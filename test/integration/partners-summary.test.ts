import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// /api/partners/summary — the CRON_SECRET-gated per-partner referral report.
// Auth mirrors the cron routes (same bearer pattern, fail-closed in prod);
// the DB is mocked at the module boundary with canned aggregate rows.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  queryThrows: false,
  dbNull: false,
}));

vi.mock('@eilon-shai/venture-core/db', () => ({
  getDbClient: () =>
    h.dbNull
      ? null
      : {
          query: async () => {
            if (h.queryThrows) throw new Error('db down');
            return h.rows;
          },
        },
}));

import { GET as summary } from '@/app/api/partners/summary/route';

function req(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/partners/summary', { method: 'GET', headers });
}

beforeEach(() => {
  h.rows = [];
  h.queryThrows = false;
  h.dbNull = false;
});

describe('partners/summary auth', () => {
  it('401s without a bearer token (CRON_SECRET is set in test env)', async () => {
    const res = await summary(req());
    expect(res.status).toBe(401);
  });

  it('401s with the wrong bearer token', async () => {
    const res = await summary(req({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('503s in production (VERCEL_ENV) when CRON_SECRET is unset', async () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevEnv = process.env.VERCEL_ENV;
    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = 'production';
    try {
      const res = await summary(req());
      expect(res.status).toBe(503);
    } finally {
      process.env.CRON_SECRET = prevSecret;
      if (prevEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevEnv;
    }
  });
});

describe('partners/summary report shape', () => {
  it('returns per-referrer rows and overall totals', async () => {
    h.rows = [
      {
        referrer: 'smith-funeral',
        collections: '5',
        generated: '2',
        paid: '3',
        first_created_at: '2026-06-01T00:00:00.000Z',
        last_created_at: '2026-07-01T00:00:00.000Z',
      },
      {
        referrer: 'valley-hospice',
        collections: '1',
        generated: '0',
        paid: '0',
        first_created_at: '2026-06-15T00:00:00.000Z',
        last_created_at: '2026-06-15T00:00:00.000Z',
      },
    ];
    const res = await summary(req({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.generatedAt).toEqual(expect.any(String));
    expect(body.totals).toEqual({ referrers: 2, collections: 6, generated: 2, paid: 3 });
    expect(body.referrers).toEqual([
      {
        referrer: 'smith-funeral',
        collections: 5,
        generated: 2,
        paid: 3,
        firstCreatedAt: '2026-06-01T00:00:00.000Z',
        lastCreatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        referrer: 'valley-hospice',
        collections: 1,
        generated: 0,
        paid: 0,
        firstCreatedAt: '2026-06-15T00:00:00.000Z',
        lastCreatedAt: '2026-06-15T00:00:00.000Z',
      },
    ]);
  });

  it('returns empty referrers + zero totals when nothing is attributed yet', async () => {
    const res = await summary(req({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals).toEqual({ referrers: 0, collections: 0, generated: 0, paid: 0 });
    expect(body.referrers).toEqual([]);
  });

  it('503s when the DB client is unavailable', async () => {
    h.dbNull = true;
    const res = await summary(req({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(503);
  });

  it('500s (retryable) on a query failure', async () => {
    h.queryThrows = true;
    const res = await summary(req({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(500);
    expect((await res.json()).retryable).toBe(true);
  });
});
