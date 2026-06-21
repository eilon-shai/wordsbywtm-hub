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
  it('503 in production (VERCEL_ENV) when CRON_SECRET is unset', async () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevEnv = process.env.VERCEL_ENV;
    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = 'production';
    try {
      const res = await purge(cronReq());
      expect(res.status).toBe(503);
    } finally {
      process.env.CRON_SECRET = prevSecret;
      if (prevEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevEnv;
    }
  });

  // SES-047 §7 [LOW]: prod detection keys off VERCEL_ENV, not NODE_ENV. On Vercel
  // NODE_ENV is 'production' for previews too — keying off it would wrongly fail
  // closed on previews where CRON_SECRET may be unset. With VERCEL_ENV='preview'
  // and no secret, the unauthenticated call must NOT 503 (it falls through).
  it('does NOT 503 on a preview deploy (NODE_ENV=production but VERCEL_ENV=preview) with no secret', async () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    delete process.env.CRON_SECRET;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'preview';
    try {
      const res = await purge(cronReq());
      expect(res.status).toBe(200); // secret unset + not prod → runs (db sentinel → purge ok)
    } finally {
      process.env.CRON_SECRET = prevSecret;
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNode;
      if (prevVercel === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
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
  it('runs the sweep once per LIVE occasion (all four)', async () => {
    const res = await deadlines(cronReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    expect([...sweepCalls].sort()).toEqual(
      [
        'pro_01kpjx66bdandnb91vvg5cw9jj', // wedding
        'pro_01kpnffw8f2ej2n0pwv2r5btap', // anniversary
        'pro_01kq7gphj79hmftt2pwj6rrad4', // retirement
        'pro_01kv1g5d6c4b3wcr74jswnnspa', // memorial
      ].sort(),
    );
  });

  it('propagates a 401/503 from a sub-call immediately', async () => {
    const res = await deadlines(cronReq({ 'x-force-status': '401', authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(401);
  });
});
