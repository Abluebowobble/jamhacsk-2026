import { logEvent, auditContext } from '../lib/events.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { mintCameraToken, cameraStreamConfigured } from '../lib/cameraToken.js'

export default async function cameraRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/devices/:deviceId/camera-token
  // Returns the device's stream URL plus a short-lived token the browser uses to
  // connect directly to the Pi's MJPEG server. Any household member may view.
  app.get('/:deviceId/camera-token', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request, reply) => {
    if (!cameraStreamConfigured()) {
      return reply.code(503).send({ error: 'Camera streaming is not configured on the server.' })
    }
    const baseUrl = request.device.camera_stream_url
    if (!baseUrl) {
      return reply.code(409).send({ error: 'This device has no camera stream configured.' })
    }

    const { token, expiresAt } = mintCameraToken(request.params.deviceId)

    await logEvent({
      ...auditContext(request),
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      eventType: 'CAMERA_STREAM_VIEWED',
      resourceType: 'device',
      resourceId: request.params.deviceId,
    }, request.log)

    return {
      streamUrl: `${baseUrl.replace(/\/+$/, '')}/stream`,
      token,
      expiresAt,
    }
  })
}
