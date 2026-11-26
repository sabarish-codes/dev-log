import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cleanTestDb, setupTestDb, teardownTestDb } from '../helpers/db.js';
import { createAndLoginUser } from '../helpers/auth.js';

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

describe('Auth API integration', () => {
  it('registers a new user and returns accessToken + refreshToken cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      username: 'alice',
      email: 'Alice@Example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email case-insensitively with 409', async () => {
    await createAndLoginUser(app, { email: 'dup@test.dev' });

    const res = await request(app).post('/api/v1/auth/register').send({
      username: 'another',
      email: 'DUP@test.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials and rejects wrong password with 401', async () => {
    const { user, password } = await createAndLoginUser(app, {
      email: 'login@test.dev',
    });

    const okRes = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password,
    });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.accessToken).toEqual(expect.any(String));

    const badRes = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'WrongPassword!',
    });
    expect(badRes.status).toBe(401);
  });

  it('protects /api/v1/auth/me with and without a valid token', async () => {
    const { accessToken, user } = await createAndLoginUser(app);

    const noTokenRes = await request(app).get('/api/v1/auth/me');
    expect(noTokenRes.status).toBe(401);

    const badTokenRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(badTokenRes.status).toBe(401);

    const okRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.user.id).toBe(user.id);
  });

  it('rotates refresh token and invalidates it on logout', async () => {
    const { cookies } = await createAndLoginUser(app);

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toEqual(expect.any(String));

    const newCookies = refreshRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', newCookies);
    expect(logoutRes.status).toBe(200);

    const afterLogoutRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookies);
    expect(afterLogoutRes.status).toBe(401);
  });
});
