// ---------------------------------------------------------------------------
// Partner referral courtesy discount — the hub-owned allowlist, display-name
// map, discount resolution, and the single price-math source of truth.
//
// Model (SES-053, PARTNER_DISCOUNT_DESIGN.md): a partner (funeral home, hospice,
// planner) hands families an opaque link `?ref=<token>`. Tokens are opaque but
// MUST match REF_SLUG_RE (lowercase alphanumeric + hyphens, no underscores), so
// use a hyphen separator — e.g. `p-8f3a2`, NOT `p_8f3a2`. An underscore token is
// silently dropped at every ref boundary (capture/store/server) and would never
// reach the collection row, so it could never earn a discount. If — and only if — that
// token is in the PARTNERS allowlist AND the founder has set PARTNER_DISCOUNT_ID
// in Vercel, we thread a single shared Paddle percentage discount (10%) onto the
// checkout transaction (price ID unchanged), and render a partner *endorsement*
// on the landing + a pre-applied *courtesy* line at the paywall. It is a discount
// only — no commission, no payout, so zero back-office. Never a public coupon:
// tokens are OPAQUE and the discount is only ever seen by a family a partner
// already sent.
//
// Two gates, both required, both server-authoritative:
//   1. getPartner(token) is non-null  → the token is a known, active partner.
//   2. process.env.PARTNER_DISCOUNT_ID is set → the Paddle discount exists.
// Either missing = full price, no discount, no banner. Safe default is OFF: with
// PARTNER_DISCOUNT_ID unset this whole feature is inert, so it can ship before
// the Paddle discount is created.
// ---------------------------------------------------------------------------

import { REF_SLUG_RE } from '@/lib/ref';

/** The referral courtesy: 10% off the finalize price. Single source of truth —
 *  the on-screen/analytics numbers below and the Paddle discount must agree. */
export const DISCOUNT_PERCENT = 10;

export interface Partner {
  /** Family-facing name rendered in the endorsement/courtesy copy ("Smith Funeral
   *  Home"). Tokens are opaque, so a grieving family must NEVER see the raw token. */
  displayName: string;
}

// ---------------------------------------------------------------------------
// ALLOWLIST. The key is an OPAQUE token (e.g. `p-8f3a2`, hyphen not underscore —
// see REF_SLUG_RE note above) — issue a fresh random one per partner, add it
// here, then hand them their link (`?ref=<token>`) and printable card
// (`?code=<token>`). Only tokens present here get an endorsement or discount;
// unknown/absent tokens resolve to null (organic, full price).
//
// EMPTY at launch — no real partners onboarded yet. Uncomment the example to see
// the shape. See docs/PARTNER_PROGRAM_GUIDE.md for the onboarding steps.
// ---------------------------------------------------------------------------
export const PARTNERS: Record<string, Partner> = {
  // 'p-8f3a2': { displayName: 'Smith Funeral Home' },
};

/**
 * Resolve a `?ref` token to its partner entry, or null. Validates the token
 * against REF_SLUG_RE first (same shape enforced at every ref boundary), so a
 * malformed/injected value can never map to a partner. Returns null for any
 * unknown, absent, or malformed token.
 */
export function getPartner(token: string | null | undefined): Partner | null {
  if (typeof token !== 'string' || !REF_SLUG_RE.test(token)) return null;
  return PARTNERS[token] ?? null;
}

/**
 * The venture-core `CollectionConfig.resolvePartnerDiscount` hook. Given the
 * collection's `referrer` slug, return the shared Paddle discount id ONLY when
 * both gates pass: the token is a known partner AND PARTNER_DISCOUNT_ID is set.
 * Otherwise undefined → venture-core omits `discountId` and charges full price.
 *
 * Signature matches @eilon-shai/venture-core 1.30.0 exactly:
 *   resolvePartnerDiscount?(referrer: string | null | undefined): string | undefined
 */
export function resolvePartnerDiscount(referrer: string | null | undefined): string | undefined {
  // Read via a dynamic key so bundlers (Vite/Next) don't statically inline this
  // server-only var at build time — it must be resolved fresh at request time.
  const discountId = process.env['PARTNER_DISCOUNT_ID'];
  if (!discountId) return undefined; // feature off until the founder sets it in Vercel
  if (!getPartner(referrer)) return undefined; // unknown/absent token → full price
  return discountId;
}

/**
 * Whether a referred collection actually gets the courtesy discount: a known
 * partner AND the Paddle discount configured. Mirrors resolvePartnerDiscount's
 * gate, but returns a boolean for the UI/analytics layer (which doesn't need the
 * id). Use this — not getPartner alone — to decide whether to show a discounted
 * price, so on-screen numbers never claim a discount that Paddle won't apply.
 */
export function partnerDiscountApplies(referrer: string | null | undefined): boolean {
  return resolvePartnerDiscount(referrer) !== undefined;
}

export interface ResolvedPrice {
  /** Exact discounted amount, e.g. 44.1 (for analytics — never over-report). */
  value: number;
  /** Rounded display string, e.g. "$44" (celebratory) or the base "$49". */
  display: string;
  /** Whether the courtesy discount was applied to this price. */
  discounted: boolean;
}

/**
 * The one place display/tracked prices are computed. Given a base display price
 * (e.g. 49) and whether the partner courtesy applies, returns the effective
 * price. 10% off 49 = 44.10 exact (analytics value), shown rounded as "$44".
 * When it doesn't apply, returns the base unchanged — list price stays $49.
 */
export function resolvePrice(basePrice: number, discountApplies: boolean): ResolvedPrice {
  if (!discountApplies) {
    return { value: basePrice, display: `$${basePrice}`, discounted: false };
  }
  // Round the exact amount to cents so it matches what Paddle charges.
  const value = Math.round(basePrice * (1 - DISCOUNT_PERCENT / 100) * 100) / 100;
  return { value, display: `$${Math.round(value)}`, discounted: true };
}
