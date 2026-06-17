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
