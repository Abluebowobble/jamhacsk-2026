// Builds the Fastify app: plugins + routes. No listening here (see server.js)
// so the app can be imported by tests without opening a port.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { registerErrorHandlers } from './middleware/errorHandler.js';

export function buildApp() {
  const app = Fastify({
    logger: { level: config.isProd ? 'info' : 'debug' },
  });

  // CORS limited to the configured frontend origin(s).
  app.register(cors, {
    origin: config.frontendOrigins,
    credentials: true,
  });

  // Root ping so hitting the bare host shows the server is up.
  app.get('/', () => ({ name: 'hestia-backend', env: config.env, api: config.apiPrefix }));

  // All /api routes (JSON body parsing is built into Fastify).
  app.register(apiRoutes, { prefix: config.apiPrefix });

  registerErrorHandlers(app);

  return app;
}
