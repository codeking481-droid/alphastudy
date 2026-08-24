import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from '../config/env.js';
import * as schema from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db: any = null;
let _pool: pg.Pool | null = null;
let _pglite: PGlite | null = null;

export function isEmbeddedDb(): boolean {
  return !getEnv().DATABASE_URL;
}

/**
 * Embedded Postgres (PGlite) — used when DATABASE_URL is not configured.
 * Data persists on disk under server/.pgdata.
 */
export async function getPglite(): Promise<PGlite> {
  if (!_pglite) {
    const dataDir = process.env.PGLITE_DATA_DIR || path.join(__dirname, '../../.pgdata');
    console.log(`💾 Using embedded Postgres (PGlite) — data dir: ${dataDir}`);
    _pglite = new PGlite(dataDir);
    await _pglite.waitReady;
  }
  return _pglite;
}

export function getDb() {
  if (!_db) {
    if (isEmbeddedDb()) {
      // Synchronous access required by callers — PGlite is initialized during startup
      if (!_pglite) throw new Error('Embedded database not initialized; call getPglite() first');
      _db = drizzlePglite(_pglite, { schema }) as any;
    } else {
      const env = getEnv();
      _pool = new pg.Pool({
        connectionString: env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      _db = drizzle(_pool, { schema });
    }
  }
  return _db;
}

export function getPool(): pg.Pool | PGlite {
  if (isEmbeddedDb()) return getPgliteSync();
  if (!_pool) {
    getDb(); // Initialize pool
  }
  return _pool!;
}

function getPgliteSync(): PGlite {
  if (!_pglite) throw new Error('Embedded database not initialized; call getPglite() first');
  return _pglite;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
  if (_pglite) {
    await _pglite.close();
    _pglite = null;
  }
  _db = null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client: any = getPool();
    const result = await client.query('SELECT 1 as ok');
    return result.rows?.[0]?.ok === 1;
  } catch {
    return false;
  }
}
