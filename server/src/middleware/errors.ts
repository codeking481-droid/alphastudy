import { FastifyInstance, FastifyError } from 'fastify';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const { log } = request;

    // Log the error
    log.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      },
    }, 'Request error');

    // Determine status code
    const statusCode = error.statusCode || 500;

    // Don't expose internal errors in production
    const message = statusCode === 500 && process.env.APP_ENV === 'production'
      ? 'Internal server error'
      : error.message;

    return reply.status(statusCode).send({
      success: false,
      error: message,
      ...(process.env.APP_ENV !== 'production' && { stack: error.stack }),
    });
  });
}
