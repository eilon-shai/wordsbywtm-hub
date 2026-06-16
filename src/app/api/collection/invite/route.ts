import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { getResendClient, sendEmail } from '@eilon-shai/venture-core/email';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getConfig } from '@/lib/registry';

// Auxiliary route (not part of the core pay/generate set): the organizer can have
// us email an invite to up to N people on their behalf. Gated by the secret
// admin token (only the owner has it) + a per-collection cap to prevent the
// endpoint from becoming an open email relay. WhatsApp can't be auto-sent (Meta
// only allows that via the paid Business API) — the UI handles WhatsApp as a
// per-person pre-filled link.

export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_REQUEST = 3; // free plan
const MAX_TOTAL_PER_COLLECTION = 12; // abuse backstop across all sends

function appBase(domain: string): string {
  return domain.replace(/\/$/, '');
}

function inviteEmailHtml(opts: {
  honoreeName: string;
  shareUrl: string;
  organizerName?: string;
  accent: string;
  recipientName?: string;
}): string {
  const greeting = opts.recipientName ? `Hi ${opts.recipientName},` : 'Hi,';
  const from = opts.organizerName ? `${opts.organizerName} is` : 'Someone is';
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a2118;line-height:1.6;">
    <p>${greeting}</p>
    <p>${from} putting together a tribute for <strong>${opts.honoreeName}</strong>, woven from memories shared by the people who knew them — and you’re invited to add yours.</p>
    <p>It takes about two minutes. No account, nothing to pay.</p>
    <p style="margin:28px 0;">
      <a href="${opts.shareUrl}" style="background:${opts.accent};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;">Add a memory of ${opts.honoreeName}</a>
    </p>
    <p style="font-size:13px;color:#8c7c68;">Or paste this link into your browser:<br>${opts.shareUrl}</p>
  </div>`;
}

export async function POST(req: NextRequest) {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    return NextResponse.json({ error: 'Invalid request', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  let body: {
    adminToken?: string;
    organizerName?: string;
    recipients?: Array<{ name?: string; email?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  const { adminToken, organizerName, recipients } = body;
  if (typeof adminToken !== 'string' || !adminToken) {
    return NextResponse.json({ error: 'Missing manage token', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  // De-dupe + validate emails, cap to the free-plan size.
  const seen = new Set<string>();
  const clean = (Array.isArray(recipients) ? recipients : [])
    .map((r) => ({ name: (r?.name ?? '').toString().trim().slice(0, 100), email: (r?.email ?? '').toString().trim().toLowerCase() }))
    .filter((r) => EMAIL_RE.test(r.email))
    .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
    .slice(0, MAX_PER_REQUEST);

  if (clean.length === 0) {
    return NextResponse.json({ error: 'Add at least one valid email address', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'Service unavailable', code: 'INVALID_SESSION', retryable: true }, { status: 503 });
  }

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  }
  if (collection.status !== 'open') {
    return NextResponse.json({ error: 'This collection is closed', code: 'COLLECTION_CLOSED', retryable: false }, { status: 409 });
  }

  const config = getConfig(collection.occasion);
  if (!config?.collectionConfig) {
    return NextResponse.json({ error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  }

  // Per-collection abuse backstop (the admin token is already secret/owner-only).
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `${config.brand.redisKeyPrefix}:invite-count:${collection.id}`;
      const total = await redis.incrby(key, clean.length);
      await redis.expire(key, 30 * 86400);
      if (total > MAX_TOTAL_PER_COLLECTION) {
        return NextResponse.json(
          { error: 'You’ve reached the invite limit for this collection. Share your link directly instead.', code: 'RATE_LIMIT', retryable: false },
          { status: 429 },
        );
      }
    } catch {
      /* non-fatal — proceed without the cap rather than block a legitimate send */
    }
  }

  const shareUrl = `${appBase(config.brand.domain)}/c/${collection.shareToken}?occasion=${collection.occasion}&src=invite`;
  const accent = config.email.brandColor || '#5a8fab';
  const from = config.email.fromEmail;

  // Respect DISABLE_EMAIL (preview/E2E): report success without actually sending.
  if (process.env.DISABLE_EMAIL === 'true') {
    return NextResponse.json({ sent: clean.length, simulated: true });
  }

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json({ error: 'Email is temporarily unavailable', code: 'INVALID_SESSION', retryable: true }, { status: 503 });
  }

  let sent = 0;
  for (const r of clean) {
    try {
      await sendEmail(resend, {
        from,
        to: r.email,
        subject: `Add a memory for ${collection.honoreeName}`,
        html: inviteEmailHtml({
          honoreeName: collection.honoreeName,
          shareUrl,
          organizerName: (organizerName ?? '').toString().trim().slice(0, 100) || undefined,
          accent,
          recipientName: r.name || undefined,
        }),
      });
      sent += 1;
    } catch (err) {
      console.error('[invite] send error:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ sent });
}
