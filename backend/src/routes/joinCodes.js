import { randomInt } from 'node:crypto'
import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { notifyHouseholdAdmins } from '../lib/notifications.js'

// Invite codes let an admin grant household access directly: a member account
// redeems the code and is added as a 'member', skipping device pairing and the
// approval queue (the code is the authorization). Codes are multi-use until an
// admin revokes them or they expire.
//
// Registered with prefix '/api'. Paths resolve to:
//   POST   /api/households/:householdId/join-codes   (admin)  create
//   GET    /api/households/:householdId/join-codes   (admin)  list active
//   DELETE /api/join-codes/:codeId                   (admin)  revoke
//   POST   /api/join-codes/redeem                    (any)    join via code

// Crockford-ish base32 minus ambiguous glyphs (no I/L/O/0/1) — codes get read
// aloud and typed by hand, so legibility matters more than entropy density.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LEN = 8
const DEFAULT_TTL_DAYS = 7

/** Random 8-char code, stored normalized (uppercase, no separators). */
function generateCode() {
  let out = ''
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

/** Strip formatting a human may paste (dashes, spaces) and uppercase. */
function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export default async function joinCodesRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/households/:householdId/join-codes — generate a code (admin only).
  // Optional body { expiresInDays: 1..90 | null }; null means a code that never
  // expires. Defaults to a 7-day code.
  app.post('/households/:householdId/join-codes', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        properties: { expiresInDays: { type: ['integer', 'null'], minimum: 1, maximum: 90 } },
      },
    },
  }, async (request, reply) => {
    const { householdId } = request.params
    const expiresInDays = request.body?.expiresInDays === undefined ? DEFAULT_TTL_DAYS : request.body.expiresInDays
    const expiresAt =
      expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 86_400_000).toISOString()

    // Retry on the rare unique-collision so a clash never surfaces to the user.
    let joinCode = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('join_codes')
        .insert({
          household_id: householdId,
          code: generateCode(),
          created_by: request.user.id,
          expires_at: expiresAt,
        })
        .select()
        .single()
      if (!error) {
        joinCode = data
        break
      }
      if (error.code !== '23505') return reply.code(500).send({ error: error.message })
    }
    if (!joinCode) return reply.code(500).send({ error: 'Could not generate a unique code. Try again.' })

    await logEvent({
      householdId,
      userId: request.user.id,
      eventType: 'JOIN_CODE_CREATED',
      metadata: { codeId: joinCode.id },
    }, request.log)

    return reply.code(201).send({ joinCode })
  })

  // GET /api/households/:householdId/join-codes — list active codes (admin only).
  // Active = not revoked and not past expiry; the dead ones are noise to an admin.
  app.get('/households/:householdId/join-codes', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('join_codes')
      .select('id, code, expires_at, use_count, created_at')
      .eq('household_id', request.params.householdId)
      .eq('revoked', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
    if (error) return reply.code(500).send({ error: error.message })
    return { joinCodes: data ?? [] }
  })

  // DELETE /api/join-codes/:codeId — revoke a code (admin of its household only).
  // householdId isn't in the path, so membership is checked against the code's
  // own household here rather than via makeRoleCheck.
  app.delete('/join-codes/:codeId', {
    schema: {
      params: { type: 'object', properties: { codeId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { codeId } = request.params

    const { data: joinCode, error: loadError } = await supabaseAdmin
      .from('join_codes')
      .select('id, household_id')
      .eq('id', codeId)
      .maybeSingle()
    if (loadError) return reply.code(500).send({ error: loadError.message })
    if (!joinCode) return reply.code(404).send({ error: 'Invite code not found' })

    if (!(await isAdmin(joinCode.household_id, request.user.id))) {
      return reply.code(403).send({ error: 'Only household admins can revoke invite codes' })
    }

    const { error } = await supabaseAdmin
      .from('join_codes')
      .update({ revoked: true })
      .eq('id', codeId)
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      householdId: joinCode.household_id,
      userId: request.user.id,
      eventType: 'JOIN_CODE_REVOKED',
      metadata: { codeId },
    }, request.log)

    return reply.code(204).send()
  })

  // POST /api/join-codes/redeem — any authenticated user joins as a member by
  // presenting a valid code. Idempotent for someone already in the household.
  app.post('/join-codes/redeem', {
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string', minLength: 1, maxLength: 32 } },
      },
    },
  }, async (request, reply) => {
    const code = normalizeCode(request.body.code)
    if (!code) return reply.code(400).send({ error: 'Enter a valid invite code.' })

    const { data: joinCode, error: loadError } = await supabaseAdmin
      .from('join_codes')
      .select('id, household_id, expires_at, revoked')
      .eq('code', code)
      .maybeSingle()
    if (loadError) return reply.code(500).send({ error: loadError.message })
    if (!joinCode || joinCode.revoked) {
      return reply.code(404).send({ error: 'That invite code isn’t valid. Check it and try again.' })
    }
    if (joinCode.expires_at && new Date(joinCode.expires_at) <= new Date()) {
      return reply.code(410).send({ error: 'That invite code has expired. Ask an admin for a new one.' })
    }

    const household = await getHousehold(joinCode.household_id)
    if (!household) return reply.code(404).send({ error: 'That household no longer exists.' })

    // Already a member? Treat as success so the code is safely re-usable.
    const { data: existing } = await supabaseAdmin
      .from('household_members')
      .select('role')
      .eq('household_id', joinCode.household_id)
      .eq('user_id', request.user.id)
      .maybeSingle()
    if (existing) {
      return { household: { ...household, role: existing.role }, alreadyMember: true }
    }

    const { error: memberError } = await supabaseAdmin
      .from('household_members')
      .insert({ household_id: joinCode.household_id, user_id: request.user.id, role: 'member' })
    if (memberError) return reply.code(500).send({ error: memberError.message })

    // Best-effort usage counter; a failed bump must not fail the join.
    await supabaseAdmin
      .from('join_codes')
      .update({ use_count: (joinCode.use_count ?? 0) + 1 })
      .eq('id', joinCode.id)

    await logEvent({
      householdId: joinCode.household_id,
      userId: request.user.id,
      eventType: 'JOIN_CODE_REDEEMED',
      metadata: { codeId: joinCode.id },
    }, request.log)
    await logEvent({
      householdId: joinCode.household_id,
      userId: request.user.id,
      eventType: 'MEMBER_ADDED',
      metadata: { via: 'join_code', codeId: joinCode.id },
    }, request.log)

    // Let admins know a member joined (skip the joiner if they happen to be one).
    const joinerName = await getProfileName(request.user.id)
    await notifyHouseholdAdmins(joinCode.household_id, {
      type: 'member_joined',
      title: 'New member joined',
      body: `${joinerName || 'Someone'} joined ${household.name} with an invite code.`,
      data: { householdId: joinCode.household_id, memberId: request.user.id },
    }, request.log, { excludeUserId: request.user.id })

    return reply.code(201).send({ household: { ...household, role: 'member' } })
  })
}

// ---- helpers --------------------------------------------------------------

async function isAdmin(householdId, userId) {
  const { data } = await supabaseAdmin
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

async function getHousehold(householdId) {
  const { data } = await supabaseAdmin
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle()
  return data ?? null
}

async function getProfileName(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()
  return data?.full_name ?? null
}
