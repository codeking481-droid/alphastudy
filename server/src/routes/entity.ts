import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from './auth.js';

interface EntityRouteOptions {
  basePath: string;
  entityName: string;
  service: any;
  userScoped?: boolean;
}

export async function registerEntityRoutes(
  app: FastifyInstance,
  options: EntityRouteOptions
) {
  const { basePath, entityName, service, userScoped = true } = options;

  // All entity routes require auth
  app.addHook('preHandler', authMiddleware);

  // ── LIST ──────────────────────────────────────────────────────────
  app.get(`${basePath}/list`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sort, limit } = request.query as { sort?: string; limit?: string };
      const userId = (request as any).user?.userId;

      let result;
      if (userScoped && userId) {
        result = await service.listByUser(userId, sort || '-created_at', limit ? parseInt(limit, 10) : 200);
      } else {
        result = await service.list(sort || '-created_at', limit ? parseInt(limit, 10) : 200);
      }
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ── FILTER ────────────────────────────────────────────────────────
  app.get(`${basePath}/filter`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const { sort, limit, ...filters } = query;
      const userId = (request as any).user?.userId;

      const parsedFilters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'sort' || key === 'limit') continue;
        if (value === 'true') parsedFilters[key] = true;
        else if (value === 'false') parsedFilters[key] = false;
        else if (!isNaN(Number(value))) parsedFilters[key] = Number(value);
        else parsedFilters[key] = value;
      }

      let result;
      if (userScoped && userId) {
        result = await service.filterByUser(userId, parsedFilters, sort || '-created_at', limit ? parseInt(limit, 10) : 100);
      } else {
        result = await service.filter(parsedFilters, sort || '-created_at', limit ? parseInt(limit, 10) : 100);
      }
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ── GET BY ID ─────────────────────────────────────────────────────
  app.get(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.get(id);
      if (!result) {
        return reply.status(404).send({ success: false, error: `${entityName} not found` });
      }
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ── CREATE ────────────────────────────────────────────────────────
  app.post(`${basePath}`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const userId = (request as any).user?.userId;

      if (userScoped && userId) {
        data.userId = userId;
      }

      const result = await service.create(data);
      return reply.status(201).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // ── UPDATE ────────────────────────────────────────────────────────
  app.put(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await service.update(id, data);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ success: false, error: error.message });
      }
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // ── DELETE ────────────────────────────────────────────────────────
  app.delete(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await service.delete(id);
      return reply.send({ success: true });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ success: false, error: error.message });
      }
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
