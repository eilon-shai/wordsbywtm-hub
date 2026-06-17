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
const DAILY_CAP = 3; // max invite emails per collection per day (#3)

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
  // Personalized when we know the organizer; otherwise honoree-centric — never "Someone".
  const intro = opts.organizerName
    ? `${opts.organizerName} is putting together a tribute for <strong>${opts.honoreeName}</strong>, woven from memories shared by the people who knew them — and you’re invited to add yours.`
    : `You’re invited to share a memory of <strong>${opts.honoreeName}</strong> for a tribute that family and friends are putting together — woven from the memories of everyone who knew them.`;
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a2118;line-height:1.6;">
    <p>${greeting}</p>
    <p>${intro}</p>
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

  const shareUrl = `${appBase(config.brand.domain)}/c/${collection.shareToken}?occasion=${collection.occasion}&src=invite`;
  const accent = config.email.brandColor || '#5a8fab';
  const from = config.email.fromEmail;
  const orgName = (organizerName ?? '').toString().trim().slice(0, 100) || undefined;
  const prefix = config.brand.redisKeyPrefix;
  const today = new Date().toISOString().slice(0, 10);
  const redis = getRedisClient();

  // Respect DISABLE_EMAIL (preview/E2E): report success without consuming the
  // daily/per-recipient quota, so previews stay testable.
  if (process.env.DISABLE_EMAIL === 'true') {
    return NextResponse.json({ sent: clean.length, skipped: 0, simulated: true });
  }

  // #3 — at most `dailyCap` invite emails per collection per day. Paying in
  // advance ("unlock up to 10 friends") raises the cap from 3 to 10.
  const dailyCap = collection.paidAt ? 10 : DAILY_CAP;
  let sentToday = 0;
  if (redis) {
    try {
      sentToday = Number(await redis.get(`${prefix}:invite-day:${collection.id}:${today}`)) || 0;
    } catch {
      /* non-fatal */
    }
  }
  const remainingToday = Math.max(0, dailyCap - sentToday);
  if (remainingToday === 0) {
    return NextResponse.json(
      { error: `You can send up to ${dailyCap} email invites a day. Share your link directly — it's free and unlimited.`, code: 'RATE_LIMIT', retryable: false },
      { status: 429 },
    );
  }

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json({ error: 'Email is temporarily unavailable', code: 'INVALID_SESSION', retryable: true }, { status: 503 });
  }

  const dayKey = `${prefix}:invite-day:${collection.id}:${today}`;
  let sent = 0;
  let skipped = 0; // already emailed this person today (#1)
  for (const r of clean) {
    const rcptKey = `${prefix}:invite-rcpt:${collection.id}:${r.email}`;
    if (redis) {
      try {
        if (await redis.get(rcptKey)) {
          skipped += 1; // #1 — one email per person per day
          continue;
        }
      } catch {
        /* non-fatal — proceed */
      }
    }

    // ARCH-07 — atomic daily-cap reservation: INCR first, then check, so two
    // concurrent requests can't both slip past the cap. Roll back on overflow.
    let reserved = false;
    if (redis) {
      try {
        const n = await redis.incr(dayKey);
        if (n === 1) await redis.expire(dayKey, 86400);
        if (n > dailyCap) {
          await redis.decr(dayKey);
          skipped += 1;
          continue;
        }
        reserved = true;
      } catch {
        /* redis hiccup — fall back to the best-effort in-memory window */
        if (sent >= remainingToday) { skipped += 1; continue; }
      }
    } else if (sent >= remainingToday) {
      skipped += 1;
      continue;
    }

    try {
      await sendEmail(resend, {
        from,
        to: r.email,
        subject: `Add a memory for ${collection.honoreeName}`,
        html: inviteEmailHtml({ honoreeName: collection.honoreeName, shareUrl, organizerName: orgName, accent, recipientName: r.name || undefined }),
      });
      sent += 1;
      if (redis) {
        try {
          await redis.set(rcptKey, '1', { ex: 86400 }); // per-recipient/day lock
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      console.error('[invite] send error:', err instanceof Error ? err.message : err);
      // Release the reserved daily slot so a failed send doesn't consume the cap.
      if (redis && reserved) {
        try { await redis.decr(dayKey); } catch { /* non-fatal */ }
      }
    }
  }

  return NextResponse.json({ sent, skipped, dailyRemaining: Math.max(0, remainingToday - sent) });
}
