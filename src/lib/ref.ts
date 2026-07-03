// ---------------------------------------------------------------------------
// Partner referral (?ref) capture — client-safe, zero imports.
//
// Funeral-home/hospice partners hand families links like
// /memorial?ref=smith-funeral. The funnel is MULTI-DAY (create now, pay days
// later via the emailed magic link, possibly on another device), so browser
// storage alone can't carry attribution to checkout. This module only bridges
// the SHORT hop — landing visit → create POST — after which the slug lives on
// the collection row itself (see src/lib/referrer.ts).
//
// The value is a partner slug, never PII. Anything that doesn't match the slug
// shape is dropped on the floor at every boundary (capture, read, server).
// ---------------------------------------------------------------------------

/**
 * Lowercase slug, 3–40 chars, alphanumeric + hyphens, no edge hyphens.
 * The partner allowlist (src/lib/partners.ts) reuses this to validate opaque
 * tokens (`p_8f3a2`) — one source of truth for what a legal `?ref` looks like.
 */
export const REF_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Request header the create POST carries the slug on. */
export const REF_HEADER = 'x-wtm-ref';

export const REF_STORAGE_KEY = 'wtm:ref';

/** Attribution window: entries older than 90 days are expired on read. */
export const REF_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function isValidRefSlug(value: unknown): value is string {
  return typeof value === 'string' && REF_SLUG_RE.test(value);
}

interface StoredRef {
  slug: string;
  ts: number;
}

// localStorage access is wrapped in try/catch throughout: it throws in private
// browsing / storage-denied contexts, and attribution is never worth an error.
function readRaw(): StoredRef | null {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRef>;
    if (!isValidRefSlug(parsed.slug) || typeof parsed.ts !== 'number') return null;
    return { slug: parsed.slug, ts: parsed.ts };
  } catch {
    return null;
  }
}

/** Persist a captured slug. A fresher stored entry is never overwritten by an older visit. */
export function storeRefSlug(slug: string, now: number = Date.now()): void {
  if (!isValidRefSlug(slug)) return;
  try {
    const existing = readRaw();
    if (existing && existing.ts > now) return;
    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ slug, ts: now }));
  } catch {
    /* storage unavailable — capture is best-effort */
  }
}

/** The stored slug if valid and within the 90-day window, else null (expired entries are cleared). */
export function readRefSlug(now: number = Date.now()): string | null {
  const stored = readRaw();
  if (!stored) return null;
  if (now - stored.ts > REF_TTL_MS) {
    try {
      localStorage.removeItem(REF_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return stored.slug;
}

/**
 * Remove any stored ref token. Called once the token has been attached to a
 * collection at create, so a single partner-link click doesn't keep
 * discounting every later, unrelated collection created from the same browser
 * for the whole 90-day window. Safe for the multi-day funnel: the pay-time
 * discount reads the collection row (`collections.referrer`), not localStorage.
 */
export function clearRefSlug(): void {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Capture ?ref from a location.search string (used by RefCapture on mount). */
export function captureRefFromSearch(search: string, now: number = Date.now()): void {
  try {
    const slug = new URLSearchParams(search).get('ref');
    if (slug !== null) storeRefSlug(slug, now);
  } catch {
    /* malformed search — nothing to capture */
  }
}
