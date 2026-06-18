import { describe, it, expect } from 'vitest';
import { CONFIGS, OCCASIONS, getConfig, getOccasionMeta } from './registry';

describe('registry', () => {
  it('registers exactly the four known occasions', () => {
    expect(Object.keys(CONFIGS).sort()).toEqual(['anniversary', 'memorial', 'retirement', 'wedding']);
  });

  it('getConfig returns the config for a known slug and undefined otherwise', () => {
    expect(getConfig('memorial')).toBe(CONFIGS.memorial);
    expect(getConfig('nope')).toBeUndefined();
    expect(getConfig('')).toBeUndefined();
  });

  it('memorial and retirement are live; wedding and anniversary are built but not yet launched', () => {
    const live = OCCASIONS.filter((o) => o.live).map((o) => o.slug).sort();
    expect(live).toEqual(['memorial', 'retirement']);
    expect(CONFIGS.memorial.collectionConfig).toBeTruthy();
    expect(CONFIGS.retirement.collectionConfig).toBeTruthy();
    // Wedding + anniversary are fully built (have a collectionConfig) but stay
    // live:false until their Paddle IDs exist.
    expect(CONFIGS.wedding.collectionConfig).toBeTruthy();
    expect(CONFIGS.anniversary.collectionConfig).toBeTruthy();
    expect(OCCASIONS.find((o) => o.slug === 'wedding')?.live).toBe(false);
    expect(OCCASIONS.find((o) => o.slug === 'anniversary')?.live).toBe(false);
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
