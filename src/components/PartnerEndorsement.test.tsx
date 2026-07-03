import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerEndorsement } from './PartnerEndorsement';
import { PARTNERS } from '@/lib/partners';

// ---------------------------------------------------------------------------
// Render smoke for the partner endorsement banner. Node env → renderToStaticMarkup
// (no jsdom). Asserts the two load-bearing properties: (1) it NEVER renders for
// organic/unknown traffic, and (2) the memorial branch carries no price number
// while the celebratory branch may.
// ---------------------------------------------------------------------------

const KNOWN = 'p-test01';

beforeEach(() => {
  PARTNERS[KNOWN] = { displayName: 'Test Funeral Home' };
  delete process.env.PARTNER_DISCOUNT_ID;
});
afterEach(() => {
  delete PARTNERS[KNOWN];
  delete process.env.PARTNER_DISCOUNT_ID;
});

const render = (occasion: string, referrer: string | null | undefined) =>
  renderToStaticMarkup(<PartnerEndorsement occasion={occasion} referrer={referrer} />);

describe('PartnerEndorsement', () => {
  it('renders NOTHING for organic (no ref) traffic', () => {
    expect(render('memorial', null)).toBe('');
    expect(render('memorial', undefined)).toBe('');
  });

  it('renders NOTHING for an unknown / malformed token', () => {
    expect(render('memorial', 'p-notreal')).toBe('');
    expect(render('memorial', 'P_UPPER')).toBe('');
  });

  it('renders the partner name for a known token', () => {
    const html = render('memorial', KNOWN);
    expect(html).toContain('Test Funeral Home');
    expect(html).toContain('partner-endorsement');
  });

  it('MEMORIAL branch carries no price/number, even when the discount is live', () => {
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    const html = render('memorial', KNOWN);
    expect(html).not.toContain('$');
    expect(html).not.toContain('10%');
    expect(html).not.toMatch(/\b44\b/);
  });

  it('CELEBRATORY branch mentions a courtesy only when the discount is live', () => {
    // Discount OFF → no courtesy mention.
    expect(render('wedding', KNOWN).toLowerCase()).not.toContain('courtesy');
    // Discount ON → soft courtesy mention, still no "10% OFF"/SALE.
    process.env.PARTNER_DISCOUNT_ID = 'dsc_abc123';
    const live = render('wedding', KNOWN);
    expect(live.toLowerCase()).toContain('courtesy');
    expect(live).not.toContain('10%');
    expect(live.toUpperCase()).not.toContain('SALE');
  });
});
