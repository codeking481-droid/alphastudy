import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { getDb } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send({ success: false, error: 'Email and password are required' });
    if (password.length < 6) return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' });

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return reply.status(409).send({ success: false, error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.insert(users).values({ email, passwordHash }).returning();
    const user = result[0];
    const env = getEnv();
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '30d' });

    return reply.status(201).send({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  });

  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send({ success: false, error: 'Email and password are required' });

    const db = getDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];
    if (!user || !user.passwordHash) return reply.status(401).send({ success: false, error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.status(401).send({ success: false, error: 'Invalid email or password' });

    const env = getEnv();
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '30d' });
    return reply.send({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  });

  app.get('/api/auth/me', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = (request as any).user;
    const db = getDb();
    const result = await db.select({ id: users.id, email: users.email, role: users.role })
      .from(users).where(eq(users.id, authUser.userId)).limit(1);
    if (result.length === 0) return reply.status(404).send({ success: false, error: 'User not found' });
    return reply.send({ success: true, data: result[0] });
  });
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string; role: string };
    (request as any).user = decoded;
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}
