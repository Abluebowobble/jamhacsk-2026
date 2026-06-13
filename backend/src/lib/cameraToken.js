// Short-lived HMAC token authorising a browser to open a device's MJPEG stream
// directly (the backend never proxies the video). The firmware validates this
// with the SAME secret — see firmware/src/camera_stream.py verify_token().
//
//   msg   = `${deviceId}.${exp}`            exp = unix seconds
//   sig   = hex( HMAC_SHA256(secret, msg) )
//   token = `${deviceId}.${exp}.${sig}`
import crypto from 'node:crypto'

const SECRET = process.env.CAMERA_STREAM_SECRET || ''
// Token lifetime in seconds. Only gates *connecting*; the MJPEG socket persists.
const TTL_SECONDS = Number(process.env.CAMERA_STREAM_TOKEN_TTL || 120)

/** Whether a camera-stream secret is configured. */
export function cameraStreamConfigured() {
  return Boolean(SECRET)
}

/**
 * Mint a stream token for a device.
 * @param {string} deviceId
 * @returns {{ token: string, expiresAt: string }}
 */
export function mintCameraToken(deviceId) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const msg = `${deviceId}.${exp}`
  const sig = crypto.createHmac('sha256', SECRET).update(msg).digest('hex')
  return { token: `${deviceId}.${exp}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() }
}
