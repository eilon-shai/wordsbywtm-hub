import { NextRequest, NextResponse } from 'next/server';
import { createFeedbackHandler } from '@eilon-shai/venture-core/api';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getConfig } from '@/lib/registry';

export const maxDuration = 30;

// One feedback per tribute, enforced server-side (the client also hides the
// widget after submit, but that's only per-browser). We reserve a per-transaction
// Redis key with NX BEFORE handling, and roll it back if the handler fails — so a
// genuine retry still works, but a second successful submit is ignored.
const FEEDBACK_ONCE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

// POST /api/[occasion]/feedback — the result-page feedback widget posts here.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ occasion: string }> },
): Promise<NextResponse> {
  const { occasion } = await params;
  const config = getConfig(occasion);
  if (!config) {
    return NextResponse.json({ error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  }

  // Parse the body once here. We re-forward an (optionally) augmented body to the
  // venture-core handler below, so read it via text() rather than letting the
  // handler consume the stream.
  const rawBody = await request.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const txn = typeof parsed.transactionId === 'string' ? parsed.transactionId.trim() : '';

  // Idempotency reservation.
  let onceKey: string | null = null;
  const redis = getRedisClient();
  if (redis) {
    try {
      if (txn) {
        const key = `${config.brand.redisKeyPrefix}:feedback-once:${txn}`;
        const reserved = await redis.set(key, '1', { nx: true, ex: FEEDBACK_ONCE_TTL_SECONDS });
        if (!reserved) {
          // Already submitted for this tribute — accept silently, send nothing.
          return NextResponse.json({ ok: true, deduped: true });
        }
        onceKey = key;
      }
    } catch {
      /* redis hiccup — fall through and let the handler run (don't block feedback) */
    }
  }

  // Resolve the organizer (customer) name server-side so the internal feedback
  // email shows WHO left it — covers both pay paths, since the feedback txn equals
  // the collection's paid_txn_id whether they paid at finalize or in advance.
  // Best-effort: a miss just leaves the name "(not provided)" in the email.
  let customerName: string | undefined;
  if (txn) {
    try {
      const db = getDbClient();
      if (db) {
        const rows = (await db.query('select organizer_name from collections where paid_txn_id = $1 limit 1', [
          txn,
        ])) as Array<{ organizer_name?: string | null }>;
        const name = rows?.[0]?.organizer_name;
        if (typeof name === 'string' && name.trim()) customerName = name.trim();
      }
    } catch {
      /* non-fatal — feedback still records/sends without the name */
    }
  }

  // Forward to the venture-core handler with the resolved name folded in (1.25.0+
  // reads `customerName` from the body and renders it as the email's "From" row).
  const forwardBody = customerName ? JSON.stringify({ ...parsed, customerName }) : rawBody;
  const forwarded = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: forwardBody,
  });

  const res = await createFeedbackHandler(config)(forwarded);

  // Roll back the reservation if the submission didn't succeed, so the customer
  // can retry (e.g. validation error or a transient email failure).
  if (onceKey && redis && !res.ok) {
    try {
      await redis.del(onceKey);
    } catch {
      /* non-fatal */
    }
  }

  return res;
}
