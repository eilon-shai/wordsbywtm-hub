import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes, sweepCalls } from '../helpers/api-fakes';
import { resetStore, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());

import { GET as purge } from '@/app/api/cron/purge/route';
import { GET as deadlines } from '@/app/api/cron/collection-deadlines/route';

function cronReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/x', { method: 'GET', headers });
}

beforeEach(() => {
  resetStore();
  resetApiFakes();
});

describe('cron/purge auth + failure modes', () => {
  it('503 in production when CRON_SECRET is unset', async () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevEnv = process.env.NODE_ENV;
    delete process.env.CRON_SECRET;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    try {
      const res = await purge(cronReq());
      expect(res.status).toBe(503);
    } finally {
      process.env.CRON_SECRET = prevSecret;
      (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    }
  });

  it('401 with a wrong/missing Bearer token', async () => {
    const wrong = await purge(cronReq({ authorization: 'Bearer nope' }));
    expect(wrong.status).toBe(401);
    const missing = await purge(cronReq());
    expect(missing.status).toBe(401);
  });

  it('200 with the correct Bearer token and purges', async () => {
    store.purgedCount = 7;
    const res = await purge(cronReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    expect((await res.json()).purged).toBe(7);
  });

  it('503 when the db client is null', async () => {
    store.dbNull = true;
    const res = await purge(cronReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(503);
  });

  it('500 when purgeExpired throws', async () => {
    store.purgeThrows = true;
    const res = await purge(cronReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(500);
  });
});

describe('cron/collection-deadlines', () => {
  it('runs the sweep once per LIVE occasion (only memorial is live)', async () => {
    const res = await deadlines(cronReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    expect(sweepCalls).toEqual(['pro_01kv1g5d6c4b3wcr74jswnnspa']);
  });

  it('propagates a 401/503 from a sub-call immediately', async () => {
    const res = await deadlines(cronReq({ 'x-force-status': '401', authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(401);
  });
});
