import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerEndorsement } from './PartnerEndorsement';

// ---------------------------------------------------------------------------
// Render smoke for the partner endorsement banner. Now a PURE presentational
// component — the landing page resolves the partner from the Postgres allowlist
// and passes partnerName/courtesyLive as props, so these tests just drive props
// (no env/allowlist mutation). Node env → renderToStaticMarkup (no jsdom).
//
// Load-bearing properties: (1) it NEVER renders without a resolved partner name,
// and (2) the memorial branch carries no price number while the celebratory
// branch may (only when the courtesy is live).
// ---------------------------------------------------------------------------

const render = (
  occasion: string,
  partnerName: string | null | undefined,
  courtesyLive = false,
) =>
  renderToStaticMarkup(
    <PartnerEndorsement occasion={occasion} partnerName={partnerName} courtesyLive={courtesyLive} />,
  );

describe('PartnerEndorsement', () => {
  it('renders NOTHING without a resolved partner name (organic/unknown/inactive)', () => {
    expect(render('memorial', null)).toBe('');
    expect(render('memorial', undefined)).toBe('');
    expect(render('memorial', '   ')).toBe(''); // whitespace-only → nothing
  });

  it('renders the partner name for a resolved partner', () => {
    const html = render('memorial', 'Test Funeral Home');
    expect(html).toContain('Test Funeral Home');
    expect(html).toContain('partner-endorsement');
  });

  it('MEMORIAL branch carries no price/number, even when the courtesy is live', () => {
    const html = render('memorial', 'Test Funeral Home', true);
    expect(html).not.toContain('$');
    expect(html).not.toContain('10%');
    expect(html).not.toMatch(/\b44\b/);
  });

  it('CELEBRATORY branch mentions a courtesy only when it is live', () => {
    // Courtesy OFF → no mention.
    expect(render('wedding', 'Test Planner', false).toLowerCase()).not.toContain('courtesy');
    // Courtesy ON → soft mention, still no "10% OFF"/SALE.
    const live = render('wedding', 'Test Planner', true);
    expect(live.toLowerCase()).toContain('courtesy');
    expect(live).not.toContain('10%');
    expect(live.toUpperCase()).not.toContain('SALE');
  });
});
