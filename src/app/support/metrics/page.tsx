import type { Metadata } from 'next';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { SiteHeader } from '@/components/SiteHeader';
import { getMetrics, type MetricsSnapshot } from '@/lib/metrics';

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

export default async function MetricsPage() {
  const db = getDbClient();
  let snap: MetricsSnapshot | null = null;
  let error: string | null = null;
  if (!db) {
    error = 'Database unavailable (DATABASE_URL not set).';
  } else {
    try {
      snap = await getMetrics(db);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load metrics.';
    }
  }

  return (
    <>
      <SiteHeader />
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
          Live funnel, conversion, and feedback across all occasions — straight from Postgres.
        </p>

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
      </main>
    </>
  );
}
