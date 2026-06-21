import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, findOpenCollectionByOrganizer } from '@eilon-shai/venture-core/db';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getConfig } from '@/lib/registry';

// POST /api/collection/check-existing { email, occasion } -> { exists: boolean }
// Lets the create form warn the organizer BEFORE they fill out the whole form
// that they already have an open collection for this occasion. Returns only a
// boolean (no tokens) — the secure path back in is the emailed manage link.
//
// Rate-limited per IP so it can't be abused as an email-existence oracle.
//
// THREAT MODEL (SES-047 §7 [LOW]) — accepted trade-off:
// This endpoint IS an email-membership oracle: a caller who knows an email +
// occasion learns whether an OPEN collection exists for it. We accept this
// because (a) the answer reveals only "has an open collection for occasion X",
// never the honoree, contents, or any token; (b) it's gated by the per-IP
// fixed-window limit above (20/hr), which bounds bulk enumeration; and (c) the
// UX win (warn the organizer before they re-create a duplicate) outweighs the
// thin leak. NOTE: the per-IP limiter FAILS OPEN under a Redis outage — if Redis
// is down the oracle is briefly unthrottled. This is deliberate (a cache hiccup
// must never block the legitimate pre-create check); the residual exposure during
// an outage is acceptable given (a)/(b). A future hardening (a per-email
// dimension) is deliberately left out here to keep the hot path simple.

export const maxDuration = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RL_MAX = 20; // checks per IP per hour
const RL_WINDOW = 3600;

// Lightweight per-IP fixed-window limit. Fails OPEN (redis down → allow) so a
// hiccup never blocks the legitimate pre-create check.
async function rateLimited(req: NextRequest): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'anonymous';
  try {
    const key = `wtm:check-existing:${ip}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, RL_WINDOW);
    return n > RL_MAX;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Under abuse, don't leak anything — just say "no".
  if (await rateLimited(req)) {
    return NextResponse.json({ exists: false });
  }

  let body: { email?: string; occasion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ exists: false });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const config = getConfig((body.occasion ?? '').trim());
  if (!EMAIL_RE.test(email) || !config?.collectionConfig) {
    return NextResponse.json({ exists: false });
  }

  try {
    const db = getDbClient();
    if (db) {
      const existing = await findOpenCollectionByOrganizer(db, config.brand.paddleProductId, email);
      return NextResponse.json({ exists: !!existing });
    }
  } catch (err) {
    console.error('[check-existing] error (non-fatal):', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ exists: false });
}
