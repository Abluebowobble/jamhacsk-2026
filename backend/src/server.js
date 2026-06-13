// Entry point: starts the HTTP server.
// Localhost:  HOST=127.0.0.1 (default in .env).
// Vultr:      set HOST=0.0.0.0 and PORT in .env — no code change needed.
import app from './app.js';
import config from './config/index.js';

const server = app.listen(config.port, config.host, () => {
  console.log(
    `Hestia backend [${config.env}] listening on http://${config.host}:${config.port}${config.apiPrefix}`
  );
});

// Graceful shutdown so deploys/restarts don't drop in-flight requests.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n${signal} received, shutting down…`);
    server.close(() => process.exit(0));
  });
}
