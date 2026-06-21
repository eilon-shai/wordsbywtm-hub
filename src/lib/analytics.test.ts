import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackPurchase,
  trackPurchaseOnce,
  purchaseTrackedKey,
  adsMisconfigured,
} from './analytics';

// The conversion layer talks to window.gtag and dedupes via sessionStorage. The
// node test env has neither, so we install minimal stubs on globalThis and tear
// them down after each test. (analytics' gtag()/trackPurchaseOnce read the bare
// `window`/`sessionStorage` globals.)
type GtagCall = unknown[];
let gtagCalls: GtagCall[];

function installGtag() {
  gtagCalls = [];
  (globalThis as { window?: unknown }).window = {
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
  };
}

function installSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  vi.restoreAllMocks();
});

describe('analytics — purchase conversion', () => {
  beforeEach(() => {
    installGtag();
    installSessionStorage();
  });

  it('trackPurchase fires a GA4 purchase event with value/currency/txn', () => {
    trackPurchase({ value: 49, occasion: 'memorial', transactionId: 'txn_abc' });
    expect(gtagCalls).toHaveLength(1);
    const [evt, name, params] = gtagCalls[0] as [string, string, Record<string, unknown>];
    expect(evt).toBe('event');
    expect(name).toBe('purchase');
    expect(params).toMatchObject({ value: 49, currency: 'USD', transaction_id: 'txn_abc' });
  });

  it('is a safe no-op when gtag is not present', () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => trackPurchase({ value: 49, occasion: 'memorial', transactionId: 't' })).not.toThrow();
  });

  it('trackPurchaseOnce fires once per txn and dedupes the second call (both pay paths share the key)', () => {
    const first = trackPurchaseOnce({ value: 49, occasion: 'memorial', transactionId: 'txn_1' });
    const second = trackPurchaseOnce({ value: 49, occasion: 'memorial', transactionId: 'txn_1' });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(gtagCalls).toHaveLength(1); // exactly one purchase event for the txn
    // The dedup flag is written under the shared cross-path key.
    expect(
      (globalThis as { sessionStorage: Storage }).sessionStorage.getItem(purchaseTrackedKey('txn_1')),
    ).toBe('1');
  });

  it('trackPurchaseOnce treats different txns independently', () => {
    expect(trackPurchaseOnce({ value: 49, occasion: 'memorial', transactionId: 'a' })).toBe(true);
    expect(trackPurchaseOnce({ value: 59, occasion: 'wedding', transactionId: 'b' })).toBe(true);
    expect(gtagCalls).toHaveLength(2);
  });

  it('trackPurchaseOnce still fires (never drops a real sale) when sessionStorage is unavailable', () => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    expect(trackPurchaseOnce({ value: 49, occasion: 'memorial', transactionId: 'x' })).toBe(true);
    expect(gtagCalls).toHaveLength(1);
  });
});

describe('analytics — Ads misconfiguration (MF-5)', () => {
  it('is misconfigured only when the tag id is set without a conversion label', () => {
    expect(adsMisconfigured('AW-123', undefined)).toBe(true);
    expect(adsMisconfigured('AW-123', '')).toBe(true);
    expect(adsMisconfigured('AW-123', 'label')).toBe(false);
    expect(adsMisconfigured(undefined, undefined)).toBe(false);
    expect(adsMisconfigured(undefined, 'label')).toBe(false);
  });
});
