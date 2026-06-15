import type { CSSProperties } from 'react';
import { getOccasionMeta } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Per-occasion theming. One house brand, three occasion sub-brands differing
// only by accent hue. We override --primary AND its derived tokens (--ring,
// --accent, --accent-foreground) — overriding --primary alone would leave focus
// rings and tinted surfaces slate. Every venture-core component and /ui
// primitive consumes these CSS vars, so the whole subtree re-themes with zero
// component edits.
//
// Accent hue comes from OCCASIONS meta (memorial slate #5a8fab). --accent is a
// soft tint of the accent and --accent-foreground is the accent itself, matching
// the relationship in globals.css. We set the strong tokens to the raw hex and
// derive the soft accent surface via color-mix so it tints toward the hue.
// ---------------------------------------------------------------------------

function occasionThemeVars(accent: string): CSSProperties {
  return {
    // Cast: CSS custom properties aren't in the CSSProperties type.
    ['--primary' as string]: accent,
    ['--ring' as string]: accent,
    // Soft tint of the accent for hover/selected surfaces.
    ['--accent' as string]: `color-mix(in oklab, ${accent} 14%, var(--background))`,
    // Text/icon color on those soft surfaces.
    ['--accent-foreground' as string]: accent,
  } as CSSProperties;
}

export default async function OccasionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ occasion: string }>;
}) {
  const { occasion } = await params;
  const meta = getOccasionMeta(occasion);
  const style = meta ? occasionThemeVars(meta.accent) : undefined;

  return (
    <div style={style} className="min-h-screen">
      {children}
    </div>
  );
}
