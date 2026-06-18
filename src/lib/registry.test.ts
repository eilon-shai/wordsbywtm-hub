import { describe, it, expect } from 'vitest';
import { CONFIGS, OCCASIONS, getConfig, getOccasionMeta } from './registry';

describe('registry', () => {
  it('registers exactly the three known occasions', () => {
    expect(Object.keys(CONFIGS).sort()).toEqual(['memorial', 'retirement', 'wedding']);
  });

  it('getConfig returns the config for a known slug and undefined otherwise', () => {
    expect(getConfig('memorial')).toBe(CONFIGS.memorial);
    expect(getConfig('nope')).toBeUndefined();
    expect(getConfig('')).toBeUndefined();
  });

  it('memorial and retirement are live with a collectionConfig; wedding is still a stub', () => {
    const live = OCCASIONS.filter((o) => o.live).map((o) => o.slug).sort();
    expect(live).toEqual(['memorial', 'retirement']);
    expect(CONFIGS.memorial.collectionConfig).toBeTruthy();
    expect(CONFIGS.retirement.collectionConfig).toBeTruthy();
    // Wedding is still a stub (no collectionConfig, not live).
    expect(CONFIGS.wedding.collectionConfig).toBeUndefined();
    expect(OCCASIONS.find((o) => o.slug === 'wedding')?.live).toBe(false);
  });

  it('every live occasion has a non-empty paddleProductId (QA-6 startup guard)', () => {
    for (const o of OCCASIONS.filter((x) => x.live)) {
      expect(CONFIGS[o.slug]?.brand?.paddleProductId).toBeTruthy();
    }
  });

  it('getOccasionMeta returns display metadata or undefined', () => {
    expect(getOccasionMeta('memorial')?.title).toBe('Memorial');
    expect(getOccasionMeta('unknown')).toBeUndefined();
  });
});
