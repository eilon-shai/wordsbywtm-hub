import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { clientIp } from '@/lib/rate-limit';
import { getConfig, OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Support console — clear THIS machine's rate-limit keys.
//
// Scoped strictly to the caller's current IP: it deletes only the IP-keyed
// limiter buckets (create per-IP, check-existing, audio per-IP) for that one IP,
// across every live occasion prefix. It does NOT touch email-keyed buckets (not
// machine-scoped) or any other customer's keys. Deleting a counter can only
// REMOVE a throttle, never add one — so the worst case is permissive, never
// harmful. The only edge: a shared/NAT public IP would reset for everyone on it.
//
// Purpose: let the founder unblock their own machine during demos / preview work
// (preview and prod share one Upstash instance) without hand-clearing keys.
//
// SECURITY: behind the same middleware Basic-Auth as the rest of /api/support/*.
// ---------------------------------------------------------------------------

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!ip || ip === 'anonymous') {
    return NextResponse.json({ error: 'Could not determine your IP address.' }, { status: 400 });
  }

  const redis = getRedisClient();
  if (!redis) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  // Every IP-keyed limiter bucket for this exact IP. Per-occasion create keys
  // use the occasion's redisKeyPrefix; check-existing and audio are app-global.
  const prefixes = OCCASIONS.filter((o) => o.live)
    .map((o) => getConfig(o.slug)?.brand.redisKeyPrefix)
    .filter((p): p is string => !!p);

  const keys = [
    ...prefixes.flatMap((p) => [`${p}:create-ip:1h:${ip}`, `${p}:create-ip:1d:${ip}`]),
    `wtm:check-existing:${ip}`,
    `wtm:audio:1h:ip:${ip}`,
  ];

  try {
    // del returns the number of keys that actually existed and were removed.
    const cleared = await redis.del(...keys);
    return NextResponse.json({ ip, cleared, scanned: keys.length });
  } catch (err) {
    console.error('[support/clear-rate-limit] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Clear failed' }, { status: 500 });
  }
}
