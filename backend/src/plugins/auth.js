import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/env.js'

// Anon client used only to validate user JWTs. getUser(token) verifies the
// token against Supabase's JWKS (including revocation), so we don't trust it blindly.
const supabaseAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Decorates the Fastify instance with `authenticate`, a preHandler that
 * requires a valid Supabase JWT. On success it attaches request.user and
 * request.token; otherwise it replies 401 and short-circuits the request.
 */
async function authPlugin(fastify) {
  fastify.decorate('authenticate', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or malformed Authorization header' })
    }

    const token = authHeader.slice('Bearer '.length)
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)

    if (error || !user) {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }

    request.user = user
    request.token = token
  })
}

export default fp(authPlugin, { name: 'auth' })
