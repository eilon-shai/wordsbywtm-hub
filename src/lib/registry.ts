import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { memorialConfig } from '@/products/memorial/config';
import { weddingConfig } from '@/products/wedding/config';
import { retirementConfig } from '@/products/retirement/config';
import { anniversaryConfig } from '@/products/anniversary/config';

// ---------------------------------------------------------------------------
// Occasion registry — the single architectural delta for the multi-occasion
// app. CONFIGS maps an occasion slug to its ProductConfig (the only
// occasion-specific code). OCCASIONS is display metadata for the root hub.
//
// To add an occasion later: add a sibling config, register it here, and flip
// `live: true`. No new app / DB / Redis key. See COLLECTION_FLOW_DESIGN.md §9.
// ---------------------------------------------------------------------------

export const CONFIGS: Record<string, ProductConfig> = {
  memorial: memorialConfig,
  wedding: weddingConfig,
  retirement: retirementConfig,
  anniversary: anniversaryConfig,
};

export interface OccasionMeta {
  slug: string;
  title: string;
  blurb: string;
  honoreeLabel: string;
  /** Accent hue for per-occasion theming (overrides --primary in [occasion]/layout). */
  accent: string;
  live: boolean;
}

export const OCCASIONS: OccasionMeta[] = [
  {
    slug: 'memorial',
    title: 'Memorial',
    blurb: 'Gather memories from everyone who knew them into one tribute, read aloud at the service.',
    honoreeLabel: 'the person we are honoring',
    accent: '#5a8fab',
    live: true,
  },
  {
    slug: 'wedding',
    title: 'Wedding',
    blurb: 'Collect stories and well-wishes from both sides into one toast for the couple.',
    honoreeLabel: 'the couple',
    accent: '#b08a8f',
    live: true,
  },
  {
    slug: 'retirement',
    title: 'Retirement',
    blurb: 'Bring together years of colleagues and friends into one send-off speech.',
    honoreeLabel: 'the person retiring',
    accent: '#b3935a',
    live: true,
  },
  {
    slug: 'anniversary',
    title: 'Anniversary',
    blurb: 'Gather memories from family and friends into one tribute for the couple’s milestone.',
    honoreeLabel: 'the couple',
    accent: '#a8768f',
    live: true,
  },
];

// QA-6: fail fast at startup if any LIVE occasion is misconfigured (empty
// paddleProductId would collapse dedup + cross-product guards). Stub occasions
// (live:false) are allowed to have a placeholder id.
for (const o of OCCASIONS) {
  if (o.live && !CONFIGS[o.slug]?.brand?.paddleProductId) {
    throw new Error(`[registry] live occasion "${o.slug}" must have a non-empty brand.paddleProductId`);
  }
}

/** Returns the ProductConfig for an occasion slug, or undefined if unknown. */
export const getConfig = (slug: string): ProductConfig | undefined => CONFIGS[slug];

/** Returns display metadata for an occasion slug, or undefined if unknown. */
export const getOccasionMeta = (slug: string): OccasionMeta | undefined =>
  OCCASIONS.find((o) => o.slug === slug);
