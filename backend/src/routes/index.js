// All API routes, registered under config.apiPrefix (default /api) in app.js.
// Exported as a Fastify plugin.
import {
  health,
  echo,
  getStatus,
  sendCommand,
  notify,
} from '../controllers/exampleController.js';
import { stream } from '../controllers/eventsController.js';

export default async function routes(fastify) {
  // Frontend -> backend
  fastify.get('/health', health);
  fastify.post('/echo', echo);

  // Backend <- upstream/device backend  (fetch data)
  fastify.get('/status', getStatus);

  // Backend -> upstream/device backend  (push data)
  fastify.post('/commands', sendCommand);

  // Backend -> frontend  (push data, real-time)
  fastify.get('/events', stream); // SSE stream
  fastify.post('/notify', notify); // trigger a push to all SSE clients
}
