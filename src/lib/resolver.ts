import type { ProductConfig } from '@eilon-shai/venture-core/types';
import {
  getDbClient,
  getCollectionByShareToken,
  getCollectionByAdminToken,
} from '@eilon-shai/venture-core/db';
import { getConfig, CONFIGS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Token → occasion → ProductConfig resolver.
//
// Token-scoped routes (contribute / get / moderate / checkout) carry only a
// capability token. We look the collection up by token (the DB helpers take a
// SqlClient as their FIRST arg — B2 corrected signature), read its `.occasion`,
// and select the ProductConfig. The generate route has no token (only a txn),
// so it resolves via the txn→collection Redis mapping written at checkout time
// (see resolveConfigByTxn).
// ---------------------------------------------------------------------------

/** Thrown when no collection matches the supplied token/txn. Routes map this to 404. */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Resolve the ProductConfig for a token-scoped request.
 * @param token capability token from the request body/query
 * @param kind  'share' for the public contributor link, 'admin' for the organizer link
 */
export async function resolveConfigByToken(
  token: string,
  kind: 'share' | 'admin',
): Promise<ProductConfig> {
  const db = getDbClient();
  if (!db) throw new NotFoundError('Service unavailable');

  const meta =
    kind === 'share'
      ? await getCollectionByShareToken(db, token)
      : await getCollectionByAdminToken(db, token);

  if (!meta) throw new NotFoundError();

  const config = getConfig(meta.occasion);
  if (!config) throw new NotFoundError(`Unknown occasion: ${meta.occasion}`);
  return config;
}

/**
 * Resolve the ProductConfig for the generate route, which only carries a
 * transactionId. The checkout handler writes a `{prefix}:txn-collection:{txn}`
 * Redis mapping under each occasion's own redisKeyPrefix, so we probe the live
 * occasions' prefixes; whichever prefix holds the mapping identifies the
 * occasion. (getCollectionById is not exported from /db in 1.6.0, and there is
 * only one live occasion at launch, so prefix-probing is correct and cheap.)
 *
 * The generate handler itself re-reads the same mapping and verifies payment;
 * this resolver only selects which config to hand it.
 */
export async function resolveConfigByTxn(transactionId: string): Promise<ProductConfig> {
  // Lazy import: /redis is server-only and not needed by the other resolvers.
  const { getRedisClient } = await import('@eilon-shai/venture-core/redis');
  const redis = getRedisClient();

  if (redis) {
    for (const config of Object.values(CONFIGS)) {
      const mapped = await redis.get<string>(
        `${config.brand.redisKeyPrefix}:txn-collection:${transactionId}`,
      );
      if (mapped) return config;
    }
  }

  // No Redis (or no mapping found, e.g. real-mode where customData carries the
  // collectionId): fall back to the single live occasion. The handler re-resolves
  // and verifies payment, so an unknown txn still 404s safely there.
  const live = Object.values(CONFIGS).find((c) => !!c.collectionConfig);
  if (!live) throw new NotFoundError('No live occasion configured');
  return live;
}
