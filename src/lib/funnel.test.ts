import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for the first-party funnel counters. getRedisClient is mocked at
// the module boundary (same holder pattern as rate-limit.test.ts) so we can
// drive the counting path AND every fail-silent path — the module's contract
// is that a Redis outage never throws out of bumpFunnel/readFunnel.
// ---------------------------------------------------------------------------

interface FakeRedis {
  incr: (key: string) => Promise<number>;
  expire: (key: string, sec: number) => Promise<number>;
  mget: (...keys: string[]) => Promise<(number | string | null)[]>;
}

const redisState: { client: FakeRedis | null; throwOnGet: boolean } = {
  client: null,
  throwOnGet: false,
};

vi.mock('@eilon-shai/venture-core/redis', () => ({
  getRedisClient: () => {
    if (redisState.throwOnGet) throw new Error('redis init failed');
    return redisState.client;
  },
}));

import {
  bumpFunnel,
  readFunnel,
  summarizeFunnel,
  funnelKey,
  utcDay,
  FUNNEL_STEPS,
} from './funnel';
import { OCCASIONS } from '@/lib/registry';

function makeStore() {
  const counts = new Map<string, number>();
  const expires = new Map<string, number>();
  const client: FakeRedis = {
    async incr(key) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    async expire(key, sec) {
      expires.set(key, sec);
      return 1;
    },
    async mget(...keys) {
      return keys.map((k) => counts.get(k) ?? null);
    },
  };
  return { counts, expires, client };
}

beforeEach(() => {
  redisState.client = null;
  redisState.throwOnGet = false;
});

describe('funnelKey / utcDay', () => {
  it('builds the documented key shape wtm:metrics:{date}:{occasion}:{step}', () => {
    expect(funnelKey('2026-07-02', 'memorial', 'landing')).toBe(
      'wtm:metrics:2026-07-02:memorial:landing',
    );
  });

  it('utcDay is a UTC YYYY-MM-DD', () => {
    expect(utcDay(new Date('2026-07-02T23:59:59.999Z'))).toBe('2026-07-02');
    expect(utcDay(new Date('2026-07-03T00:00:00.000Z'))).toBe('2026-07-03');
  });
});

describe('bumpFunnel', () => {
  it("increments today's key and sets the ~90-day TTL", async () => {
    const store = makeStore();
    redisState.client = store.client;
    await bumpFunnel('memorial', 'landing');
    const key = funnelKey(utcDay(), 'memorial', 'landing');
    expect(store.counts.get(key)).toBe(1);
    expect(store.expires.get(key)).toBe(90 * 86400);
    await bumpFunnel('memorial', 'landing');
    expect(store.counts.get(key)).toBe(2);
  });

  it('is silent when getRedisClient() returns null', async () => {
    redisState.client = null;
    await expect(bumpFunnel('memorial', 'start')).resolves.toBeUndefined();
  });

  it('is silent when getRedisClient() throws', async () => {
    redisState.throwOnGet = true;
    await expect(bumpFunnel('memorial', 'create')).resolves.toBeUndefined();
  });

  it('is silent when incr throws', async () => {
    redisState.client = {
      async incr() {
        throw new Error('down');
      },
      async expire() {
        return 1;
      },
      async mget() {
        return [];
      },
    };
    await expect(bumpFunnel('memorial', 'landing')).resolves.toBeUndefined();
  });
});

describe('readFunnel', () => {
  it('returns {date: {occasion: {landing, start, create}}} for every registered occasion', async () => {
    const store = makeStore();
    redisState.client = store.client;
    await bumpFunnel('memorial', 'landing');
    await bumpFunnel('memorial', 'landing');
    await bumpFunnel('memorial', 'start');
    await bumpFunnel('wedding', 'create');

    const days = await readFunnel(3);
    const dates = Object.keys(days);
    expect(dates).toHaveLength(3);
    const today = utcDay();
    expect(dates[dates.length - 1]).toBe(today); // oldest → newest
    expect(days[today].memorial).toEqual({ landing: 2, start: 1, create: 0 });
    expect(days[today].wedding).toEqual({ landing: 0, start: 0, create: 1 });
    // Every registered occasion is present with zeroed steps.
    for (const o of OCCASIONS) {
      expect(days[today][o.slug]).toBeDefined();
      for (const step of FUNNEL_STEPS) {
        expect(typeof days[today][o.slug][step]).toBe('number');
      }
    }
  });

  it('returns zeroed counters when Redis is unavailable', async () => {
    redisState.throwOnGet = true;
    const days = await readFunnel(2);
    expect(Object.keys(days)).toHaveLength(2);
    for (const perOccasion of Object.values(days)) {
      for (const counts of Object.values(perOccasion)) {
        expect(counts).toEqual({ landing: 0, start: 0, create: 0 });
      }
    }
  });

  it('returns zeroed counters when mget throws', async () => {
    const store = makeStore();
    redisState.client = { ...store.client, mget: async () => Promise.reject(new Error('down')) };
    const days = await readFunnel(1);
    expect(days[utcDay()].memorial).toEqual({ landing: 0, start: 0, create: 0 });
  });
});

describe('summarizeFunnel', () => {
  it('rolls up per-occasion + overall totals with landing→start / start→create rates', async () => {
    const store = makeStore();
    redisState.client = store.client;
    // memorial: 4 landing, 1 start, 0 create
    for (let i = 0; i < 4; i++) await bumpFunnel('memorial', 'landing');
    await bumpFunnel('memorial', 'start');
    // wedding: 1 landing, 0 start
    await bumpFunnel('wedding', 'landing');

    const s = await summarizeFunnel(3);
    expect(s.windowDays).toBe(3);
    expect(s.byOccasion.memorial).toEqual({
      landing: 4,
      start: 1,
      create: 0,
      landingToStart: 0.25,
      startToCreate: 0, // 1 start, 0 creates → 0 (denominator is non-zero)
    });
    // wedding has 1 landing, 0 starts → startToCreate divides by zero → null.
    expect(s.byOccasion.wedding.landingToStart).toBe(0);
    expect(s.byOccasion.wedding.startToCreate).toBeNull();
    expect(s.overall.landing).toBe(5);
    expect(s.overall.start).toBe(1);
    expect(s.overall.create).toBe(0);
    expect(s.overall.landingToStart).toBe(0.2);
    expect(s.overall.startToCreate).toBe(0);
    // The raw daily breakdown is carried through for callers that want it.
    expect(s.days[utcDay()].memorial.landing).toBe(4);
  });

  it('is all-zero (not thrown) when Redis is unavailable', async () => {
    redisState.throwOnGet = true;
    const s = await summarizeFunnel(2);
    expect(s.overall).toEqual({
      landing: 0,
      start: 0,
      create: 0,
      landingToStart: null,
      startToCreate: null,
    });
  });
});
