// Central error + 404 handlers. Fastify catches thrown/rejected errors from
// async route handlers automatically, so no asyncHandler wrapper is needed.

export function registerErrorHandlers(app) {
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'Not found', path: req.url });
  });

  app.setErrorHandler((err, req, reply) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) req.log.error(err);
    reply.code(status).send({
      error: err.message || 'Internal Server Error',
      ...(err.data ? { details: err.data } : {}),
    });
  });
}
