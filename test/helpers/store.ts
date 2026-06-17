import type { CollectionMeta } from '@eilon-shai/venture-core/db';

// ---------------------------------------------------------------------------
// Shared in-memory store. Lives in its own module (no vitest imports) so it can
// be imported by both the vi.mock factory (hoisted) and the test bodies, and
// both see the SAME object. The mock factory reads from here; tests seed here.
// ---------------------------------------------------------------------------

export interface StoreState {
  collections: Map<string, CollectionMeta>; // keyed by id
  contributorCounts: Map<string, number>; // collectionId -> count
  dbNull: boolean; // simulate getDbClient() returning null
  purgeThrows: boolean; // simulate purgeExpired throwing
  purgedCount: number; // value purgeExpired resolves to
  lookupThrows: boolean; // simulate a db helper throwing (check-existing/invite)
}

export const store: StoreState = {
  collections: new Map(),
  contributorCounts: new Map(),
  dbNull: false,
  purgeThrows: false,
  purgedCount: 0,
  lookupThrows: false,
};

export function resetStore(): void {
  store.collections.clear();
  store.contributorCounts.clear();
  store.dbNull = false;
  store.purgeThrows = false;
  store.purgedCount = 0;
  store.lookupThrows = false;
}

let seq = 0;

export interface SeedOpts {
  occasion?: string;
  shareToken?: string;
  adminToken?: string;
  status?: CollectionMeta['status'];
  paidAt?: string | null;
  organizerEmail?: string;
  honoreeName?: string;
  product?: string;
}

export function seedCollection(opts: SeedOpts = {}): CollectionMeta {
  const id = `col_${++seq}`;
  const meta: CollectionMeta = {
    id,
    product: opts.product ?? 'pro_01kv1g5d6c4b3wcr74jswnnspa',
    organizerEmail: opts.organizerEmail ?? 'organizer@example.com',
    honoreeName: opts.honoreeName ?? 'Jane Doe',
    occasion: opts.occasion ?? 'memorial',
    tier: 'standard',
    status: opts.status ?? 'open',
    shareToken: opts.shareToken ?? `share_${id}`,
    adminToken: opts.adminToken ?? `admin_${id}`,
    priceShown: 29,
    createdAt: new Date().toISOString(),
    deadline: null,
    purgeAfter: null,
    paidAt: opts.paidAt ?? null,
  } as CollectionMeta;
  store.collections.set(id, meta);
  return meta;
}

export function seedContributions(collectionId: string, n: number): void {
  store.contributorCounts.set(collectionId, n);
}

export function findByShareToken(token: string): CollectionMeta | null {
  for (const c of store.collections.values()) if (c.shareToken === token) return c;
  return null;
}

export function findByAdminToken(token: string): CollectionMeta | null {
  for (const c of store.collections.values()) if (c.adminToken === token) return c;
  return null;
}

export function findOpenByOrganizer(product: string, email: string): CollectionMeta | null {
  for (const c of store.collections.values()) {
    if (c.product === product && c.organizerEmail === email && c.status === 'open') return c;
  }
  return null;
}
