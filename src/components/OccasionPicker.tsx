import Link from 'next/link';
import { OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Occasion picker for the root hub (S1). One card per occasion. Live occasions
// link into their landing page; stub occasions are dimmed with a "Coming soon"
// badge and still link to their coming-soon screen. Each card carries its own
// accent hue so the picker previews the per-occasion sub-brand.
//
// `focus` (from the landing ?focus= param, set per ad group) puts one occasion
// in focus: it's ordered first and ringed, so a campaign that splits keywords by
// topic can land each visitor on the right product without separate sites.
// ---------------------------------------------------------------------------

// Map ad-keyword-ish values to occasion slugs (so ?focus=memories → memorial).
const FOCUS_ALIASES: Record<string, string> = {
  memories: 'memorial', memory: 'memorial', memorial: 'memorial', funeral: 'memorial', eulogy: 'memorial', tribute: 'memorial',
  wedding: 'wedding', weddings: 'wedding', vows: 'wedding', marriage: 'wedding',
  retirement: 'retirement', retire: 'retirement', career: 'retirement', farewell: 'retirement',
};

export function resolveFocusSlug(focus?: string | null): string | null {
  if (!focus) return null;
  return FOCUS_ALIASES[focus.trim().toLowerCase()] ?? null;
}

export default function OccasionPicker({ focus }: { focus?: string | null }) {
  const focusSlug = resolveFocusSlug(focus);
  // Focused occasion first, original order otherwise.
  const occasions = focusSlug
    ? [...OCCASIONS].sort((a, b) => Number(b.slug === focusSlug) - Number(a.slug === focusSlug))
    : OCCASIONS;

  return (
    <div id="occasions" className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
      {occasions.map((o) => {
        const accentStyle = { ['--occ-accent' as string]: o.accent } as React.CSSProperties;
        const isFocused = o.slug === focusSlug;
        return (
          <Link
            key={o.slug}
            href={`/${o.slug}`}
            aria-label={`${o.title} collection`}
            aria-current={isFocused ? 'true' : undefined}
            style={accentStyle}
            className={[
              'group relative flex flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-all',
              o.live
                ? 'border-border hover:-translate-y-0.5 hover:shadow-md'
                : 'border-border/70 opacity-70 hover:opacity-90',
              isFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : '',
            ].join(' ')}
          >
            {isFocused && (
              <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                What you’re after
              </span>
            )}
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
