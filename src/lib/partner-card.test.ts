import { describe, it, expect } from 'vitest';
import { CARD_COPY, cardCopyFor, pickCardOccasion } from './partner-card';

// ---------------------------------------------------------------------------
// Occasion resolution + copy selection for the /partners/card printable card.
// The card's baked link occasion MUST match the partner's scope, because the
// create-time discount gate is occasion-scoped — a wrong occasion silently
// earns no endorsement and no courtesy. These cover the resolution rules.
// ---------------------------------------------------------------------------

describe('pickCardOccasion', () => {
  it('uses the first scoped occasion when we have card copy for it', () => {
    expect(pickCardOccasion(['wedding'])).toBe('wedding');
    expect(pickCardOccasion(['retirement', 'anniversary'])).toBe('retirement');
  });

  it('falls back to memorial for an empty scope (unrestricted partner)', () => {
    expect(pickCardOccasion([])).toBe('memorial');
  });

  it('falls back to memorial for a null/undefined scope (unknown/inactive code)', () => {
    expect(pickCardOccasion(null)).toBe('memorial');
    expect(pickCardOccasion(undefined)).toBe('memorial');
  });

  it('falls back to memorial when the first occasion has no card copy', () => {
    expect(pickCardOccasion(['graduation'])).toBe('memorial');
  });
});

describe('cardCopyFor', () => {
  it('returns the matching occasion copy', () => {
    expect(cardCopyFor('wedding').occasion).toBe('wedding');
    expect(cardCopyFor('wedding').step3).toMatch(/toast for the reception/i);
  });

  it('falls back to the memorial card for unknown/absent occasions', () => {
    expect(cardCopyFor('graduation').occasion).toBe('memorial');
    expect(cardCopyFor(null).occasion).toBe('memorial');
    expect(cardCopyFor(undefined).occasion).toBe('memorial');
  });

  it('keeps the grief-register reassurance only on the memorial card', () => {
    expect(cardCopyFor('memorial').reassurance).toMatch(/take your time/i);
    expect(cardCopyFor('wedding').reassurance).not.toMatch(/take your time/i);
  });

  it('every registered occasion has complete, non-empty copy', () => {
    for (const [slug, copy] of Object.entries(CARD_COPY)) {
      expect(copy.occasion).toBe(slug);
      for (const field of ['title', 'headline', 'step2', 'step3', 'reassurance'] as const) {
        expect(copy[field].length).toBeGreaterThan(0);
      }
    }
  });
});
