import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks, fakeRedis } from '../helpers/mocks';
import { resetStore } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as create } from '@/app/api/[occasion]/collection/create/route';

const params = (occasion: string) => ({ params: Promise.resolve({ occasion }) });
const body = (email: string) => ({ organizerEmail: email, honoreeName: 'X' });

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
  // The rate-limit guard is bypassed under mock payment (E2E). Turn it ON for
  // these tests; the global setup defaults it to 'true'.
  process.env.ENABLE_MOCK_PAYMENT = 'false';
});
afterEach(() => {
  process.env.ENABLE_MOCK_PAYMENT = 'true';
});

describe('collection create — anti-abuse rate limiting', () => {
  it('allows the per-email hourly quota (3) then 429s the next attempt', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await create(makeRequest(body('abuser@example.com')), params('memorial'));
      expect(res.status).toBe(200);
    }
    const blocked = await create(makeRequest(body('abuser@example.com')), params('memorial'));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).code).toBe('RATE_LIMIT');
  });

  it('limits per-email — a different address is not blocked by another’s quota', async () => {
    for (let i = 0; i < 4; i++) {
      await create(makeRequest(body('a@example.com')), params('memorial'));
    }
    // a@ is now throttled; b@ is independent and still allowed.
    const other = await create(makeRequest(body('b@example.com')), params('memorial'));
    expect(other.status).toBe(200);
  });

  it('does NOT apply the per-email cap when no email is present (only the looser per-IP cap)', async () => {
    // 7 > the per-email day cap (6): if the email rules were (wrongly) applied to
    // an empty email they'd 429 here. They're skipped; only per-IP (10/hr) runs,
    // so all 7 pass the limiter. (The real core handler 400s a missing email; the
    // mock acks 200 — the point here is the limiter never returns 429.)
    for (let i = 0; i < 7; i++) {
      const res = await create(makeRequest({ honoreeName: 'X' }), params('memorial'));
      expect(res.status).not.toBe(429);
    }
  });

  it('still enforces the per-IP cap even with no/garbage email (bot spamming the 400 path)', async () => {
    // ipHour = 10: the 11th attempt from one IP is blocked regardless of email.
    let blocked = false;
    for (let i = 0; i < 12; i++) {
      const res = await create(makeRequest({ honoreeName: 'X' }), params('memorial'));
      if (res.status === 429) blocked = true;
    }
    expect(blocked).toBe(true);
  });

  it('fails open when Redis errors — creation is never blocked', async () => {
    const spy = vi.spyOn(fakeRedis, 'incr').mockRejectedValue(new Error('redis down'));
    // Well past every cap, but each rule errors and is skipped → always allowed.
    for (let i = 0; i < 8; i++) {
      const res = await create(makeRequest(body('whoever@example.com')), params('memorial'));
      expect(res.status).toBe(200);
    }
    spy.mockRestore();
  });

  it('is bypassed under mock payment (E2E happy paths are never throttled)', async () => {
    process.env.ENABLE_MOCK_PAYMENT = 'true';
    for (let i = 0; i < 8; i++) {
      const res = await create(makeRequest(body('e2e@example.com')), params('memorial'));
      expect(res.status).toBe(200);
    }
  });
});
