import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getReferrerSummary } from '@/lib/referrer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET /api/partners/summary — per-partner referral report (?ref attribution).
// One row per collections.referrer slug: how many collections that partner's
// links started, how many were paid, how many reached a generated tribute.
// CRON_SECRET-guarded (same bearer pattern as the cron routes): read with
//   curl -H "Authorization: Bearer $CRON_SECRET" https://www.wordsbywtm.com/api/partners/summary
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Fail-closed in production; VERCEL_ENV (not NODE_ENV) is the real
  // production/preview discriminator — same rationale as /api/cron/purge.
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.VERCEL_ENV === 'production';
  if (!secret) {
    if (isProd) {
      console.error('[partners/summary] CRON_SECRET not set — refusing to serve in production');
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }
  } else if ((request.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable', retryable: true }, { status: 503 });
  try {
    const { totals, referrers } = await getReferrerSummary(db);
    return NextResponse.json({ generatedAt: new Date().toISOString(), totals, referrers });
  } catch (err) {
    console.error('[partners/summary] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Report failed', retryable: true }, { status: 500 });
  }
}
