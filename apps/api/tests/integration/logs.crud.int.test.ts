import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/app.js';
import { db } from '../../src/config/drizzle.js';
import { projects } from '../../src/db/schema.js';
import * as logService from '../../src/services/logs.js';
import { cleanTestDb, setupTestDb, teardownTestDb } from '../helpers/db.js';
import { createAndLoginUser } from '../helpers/auth.js';
import { buildLogPayload, createLogViaApi } from '../helpers/factories.js';

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

describe('Logs CRUD, Stats, Ownership, and Transactions', () => {
  it('requires authentication on all log, stats, projects, and tags routes', async () => {
    const endpoints = [
      request(app).get('/api/v1/logs'),
      request(app).post('/api/v1/logs').send(buildLogPayload()),
      request(app).get('/api/v1/logs/1'),
      request(app).patch('/api/v1/logs/1').send({ title: 'Updated' }),
      request(app).delete('/api/v1/logs/1'),
      request(app).get('/api/v1/stats'),
      request(app).get('/api/v1/projects'),
      request(app).get('/api/v1/tags'),
    ];

    const responses = await Promise.all(endpoints);
    for (const res of responses) {
      expect(res.status).toBe(401);
    }
  });

  it('creates, reads, updates, and deletes a log, and updates stats', async () => {
    const { accessToken } = await createAndLoginUser(app);

    // Create
    const createRes = await request(app)
      .post('/api/v1/logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        buildLogPayload({
          title: 'Docker ECONNREFUSED',
          type: 'error',
          timespentMinutes: 45,
          project: 'dev-log',
          tags: ['docker', 'postgres'],
        }),
      );

    expect(createRes.status).toBe(201);
    const created = createRes.body.data.log;
    expect(created.title).toBe('Docker ECONNREFUSED');
    expect(created.project).toBe('dev-log');
    expect(created.tags).toEqual(
      expect.arrayContaining(['docker', 'postgres']),
    );

    // Read by ID
    const getRes = await request(app)
      .get(`/api/v1/logs/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.log.id).toBe(created.id);

    // Stats
    const statsRes = await request(app)
      .get('/api/v1/stats')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats).toEqual({
      totalLogs: 1,
      totalTimespentMinutes: 45,
    });

    // Update
    const patchRes = await request(app)
      .patch(`/api/v1/logs/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Docker ECONNREFUSED fixed',
        timespentMinutes: 60,
        tags: ['docker'],
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.log.title).toBe('Docker ECONNREFUSED fixed');
    expect(patchRes.body.data.log.tags).toEqual(['docker']);

    // Delete
    const delRes = await request(app)
      .delete(`/api/v1/logs/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delRes.status).toBe(200);

    // Read deleted -> 404
    const missingRes = await request(app)
      .get(`/api/v1/logs/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(missingRes.status).toBe(404);
  });

  it('returns 400 on validation errors and 404 on missing log', async () => {
    const { accessToken } = await createAndLoginUser(app);

    const badCreate = await request(app)
      .post('/api/v1/logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '', type: 'invalid', timespentMinutes: -5 });
    expect(badCreate.status).toBe(400);

    const missingGet = await request(app)
      .get('/api/v1/logs/999999')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(missingGet.status).toBe(404);
  });

  it('enforces ownership: user A cannot read, update, or delete user B logs', async () => {
    const userA = await createAndLoginUser(app);
    const userB = await createAndLoginUser(app);

    const logB = await createLogViaApi(app, userB.accessToken, {
      title: 'User B secret log',
    });

    const listA = await request(app)
      .get('/api/v1/logs')
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(0);

    const readRes = await request(app)
      .get(`/api/v1/logs/${logB.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(readRes.status).toBe(404);

    const patchRes = await request(app)
      .patch(`/api/v1/logs/${logB.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ title: 'Hacked' });
    expect(patchRes.status).toBe(404);

    const delRes = await request(app)
      .delete(`/api/v1/logs/${logB.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(delRes.status).toBe(404);
  });

  it('find-or-creates projects and tags case-insensitively', async () => {
    const { accessToken } = await createAndLoginUser(app);

    await createLogViaApi(app, accessToken, {
      project: 'Dev-Log',
      tags: ['Postgres', 'Docker'],
    });
    await createLogViaApi(app, accessToken, {
      project: 'dev-log',
      tags: ['postgres', 'REDIS'],
    });

    const projRes = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(projRes.status).toBe(200);
    expect(projRes.body.data).toHaveLength(1);
    expect(projRes.body.data[0].name).toBe('Dev-Log');

    const tagsRes = await request(app)
      .get('/api/v1/tags')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.body.data).toHaveLength(3);
  });

  it('rolls back project insert when log insert fails inside transaction', async () => {
    const { user } = await createAndLoginUser(app);

    await expect(
      logService.createLog(user.id, {
        title: 'Should roll back',
        type: 'bug',
        fixTakeaway: 'Never persisted',
        date: '2026-11-01',
        timespentMinutes: -10, // violates DB check constraint logs_timespent_positive
        project: 'rollback-project',
        tags: ['rollback-tag'],
      }),
    ).rejects.toThrow();

    const leftoverProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id));
    expect(leftoverProjects).toHaveLength(0);
  });
});
