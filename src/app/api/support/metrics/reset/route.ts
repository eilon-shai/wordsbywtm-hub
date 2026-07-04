import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resetFunnel } from '@/lib/funnel';

// ---------------------------------------------------------------------------
// Support console — zero out the first-party funnel counters (landing / start /
// create) in Redis. Behind the same middleware Basic-Auth as the rest of
// /api/support/*.
//
// PRODUCTION-ONLY: preview deployments + CI share one Upstash instance, so a
// reset triggered from a preview would wipe the LIVE counters. Guard against it
// (local dev — no VERCEL_ENV — is allowed so the flow is testable).
// ---------------------------------------------------------------------------

export const maxDuration = 10;

export async function POST(_req: NextRequest) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Reset is production-only (preview shares the live Redis).' }, { status: 403 });
  }
  const deleted = await resetFunnel();
  return NextResponse.json({ deleted });
}
