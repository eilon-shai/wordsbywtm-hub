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

  it('only memorial is live; retirement is built (has a collectionConfig) but not yet launched', () => {
    const live = OCCASIONS.filter((o) => o.live).map((o) => o.slug);
    expect(live).toEqual(['memorial']);
    expect(CONFIGS.memorial.collectionConfig).toBeTruthy();
    // Retirement is fully built but stays live:false until Paddle IDs exist.
    expect(CONFIGS.retirement.collectionConfig).toBeTruthy();
    const retirementMeta = OCCASIONS.find((o) => o.slug === 'retirement');
    expect(retirementMeta?.live).toBe(false);
    // Wedding is still a stub.
    expect(CONFIGS.wedding.collectionConfig).toBeUndefined();
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
