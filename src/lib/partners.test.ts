import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolvePartnerDiscount,
  partnerDiscountApplies,
  resolvePrice,
  discountConfigured,
  isPartnerToken,
  partnerAllowsOccasion,
  DISCOUNT_PERCENT,
} from './partners';

// ---------------------------------------------------------------------------
// Unit tests for the client-safe pure helpers. The allowlist + token minting
// live in partners-store.ts (DB-backed) and are covered by an integration test.
//
// SECURITY MODEL (see the invariant comment in partners.ts): the sync checkout
// hook resolvePartnerDiscount trusts any non-null `referrer` because
// attachReferrer only ever stores an active partner's slug. So these tests assert
// the referrer-present + env-set contract, NOT an allowlist re-check.
// ---------------------------------------------------------------------------

const STORED = 'p-abc123'; // a stored (already-vetted) referrer slug

beforeEach(() => {
  delete process.env.PARTNER_DISCOUNT_ID;
});
afterEach(() => {
  delete process.env.PARTNER_DISCOUNT_ID;
});

describe('resolvePartnerDiscount', () => {
  it('is OFF (undefined) when PARTNER_DISCOUNT_ID is unset, even with a referrer', () => {
    expect(process.env.PARTNER_DISCOUNT_ID).toBeUndefined();
    expect(resolvePartnerDiscount(STORED)).toBeUndefined();
  });

  it('is OFF for organic (no referrer) even when the env IS set', () => {
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(resolvePartnerDiscount(null)).toBeUndefined();
    expect(resolvePartnerDiscount(undefined)).toBeUndefined();
    expect(resolvePartnerDiscount('')).toBeUndefined();
  });

  it('returns the discount id when a (pre-vetted) referrer is present AND the env is set', () => {
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(resolvePartnerDiscount(STORED)).toBe('dsc_abc123');
  });
});

describe('partnerDiscountApplies', () => {
  it('mirrors resolvePartnerDiscount as a boolean', () => {
    expect(partnerDiscountApplies(STORED)).toBe(false); // env unset
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(partnerDiscountApplies(STORED)).toBe(true);
    expect(partnerDiscountApplies(null)).toBe(false); // organic
  });
});

describe('discountConfigured', () => {
  it('reflects whether PARTNER_DISCOUNT_ID is set', () => {
    expect(discountConfigured()).toBe(false);
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(discountConfigured()).toBe(true);
  });
});

describe('isPartnerToken', () => {
  it('accepts well-formed opaque tokens', () => {
    expect(isPartnerToken('p-3ae689')).toBe(true);
    expect(isPartnerToken('p-1a2b3c4d')).toBe(true);
  });

  it('rejects malformed / injected / empty values', () => {
    expect(isPartnerToken('P_UPPER')).toBe(false); // uppercase + underscore
    expect(isPartnerToken('ab')).toBe(false); // too short
    expect(isPartnerToken('-leading')).toBe(false); // edge hyphen
    expect(isPartnerToken('has space')).toBe(false);
    expect(isPartnerToken(null)).toBe(false);
    expect(isPartnerToken(undefined)).toBe(false);
    expect(isPartnerToken(42)).toBe(false);
  });
});

describe('partnerAllowsOccasion', () => {
  it('an empty scope matches every occasion (unrestricted)', () => {
    expect(partnerAllowsOccasion([], 'memorial')).toBe(true);
    expect(partnerAllowsOccasion([], 'wedding')).toBe(true);
  });

  it('a scoped partner matches only its listed occasions', () => {
    expect(partnerAllowsOccasion(['memorial'], 'memorial')).toBe(true);
    expect(partnerAllowsOccasion(['memorial'], 'wedding')).toBe(false);
    expect(partnerAllowsOccasion(['memorial', 'retirement'], 'retirement')).toBe(true);
    expect(partnerAllowsOccasion(['memorial', 'retirement'], 'anniversary')).toBe(false);
  });
});

describe('resolvePrice', () => {
  it('returns the base price unchanged when the discount does not apply', () => {
    expect(resolvePrice(49, false)).toEqual({ value: 49, display: '$49', discounted: false });
  });

  it('applies the 10% courtesy: 49 -> 44.10 exact, "$44" display', () => {
    const r = resolvePrice(49, true);
    expect(r.value).toBe(44.1);
    expect(r.display).toBe('$44');
    expect(r.discounted).toBe(true);
  });

  it('DISCOUNT_PERCENT is the single source of truth (10)', () => {
    expect(DISCOUNT_PERCENT).toBe(10);
    const base = 49;
    const expected = Math.round(base * (1 - DISCOUNT_PERCENT / 100) * 100) / 100;
    expect(resolvePrice(base, true).value).toBe(expected);
  });
});
