import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';

// ---------------------------------------------------------------------------
// DEV/PREVIEW-ONLY test helper — fast-forward a collection's clock so you can
// validate the deadline-sweep + purge crons without waiting 30 days.
//
// HARD-DISABLED in production. CRON_SECRET-gated when the secret is set, so it
// isn't an open mutation endpoint even on a preview deployment.
//
// POST /api/dev/collection-clock
//   { adminToken, deadlineInDays?, deadlineInPast?, purgeNow?, clearReminder? }
// Then trigger the crons to observe the behaviour:
//   GET /api/cron/collection-deadlines   (Authorization: Bearer $CRON_SECRET)
//   GET /api/cron/purge                  (Authorization: Bearer $CRON_SECRET)
//
// Recipes:
//   3-day warning  → { deadlineInDays: 3, clearReminder: true } → deadline cron
//   delete unpaid  → { deadlineInPast: true }                    → deadline cron
//   purge tribute  → { purgeNow: true }   (collection must be generated/paid)→ purge cron
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Never in production. Key off VERCEL_ENV ONLY (matches the purge cron, SES-047
  // §7): NODE_ENV is always 'production' on Vercel for every deploy — preview
  // included — so an OR on NODE_ENV would 404 this helper on previews too, which
  // is exactly where it's meant to run. Preview safety comes from the CRON_SECRET
  // gate below, not from disabling the route.
  const isProd = process.env.VERCEL_ENV === 'production';
  if (isProd) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // When a CRON_SECRET exists, require it (header-only) so a preview URL isn't open.
  const secret = process.env.CRON_SECRET;
  if (secret && (request.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    adminToken?: string;
    deadlineInDays?: number;
    deadlineInPast?: boolean;
    purgeNow?: boolean;
    clearReminder?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { adminToken, deadlineInDays, deadlineInPast, purgeNow, clearReminder } = body;
  if (!adminToken) {
    return NextResponse.json({ error: 'Missing adminToken' }, { status: 400 });
  }

  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const now = Date.now();
  const sets: string[] = [];
  const params: unknown[] = [];
  const applied: Record<string, unknown> = {};

  if (typeof deadlineInDays === 'number') {
    const iso = new Date(now + deadlineInDays * DAY_MS).toISOString();
    params.push(iso);
    sets.push(`deadline = $${params.length}`);
    applied.deadline = iso;
  } else if (deadlineInPast) {
    const iso = new Date(now - 60_000).toISOString(); // 1 minute ago
    params.push(iso);
    sets.push(`deadline = $${params.length}`);
    applied.deadline = iso;
  }

  if (purgeNow) {
    const iso = new Date(now - 60_000).toISOString();
    params.push(iso);
    sets.push(`purge_after = $${params.length}`);
    applied.purge_after = iso;
  }

  if (clearReminder) {
    sets.push(`reminder_sent_at = null`);
    applied.reminder_sent_at = null;
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nothing to set — pass deadlineInDays | deadlineInPast | purgeNow | clearReminder' }, { status: 400 });
  }

  params.push(collection.id);
  await db.query(`update collections set ${sets.join(', ')} where id = $${params.length}`, params);

  return NextResponse.json({
    ok: true,
    collectionId: collection.id,
    honoreeName: collection.honoreeName,
    paid: !!collection.paidAt,
    status: collection.status,
    applied,
    next: 'Now trigger the cron: GET /api/cron/collection-deadlines or /api/cron/purge with Authorization: Bearer $CRON_SECRET',
  });
}
