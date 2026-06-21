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

  it('all four occasions are live, each with a collectionConfig', () => {
    const live = OCCASIONS.filter((o) => o.live).map((o) => o.slug).sort();
    expect(live).toEqual(['anniversary', 'memorial', 'retirement', 'wedding']);
    expect(CONFIGS.memorial.collectionConfig).toBeTruthy();
    expect(CONFIGS.retirement.collectionConfig).toBeTruthy();
    expect(CONFIGS.wedding.collectionConfig).toBeTruthy();
    expect(CONFIGS.anniversary.collectionConfig).toBeTruthy();
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

  // Cross-product isolation invariants — all four occasions share one DB / Redis /
  // Paddle account / webhook, so these identifiers MUST be unique per occasion or
  // one product's payment/data could touch another's.
  it('every live occasion has a UNIQUE paddleProductId, redisKeyPrefix, and from-address', () => {
    const live = OCCASIONS.filter((o) => o.live).map((o) => CONFIGS[o.slug]);
    const productIds = live.map((c) => c.brand.paddleProductId);
    const prefixes = live.map((c) => c.brand.redisKeyPrefix);
    const fromEmails = live.map((c) => c.email.fromEmail);
    expect(new Set(productIds).size).toBe(productIds.length);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(new Set(fromEmails).size).toBe(fromEmails.length);
  });

  it('every live occasion config is collection-complete (synthesis + contributor fields + deliverable copy)', () => {
    for (const o of OCCASIONS.filter((x) => x.live)) {
      const cc = CONFIGS[o.slug].collectionConfig;
      expect(cc?.synthesisSystemPrompt, o.slug).toBeTruthy();
      expect(typeof cc?.buildSynthesisPrompt, o.slug).toBe('function');
      expect((cc?.contributorFormFields ?? []).length, o.slug).toBeGreaterThan(0);
      expect(o.deliverableNoun, o.slug).toBeTruthy();
      expect(o.readAloudContext, o.slug).toBeTruthy();
      expect(o.successIcon, o.slug).toBeTruthy();
      expect(o.terminalIcon, o.slug).toBeTruthy();
    }
  });

  // Per-occasion deliverable noun (SES-047 §7 [QA]). Render tests aren't possible
  // in the node-only runner, so this guards the config values that drive the
  // shared UI/email copy ("your tribute" vs "your toast"). A future config edit
  // that breaks a noun is caught here instead of shipping wrong copy.
  it('each live occasion uses its expected deliverableNoun', () => {
    expect(getOccasionMeta('memorial')?.deliverableNoun).toBe('tribute');
    expect(getOccasionMeta('wedding')?.deliverableNoun).toBe('toast');
    expect(getOccasionMeta('retirement')?.deliverableNoun).toBe('send-off');
    expect(getOccasionMeta('anniversary')?.deliverableNoun).toBe('toast');
  });

  it('memorial uses the candle; celebratory occasions use a distinct success icon', () => {
    expect(getOccasionMeta('memorial')?.successIcon).toBe('🕯️');
    for (const slug of ['wedding', 'retirement', 'anniversary']) {
      expect(getOccasionMeta(slug)?.successIcon, slug).not.toBe('🕯️');
    }
  });
});
