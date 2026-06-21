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
  /** What the finished piece is called (e.g. "tribute", "toast", "send-off"). Genericizes shared UI copy across occasions. */
  deliverableNoun: string;
  /** Where it's read aloud (e.g. "at the service", "at the reception"). Replaces the memorial-only "at the service". */
  readAloudContext: string;
  /** Tasteful emoji for success/terminal screens. Memorial keeps the white heart; celebratory occasions get their own so 🤍 doesn't read as mourning. */
  successIcon: string;
}

export const OCCASIONS: OccasionMeta[] = [
  {
    slug: 'memorial',
    title: 'Memorial',
    blurb: 'Gather memories from everyone who knew them into one tribute, read aloud at the service.',
    honoreeLabel: 'the person we are honoring',
    accent: '#5a8fab',
    live: true,
    deliverableNoun: 'tribute',
    readAloudContext: 'at the service',
    successIcon: '🤍',
  },
  {
    slug: 'wedding',
    title: 'Wedding',
    blurb: 'Collect stories and well-wishes from both sides into one toast for the couple.',
    honoreeLabel: 'the couple',
    accent: '#b08a8f',
    live: true,
    deliverableNoun: 'toast',
    readAloudContext: 'at the reception',
    successIcon: '🥂',
  },
  {
    slug: 'retirement',
    title: 'Retirement',
    blurb: 'Bring together years of colleagues and friends into one send-off speech.',
    honoreeLabel: 'the person retiring',
    accent: '#b3935a',
    live: true,
    deliverableNoun: 'send-off',
    readAloudContext: 'at the party',
    successIcon: '🎉',
  },
  {
    slug: 'anniversary',
    title: 'Anniversary',
    blurb: 'Gather memories from family and friends into one tribute for the couple’s milestone.',
    honoreeLabel: 'the couple',
    accent: '#a8768f',
    live: true,
    deliverableNoun: 'tribute',
    readAloudContext: 'at the celebration',
    successIcon: '💞',
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

// Cross-product isolation invariant: every live occasion's Paddle product id must
// be UNIQUE. Webhook routing + mark-paid resolve the occasion by customData.product
// === brand.paddleProductId, so a duplicate id would let one product's payment
// touch another's collections. Fail fast at startup if two live occasions collide.
{
  const seen = new Map<string, string>();
  for (const o of OCCASIONS) {
    const id = CONFIGS[o.slug]?.brand?.paddleProductId;
    if (!o.live || !id) continue;
    const prior = seen.get(id);
    if (prior) {
      throw new Error(`[registry] live occasions "${prior}" and "${o.slug}" share paddleProductId "${id}" — product ids must be unique for cross-product isolation`);
    }
    seen.set(id, o.slug);
  }
}

// PROD CHECKOUT GUARD (SES-047 §7 [Architect]): in PRODUCTION ONLY, fail closed
// at boot if any LIVE occasion would open a broken or sandbox checkout. We serve
// paid ad traffic — a live occasion whose `full` tier has no live Paddle price id
// (or still carries the known sandbox placeholder) means the customer hits a dead
// or sandbox checkout after we've already paid for the click. A thrown guard fails
// the whole app boot on purpose (fail-closed: don't serve traffic to broken
// checkout). It is OFF outside production so dev/preview/sandbox still run on the
// sandbox price ids.
//
// How live vs sandbox ids differ in the configs: each tier carries a live
// `priceId` (from NEXT_PUBLIC_PADDLE_PRICE_ID_<OCC>, default '') AND a
// `priceIdSandbox` fallback (a hard-coded `pri_...` sandbox id). In production the
// live `priceId` MUST be a non-empty real id and MUST NOT equal the sandbox
// placeholder. (Live and sandbox Paddle ids share the `pri_` prefix, so prefix
// alone can't distinguish them — we compare against the occasion's own known
// sandbox id and require non-empty.)
if (process.env.VERCEL_ENV === 'production') {
  for (const o of OCCASIONS) {
    if (!o.live) continue;
    const cfg = CONFIGS[o.slug];
    const full = cfg?.tiers?.full;
    if (!full) {
      throw new Error(`[registry] PROD: live occasion "${o.slug}" has no "full" tier — cannot open checkout`);
    }
    const livePriceId = (full.priceId ?? '').trim();
    if (!livePriceId) {
      throw new Error(`[registry] PROD: live occasion "${o.slug}" has an empty live tiers.full.priceId — set NEXT_PUBLIC_PADDLE_PRICE_ID_${o.slug.toUpperCase()} to the LIVE Paddle price id (refusing to serve a broken checkout)`);
    }
    const sandboxPriceId = (full.priceIdSandbox ?? '').trim();
    if (sandboxPriceId && livePriceId === sandboxPriceId) {
      throw new Error(`[registry] PROD: live occasion "${o.slug}" tiers.full.priceId "${livePriceId}" matches its SANDBOX price id — a sandbox checkout would open for real customers (refusing to boot)`);
    }
  }
}

/** Returns the ProductConfig for an occasion slug, or undefined if unknown. */
export const getConfig = (slug: string): ProductConfig | undefined => CONFIGS[slug];

/** Returns display metadata for an occasion slug, or undefined if unknown. */
export const getOccasionMeta = (slug: string): OccasionMeta | undefined =>
  OCCASIONS.find((o) => o.slug === slug);
