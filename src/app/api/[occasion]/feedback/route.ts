import { NextRequest, NextResponse } from 'next/server';
import { createFeedbackHandler } from '@eilon-shai/venture-core/api';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
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

  // Read the transactionId via a clone (the handler still reads the original) for
  // the idempotency reservation below. Persistence of the feedback itself is done
  // inside venture-core's createFeedbackHandler (collection_feedback table).
  const body = (await request.clone().json().catch(() => ({}))) as { transactionId?: unknown };
  const txn = typeof body?.transactionId === 'string' ? body.transactionId.trim() : '';

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

  const res = await createFeedbackHandler(config)(request);

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
