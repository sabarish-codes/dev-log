import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../../src/config/drizzle.js';
import { pool } from '../../src/config/db.js';
import { redis } from '../../src/config/redis.js';

export async function setupTestDb(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('_test') && process.env.NODE_ENV !== 'test') {
    throw new Error(`Refusing to run tests against non-test DB: ${dbUrl}`);
  }

  await migrate(db, { migrationsFolder: './src/db/migrations' });

  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function cleanTestDb(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE logs_tags, logs, tags, projects, users RESTART IDENTITY CASCADE`,
  );
  if (redis.isOpen) {
    await redis.flushDb();
  }
}

export async function teardownTestDb(): Promise<void> {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end();
}
