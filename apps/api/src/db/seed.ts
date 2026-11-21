import { and, eq, sql } from 'drizzle-orm';
import { pool } from '../config/db.js';
import { db } from '../config/drizzle.js';
import { logs, logsTags, projects, tags, users } from './schema.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../config/logger.js';

const DEMO_EMAIL = 'demo@devlog.io';
const DEMO_PASSWORD = 'Password123!';

const SEED_LOGS = [
  // 1. Config
  {
    title: 'Docker container cannot reach PostgreSQL on localhost',
    type: 'config' as const,
    errorMsg: 'connect ECONNREFUSED 127.0.0.1:5432',
    whatHappened:
      'API container could not connect to postgres running on host machine',
    fixTakeaway:
      'In Docker for Mac/Windows, use host.docker.internal:5432 instead of localhost:5432.',
    project: 'dev-log',
    tags: ['docker', 'networking', 'postgres'],
    date: '2026-11-01',
    timespentMinutes: 45,
  },
  // 2. Error
  {
    title:
      'PostgreSQL check constraint fails on table-prefixed columns in CREATE TABLE',
    type: 'error' as const,
    errorMsg: 'ERROR: invalid reference to FROM-clause entry for table "users"',
    whatHappened:
      'Check constraint written as CHECK (users.username != "") failed during table creation',
    fixTakeaway:
      'In PostgreSQL CREATE TABLE check constraints, columns must be unqualified: CHECK (username != "").',
    project: 'dev-log',
    tags: ['postgres', 'sql', 'drizzle'],
    date: '2026-11-02',
    timespentMinutes: 60,
  },
  // 3. Bug
  {
    title: 'Refresh token cookie not sent across Vite and Express ports',
    type: 'bug' as const,
    errorMsg: '401 Unauthorized on /api/v1/auth/refresh',
    whatHappened:
      'Cookie was set in browser but request to /refresh never had Cookie header attached',
    fixTakeaway:
      'Axios requires withCredentials: true, and CORS must specify exact origin with credentials: true.',
    project: 'auth-service',
    tags: ['cookies', 'cors', 'axios', 'express'],
    date: '2026-11-03',
    timespentMinutes: 90,
  },
  // 4. Discovery
  {
    title: 'PostgreSQL generatedAlwaysAsIdentity vs serial',
    type: 'discovery' as const,
    whatHappened:
      'Comparing primary key auto-increment strategies for modern Postgres',
    fixTakeaway:
      'GENERATED ALWAYS AS IDENTITY is SQL standard and prevents accidental manual ID inserts unlike serial.',
    project: 'dev-log',
    tags: ['postgres', 'sql'],
    date: '2026-11-04',
    timespentMinutes: 30,
  },
  // 5. Error
  {
    title: 'TypeError: Do not know how to serialize a BigInt',
    type: 'error' as const,
    errorMsg:
      'TypeError: Do not know how to serialize a BigInt at JSON.stringify',
    whatHappened:
      'Express res.json() crashed when sending a row with bigint primary key to client',
    fixTakeaway:
      'In Drizzle pg-core, use bigint({ mode: "number" }) for IDs under 9 quadrillion to serialize directly.',
    project: 'dev-log',
    tags: ['typescript', 'drizzle', 'express'],
    date: '2026-11-05',
    timespentMinutes: 40,
  },
  // 6. Config
  {
    title: 'Nginx 502 Bad Gateway with upstream Express container',
    type: 'config' as const,
    errorMsg: '502 Bad Gateway - connect() failed (111: Connection refused)',
    whatHappened:
      'Nginx proxy_pass failed to reach API container in Docker network',
    fixTakeaway:
      'Ensure Nginx and API share the same Docker network and proxy_pass uses the service name http://api:3000.',
    project: 'dev-log',
    tags: ['nginx', 'docker', 'devops'],
    date: '2026-11-06',
    timespentMinutes: 75,
  },
  // 7. Bug
  {
    title: 'Stale state in React useEffect closure',
    type: 'bug' as const,
    whatHappened:
      'Log count was showing previous value when polling API inside setInterval',
    fixTakeaway:
      'Use functional state updates setLogs(prev => ...) or useRef to avoid capturing stale values in closures.',
    project: 'dev-log',
    tags: ['react', 'hooks', 'javascript'],
    date: '2026-11-07',
    timespentMinutes: 50,
  },
  // 8. Discovery
  {
    title: 'pnpm deploy for minimal Docker images',
    type: 'discovery' as const,
    whatHappened:
      'Container build was including full monorepo node_modules resulting in 1.5GB image',
    fixTakeaway:
      'pnpm --filter api deploy --prod /out isolates only the needed package and its production dependencies (200MB).',
    project: 'dev-log',
    tags: ['pnpm', 'docker', 'monorepo'],
    date: '2026-11-08',
    timespentMinutes: 60,
  },
  // 9. Error
  {
    title: 'Jest crashes on pure ESM dependency jose',
    type: 'error' as const,
    errorMsg: 'Must use import to load ES Module',
    whatHappened:
      'Running unit test on auth service failed because Jest defaults to CommonJS require()',
    fixTakeaway:
      'Set transformIgnorePatterns: [] in jest.config and pass --experimental-vm-modules to node.',
    project: 'dev-log',
    tags: ['jest', 'esm', 'testing'],
    date: '2026-11-09',
    timespentMinutes: 80,
  },
  // 10. Config
  {
    title: 'Tailwind v4 theme variables not resolving in Shadcn UI',
    type: 'config' as const,
    errorMsg: 'Unknown utility class bg-sidebar',
    whatHappened:
      'CSS variable definitions in @theme inline were missing oklch color conversions',
    fixTakeaway:
      'Tailwind v4 replaces tailwind.config.js with @theme directive in index.css; map variables directly.',
    project: 'dev-log',
    tags: ['tailwind', 'css', 'vite'],
    date: '2026-11-10',
    timespentMinutes: 45,
  },
  // 11. Bug
  {
    title: 'Redis client closed error on API server reload',
    type: 'bug' as const,
    errorMsg: 'The client is closed at Commander._sendCommand',
    whatHappened: 'API failed to store refresh tokens after container restart',
    fixTakeaway:
      'Handle redis reconnect events and graceful shutdown with server.close() and redis.quit().',
    project: 'auth-service',
    tags: ['redis', 'node', 'express'],
    date: '2026-11-11',
    timespentMinutes: 60,
  },
  // 12. Discovery
  {
    title: 'Zod flattenError vs format for form errors',
    type: 'discovery' as const,
    whatHappened:
      'Needed clean field-by-field error messages for API validation responses',
    fixTakeaway:
      'z.flattenError(error).fieldErrors returns Record<string, string[]> which directly maps to form input error states.',
    project: 'dev-log',
    tags: ['zod', 'typescript', 'validation'],
    date: '2026-11-12',
    timespentMinutes: 25,
  },
  // 13. Error
  {
    title:
      'CORS header Access-Control-Allow-Origin cannot be wildcard when credentials is true',
    type: 'error' as const,
    errorMsg:
      'The value of the Access-Control-Allow-Origin header in the response must not be the wildcard *',
    whatHappened:
      'Setting origin: * with credentials: true threw browser security violation',
    fixTakeaway:
      'When sending cookies/credentials, Access-Control-Allow-Origin must be an explicit URL matching client.',
    project: 'auth-service',
    tags: ['cors', 'security', 'express'],
    date: '2026-11-13',
    timespentMinutes: 35,
  },
  // 14. Bug
  {
    title: 'Duplicate tags created due to casing differences',
    type: 'bug' as const,
    whatHappened:
      'Tags like "Docker" and "docker" both existed for the same user in database',
    fixTakeaway:
      'Use uniqueIndex("tags_user_name_uq").on(userId, sql`lower(name)`) and lower() before insert.',
    project: 'dev-log',
    tags: ['postgres', 'database', 'drizzle'],
    date: '2026-11-14',
    timespentMinutes: 40,
  },
  // 15. Config
  {
    title: 'Prometheus scraper failed to reach API target',
    type: 'config' as const,
    errorMsg:
      'Get "http://localhost:3000/metrics": dial tcp 127.0.0.1:3000: connect: connection refused',
    whatHappened:
      'Prometheus container tried to scrape localhost which referred to itself',
    fixTakeaway:
      'In prometheus.yml static_configs, use host.docker.internal:3000 or container name api:3000.',
    project: 'dev-log',
    tags: ['prometheus', 'monitoring', 'docker'],
    date: '2026-11-15',
    timespentMinutes: 30,
  },
  // 16. Discovery
  {
    title: 'Argon2id vs bcrypt performance and security',
    type: 'discovery' as const,
    whatHappened: 'Benchmarking password hashing algorithms under load',
    fixTakeaway:
      'Argon2id is memory-hard and GPU-resistant, making brute force far costlier than bcrypt for the same CPU time.',
    project: 'auth-service',
    tags: ['security', 'cryptography', 'auth'],
    date: '2026-11-16',
    timespentMinutes: 45,
  },
  // 17. Error
  {
    title: 'JWT TokenExpiredError not caught by auth middleware',
    type: 'error' as const,
    errorMsg: 'JWTExpired: "exp" claim timestamp check failed',
    whatHappened:
      'Expired tokens caused unhandled 500 error instead of clean 401 response',
    fixTakeaway:
      'Wrap jwtVerify in try/catch and map jose errors to AppError("Invalid or expired token", 401).',
    project: 'auth-service',
    tags: ['jwt', 'auth', 'node'],
    date: '2026-11-17',
    timespentMinutes: 30,
  },
  // 18. Bug
  {
    title: 'Turborepo cache miss on identical builds',
    type: 'bug' as const,
    whatHappened:
      'turbo build was rebuilding api package every time despite no code changes',
    fixTakeaway:
      'Add outputs: ["dist/**"] in turbo.json so turbo tracks compiled artifacts in its hash.',
    project: 'dev-log',
    tags: ['turborepo', 'monorepo', 'build'],
    date: '2026-11-18',
    timespentMinutes: 55,
  },
  // 19. Config
  {
    title: 'PostgreSQL container port conflict on 5432 with Windows service',
    type: 'config' as const,
    errorMsg: 'password authentication failed for user "postgres"',
    whatHappened:
      'Local Windows PostgreSQL service was intercepting connections intended for Docker',
    fixTakeaway:
      'Map Docker host port to 5433:5432 in docker-compose.yml to avoid host service collisions.',
    project: 'dev-log',
    tags: ['docker', 'postgres', 'windows'],
    date: '2026-11-19',
    timespentMinutes: 50,
  },
  // 20. Discovery
  {
    title:
      'Single-source-of-truth types with Drizzle $inferSelect and $inferInsert',
    type: 'discovery' as const,
    whatHappened:
      'Manual TypeScript interfaces drifted when new columns were added to schema',
    fixTakeaway:
      'Export typeof table.$inferSelect and $inferInsert directly from schema to eliminate duplicate interfaces.',
    project: 'dev-log',
    tags: ['typescript', 'drizzle', 'database'],
    date: '2026-11-20',
    timespentMinutes: 20,
  },
];

async function seed() {
  logger.info('Starting database seed...');

  // 1. Find or create demo user
  let [demoUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  if (!demoUser) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const [created] = await db
      .insert(users)
      .values({
        username: 'demo',
        email: DEMO_EMAIL,
        passwordHash,
      })
      .returning({ id: users.id });
    demoUser = created;
    logger.info(`Created demo user: ${DEMO_EMAIL}`);
  } else {
    logger.info(`Found demo user: ${DEMO_EMAIL}`);
  }

  const userId = demoUser.id;

  // 2. Clear previous logs for demo user (makes seed rerunnable)
  await db.delete(logs).where(eq(logs.userId, userId));
  logger.info('Cleared existing demo logs');

  // 3. Seed the 20 logs with find-or-create projects & tags
  for (const item of SEED_LOGS) {
    // Project find-or-create
    let projectId: number | null = null;
    if (item.project) {
      const [p] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.userId, userId),
            sql`lower(${projects.name}) = lower(${item.project})`,
          ),
        )
        .limit(1);

      if (p) {
        projectId = p.id;
      } else {
        const [newP] = await db
          .insert(projects)
          .values({ userId, name: item.project })
          .returning({ id: projects.id });
        projectId = newP.id;
      }
    }

    // Insert log
    const [newLog] = await db
      .insert(logs)
      .values({
        userId,
        projectId,
        title: item.title,
        type: item.type,
        errorMsg: item.errorMsg || null,
        whatHappened: item.whatHappened || null,
        fixTakeaway: item.fixTakeaway,
        date: item.date,
        timespentMinutes: item.timespentMinutes,
      })
      .returning({ id: logs.id });

    // Tags find-or-create and junction link
    for (const tagName of item.tags) {
      const [t] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(
          and(
            eq(tags.userId, userId),
            sql`lower(${tags.name}) = lower(${tagName})`,
          ),
        )
        .limit(1);

      let tagId: number;
      if (t) {
        tagId = t.id;
      } else {
        const [newT] = await db
          .insert(tags)
          .values({ userId, name: tagName })
          .returning({ id: tags.id });
        tagId = newT.id;
      }

      await db.insert(logsTags).values({
        logId: newLog.id,
        tagId,
        userId,
      });
    }
  }

  logger.info(`Seeded ${SEED_LOGS.length} realistic logs successfully!`);
}

seed()
  .catch((err) => {
    logger.error({ err }, 'Seeding falied');
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    process.exit(0);
  });
