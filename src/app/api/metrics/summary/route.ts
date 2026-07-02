import { NextRequest, NextResponse } from 'next/server';
import { readFunnel, type FunnelStep } from '@/lib/funnel';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/metrics/summary — last 14 days of first-party funnel counters.
//
// {date: {occasion: {landing, start, create}}} plus per-occasion and overall
// totals with landing→start and start→create rates. Reads aggregate counters
// only — there is nothing user-level to expose, but the endpoint is still
// gated so funnel numbers aren't public.
//
// Auth: CRON_SECRET bearer — the exact same guard as /api/cron/* (fail-closed
// in production when unset; VERCEL_ENV is the prod discriminator, see
// cron/purge for why not NODE_ENV). No new secret invented.
// ---------------------------------------------------------------------------

const DAYS = 14;

interface StepCounts {
  landing: number;
  start: number;
  create: number;
}

const rate = (num: number, den: number): number | null =>
  den > 0 ? Math.round((num / den) * 1000) / 1000 : null;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.VERCEL_ENV === 'production';
  if (!secret) {
    if (isProd) {
      console.error('[metrics/summary] CRON_SECRET not set — refusing to serve in production');
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }
  } else if ((request.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = await readFunnel(DAYS);

  // Roll up totals per occasion across the window, then overall.
  const byOccasion: Record<string, StepCounts> = {};
  for (const perOccasion of Object.values(days)) {
    for (const [occasion, counts] of Object.entries(perOccasion)) {
      const t = (byOccasion[occasion] ??= { landing: 0, start: 0, create: 0 });
      for (const step of ['landing', 'start', 'create'] as FunnelStep[]) {
        t[step] += counts[step];
      }
    }
  }
  const overall: StepCounts = { landing: 0, start: 0, create: 0 };
  for (const t of Object.values(byOccasion)) {
    overall.landing += t.landing;
    overall.start += t.start;
    overall.create += t.create;
  }

  const withRates = (t: StepCounts) => ({
    ...t,
    landingToStart: rate(t.start, t.landing),
    startToCreate: rate(t.create, t.start),
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    windowDays: DAYS,
    days,
    totals: {
      overall: withRates(overall),
      byOccasion: Object.fromEntries(
        Object.entries(byOccasion).map(([occasion, t]) => [occasion, withRates(t)]),
      ),
    },
  });
}
