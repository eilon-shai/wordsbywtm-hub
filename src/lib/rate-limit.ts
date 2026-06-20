import { createHash } from 'crypto';
import { getRedisClient } from '@eilon-shai/venture-core/redis';

// ---------------------------------------------------------------------------
// Lightweight fixed-window rate limiting via Redis INCR + EXPIRE.
//
// Used to bound abuse of the endpoints that create rows OR send email on an
// unverified address's behalf (collection create) — the "one malicious actor
// creates thousands of collections / email-bombs a victim" vector. The
// venture-core create handler already limits per-IP; this adds the missing
// per-EMAIL dimension (an IP limit alone is defeated by IPv6 rotation).
//
// Fail-OPEN: any Redis error or a missing client allows the request. A cache
// outage must never block legitimate users from creating a collection — this
// is an abuse speed-bump, not an authz gate. (Matches the non-fatal Redis
// handling used elsewhere in the collection routes.)
// ---------------------------------------------------------------------------

export interface RateRule {
  /** Max allowed actions within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

/** Hash an email for use in a Redis key, so raw PII never lands in the store. */
export function hashForKey(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 24);
}

/** Read the best-effort client IP from the proxy headers (Vercel sets these). */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anonymous'
  );
}

/**
 * Check a set of fixed-window rules. Returns `{ ok: true }` if ALL rules are
 * under their limit, or `{ ok: false }` if any is exceeded. Blocked requests
 * still count toward the window (an abuser hammering a limit keeps it tripped).
 */
export async function checkRateLimits(
  rules: Array<{ key: string } & RateRule>,
): Promise<{ ok: boolean }> {
  let redis: ReturnType<typeof getRedisClient>;
  try {
    redis = getRedisClient();
  } catch {
    return { ok: true };
  }
  if (!redis) return { ok: true };

  let ok = true;
  for (const r of rules) {
    try {
      const n = await redis.incr(r.key);
      // Refresh the TTL on EVERY increment, not just the first. This self-heals
      // the INCR-succeeded-but-EXPIRE-failed race that would otherwise leave a
      // TTL-less key blocking the bucket forever (a fail-CLOSED bug in a module
      // that must fail open). The resulting expiry is "windowSec after the last
      // attempt" — stricter on a sustained abuser, and harmless to a real
      // organizer (the per-product create dedup already caps them well under it).
      await redis.expire(r.key, r.windowSec);
      if (n > r.limit) ok = false;
    } catch {
      /* non-fatal — this rule is skipped (fail-open) */
    }
  }
  return { ok };
}
