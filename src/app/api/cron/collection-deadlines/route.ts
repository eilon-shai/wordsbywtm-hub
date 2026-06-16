import { NextRequest, NextResponse } from 'next/server';
import { createCollectionDeadlineSweepHandler } from '@eilon-shai/venture-core/api';
import { CONFIGS, OCCASIONS } from '@/lib/registry';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// GET /api/cron/collection-deadlines — daily deadline sweep (Vercel Cron, see
// vercel.json). 3-day warnings, delete unpaid at the deadline, auto-generate
// paid "with what we have", extend paid-but-empty. Guarded by CRON_SECRET (the
// venture-core handler checks Authorization: Bearer $CRON_SECRET, which Vercel
// Cron sends automatically when CRON_SECRET is set).
//
// NOTE: the venture-core sweep is not yet product-scoped — it processes every
// open collection with a deadline. That's correct while a single occasion is
// live. Before a 2nd occasion goes live, scope listOpenCollectionsWithDeadline
// by product (and run the sweep once per live config).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const live = OCCASIONS.filter((o) => o.live);
  const configs = live.map((o) => CONFIGS[o.slug]).filter(Boolean);

  // Today exactly one occasion is live, so this runs once. If/when more go live
  // this loop must wait for product-scoping (see NOTE above) to avoid double work.
  const primary = configs[0];
  if (!primary) {
    return NextResponse.json({ ok: true, note: 'no live occasion config' });
  }

  return createCollectionDeadlineSweepHandler(primary)(request);
}
