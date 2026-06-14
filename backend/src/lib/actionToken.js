// Short-lived signed tokens that let a notification action button act on a
// device WITHOUT a logged-in session. The token rides inside the Web Push
// payload (which only the household's authorized subscriptions ever receive),
// so the service worker can POST "snooze"/"turn off" straight to the backend
// from a locked phone with the app closed — no Supabase JWT available there.
//
// Format: base64url(json payload) + "." + base64url(HMAC-SHA256(payload)).
// Self-contained and stateless (no DB row to store/clean up); security comes
// from the signature + a tight expiry + device/action scoping.
import crypto from 'node:crypto'

// Falls back to the VAPID private key so this works with zero new config — that
// key is already a high-entropy server secret never sent to clients. Set
// ACTION_TOKEN_SECRET explicitly to rotate independently of VAPID.
function secret() {
  const s = process.env.ACTION_TOKEN_SECRET || process.env.VAPID_PRIVATE_KEY || ''
  if (!s) throw new Error('No ACTION_TOKEN_SECRET / VAPID_PRIVATE_KEY set for action tokens')
  return s
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}

// Constant-time compare so a bad signature can't be timing-probed.
function safeEqual(a, b) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

/**
 * Mint a token authorizing `actions` on `deviceId` for `ttlSeconds`.
 * @param {string} deviceId
 * @param {object} [opts]
 * @param {string[]} [opts.actions] allowed actions (default snooze + turnoff)
 * @param {number}   [opts.ttlSeconds] lifetime (default 600s)
 * @param {number}   [opts.now] epoch ms (testing seam)
 */
export function mintActionToken(deviceId, { actions = ['snooze', 'turnoff'], ttlSeconds = 600, now = Date.now() } = {}) {
  const payload = { d: deviceId, a: actions, exp: Math.floor(now / 1000) + ttlSeconds }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

/**
 * Verify a token. Returns the decoded payload `{ deviceId, actions, exp }` or
 * null if malformed, tampered, or expired.
 * @param {string} token
 * @param {number} [now] epoch ms (testing seam)
 */
export function verifyActionToken(token, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  if (!safeEqual(sig, sign(body))) return null

  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload?.d || !Array.isArray(payload.a)) return null
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(now / 1000)) return null
  return { deviceId: payload.d, actions: payload.a, exp: payload.exp }
}
