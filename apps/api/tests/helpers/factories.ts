import request from 'supertest';
import type { Application } from 'express';

let logCounter = 0;

export interface LogFactoryInput {
  title?: string;
  type?: 'bug' | 'error' | 'config' | 'discovery';
  errorMsg?: string | null;
  whatHappened?: string | null;
  fixTakeaway?: string;
  link?: string | null;
  date?: string;
  timespentMinutes?: number;
  project?: string | null;
  tags?: string[];
}

export function buildLogPayload(overrides: LogFactoryInput = {}) {
  logCounter += 1;
  return {
    title: overrides.title ?? `Test log issue #${logCounter}`,
    type: overrides.type ?? 'bug',
    errorMsg:
      overrides.errorMsg !== undefined
        ? overrides.errorMsg
        : `ERR_TEST_${logCounter}`,
    whatHappened:
      overrides.whatHappened !== undefined
        ? overrides.whatHappened
        : 'Something broke during testing',
    fixTakeaway: overrides.fixTakeaway ?? `Fixed issue #${logCounter}`,
    link: overrides.link !== undefined ? overrides.link : null,
    date: overrides.date ?? '2026-11-01',
    timespentMinutes: overrides.timespentMinutes ?? 30,
    project: overrides.project !== undefined ? overrides.project : 'dev-log',
    tags: overrides.tags ?? ['node', 'testing'],
  };
}

export async function createLogViaApi(
  app: Application,
  accessToken: string,
  overrides: LogFactoryInput = {},
) {
  const payload = buildLogPayload(overrides);
  const res = await request(app)
    .post('/api/v1/logs')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload);

  if (res.status !== 201) {
    throw new Error(
      `Failed to create test log (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  return res.body.data.log;
}
