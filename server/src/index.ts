import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { getEnv } from './config/env.js';
import { closeDb } from './db/index.js';
import { errorHandler } from './middleware/errors.js';
import { healthRoutes } from './routes/health.js';
import { llmRoutes } from './routes/llm.js';
import { registerEntityRoutes } from './routes/entity.js';
import {
  conversationMessages,
  learningRecords,
  mistakes,
  missions,
  notes,
  questions,
  portalSessions,
  concepts,
  users,
} from './repositories/index.js';
import { EntityService } from './services/entity.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Alpha Study API Server — serves both API and frontend
// ============================================================================

async function buildServer() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.APP_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ── CORS ──────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });

  // ── Error Handler ─────────────────────────────────────────────────────
  await app.register(errorHandler);

  // ── Health Routes ─────────────────────────────────────────────────────
  await app.register(healthRoutes);

  // ── LLM Routes ───────────────────────────────────────────────────────
  await app.register(llmRoutes);

  // ── Entity Routes ─────────────────────────────────────────────────────
  const entityRoutes: Array<{ path: string; name: string; service: EntityService }> = [
    { path: '/api/entities/conversation-messages', name: 'ConversationMessage', service: new EntityService(conversationMessages) },
    { path: '/api/entities/learning-records', name: 'LearningRecord', service: new EntityService(learningRecords) },
    { path: '/api/entities/mistakes', name: 'Mistake', service: new EntityService(mistakes) },
    { path: '/api/entities/missions', name: 'Mission', service: new EntityService(missions) },
    { path: '/api/entities/notes', name: 'Note', service: new EntityService(notes) },
    { path: '/api/entities/questions', name: 'Question', service: new EntityService(questions) },
    { path: '/api/entities/portal-sessions', name: 'PortalSession', service: new EntityService(portalSessions) },
    { path: '/api/entities/concepts', name: 'Concept', service: new EntityService(concepts) },
    { path: '/api/entities/users', name: 'User', service: new EntityService(users) },
  ];

  for (const route of entityRoutes) {
    await app.register(
      async (instance) => {
        await registerEntityRoutes(instance, {
          basePath: '',
          entityName: route.name,
          service: route.service,
        });
      },
      { prefix: route.path }
    );
  }

  // ── Serve Frontend Static Files ───────────────────────────────────────
  // The frontend build output is at ../../dist (relative to server/src/)
  const distPath = path.join(__dirname, '../../dist');

  if (fs.existsSync(distPath)) {
    await app.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
      decorateReply: true,
    });

    // SPA fallback: serve index.html for all non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ success: false, error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    console.warn('⚠️  Frontend dist/ not found. Serving API only.');
  }

  return app;
}

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  const env = getEnv();
  const app = await buildServer();

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Alpha Study running on http://localhost:${env.API_PORT}`);
    console.log(`   Environment: ${env.APP_ENV}`);
    console.log('');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
