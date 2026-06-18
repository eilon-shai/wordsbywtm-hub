import Link from 'next/link';
import { OCCASIONS, type OccasionMeta } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Occasion picker for the root hub (S1). One card per occasion. Live occasions
// link into their landing page; stub occasions are dimmed with a "Coming soon"
// badge and still link to their coming-soon screen. Each card carries its own
// accent hue so the picker previews the per-occasion sub-brand.
//
// `focus` (from the landing ?focus= param, set per ad group) puts one occasion
// in focus so a campaign that splits keywords by topic can land each visitor on
// the right product without separate sites. When focused, that occasion becomes
// a LARGE full-width featured card and the others drop into a smaller, dimmed
// "Other occasions" row beneath it.
// ---------------------------------------------------------------------------

// Map ad-keyword-ish values to occasion slugs (so ?focus=memories → memorial).
const FOCUS_ALIASES: Record<string, string> = {
  memories: 'memorial', memory: 'memorial', memorial: 'memorial', funeral: 'memorial', eulogy: 'memorial', tribute: 'memorial',
  wedding: 'wedding', weddings: 'wedding', vows: 'wedding', marriage: 'wedding', toast: 'wedding',
  retirement: 'retirement', retire: 'retirement', career: 'retirement', farewell: 'retirement',
  anniversary: 'anniversary', anniversaries: 'anniversary', milestone: 'anniversary',
};

export function resolveFocusSlug(focus?: string | null): string | null {
  if (!focus) return null;
  return FOCUS_ALIASES[focus.trim().toLowerCase()] ?? null;
}

function accentVar(o: OccasionMeta): React.CSSProperties {
  return { ['--occ-accent' as string]: o.accent } as React.CSSProperties;
}

const ctaLabel = (o: OccasionMeta) => (o.live ? 'Start a collection →' : 'Notify me →');

export default function OccasionPicker({ focus }: { focus?: string | null }) {
  const focusSlug = resolveFocusSlug(focus);
  const featured = focusSlug ? OCCASIONS.find((o) => o.slug === focusSlug) ?? null : null;

  // No focus → the standard equal grid (one card per live occasion; 4-up on lg).
  if (!featured) {
    return (
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {OCCASIONS.map((o) => (
          <OccasionCard key={o.slug} o={o} />
        ))}
      </div>
    );
  }

  // Focused → a (modestly) featured card + the rest as a smaller, dimmed row.
  const others = OCCASIONS.filter((o) => o.slug !== featured.slug);
  return (
    <div id="occasions" className="mx-auto max-w-2xl">
      <FeaturedOccasionCard o={featured} />
      {others.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Other occasions
          </p>
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {others.map((o) => (
              <OccasionCard key={o.slug} o={o} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Large full-width featured card for the focused occasion.
function FeaturedOccasionCard({ o }: { o: OccasionMeta }) {
  return (
    <Link
      href={`/${o.slug}`}
      aria-label={`${o.title} collection`}
      aria-current="true"
      style={accentVar(o)}
      className={[
        'group relative flex flex-col rounded-2xl border-2 bg-card p-6 text-left shadow-md transition-all',
        o.live ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-90',
      ].join(' ')}
    >
      <span
        className="absolute -top-2.5 left-6 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white"
        style={{ backgroundColor: o.accent }}
      >
        What you’re after
      </span>

      <div className="mb-2 flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `color-mix(in oklab, ${o.accent} 16%, white)` }}
          aria-hidden
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.accent }} />
        </span>
        <h3 className="font-serif text-2xl text-foreground">{o.title}</h3>
        {!o.live && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Coming soon
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{o.blurb}</p>

      <span
        className="mt-4 inline-flex w-fit items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: o.live ? o.accent : 'var(--muted-foreground)' }}
      >
        {o.live ? `Start a ${o.title} collection →` : 'Notify me →'}
      </span>
    </Link>
  );
}

// Standard card. `compact` shrinks it for the secondary "Other occasions" row.
function OccasionCard({ o, compact = false }: { o: OccasionMeta; compact?: boolean }) {
  return (
    <Link
      href={`/${o.slug}`}
      aria-label={`${o.title} collection`}
      style={accentVar(o)}
      className={[
        'group relative flex flex-col rounded-2xl border bg-card text-left shadow-sm transition-all',
        compact ? 'p-5' : 'p-6',
        o.live
          ? 'border-border hover:-translate-y-0.5 hover:shadow-md'
          : 'border-border/70 opacity-70 hover:opacity-90',
      ].join(' ')}
    >
      <span
        className={`${compact ? 'mb-3 h-8 w-8' : 'mb-4 h-9 w-9'} inline-flex items-center justify-center rounded-full`}
        style={{ backgroundColor: `color-mix(in oklab, ${o.accent} 16%, white)` }}
        aria-hidden
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.accent }} />
      </span>

      <div className="mb-1 flex items-center gap-2">
        <h3 className={`font-serif text-foreground ${compact ? 'text-xl' : 'text-2xl'}`}>{o.title}</h3>
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
        <span className={o.live ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground'}>
          {ctaLabel(o)}
        </span>
      </span>
    </Link>
  );
}
