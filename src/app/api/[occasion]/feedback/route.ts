import { NextRequest, NextResponse } from 'next/server';
import { createFeedbackHandler } from '@eilon-shai/venture-core/api';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getConfig } from '@/lib/registry';
import { recordFeedback } from '@/lib/metrics';

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

  // Read the body once via a clone (the handler still reads the original). Used
  // for both the idempotency reservation and persisting the feedback for metrics.
  const body = (await request.clone().json().catch(() => ({}))) as {
    transactionId?: unknown;
    rating?: unknown;
    feedback?: unknown;
    canShare?: unknown;
  };
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

  // Persist the feedback for the metrics dashboard (best-effort — never let a DB
  // hiccup turn a successful submission into an error for the customer). The
  // route-level dedup above means a given txn reaches here at most once.
  if (res.ok && txn) {
    const db = getDbClient();
    if (db) {
      try {
        const rating = typeof body.rating === 'number' ? body.rating : undefined;
        await recordFeedback(db, {
          product: config.brand.paddleProductId,
          transactionId: txn,
          rating,
          feedback: typeof body.feedback === 'string' ? body.feedback : undefined,
          canShare: typeof body.canShare === 'boolean' ? body.canShare : undefined,
        });
      } catch (err) {
        console.error('[feedback] persist failed (non-fatal):', err instanceof Error ? err.message : err);
      }
    }
  }

  return res;
}
