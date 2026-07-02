import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@eilon-shai/venture-core/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface RefRow {
  referrer: string;
  collections: string;
  generated: string;
  paid: string;
  first_created_at: string;
  last_created_at: string;
}

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

// GET /api/partners/summary — per-partner referral report (?ref attribution).
// One row per collections.referrer slug: how many collections that partner's
// links started, how many were paid, how many reached a generated tribute.
// CRON_SECRET-guarded (same bearer pattern as the cron routes): read with
//   curl -H "Authorization: Bearer $CRON_SECRET" https://wordsbywtm.com/api/partners/summary
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
    const rows = await db.query<RefRow>(
      `select referrer,
              count(*)                                       as collections,
              count(*) filter (where status = 'generated')   as generated,
              count(*) filter (where paid_at is not null)    as paid,
              min(created_at)                                as first_created_at,
              max(created_at)                                as last_created_at
         from collections
        where referrer is not null
        group by referrer
        order by count(*) desc, referrer`,
    );
    const referrers = rows.map((r) => ({
      referrer: r.referrer,
      collections: num(r.collections),
      generated: num(r.generated),
      paid: num(r.paid),
      firstCreatedAt: r.first_created_at,
      lastCreatedAt: r.last_created_at,
    }));
    const totals = {
      referrers: referrers.length,
      collections: referrers.reduce((s, r) => s + r.collections, 0),
      generated: referrers.reduce((s, r) => s + r.generated, 0),
      paid: referrers.reduce((s, r) => s + r.paid, 0),
    };
    return NextResponse.json({ generatedAt: new Date().toISOString(), totals, referrers });
  } catch (err) {
    console.error('[partners/summary] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Report failed', retryable: true }, { status: 500 });
  }
}
