import { FastifyInstance } from 'fastify';
import { testConnection } from '../db/index.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    const dbOk = await testConnection();
    return {
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/api/health/ready', async (_, reply) => {
    const dbOk = await testConnection();
    if (!dbOk) {
      return reply.status(503).send({ status: 'not ready' });
    }
    return { status: 'ready' };
  });
}
