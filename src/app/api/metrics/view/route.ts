import { NextRequest, NextResponse } from 'next/server';
import { bumpFunnel, INTERNAL_COOKIE } from '@/lib/funnel';
import { getConfig, getOccasionMeta } from '@/lib/registry';

// ---------------------------------------------------------------------------
// POST /api/metrics/view — first-party page-view beacon (landing | start).
//
// Fired by PageBeacon via navigator.sendBeacon. Increments an AGGREGATE daily
// counter only: no cookies read or set, IP ignored, nothing user-identifying
// stored (DEC-P-005). 'create' is deliberately NOT accepted here — it's
// counted server-side in the create route, so a client can't inflate it.
//
// Always 204, even for invalid input: a beacon endpoint must never be an
// oracle for what's valid, and sendBeacon discards the response anyway.
// ---------------------------------------------------------------------------

const BEACON_STEPS = ['landing', 'start'] as const;
type BeaconStep = (typeof BEACON_STEPS)[number];

const BOT_UA = /bot|crawl|spider|preview|headless/i;

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Drop the obvious non-humans (crawlers, link previews, headless browsers).
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOT_UA.test(ua)) return NO_CONTENT();

  // Operator self-exclusion — don't count a browser that opted out via
  // ?wtm_internal=1 (their own testing on the live site).
  if (request.cookies.get(INTERNAL_COOKIE)?.value === '1') return NO_CONTENT();

  let occasion = '';
  let step = '';
  try {
    const body = (await request.json()) as Record<string, unknown>;
    occasion = typeof body.occasion === 'string' ? body.occasion : '';
    step = typeof body.step === 'string' ? body.step : '';
  } catch {
    return NO_CONTENT();
  }

  // Whitelist the step and validate the occasion against the registry (live,
  // with a collection flow — same gate as the create route) so arbitrary
  // strings can never mint Redis keys.
  if (!(BEACON_STEPS as readonly string[]).includes(step)) return NO_CONTENT();
  const meta = getOccasionMeta(occasion);
  const config = getConfig(occasion);
  if (!meta?.live || !config?.collectionConfig) return NO_CONTENT();

  await bumpFunnel(occasion, step as BeaconStep);
  return NO_CONTENT();
}
