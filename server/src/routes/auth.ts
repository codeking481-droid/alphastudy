import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../config/env.js';
import { getDb } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function authRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // Register — email + password + name fields
  // ---------------------------------------------------------------------------
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, firstName, middleName, lastName } = request.body as {
      email: string;
      password: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db
      .insert(users)
      .values({ email, passwordHash, firstName: firstName || null, middleName: middleName || null, lastName: lastName || null })
      .returning();
    const user = result[0];

    const env = getEnv();
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    return reply.status(201).send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Login — email + password
  // ---------------------------------------------------------------------------
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password are required' });
    }

    const db = getDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ success: false, error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid email or password' });
    }

    const env = getEnv();
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Me — current authenticated user
  // ---------------------------------------------------------------------------
  app.get('/api/auth/me', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = (request as any).user;
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (result.length === 0) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    return reply.send({ success: true, data: result[0] });
  });

  // ---------------------------------------------------------------------------
  // Forgot Password — send reset email (stub: always returns success)
  // ---------------------------------------------------------------------------
  app.post('/api/auth/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };
    if (!email) {
      return reply.status(400).send({ success: false, error: 'Email is required' });
    }

    const db = getDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (result.length > 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.update(users).set({
        resetToken,
        resetTokenExpires: expiresAt,
        updatedAt: new Date(),
      }).where(eq(users.id, result[0].id));

      // In production, send email here. For now, log the token.
      console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    }

    // Always return success to prevent email enumeration
    return reply.send({
      success: true,
      data: { message: 'If an account exists with that email, a reset link has been sent.' },
    });
  });

  // ---------------------------------------------------------------------------
  // Reset Password — verify token and set new password
  // ---------------------------------------------------------------------------
  app.post('/api/auth/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { resetToken, newPassword } = request.body as { resetToken: string; newPassword: string };
    if (!resetToken || !newPassword) {
      return reply.status(400).send({ success: false, error: 'Reset token and new password are required' });
    }
    if (newPassword.length < 6) {
      return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const result = await db.select().from(users).where(eq(users.resetToken, resetToken)).limit(1);
    const user = result[0];

    if (!user || !user.resetTokenExpires) {
      return reply.status(400).send({ success: false, error: 'Invalid or expired reset token' });
    }

    if (new Date(user.resetTokenExpires) < new Date()) {
      return reply.status(400).send({ success: false, error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    return reply.send({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });
  });
}

// ---------------------------------------------------------------------------
// Auth middleware — exported for use in other route files
// ---------------------------------------------------------------------------
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
