import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// First-party, cookieless funnel counters (landing → start → create).
//
// Clarity/GA4 are consent-gated, so paid-ad funnel visibility dies at the
// banner. These are pure AGGREGATE daily counters in the existing Upstash
// Redis: no cookies, no user identifiers, no IP, no PII — a key holds only an
// integer count per (day, occasion, step). That keeps them consent-independent
// by construction and inside DEC-P-005 (coordination/aggregate keys only;
// never per-user data).
//
// Key shape: wtm:metrics:{YYYY-MM-DD}:{occasion}:{step}
// (`wtm:` matches the global app-level Redis prefix used by the audio route;
// these counters are cross-occasion aggregates, not per-occasion isolation
// keys, so they don't use brand.redisKeyPrefix.)
//
// Fail-SILENT: a Redis outage must never break a page view or a create.
// Counters are best-effort telemetry, not a gate.
// ---------------------------------------------------------------------------

export type FunnelStep = 'landing' | 'start' | 'create';

export const FUNNEL_STEPS: readonly FunnelStep[] = ['landing', 'start', 'create'] as const;

/** ~90 days — long enough to compare month-over-month, short enough to self-clean. */
const TTL_SEC = 90 * 86400;

/** UTC calendar day, YYYY-MM-DD. UTC (not server-local) so keys are stable across regions. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function funnelKey(date: string, occasion: string, step: FunnelStep): string {
  return `wtm:metrics:${date}:${occasion}:${step}`;
}

/** Increment today's counter for (occasion, step). Never throws. */
export async function bumpFunnel(occasion: string, step: FunnelStep): Promise<void> {
  let redis: ReturnType<typeof getRedisClient>;
  try {
    redis = getRedisClient();
  } catch {
    return;
  }
  if (!redis) return;
  try {
    const key = funnelKey(utcDay(), occasion, step);
    await redis.incr(key);
    // Refresh the TTL on every increment (same self-heal as rate-limit.ts: an
    // INCR-succeeded-but-EXPIRE-failed race must not leave an immortal key).
    // The date is in the key, so this converges to "90 days after the day ends".
    await redis.expire(key, TTL_SEC);
  } catch {
    /* non-fatal — telemetry only */
  }
}

export type DailyFunnel = Record<string, Record<string, Record<FunnelStep, number>>>;

/**
 * Read the last `days` days of counters for every registered occasion.
 * Returns {date: {occasion: {landing, start, create}}} (zeros where no key).
 * Never throws — a Redis outage returns zeroed counters.
 */
export async function readFunnel(days: number): Promise<DailyFunnel> {
  const slugs = OCCASIONS.map((o) => o.slug);
  const dates: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    dates.push(utcDay(new Date(now - i * 86400_000)));
  }

  const result: DailyFunnel = {};
  for (const date of dates) {
    result[date] = {};
    for (const slug of slugs) {
      result[date][slug] = { landing: 0, start: 0, create: 0 };
    }
  }

  let redis: ReturnType<typeof getRedisClient>;
  try {
    redis = getRedisClient();
  } catch {
    return result;
  }
  if (!redis) return result;

  const keys: string[] = [];
  for (const date of dates) {
    for (const slug of slugs) {
      for (const step of FUNNEL_STEPS) {
        keys.push(funnelKey(date, slug, step));
      }
    }
  }

  try {
    const values = await redis.mget<(number | string | null)[]>(...keys);
    let i = 0;
    for (const date of dates) {
      for (const slug of slugs) {
        for (const step of FUNNEL_STEPS) {
          const v = values[i++];
          result[date][slug][step] = v == null ? 0 : Number(v) || 0;
        }
      }
    }
  } catch {
    /* non-fatal — return zeroed counters */
  }
  return result;
}
