import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Summary endpoint: reuses the cron CRON_SECRET bearer guard (fail-closed in
// prod, VERCEL_ENV-keyed) and rolls daily counters into totals + rates.
// readFunnel is mocked with a fixed two-day window so the math is exact.
// ---------------------------------------------------------------------------

const zero = { landing: 0, start: 0, create: 0 };
const fixedDays = {
  '2026-07-01': {
    memorial: { landing: 100, start: 20, create: 5 },
    wedding: { landing: 10, start: 0, create: 0 },
    retirement: { ...zero },
    anniversary: { ...zero },
  },
  '2026-07-02': {
    memorial: { landing: 100, start: 30, create: 5 },
    wedding: { ...zero },
    retirement: { ...zero },
    anniversary: { ...zero },
  },
};

vi.mock('@/lib/funnel', () => ({
  readFunnel: vi.fn(async () => fixedDays),
}));

import { GET as summary } from './route';

function summaryReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/metrics/summary', { method: 'GET', headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret';
});

describe('metrics/summary auth (same guard as cron routes)', () => {
  it('503 in production (VERCEL_ENV) when CRON_SECRET is unset', async () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevEnv = process.env.VERCEL_ENV;
    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = 'production';
    try {
      const res = await summary(summaryReq());
      expect(res.status).toBe(503);
    } finally {
      process.env.CRON_SECRET = prevSecret;
      if (prevEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevEnv;
    }
  });

  it('401 with a wrong or missing Bearer token', async () => {
    expect((await summary(summaryReq({ authorization: 'Bearer nope' }))).status).toBe(401);
    expect((await summary(summaryReq())).status).toBe(401);
  });
});

describe('metrics/summary payload', () => {
  it('returns days as {date: {occasion: {landing, start, create}}}', async () => {
    const res = await summary(summaryReq({ authorization: 'Bearer test-secret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.windowDays).toBe(14);
    expect(body.days).toEqual(fixedDays);
  });

  it('computes per-occasion and overall totals with landing→start and start→create rates', async () => {
    const res = await summary(summaryReq({ authorization: 'Bearer test-secret' }));
    const body = await res.json();
    // memorial: 200 landing, 50 start, 10 create → 0.25 and 0.2
    expect(body.totals.byOccasion.memorial).toEqual({
      landing: 200,
      start: 50,
      create: 10,
      landingToStart: 0.25,
      startToCreate: 0.2,
    });
    // wedding: 10 landing, 0 start → startToCreate has a zero denominator → null
    expect(body.totals.byOccasion.wedding.landingToStart).toBe(0);
    expect(body.totals.byOccasion.wedding.startToCreate).toBeNull();
    // overall: 210 landing, 50 start, 10 create
    expect(body.totals.overall.landing).toBe(210);
    expect(body.totals.overall.start).toBe(50);
    expect(body.totals.overall.create).toBe(10);
    expect(body.totals.overall.landingToStart).toBe(0.238);
    expect(body.totals.overall.startToCreate).toBe(0.2);
  });
});
