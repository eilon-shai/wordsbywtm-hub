import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  isValidRefSlug,
  storeRefSlug,
  readRefSlug,
  captureRefFromSearch,
  REF_STORAGE_KEY,
  REF_TTL_MS,
} from './ref';

// ---------------------------------------------------------------------------
// Unit tests for the ?ref partner-slug capture helpers. Vitest runs in a node
// environment (no jsdom), so localStorage is stubbed with a Map-backed fake.
// ---------------------------------------------------------------------------

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

let storage: ReturnType<typeof makeStorage>;

beforeEach(() => {
  storage = makeStorage();
  (globalThis as Record<string, unknown>).localStorage = storage;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('isValidRefSlug', () => {
  it.each(['smith-funeral', 'abc', 'a1b', 'hospice-of-the-valley-2', 'a'.repeat(40)])(
    'accepts %s',
    (slug) => {
      expect(isValidRefSlug(slug)).toBe(true);
    },
  );

  it.each([
    '', // empty
    'ab', // too short (min 3)
    'a'.repeat(41), // too long (max 40)
    'Smith-Funeral', // uppercase
    '-smith', // leading hyphen
    'smith-', // trailing hyphen
    'smith funeral', // whitespace
    'smith_funeral', // underscore
    'a@b.com', // email-shaped (never PII)
    '../../etc', // path traversal chars
    "x'; drop table collections;--", // injection-shaped
  ])('rejects %j', (slug) => {
    expect(isValidRefSlug(slug)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidRefSlug(null)).toBe(false);
    expect(isValidRefSlug(undefined)).toBe(false);
    expect(isValidRefSlug(42)).toBe(false);
  });
});

describe('storeRefSlug / readRefSlug', () => {
  it('round-trips a valid slug', () => {
    storeRefSlug('smith-funeral', 1000);
    expect(readRefSlug(2000)).toBe('smith-funeral');
  });

  it('never stores an invalid slug', () => {
    storeRefSlug('NOT A SLUG');
    expect(storage._map.size).toBe(0);
  });

  it('a newer visit overwrites an older stored slug (last-touch)', () => {
    storeRefSlug('old-partner', 1000);
    storeRefSlug('new-partner', 2000);
    expect(readRefSlug(3000)).toBe('new-partner');
  });

  it('an older visit never overwrites a fresher stored slug', () => {
    storeRefSlug('fresh-partner', 5000);
    storeRefSlug('stale-partner', 1000);
    expect(readRefSlug(6000)).toBe('fresh-partner');
  });

  it('expires entries older than 90 days on read (and clears them)', () => {
    storeRefSlug('smith-funeral', 0);
    expect(readRefSlug(REF_TTL_MS + 1)).toBeNull();
    expect(storage._map.has(REF_STORAGE_KEY)).toBe(false);
  });

  it('still returns the slug right at the 90-day boundary', () => {
    storeRefSlug('smith-funeral', 0);
    expect(readRefSlug(REF_TTL_MS)).toBe('smith-funeral');
  });

  it('returns null on tampered storage (garbage JSON or invalid stored slug)', () => {
    storage.setItem(REF_STORAGE_KEY, 'not-json{');
    expect(readRefSlug()).toBeNull();
    storage.setItem(REF_STORAGE_KEY, JSON.stringify({ slug: 'BAD SLUG', ts: Date.now() }));
    expect(readRefSlug()).toBeNull();
  });

  it('is a silent no-op when localStorage is unavailable', () => {
    delete (globalThis as Record<string, unknown>).localStorage;
    expect(() => storeRefSlug('smith-funeral')).not.toThrow();
    expect(readRefSlug()).toBeNull();
  });
});

describe('captureRefFromSearch', () => {
  it('captures a valid ?ref from a search string', () => {
    captureRefFromSearch('?ref=smith-funeral&utm_source=partner', 1000);
    expect(readRefSlug(2000)).toBe('smith-funeral');
  });

  it('ignores an invalid ?ref value', () => {
    captureRefFromSearch('?ref=Not%20A%20Slug');
    expect(storage._map.size).toBe(0);
  });

  it('is a no-op with no ref param', () => {
    captureRefFromSearch('?utm_source=partner');
    expect(storage._map.size).toBe(0);
    captureRefFromSearch('');
    expect(storage._map.size).toBe(0);
  });
});
