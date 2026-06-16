import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, findOpenCollectionByOrganizer } from '@eilon-shai/venture-core/db';
import { getResendClient, sendEmail } from '@eilon-shai/venture-core/email';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getConfig } from '@/lib/registry';

// POST /api/collection/resend-link { email, occasion }
// Re-sends the private manage link to the organizer's email (the secure way back
// to an existing collection — we never expose the admin token on screen). Always
// returns a generic ok so it can't be used to probe which emails exist.

export const maxDuration = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function appBase(domain: string): string {
  return domain.startsWith('http') ? domain.replace(/\/$/, '') : `https://${domain}`;
}

export async function POST(req: NextRequest) {
  let body: { email?: string; occasion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const occasion = (body.occasion ?? '').trim();
  const config = getConfig(occasion);
  const cc = config?.collectionConfig;

  // Generic success regardless of outcome (no existence oracle).
  if (!EMAIL_RE.test(email) || !config || !cc) {
    return NextResponse.json({ ok: true });
  }

  // Rate limit: at most one resend per email+occasion per hour.
  try {
    const redis = getRedisClient();
    if (redis) {
      const key = `${config.brand.redisKeyPrefix}:resend:${occasion}:${email}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 3600);
      if (n > 1) return NextResponse.json({ ok: true }); // already sent within the hour
    }
  } catch {
    /* non-fatal — proceed */
  }

  try {
    const db = getDbClient();
    if (db) {
      const existing = await findOpenCollectionByOrganizer(db, config.brand.paddleProductId, email);
      if (existing && process.env.DISABLE_EMAIL !== 'true') {
        const adminUrl = `${appBase(config.brand.domain)}/collect/manage?t=${existing.adminToken}`;
        const payload = cc.buildAdminLinkEmail({ to: existing.organizerEmail, honoreeName: existing.honoreeName, adminUrl });
        await sendEmail(getResendClient(), payload);
      }
    }
  } catch (err) {
    console.error('[resend-link] error (non-fatal):', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
