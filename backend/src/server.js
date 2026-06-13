// Entry point: starts the HTTP server.
// Localhost:  HOST=127.0.0.1 (default in .env).
// Vultr:      set HOST=0.0.0.0 and PORT in .env — no code change needed.
import { buildApp } from './app.js';
import config from './config/index.js';

const app = buildApp();

try {
  await app.listen({ host: config.host, port: config.port });
  // Fastify's logger already prints the listening address.
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown so deploys/restarts don't drop in-flight requests.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down…`);
    await app.close();
    process.exit(0);
  });
}
