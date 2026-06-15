import Link from 'next/link';
import { OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Occasion picker for the root hub (S1). One card per occasion. Live occasions
// link into their landing page; stub occasions are dimmed with a "Coming soon"
// badge and still link to their coming-soon screen. Each card carries its own
// accent hue so the picker previews the per-occasion sub-brand.
// ---------------------------------------------------------------------------

export default function OccasionPicker() {
  return (
    <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
      {OCCASIONS.map((o) => {
        const accentStyle = { ['--occ-accent' as string]: o.accent } as React.CSSProperties;
        return (
          <Link
            key={o.slug}
            href={`/${o.slug}`}
            aria-label={`${o.title} collection`}
            style={accentStyle}
            className={[
              'group relative flex flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-all',
              o.live
                ? 'border-border hover:-translate-y-0.5 hover:shadow-md'
                : 'border-border/70 opacity-70 hover:opacity-90',
            ].join(' ')}
          >
            <span
              className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklab, ${o.accent} 16%, white)` }}
              aria-hidden
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.accent }} />
            </span>

            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-serif text-2xl text-foreground">{o.title}</h3>
              {!o.live && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Coming soon
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{o.blurb}</p>

            <span
              className="mt-4 text-sm font-semibold"
              style={{ color: o.live ? o.accent : undefined }}
            >
              {o.live ? (
                <span className="text-muted-foreground group-hover:text-foreground">
                  Start a collection →
                </span>
              ) : (
                <span className="text-muted-foreground">Notify me →</span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
