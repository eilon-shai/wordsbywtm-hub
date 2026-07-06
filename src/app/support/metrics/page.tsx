import type { Metadata } from 'next';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getMetrics, type MetricsSnapshot } from '@/lib/metrics';
import { getReferrerSummary, type ReferrerSummary } from '@/lib/referrer';
import { summarizeFunnel, type FunnelSummary, type StepSummary } from '@/lib/funnel';
import { getOccasionMeta } from '@/lib/registry';
import { ResetFunnelButton } from '@/components/ResetFunnelButton';

const FUNNEL_DAYS = 14;

// ---------------------------------------------------------------------------
// Business metrics dashboard. Behind the same edge-middleware Basic-Auth as the
// rest of /support. Sourced entirely from our own Postgres (collections +
// contributions + collection_feedback) — no third-party analytics for purchase
// or feedback data.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Metrics', robots: { index: false, follow: false } };

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Stars({ avg }: { avg: number | null }) {
  if (avg == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="text-amber-500">{'★'.repeat(Math.round(avg))}</span>
      <span className="text-muted-foreground/40">{'★'.repeat(5 - Math.round(avg))}</span>
      <span className="ml-1 text-foreground">{avg.toFixed(2)}</span>
    </span>
  );
}

function rateLabel(r: number | null): string {
  return r == null ? '—' : `${(r * 100).toFixed(0)}%`;
}

export default async function MetricsPage() {
  const db = getDbClient();
  let snap: MetricsSnapshot | null = null;
  let partners: ReferrerSummary | null = null;
  let error: string | null = null;

  // First-party traffic funnel (Redis, cookieless) — loads independently of the
  // Postgres snapshot so a Redis hiccup never blanks the DB metrics, and vice
  // versa. This is the consent-independent count to compare against ad clicks.
  let funnel: FunnelSummary | null = null;
  try {
    funnel = await summarizeFunnel(FUNNEL_DAYS);
  } catch (err) {
    console.error('[metrics] funnel error:', err instanceof Error ? err.message : err);
  }
  if (!db) {
    error = 'Database unavailable (DATABASE_URL not set).';
  } else {
    try {
      snap = await getMetrics(db);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load metrics.';
    }
    // Partner report loads independently — a failure here (e.g. referrer column
    // not yet migrated) must not blank the rest of the dashboard.
    try {
      partners = await getReferrerSummary(db);
    } catch (err) {
      console.error('[metrics] partner summary error:', err instanceof Error ? err.message : err);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-serif text-2xl text-foreground">Metrics</h1>
          {snap ? (
            <p className="text-xs text-muted-foreground">
              as of {new Date(snap.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          First-party traffic funnel (Redis) plus conversion and feedback across all occasions
          (Postgres). None of this is consent-gated, so it counts every visitor — unlike Clarity/GA.
        </p>

        {/* First-party traffic funnel — the consent-independent visit counts to
            compare against Google Ads clicks. Every landing/start/create is
            counted server-side regardless of cookie consent. */}
        {funnel ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Traffic funnel — last {funnel.windowDays} days (all visitors)
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  production only · excludes your opted-out browsers · lines up with ad clicks (not Clarity)
                </p>
                <ResetFunnelButton />
              </div>
            </div>

            {funnel.overall.landing === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No first-party traffic recorded in this window yet. (Counters began 2026-07-02;
                a landing only counts real, non-bot page views.)
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <Stat label="Landings" value={String(funnel.overall.landing)} sub="visits (all)" />
                  <Stat label="Started" value={String(funnel.overall.start)} sub="opened the form" />
                  <Stat label="Created" value={String(funnel.overall.create)} sub="collections" />
                  <Stat
                    label="Landing → start"
                    value={rateLabel(funnel.overall.landingToStart)}
                    sub="reached the form"
                  />
                  <Stat
                    label="Start → create"
                    value={rateLabel(funnel.overall.startToCreate)}
                    sub="finished creating"
                  />
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Occasion</th>
                        <th className="px-3 py-2 text-right font-medium">Landings</th>
                        <th className="px-3 py-2 text-right font-medium">Started</th>
                        <th className="px-3 py-2 text-right font-medium">Created</th>
                        <th className="px-3 py-2 text-right font-medium">L→S</th>
                        <th className="px-3 py-2 text-right font-medium">S→C</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(funnel.byOccasion)
                        .filter(([, t]) => t.landing + t.start + t.create > 0)
                        .sort(([, a], [, b]) => b.landing - a.landing)
                        .map(([occasion, t]: [string, StepSummary]) => (
                          <tr key={occasion} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 text-foreground">
                              {getOccasionMeta(occasion)?.title ?? occasion}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{t.landing}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{t.start}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{t.create}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {rateLabel(t.landingToStart)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {rateLabel(t.startToCreate)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

        {snap ? (
          <>
            {/* Totals */}
            <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Collections" value={String(snap.totals.created)} sub="started" />
              <Stat label="Finalized" value={String(snap.totals.finalized)} sub="paid + generated" />
              <Stat label="Conversion" value={pct(snap.totals.conversion)} sub="finalized / started" />
              <Stat label="Memories" value={String(snap.totals.memories)} sub="contributions" />
              <Stat
                label="Avg rating"
                value={snap.totals.avgRating != null ? snap.totals.avgRating.toFixed(2) : '—'}
                sub={`${snap.totals.feedbackCount} responses`}
              />
            </section>

            {/* Per-occasion breakdown */}
            <section className="mt-10">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                By occasion
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Occasion</th>
                      <th className="px-3 py-2 text-right font-medium">Started</th>
                      <th className="px-3 py-2 text-right font-medium">Finalized</th>
                      <th className="px-3 py-2 text-right font-medium">Conv.</th>
                      <th className="px-3 py-2 text-right font-medium">Memories</th>
                      <th className="px-3 py-2 text-right font-medium">Feedback</th>
                      <th className="px-3 py-2 text-right font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.byOccasion.map((o) => (
                      <tr key={o.occasion} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 text-foreground">{o.title}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{o.created}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{o.finalized}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(o.conversion)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{o.memories}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{o.feedbackCount}</td>
                        <td className="px-3 py-2 text-right">
                          <Stars avg={o.avgRating} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Weekly trend */}
            <section className="mt-10">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Last 12 weeks (all occasions)
              </h2>
              {snap.weekly.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collections yet.</p>
              ) : (
                <ul className="space-y-1">
                  {snap.weekly.map((w) => {
                    const max = Math.max(1, ...snap!.weekly.map((x) => x.created));
                    return (
                      <li key={w.week} className="flex items-center gap-3 text-xs">
                        <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{w.week}</span>
                        <span
                          className="inline-block h-3 rounded bg-foreground/70"
                          style={{ width: `${(w.created / max) * 100}%`, minWidth: w.created ? 4 : 0 }}
                        />
                        <span className="tabular-nums text-foreground">{w.created}</span>
                        <span className="tabular-nums text-muted-foreground">({w.finalized} finalized)</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}

        {/* Partner referrals (?ref attribution). Rendered whenever the report
            loads — independent of the main snapshot. */}
        {partners ? (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Partner referrals
            </h2>
            {partners.referrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No partner-attributed collections yet. Partner links carry <code>?ref=&lt;slug&gt;</code>;
                attributed rows will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Partner</th>
                      <th className="px-3 py-2 text-right font-medium">Collections</th>
                      <th className="px-3 py-2 text-right font-medium">Generated</th>
                      <th className="px-3 py-2 text-right font-medium">Paid</th>
                      <th className="px-3 py-2 text-right font-medium">First</th>
                      <th className="px-3 py-2 text-right font-medium">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.referrers.map((r) => (
                      <tr key={r.referrer} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs text-foreground">{r.referrer}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.collections}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.generated}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.paid}</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {new Date(r.firstCreatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {new Date(r.lastCreatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
    </main>
  );
}
