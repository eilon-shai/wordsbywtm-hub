// ---------------------------------------------------------------------------
// Partner referral courtesy discount — client-safe pure helpers: the discount
// gate the checkout hook calls, the price math, and shared types/constants.
//
// This module is imported by CLIENT components (ManageDashboard pulls in
// resolvePrice), so it MUST stay free of server-only imports (no node:crypto,
// no getDbClient). All database + token-minting code lives in the server-only
// companion `partners-store.ts`.
//
// Model (SES-053/054, PARTNER_DISCOUNT_DESIGN.md): a partner (funeral home,
// hospice, planner) hands families an opaque link `?ref=<token>`. Tokens are
// opaque but MUST match REF_SLUG_RE (lowercase alphanumeric + hyphens, no
// underscores) — e.g. `p-3ae689`. Partners are now managed at runtime from the
// /support/partners admin page (Postgres `partners` table, see partners-store),
// no code deploy. If — and only if — a family's collection was referred by an
// ACTIVE partner AND the founder set PARTNER_DISCOUNT_ID in Vercel, we thread a
// single shared Paddle percentage discount (10%) onto the checkout transaction
// (price ID unchanged) and render a partner endorsement + courtesy line. It is a
// discount only — no commission, no payout, so zero back-office.
//
// ── SECURITY INVARIANT (read before touching resolvePartnerDiscount) ──────────
// `collections.referrer` is written by exactly ONE function — attachReferrer in
// src/lib/referrer.ts — which stores a slug ONLY after confirming it is an
// ACTIVE, allowlisted partner (DB lookup, fail-closed). Therefore any non-null
// `referrer` that reaches checkout is already a vetted partner, and the sync
// checkout hook below only needs the env gate — it does NOT (and cannot, being
// sync) re-read the Postgres allowlist. If you ever add another writer of
// collections.referrer, it MUST perform the same active-partner gate, or this
// becomes a self-serve discount hole (?ref=anything → 10% off).
// ---------------------------------------------------------------------------

import { REF_SLUG_RE } from '@/lib/ref';

/** The referral courtesy: 10% off the finalize price. Single source of truth —
 *  the on-screen/analytics numbers and the Paddle discount must agree. */
export const DISCOUNT_PERCENT = 10;

export interface Partner {
  /** Opaque referral token (e.g. `p-3ae689`) — matches REF_SLUG_RE. Never shown
   *  to a family; it's the `?ref` value and the printable-card `?code`. */
  token: string;
  /** Family-facing name rendered in the endorsement/courtesy copy ("Smith Funeral
   *  Home"). Tokens are opaque, so a grieving family must NEVER see the raw token. */
  displayName: string;
  /** Deactivated partners keep their attribution history but stop earning new
   *  endorsements/discounts. */
  active: boolean;
  /** ISO timestamp the partner was added (present on DB-sourced entries). */
  createdAt?: string;
}

/** Whether a value is a well-formed opaque partner token (same shape as any
 *  `?ref` slug). A malformed/injected value can never be a partner. */
export function isPartnerToken(value: unknown): value is string {
  return typeof value === 'string' && REF_SLUG_RE.test(value);
}

/** Whether the Paddle courtesy discount is configured (founder set the env var).
 *  With it unset the whole discount feature is inert — endorsements still show,
 *  but no price is ever changed. */
export function discountConfigured(): boolean {
  // Dynamic key so bundlers don't statically inline this server-only var.
  return !!process.env['PARTNER_DISCOUNT_ID'];
}

/**
 * The venture-core `CollectionConfig.resolvePartnerDiscount` hook (SYNCHRONOUS).
 * Given the collection's stored `referrer` slug, return the shared Paddle
 * discount id when PARTNER_DISCOUNT_ID is set and the collection was referred.
 *
 * It trusts a non-null referrer WITHOUT re-checking the allowlist — see the
 * SECURITY INVARIANT at the top of this file: attachReferrer already guaranteed
 * that any stored referrer is an active partner. Returns undefined (full price)
 * when the env is unset or the collection is organic.
 *
 * Signature matches @eilon-shai/venture-core 1.30.0 exactly:
 *   resolvePartnerDiscount?(referrer: string | null | undefined): string | undefined
 */
export function resolvePartnerDiscount(referrer: string | null | undefined): string | undefined {
  const discountId = process.env['PARTNER_DISCOUNT_ID'];
  if (!discountId) return undefined; // feature off until the founder sets it in Vercel
  return referrer ? discountId : undefined; // referrer is pre-vetted at create time
}

/**
 * Whether a collection with this STORED referrer actually gets the courtesy
 * discount — mirrors resolvePartnerDiscount exactly, as a boolean for the UI.
 * Callers MUST pass a stored `collections.referrer` (already allowlist-gated at
 * create), NOT a raw `?ref` query value; for the pre-create landing decision use
 * the DB lookup getPartner() in partners-store.ts instead. Using this keeps the
 * on-screen/tracked price identical to what Paddle charges (never $49-then-$44).
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
