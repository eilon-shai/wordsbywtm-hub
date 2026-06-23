import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@eilon-shai/venture-core/redis';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 10;

// POST /api/collection/checkout/release — release the short-lived double-charge
// `checkout-lock` for a collection when the organizer CLOSES the Paddle overlay
// WITHOUT paying, so an immediate retry isn't blocked for the lock's TTL.
//
// Admin-token scoped (resolveForTokenPost resolves the occasion config from the
// token). Best-effort + idempotent: deleting a non-existent lock is a no-op, and
// the lock also expires on its own TTL — so any failure here is non-fatal. The
// venture-core checkout handler still re-checks paidAt/status on every attempt,
// so releasing a lock can never itself cause a double charge.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (config instanceof NextResponse) return config;

  let adminToken: string | undefined;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    if (typeof body.adminToken === 'string') adminToken = body.adminToken;
  } catch {
    /* malformed — handled below */
  }
  if (!adminToken) {
    return NextResponse.json({ error: 'Missing token', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  const db = getDbClient();
  const redis = getRedisClient();
  // No infra → nothing to release; report ok so the client never surfaces an error.
  if (!db || !redis) return NextResponse.json({ ok: true });

  try {
    const collection = await getCollectionByAdminToken(db, adminToken);
    if (collection) {
      await redis.del(`${config.brand.redisKeyPrefix}:checkout-lock:${collection.id}`);
    }
  } catch (err) {
    console.error('[collection-checkout/release] error:', err instanceof Error ? err.message : err);
    /* non-fatal — the lock expires on its own TTL */
  }
  return NextResponse.json({ ok: true });
}
