import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for the fixed-window rate-limit helpers (SES-047 §7 [QA]).
//
// getRedisClient is mocked at the module boundary so we can drive both the
// "client present" path and the fail-OPEN "no client" path. The factory returns
// a mutable holder so individual tests can swap in null or a throwing client.
// ---------------------------------------------------------------------------

interface FakeClient {
  incr: (key: string) => Promise<number>;
  expire: (key: string, sec: number) => Promise<number>;
}

const redisState: { client: FakeClient | null; throwOnGet: boolean } = {
  client: null,
  throwOnGet: false,
};

vi.mock('@eilon-shai/venture-core/redis', () => ({
  getRedisClient: () => {
    if (redisState.throwOnGet) throw new Error('redis init failed');
    return redisState.client;
  },
}));

import { hashForKey, clientIp, checkRateLimits } from './rate-limit';

function makeCounter(): FakeClient {
  const counts = new Map<string, number>();
  return {
    async incr(key: string) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    async expire() {
      return 1;
    },
  };
}

beforeEach(() => {
  redisState.client = null;
  redisState.throwOnGet = false;
});

describe('hashForKey', () => {
  it('is stable for the same input', () => {
    expect(hashForKey('person@example.com')).toBe(hashForKey('person@example.com'));
  });

  it('lowercases and trims before hashing (same hash regardless of case/whitespace)', () => {
    const base = hashForKey('person@example.com');
    expect(hashForKey('  Person@Example.COM  ')).toBe(base);
    expect(hashForKey('PERSON@EXAMPLE.COM')).toBe(base);
  });

  it('never returns the raw email (no PII in the key)', () => {
    const raw = 'person@example.com';
    const hashed = hashForKey(raw);
    expect(hashed).not.toBe(raw);
    expect(hashed).not.toContain('person');
    expect(hashed).not.toContain('@');
    expect(hashed).toMatch(/^[0-9a-f]{24}$/); // 24 hex chars, no PII
  });

  it('produces different hashes for different inputs', () => {
    expect(hashForKey('a@example.com')).not.toBe(hashForKey('b@example.com'));
  });
});

describe('clientIp', () => {
  it('prefers x-real-ip over everything', () => {
    const h = new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2, 3.3.3.3' });
    expect(clientIp(h)).toBe('1.1.1.1');
  });

  it('falls back to the first hop of x-forwarded-for when x-real-ip is absent', () => {
    const h = new Headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' });
    expect(clientIp(h)).toBe('2.2.2.2');
  });

  it('trims whitespace around the first forwarded hop', () => {
    const h = new Headers({ 'x-forwarded-for': '  4.4.4.4 , 5.5.5.5' });
    expect(clientIp(h)).toBe('4.4.4.4');
  });

  it("returns 'anonymous' when no proxy headers are present", () => {
    expect(clientIp(new Headers())).toBe('anonymous');
  });
});

describe('checkRateLimits', () => {
  it('fails OPEN (ok:true) when getRedisClient() returns null', async () => {
    redisState.client = null;
    const res = await checkRateLimits([{ key: 'k', limit: 1, windowSec: 60 }]);
    expect(res.ok).toBe(true);
  });

  it('fails OPEN (ok:true) when getRedisClient() throws', async () => {
    redisState.throwOnGet = true;
    const res = await checkRateLimits([{ key: 'k', limit: 0, windowSec: 60 }]);
    expect(res.ok).toBe(true);
  });

  it('allows while under the limit and blocks once a rule is exceeded', async () => {
    redisState.client = makeCounter();
    const rule = { key: 'bucket', limit: 2, windowSec: 60 };
    expect((await checkRateLimits([rule])).ok).toBe(true); // 1
    expect((await checkRateLimits([rule])).ok).toBe(true); // 2
    expect((await checkRateLimits([rule])).ok).toBe(false); // 3 > 2
  });

  it('blocks when ANY rule in the set is exceeded (independent buckets)', async () => {
    redisState.client = makeCounter();
    // 'tight' trips after 1; 'loose' has plenty of room — the set must still block.
    await checkRateLimits([{ key: 'tight', limit: 1, windowSec: 60 }]);
    const res = await checkRateLimits([
      { key: 'tight', limit: 1, windowSec: 60 },
      { key: 'loose', limit: 100, windowSec: 60 },
    ]);
    expect(res.ok).toBe(false);
  });
});
