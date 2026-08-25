import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Optional — when absent, the server runs an embedded Postgres (PGlite)
  DATABASE_URL: z.string().min(1).optional(),
  API_PORT: z.coerce.number().default(parseInt(process.env.PORT || '3001', 10)),
  APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_SECRET: z.string().min(16).default('alpha-study-dev-secret-change-in-production'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  ALOC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
      throw new Error('Invalid environment configuration');
    }
    _env = result.data;
  }
  return _env;
}
