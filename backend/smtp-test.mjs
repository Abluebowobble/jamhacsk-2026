// Standalone Brevo SMTP probe — bypasses Supabase to isolate the failure.
// Reads creds from env so nothing is hardcoded.
import tls from 'node:tls'
import net from 'node:net'

const HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com'
const PORT = Number(process.env.SMTP_PORT || 587)
const USER = process.env.SMTP_USER
const PASS = process.env.SMTP_PASS
const FROM = process.env.SMTP_FROM
const TO = process.env.SMTP_TO || FROM

for (const [k, v] of Object.entries({ SMTP_USER: USER, SMTP_PASS: PASS, SMTP_FROM: FROM })) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(2) }
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')

// A proper SMTP response reader: buffers bytes and only resolves once a
// COMPLETE reply has arrived. Multi-line replies use "250-" on continuation
// lines and "250 " (digit + space) on the final line.
function makeReader(sock) {
  let buf = ''
  let pending = null
  sock.on('data', (d) => {
    buf += d.toString()
    tryResolve()
  })
  function complete() {
    const lines = buf.replace(/\r\n$/, '').split('\r\n')
    const last = lines[lines.length - 1]
    return /^\d{3} /.test(last) ? buf.trim() : null
  }
  function tryResolve() {
    if (!pending) return
    const done = complete()
    if (done !== null) { buf = ''; const r = pending; pending = null; r(done) }
  }
  return () => new Promise((resolve) => { pending = resolve; tryResolve() })
}

async function cmd(read, sock, line, redact = false) {
  if (line) { console.log('→', redact ? '[redacted]' : line); sock.write(line + '\r\n') }
  const res = await read()
  console.log('←', res)
  return res
}

console.log(`Connecting to ${HOST}:${PORT} ...`)
const raw = net.connect(PORT, HOST)
raw.setEncoding('utf8')
await new Promise((r, j) => { raw.once('connect', r); raw.once('error', j) })

let read = makeReader(raw)
await read()                                       // 220 greeting
await cmd(read, raw, `EHLO test.local`)
const starttls = await cmd(read, raw, `STARTTLS`)
if (!starttls.startsWith('220')) {
  console.log('\nRESULT: server refused STARTTLS ❌ — try port 465 instead.')
  process.exit(1)
}

// Upgrade to TLS only after the 220 STARTTLS ack.
const sock = tls.connect({ socket: raw, servername: HOST, rejectUnauthorized: false })
sock.setEncoding('utf8')
await new Promise((r, j) => { sock.once('secureConnect', r); sock.once('error', j) })
read = makeReader(sock)

await cmd(read, sock, `EHLO test.local`)
await cmd(read, sock, `AUTH LOGIN`)
await cmd(read, sock, b64(USER), true)
const authResp = await cmd(read, sock, b64(PASS), true)
if (!authResp.startsWith('235')) {
  console.log('\nRESULT: AUTH FAILED ❌  →  SMTP username/password is wrong.')
  console.log('Brevo login must be the xxxx@smtp-brevo.com string; password = the SMTP key.')
  process.exit(1)
}
console.log('AUTH OK ✅')

const mailResp = await cmd(read, sock, `MAIL FROM:<${FROM}>`)
if (!mailResp.startsWith('250')) {
  console.log(`\nRESULT: SENDER REJECTED ❌  →  ${FROM} is not an accepted/verified Brevo sender.`)
  process.exit(1)
}
const rcptResp = await cmd(read, sock, `RCPT TO:<${TO}>`)
console.log(rcptResp.startsWith('250') ? '\nRESULT: SMTP path is fully working ✅' : `\nRESULT: recipient rejected ❌ — ${rcptResp}`)
await cmd(read, sock, `QUIT`)
sock.end()
