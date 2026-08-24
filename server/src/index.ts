import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { getEnv } from './config/env.js';
import { closeDb } from './db/index.js';
import { errorHandler } from './middleware/errors.js';
import { healthRoutes } from './routes/health.js';
import { llmRoutes } from './routes/llm.js';
import { authRoutes } from './routes/auth.js';
import { alocRoutes } from './routes/aloc.js';
import { curriculumRoutes } from './routes/curriculum.js';
import { registerEntityRoutes } from './routes/entity.js';
import {
  conversationMessages, learningRecords, mistakes, missions,
  notes, questions, portalSessions, concepts, users, reasoningTranscripts,
} from './repositories/index.js';
import { EntityService } from './services/entity.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(errorHandler);
  await app.register(healthRoutes);
  await app.register(llmRoutes);
  await app.register(authRoutes);
  await app.register(alocRoutes);
  await app.register(curriculumRoutes);

  // Entity routes (all user-scoped)
  const entityRoutes: Array<{ path: string; name: string; service: EntityService; userScoped: boolean }> = [
    { path: '/api/entities/conversation-messages', name: 'ConversationMessage', service: new EntityService(conversationMessages), userScoped: true },
    { path: '/api/entities/learning-records', name: 'LearningRecord', service: new EntityService(learningRecords), userScoped: true },
    { path: '/api/entities/mistakes', name: 'Mistake', service: new EntityService(mistakes), userScoped: true },
    { path: '/api/entities/missions', name: 'Mission', service: new EntityService(missions), userScoped: true },
    { path: '/api/entities/notes', name: 'Note', service: new EntityService(notes), userScoped: true },
    { path: '/api/entities/questions', name: 'Question', service: new EntityService(questions), userScoped: false },
    { path: '/api/entities/portal-sessions', name: 'PortalSession', service: new EntityService(portalSessions), userScoped: true },
    { path: '/api/entities/concepts', name: 'Concept', service: new EntityService(concepts), userScoped: false },
    { path: '/api/entities/users', name: 'User', service: new EntityService(users), userScoped: false },
    { path: '/api/entities/reasoning-transcripts', name: 'ReasoningTranscript', service: new EntityService(reasoningTranscripts), userScoped: true },
  ];

  for (const route of entityRoutes) {
    await app.register(async (instance) => {
      await registerEntityRoutes(instance, {
        basePath: '', entityName: route.name, service: route.service, userScoped: route.userScoped,
      });
    }, { prefix: route.path });
  }

  // Serve frontend — look in multiple locations for the built SPA
  const possibleDistPaths = [
    path.join(__dirname, '../../dist'),   // running from dist/index.js
    path.join(__dirname, '../dist'),       // running from server/dist/index.js
    path.join(process.cwd(), 'dist'),     // running from project root
  ];
  const distPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));
  if (distPath) {
    app.log.info(`Serving frontend from ${distPath}`);
    await app.register(fastifyStatic, { root: distPath, prefix: '/', decorateReply: true });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ success: false, error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.log.warn('No frontend dist/ found — API-only mode');
  }

  return app;
}

async function start() {
  const env = getEnv();
  const app = await buildServer();
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Alpha Study running on http://localhost:${env.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
  const shutdown = async () => { await app.close(); await closeDb(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
