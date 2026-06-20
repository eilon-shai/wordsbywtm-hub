import {
  store,
  findByShareToken,
  findByAdminToken,
  findOpenByOrganizer,
} from './store';

// ---------------------------------------------------------------------------
// vi.mock factory for '@eilon-shai/venture-core/db'.
//
// vi.mock is hoisted, but its factory may reference values imported by THIS
// module (Vitest tracks the dependency). Each test file does:
//
//   vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
//
// getDbClient() returns a truthy sentinel (the real client is a tagged-template
// SqlClient; the app only checks truthiness and passes it through to helpers we
// also stub here). The stubbed helpers read/write the shared in-memory store.
// ---------------------------------------------------------------------------

const DB_SENTINEL = { __mockDb: true };

export function dbMockFactory() {
  return {
    getDbClient: () => (store.dbNull ? null : DB_SENTINEL),

    getCollectionByShareToken: async (_db: unknown, token: string) => {
      if (store.lookupThrows) throw new Error('db boom');
      return findByShareToken(token);
    },
    getCollectionByAdminToken: async (_db: unknown, token: string) => {
      if (store.lookupThrows) throw new Error('db boom');
      return findByAdminToken(token);
    },
    findOpenCollectionByOrganizer: async (_db: unknown, product: string, email: string) => {
      if (store.lookupThrows) throw new Error('db boom');
      return findOpenByOrganizer(product, email.toLowerCase());
    },
    countContributors: async (_db: unknown, collectionId: string) =>
      store.contributorCounts.get(collectionId) ?? 0,
    contributorCap: (paid: boolean) => (paid ? 10 : 3),
    // Deterministic, round-trippable stand-ins for the real HMAC tokens — the
    // app only needs sign→verify to round-trip and a tampered token to fail.
    signInviteEmail: (email: string) => `inv1.${email.trim().toLowerCase()}`,
    verifyInviteEmail: (token: string) =>
      typeof token === 'string' && token.startsWith('inv1.') ? token.slice(5) : null,
    purgeExpired: async (_db: unknown) => {
      if (store.purgeThrows) throw new Error('purge boom');
      return store.purgedCount;
    },
  };
}
