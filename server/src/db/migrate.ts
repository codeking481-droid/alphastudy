import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getEnv } from '../config/env.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findMigrationsFolder(): string {
  // When running from server/dist/index.js, migrations are in server/src/db/migrations
  const candidates = [
    path.join(__dirname, 'migrations'),           // server/dist/migrations
    path.join(__dirname, '../src/db/migrations'),   // server/src/db/migrations (from dist/index.js)
    path.join(__dirname, '../../src/db/migrations'), // server/dist/index.js → ../../src/db/migrations
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`   Found migrations at: ${candidate}`);
      return candidate;
    }
  }
  throw new Error(`Migrations folder not found. Tried: ${candidates.join(', ')}`);
}

async function runMigrations() {
  const env = getEnv();
  console.log('🔄 Running database migrations...');
  console.log(`   Database: ${env.DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);

  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: findMigrationsFolder(),
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
