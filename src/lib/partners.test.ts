import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PARTNERS,
  getPartner,
  resolvePartnerDiscount,
  partnerDiscountApplies,
  resolvePrice,
  DISCOUNT_PERCENT,
} from './partners';

// ---------------------------------------------------------------------------
// Unit tests for the partner allowlist + discount resolution + price math.
//
// PARTNERS ships EMPTY (no partners onboarded), so these tests inject a single
// known token by mutating the exported map, then clean it up. That exercises the
// real getPartner/resolvePartnerDiscount code paths against a real allowlist
// entry without shipping a fake partner in the source.
// ---------------------------------------------------------------------------

// Opaque tokens must match REF_SLUG_RE (no underscores) — use a hyphen.
const KNOWN = 'p-test01';

beforeEach(() => {
  PARTNERS[KNOWN] = { displayName: 'Test Funeral Home' };
  delete process.env.PARTNER_DISCOUNT_ID;
});

afterEach(() => {
  delete PARTNERS[KNOWN];
  delete process.env.PARTNER_DISCOUNT_ID;
});

describe('getPartner', () => {
  it('returns the entry for a known, allowlisted token', () => {
    expect(getPartner(KNOWN)).toEqual({ displayName: 'Test Funeral Home' });
  });

  it('returns null for an unknown (well-formed) token', () => {
    expect(getPartner('p-notreal')).toBeNull();
  });

  it('returns null for a malformed token (fails REF_SLUG_RE)', () => {
    expect(getPartner('P_UPPER')).toBeNull(); // uppercase
    expect(getPartner('ab')).toBeNull(); // too short
    expect(getPartner('-leading')).toBeNull(); // edge hyphen
    expect(getPartner('has space')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(getPartner(null)).toBeNull();
    expect(getPartner(undefined)).toBeNull();
    expect(getPartner('')).toBeNull();
  });
});

describe('resolvePartnerDiscount', () => {
  it('is OFF (undefined) when PARTNER_DISCOUNT_ID is unset, even for a known token', () => {
    expect(process.env.PARTNER_DISCOUNT_ID).toBeUndefined();
    expect(resolvePartnerDiscount(KNOWN)).toBeUndefined();
  });

  it('is OFF (undefined) for an unknown token even when the env IS set', () => {
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(resolvePartnerDiscount('p-notreal')).toBeUndefined();
    expect(resolvePartnerDiscount(null)).toBeUndefined();
    expect(resolvePartnerDiscount(undefined)).toBeUndefined();
  });

  it('returns the discount id when BOTH the token is known AND the env is set', () => {
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(resolvePartnerDiscount(KNOWN)).toBe('dsc_abc123');
  });
});

describe('partnerDiscountApplies', () => {
  it('mirrors resolvePartnerDiscount as a boolean', () => {
    expect(partnerDiscountApplies(KNOWN)).toBe(false); // env unset
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    expect(partnerDiscountApplies(KNOWN)).toBe(true);
    expect(partnerDiscountApplies('p-notreal')).toBe(false);
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
    // The discounted value must equal base * (1 - percent/100), rounded to cents.
    const base = 49;
    const expected = Math.round(base * (1 - DISCOUNT_PERCENT / 100) * 100) / 100;
    expect(resolvePrice(base, true).value).toBe(expected);
  });
});
