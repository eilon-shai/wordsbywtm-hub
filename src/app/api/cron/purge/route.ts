import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, purgeExpired } from '@eilon-shai/venture-core/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET /api/cron/purge — daily retention sweep (ARCH-01 / LC-01). Hard-deletes any
// collection past its purge_after: abandoned-never-finalized AND finalized rows
// past their post-generation retention window. CRON_SECRET-guarded (Vercel Cron
// sends Authorization: Bearer $CRON_SECRET).
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Fail-closed (BE-N4/SEC-06): require CRON_SECRET in production; header-only match.
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!secret) {
    if (isProd) {
      console.error('[cron/purge] CRON_SECRET not set — refusing to run in production');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
    }
  } else if ((request.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable', retryable: true }, { status: 503 });
  try {
    const purged = await purgeExpired(db);
    return NextResponse.json({ ok: true, purged });
  } catch (err) {
    console.error('[cron/purge] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Purge failed', retryable: true }, { status: 500 });
  }
}
