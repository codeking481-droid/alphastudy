import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().min(1)).describe('PostgreSQL connection string'),
  API_PORT: z.coerce.number().default(3001).describe('Server port'),
  APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173').describe('Allowed CORS origin'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:');
      console.error(result.error.flatten().fieldErrors);
      throw new Error('Invalid environment configuration');
    }
    _env = result.data;
  }
  return _env;
}

export function getEnvUnsafe(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
