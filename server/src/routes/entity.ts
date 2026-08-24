import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EntityService } from '../services/entity.js';

// ============================================================================
// Generic Entity Routes — matches Base44 SDK entity operations
// ============================================================================

interface EntityRouteOptions {
  basePath: string;        // e.g. '/api/entities/conversation-messages'
  entityName: string;      // e.g. 'ConversationMessage'
  service: EntityService;
}

export async function registerEntityRoutes(
  app: FastifyInstance,
  options: EntityRouteOptions
) {
  const { basePath, entityName, service } = options;

  // ── LIST ──────────────────────────────────────────────────────────────
  // GET /api/entities/:entity/list?sort=-created_date&limit=200
  app.get(`${basePath}/list`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sort, limit } = request.query as { sort?: string; limit?: string };
      const result = await service.list(
        sort || '-created_at',
        limit ? parseInt(limit, 10) : 200
      );
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  // ── FILTER ────────────────────────────────────────────────────────────
  // GET /api/entities/:entity/filter?concept=X&sort=-created_date&limit=100
  app.get(`${basePath}/filter`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const { sort, limit, ...filters } = query;

      // Parse filter values (try to parse numbers and booleans)
      const parsedFilters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'sort' || key === 'limit') continue;
        if (value === 'true') parsedFilters[key] = true;
        else if (value === 'false') parsedFilters[key] = false;
        else if (!isNaN(Number(value))) parsedFilters[key] = Number(value);
        else parsedFilters[key] = value;
      }

      const result = await service.filter(
        parsedFilters,
        sort || '-created_at',
        limit ? parseInt(limit, 10) : 100
      );
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  // ── GET BY ID ─────────────────────────────────────────────────────────
  // GET /api/entities/:entity/:id
  app.get(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.get(id);
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: `${entityName} not found`,
        });
      }
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  // ── CREATE ────────────────────────────────────────────────────────────
  // POST /api/entities/:entity
  app.post(`${basePath}`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const result = await service.create(data);
      return reply.status(201).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Invalid data',
      });
    }
  });

  // ── UPDATE ────────────────────────────────────────────────────────────
  // PUT /api/entities/:entity/:id
  app.put(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await service.update(id, data);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({
          success: false,
          error: error.message,
        });
      }
      return reply.status(400).send({
        success: false,
        error: error.message || 'Invalid data',
      });
    }
  });

  // ── DELETE ────────────────────────────────────────────────────────────
  // DELETE /api/entities/:entity/:id
  app.delete(`${basePath}/:id`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await service.delete(id);
      return reply.send({ success: true });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({
          success: false,
          error: error.message,
        });
      }
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });
}
