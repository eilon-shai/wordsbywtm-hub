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
 * transactionId. The checkout handler ALWAYS writes a `{prefix}:txn-collection:{txn}`
 * Redis mapping under the occasion's own redisKeyPrefix (both real and mock
 * paths), so we probe the live occasions' prefixes; whichever prefix holds the
 * mapping identifies the occasion.
 *
 * Multi-occasion safety: there is NO occasion fallback. With four live occasions,
 * guessing (e.g. "first config with a collectionConfig") could hand the generate
 * handler the WRONG occasion's config — and the handler verifies payment against
 * that config's Paddle product, so a mis-guess fails anyway. If no mapping is
 * found we throw NotFoundError → the route 404s, and the client recovers via the
 * admin-token path (/tribute), which resolves by DB token (resolveConfigByToken).
 * The generate handler reads the same mapping for the collectionId, so a missing
 * mapping is unrecoverable here regardless — throwing is correct, not lossy.
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

  // No mapping for this txn under any live occasion → we cannot identify the
  // occasion. Never fall back to an arbitrary one (cross-occasion mis-resolution).
  throw new NotFoundError('Could not resolve occasion for transaction');
}
