import request from 'supertest';
import type { Application } from 'express';

let userCounter = 0;

export interface TestUserResult {
  user: {
    id: number;
    username: string;
    email: string;
  };
  accessToken: string;
  cookies: string[];
  password: string;
}

export async function createAndLoginUser(
  app: Application,
  overrides: Partial<{
    username: string;
    email: string;
    password: string;
  }> = {},
): Promise<TestUserResult> {
  userCounter += 1;
  const payload = {
    username: overrides.username ?? `testuser${userCounter}`,
    email: overrides.email ?? `user${userCounter}@test.dev`,
    password: overrides.password ?? 'Password123!',
  };

  const res = await request(app).post('/api/v1/auth/register').send(payload);

  if (res.status !== 201) {
    throw new Error(
      `Failed to create test user (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  const rawCookies = res.headers['set-cookie'];
  const cookies = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : [];

  return {
    user: res.body.data.user,
    accessToken: res.body.data.accessToken,
    cookies,
    password: payload.password,
  };
}
