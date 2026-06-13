import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { memorialConfig } from './memorial/config';

// ---------------------------------------------------------------------------
// Occasion registry — the single source of truth for which occasions this app
// supports. One app, many occasions (mirrors VocalVow's multi-product pattern).
// Add an occasion by: writing src/products/<slug>/config.ts and registering it
// here + in OCCASIONS below. No new app, DB, or encryption key.
// ---------------------------------------------------------------------------

export const CONFIGS: Record<string, ProductConfig> = {
  memorial: memorialConfig,
};

/** Display metadata for the landing-page occasion picker. */
export interface OccasionMeta {
  slug: string;
  /** Card title, e.g. "Memorial tribute". */
  title: string;
  /** One-line description shown on the picker card. */
  blurb: string;
  /** What the honoree field collects, e.g. "the person you're honoring". */
  honoreeLabel: string;
  /** Accent color for this occasion's pages. */
  accent: string;
  /** Whether the occasion is live (false => "coming soon"). */
  live: boolean;
}

export const OCCASIONS: OccasionMeta[] = [
  {
    slug: 'memorial',
    title: 'Memorial tribute',
    blurb: 'Gather memories from family and friends into one tribute to read at a service.',
    honoreeLabel: 'the person being honored',
    accent: '#5a8fab',
    live: true,
  },
  {
    slug: 'wedding',
    title: 'Wedding tribute',
    blurb: 'Collect stories and well-wishes from everyone who loves the couple.',
    honoreeLabel: 'the couple',
    accent: '#b8609a',
    live: false,
  },
  {
    slug: 'retirement',
    title: 'Retirement tribute',
    blurb: 'Bring together a career of memories from colleagues into one send-off.',
    honoreeLabel: 'the retiree',
    accent: '#b8924a',
    live: false,
  },
];

export function getConfig(occasion: string): ProductConfig | null {
  return CONFIGS[occasion] ?? null;
}

export function getOccasionMeta(occasion: string): OccasionMeta | null {
  return OCCASIONS.find((o) => o.slug === occasion) ?? null;
}
