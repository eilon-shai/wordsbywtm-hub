import { NextRequest, NextResponse } from 'next/server';
import { createCollectionDeadlineSweepHandler } from '@eilon-shai/venture-core/api';
import { CONFIGS, OCCASIONS } from '@/lib/registry';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// GET /api/cron/collection-deadlines — daily deadline sweep (Vercel Cron, see
// vercel.json). 3-day warnings, delete unpaid at the deadline, auto-generate
// paid "with what we have", extend paid-but-empty. CRON_SECRET-guarded inside the
// venture-core handler (fail-closed: requires the secret in production).
//
// The venture-core sweep is product-scoped (1.15.x), so we run it once PER LIVE
// occasion config (ARCH-02b) — safe with any number of live occasions.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const configs = OCCASIONS.filter((o) => o.live).map((o) => CONFIGS[o.slug]).filter(Boolean);
  if (configs.length === 0) {
    return NextResponse.json({ ok: true, note: 'no live occasion config' });
  }

  const results: Record<string, unknown> = {};
  for (const config of configs) {
    const res = await createCollectionDeadlineSweepHandler(config)(request);
    // Propagate an auth/config failure (401/503) immediately.
    if (res.status === 401 || res.status === 503) return res;
    results[config.brand.paddleProductId] = await res.json().catch(() => ({}));
  }
  return NextResponse.json({ ok: true, results });
}
