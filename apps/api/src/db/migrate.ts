import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';

async function migrateDb() {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  logger.info('Migrations applied');
}

migrateDb()
  .catch((err: Error) => {
    logger.error({ err }, 'Migrations failed');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
