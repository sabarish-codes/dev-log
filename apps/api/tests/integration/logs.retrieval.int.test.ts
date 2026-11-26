import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cleanTestDb, setupTestDb, teardownTestDb } from '../helpers/db.js';
import { createAndLoginUser } from '../helpers/auth.js';
import { createLogViaApi } from '../helpers/factories.js';

const app = createApp();

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('Logs Retrieval: search, filter, sort, pagination', () => {
  async function seedRetrievalLogs(accessToken: string) {
    await createLogViaApi(app, accessToken, {
      title: 'Docker container port 5432 refused',
      type: 'error',
      errorMsg: 'ECONNREFUSED 127.0.0.1:5432',
      whatHappened: 'Postgres running on host',
      fixTakeaway: 'Use host.docker.internal',
      project: 'dev-log',
      tags: ['docker', 'postgres'],
      date: '2026-09-01',
    });

    await createLogViaApi(app, accessToken, {
      title: '100% CPU spike in worker_pool',
      type: 'bug',
      errorMsg: 'worker_pool timeout',
      whatHappened: 'Infinite retry loop',
      fixTakeaway: 'Add exponential backoff',
      project: 'auth-service',
      tags: ['redis', 'node'],
      date: '2026-10-15',
    });

    await createLogViaApi(app, accessToken, {
      title: 'CORS cookie blocked in staging',
      type: 'config',
      errorMsg: 'SameSite=Strict rejected',
      whatHappened: 'Cross-origin request dropped cookie',
      fixTakeaway: 'Set SameSite=Lax',
      project: 'dev-log',
      tags: ['auth', 'docker'],
      date: '2026-11-10',
    });
  }

  it('supports multi-word, partial, and literal % / _ search', async () => {
    const { accessToken } = await createAndLoginUser(app);
    await seedRetrievalLogs(accessToken);

    // Multi-word across fields (title + fixTakeaway)
    const multiRes = await request(app)
      .get('/api/v1/logs?q=docker+backoff')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(multiRes.status).toBe(200);
    expect(multiRes.body.data).toHaveLength(0);

    const matchMulti = await request(app)
      .get('/api/v1/logs?q=docker+5432')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(matchMulti.body.data).toHaveLength(1);
    expect(matchMulti.body.data[0].title).toContain('Docker container');

    // Partial match
    const partialRes = await request(app)
      .get('/api/v1/logs?q=backo')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(partialRes.body.data).toHaveLength(1);
    expect(partialRes.body.data[0].title).toContain('worker_pool');

    // Literal % and _ (must not act as SQL wildcards)
    const percentRes = await request(app)
      .get('/api/v1/logs')
      .query({ q: '100%' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(percentRes.body.data).toHaveLength(1);
    expect(percentRes.body.data[0].title).toContain('100%');

    const underscoreRes = await request(app)
      .get('/api/v1/logs')
      .query({ q: 'worker_pool' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(underscoreRes.body.data).toHaveLength(1);
    expect(underscoreRes.body.data[0].title).toContain('worker_pool');
  });

  it('filters by type, project, tags, date range, and combines with search', async () => {
    const { accessToken } = await createAndLoginUser(app);
    await seedRetrievalLogs(accessToken);

    const byType = await request(app)
      .get('/api/v1/logs?type=config')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(byType.body.data).toHaveLength(1);

    const byProject = await request(app)
      .get('/api/v1/logs?project=dev-log')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(byProject.body.data).toHaveLength(2);

    const byTags = await request(app)
      .get('/api/v1/logs?tags=postgres,redis')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(byTags.body.data).toHaveLength(2);

    const byDate = await request(app)
      .get('/api/v1/logs?from=2026-10-01&to=2026-10-31')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(byDate.body.data).toHaveLength(1);
    expect(byDate.body.data[0].project).toBe('auth-service');

    const combined = await request(app)
      .get('/api/v1/logs?project=dev-log&tags=docker&q=cookie')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(combined.body.data).toHaveLength(1);
    expect(combined.body.data[0].type).toBe('config');
  });

  it('sorts newest and oldest and paginates including past-the-end pages', async () => {
    const { accessToken } = await createAndLoginUser(app);
    await seedRetrievalLogs(accessToken);

    const newest = await request(app)
      .get('/api/v1/logs?sort=newest&page=1&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(newest.status).toBe(200);
    expect(newest.body.meta).toEqual({ total: 3, page: 1, limit: 2 });
    expect(newest.body.data).toHaveLength(2);
    expect(newest.body.data[0].date.slice(0, 10)).toBe('2026-11-10');

    const oldest = await request(app)
      .get('/api/v1/logs?sort=oldest&page=1&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(oldest.body.data[0].date.slice(0, 10)).toBe('2026-09-01');

    const page2 = await request(app)
      .get('/api/v1/logs?sort=newest&page=2&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toEqual({ total: 3, page: 2, limit: 2 });

    const pastEnd = await request(app)
      .get('/api/v1/logs?sort=newest&page=5&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(pastEnd.status).toBe(200);
    expect(pastEnd.body.data).toEqual([]);
    expect(pastEnd.body.meta).toEqual({ total: 3, page: 5, limit: 2 });
  });
});
