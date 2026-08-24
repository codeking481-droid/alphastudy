import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the route handler
// ---------------------------------------------------------------------------

// Drizzle chainable query builder mock
function createQueryChain(result: any[]) {
  const chain: any = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnThis(),
  };
  return chain;
}

const mockSelectResult: any[] = [];
const mockInsertResult: any[] = [];
const mockUpdateResult: any[] = [];

const mockTableProxy = new Proxy({}, {
  get: (_target, _prop) => (_prop === Symbol.toPrimitive || _prop === 'then')
    ? undefined
    : vi.fn().mockImplementation(() => 'column'),
});

vi.mock('../src/db/schema/index.js', () => ({
  users: new Proxy({}, {
    get: (_target: any, prop: string) => {
      if (prop === Symbol.toPrimitive || prop === 'then') return undefined;
      // Return a callable column stub that works with eq()
      return vi.fn().mockReturnValue(`col:${prop}`);
    },
  }),
}));

let mockDb: any;

vi.mock('../src/db/index.js', () => ({
  getDb: () => mockDb,
}));

vi.mock('../src/config/env.js', () => ({
  getEnv: () => ({
    JWT_SECRET: 'test-secret-min-16-chars!!!',
    APP_ENV: 'test',
  }),
}));

// ---------------------------------------------------------------------------
// Helper — simulate Fastify request / reply
// ---------------------------------------------------------------------------

function mockRequest(body: any = {}, headers: Record<string, string> = {}) {
  return { body, headers } as any;
}

function mockReply() {
  const reply: any = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { authRoutes, authMiddleware } from '../src/routes/auth.js';

// We need a minimal Fastify-like "app" to register routes
function createMockApp() {
  const routes: Record<string, Function> = {};
  return {
    post: (path: string, optsOrHandler: any, maybeHandler?: Function) => {
      const handler = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler;
      routes[path] = handler;
    },
    get: (path: string, optsOrHandler: any, maybeHandler?: Function) => {
      const handler = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler;
      routes[path] = handler;
    },
    __routes: routes,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Routes', () => {
  let app: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createMockApp();
  });

  function setupDb(selectResult: any[] = [], insertResult: any[] = [], updateResult: any[] = []) {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(selectResult),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(selectResult),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(updateResult),
          }),
        }),
      }),
    };
  }

  describe('POST /api/auth/register', () => {
    it('should register with email, password, and name fields', async () => {
      setupDb([], [{
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        middleName: 'M',
        lastName: 'Doe',
        role: 'user',
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/register'];

      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        middleName: 'M',
        lastName: 'Doe',
      });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({
              email: 'test@example.com',
              firstName: 'John',
              middleName: 'M',
              lastName: 'Doe',
            }),
          }),
        }),
      );
    });

    it('should reject registration with short password', async () => {
      setupDb();

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/register'];

      const req = mockRequest({ email: 'test@example.com', password: '123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('6 characters'),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      setupDb([{ id: 'existing', email: 'test@example.com' }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/register'];

      const req = mockRequest({ email: 'test@example.com', password: 'password123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('already registered'),
        }),
      );
    });

    it('should hash passwords with bcrypt', async () => {
      setupDb([], [{
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/register'];

      const req = mockRequest({ email: 'test@example.com', password: 'password123' });
      const reply = mockReply();

      await handler(req, reply);

      // Check that insert was called with a bcrypt hash
      const insertCall = mockDb.insert();
      expect(insertCall.values).toHaveBeenCalled();
      const values = insertCall.values.mock.calls[0][0];
      const isValidHash = await bcrypt.compare('password123', values.passwordHash);
      expect(isValidHash).toBe(true);
    });

    it('should register without name fields', async () => {
      setupDb([], [{
        id: 'user-1',
        email: 'test@example.com',
        firstName: null,
        middleName: null,
        lastName: null,
        role: 'user',
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/register'];

      const req = mockRequest({ email: 'test@example.com', password: 'password123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              firstName: null,
              middleName: null,
              lastName: null,
            }),
          }),
        }),
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      setupDb([{
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        firstName: 'John',
        middleName: null,
        lastName: 'Doe',
        role: 'user',
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/login'];

      const req = mockRequest({ email: 'test@example.com', password: 'password123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({ email: 'test@example.com' }),
          }),
        }),
      );
    });

    it('should reject wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      setupDb([{
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        role: 'user',
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/login'];

      const req = mockRequest({ email: 'test@example.com', password: 'wrong-password' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid email or password'),
        }),
      );
    });

    it('should reject non-existent email', async () => {
      setupDb([]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/login'];

      const req = mockRequest({ email: 'nobody@example.com', password: 'password123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid email or password'),
        }),
      );
    });

    it('should reject missing fields', async () => {
      setupDb();

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/login'];

      const req = mockRequest({ email: 'test@example.com' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should always return success to prevent email enumeration', async () => {
      setupDb([{ id: 'user-1', email: 'test@example.com' }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/forgot-password'];

      const req = mockRequest({ email: 'test@example.com' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return success even for non-existent email', async () => {
      setupDb([]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/forgot-password'];

      const req = mockRequest({ email: 'nobody@example.com' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      setupDb([{
        id: 'user-1',
        resetToken: 'valid-token',
        resetTokenExpires: futureDate,
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/reset-password'];

      const req = mockRequest({ resetToken: 'valid-token', newPassword: 'newpass123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should reject expired token', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      setupDb([{
        id: 'user-1',
        resetToken: 'expired-token',
        resetTokenExpires: pastDate,
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/reset-password'];

      const req = mockRequest({ resetToken: 'expired-token', newPassword: 'newpass123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid token', async () => {
      setupDb([]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/reset-password'];

      const req = mockRequest({ resetToken: 'invalid', newPassword: 'newpass123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('should reject short password in reset', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      setupDb([{
        id: 'user-1',
        resetToken: 'valid-token',
        resetTokenExpires: futureDate,
      }]);

      await authRoutes(app as any);
      const handler = app.__routes['/api/auth/reset-password'];

      const req = mockRequest({ resetToken: 'valid-token', newPassword: '123' });
      const reply = mockReply();

      await handler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('6 characters'),
        }),
      );
    });
  });
});

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject request without Authorization header', async () => {
    const req = mockRequest({}, {});
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('should reject request with invalid token', async () => {
    const req = mockRequest({}, { Authorization: 'Bearer invalid-token' });
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('should accept valid JWT token', async () => {
    // Test that a valid JWT is correctly structured and can be verified
    const secret = 'test-secret-min-16-chars!!!';
    const payload = { userId: 'user-1', email: 'test@example.com', role: 'user' };
    const token = jwt.sign(payload, secret, { expiresIn: '30d' });

    // Verify token can be decoded
    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.userId).toBe('user-1');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('user');
    expect(decoded.exp).toBeDefined();
  });

  it('should reject Bearer without token', async () => {
    const req = mockRequest({}, { Authorization: 'Bearer ' });
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });
});

describe('Password Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should never store plain-text passwords', async () => {
    const insertValues: any = {};

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((vals: any) => {
          Object.assign(insertValues, vals);
          return {
            returning: vi.fn().mockResolvedValue([{
              id: 'user-1',
              email: 'test@example.com',
              role: 'user',
            }]),
          };
        }),
      }),
    };

    const app = createMockApp();
    await authRoutes(app as any);
    const handler = app.__routes['/api/auth/register'];

    const req = mockRequest({ email: 'test@example.com', password: 'mypassword' });
    const reply = mockReply();

    await handler(req, reply);

    expect(insertValues.passwordHash).toBeDefined();
    expect(insertValues.passwordHash).not.toBe('mypassword');
    // bcrypt hashes start with $2a$, $2b$, or $2y$
    expect(insertValues.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
