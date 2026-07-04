import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resetFunnel } from '@/lib/funnel';

// ---------------------------------------------------------------------------
// Support console — zero out the first-party funnel counters (landing / start /
// create) in Redis. Behind the same middleware Basic-Auth as the rest of
// /api/support/*.
//
// STRICTLY PRODUCTION-ONLY. Preview deployments AND local dev both point at the
// shared production Upstash instance (see reference_wordsbywtm_shared_redis), so
// a reset from anywhere but prod would wipe the LIVE counters — and local
// /api/support/* isn't Basic-Auth-gated when SUPPORT_PASSWORD is unset. Requiring
// VERCEL_ENV === 'production' means only the real, authenticated prod console can
// trigger it. resetFunnel() itself is unit-tested directly, so this loses no
// coverage.
// ---------------------------------------------------------------------------

export const maxDuration = 10;

export async function POST(_req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Reset is production-only.' }, { status: 403 });
  }
  const deleted = await resetFunnel();
  return NextResponse.json({ deleted });
}
