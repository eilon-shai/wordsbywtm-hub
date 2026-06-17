import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbMockFactory } from '../../test/helpers/mock-db';
import { resetStore, seedCollection, store } from '../../test/helpers/store';
import { fakeRedis, resetMocks, redisMockFactory } from '../../test/helpers/mocks';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import {
  resolveConfigByToken,
  resolveConfigByTxn,
  NotFoundError,
} from './resolver';
import { CONFIGS } from './registry';

beforeEach(() => {
  resetStore();
  resetMocks();
});

describe('resolveConfigByToken', () => {
  it('resolves by share token to the collection occasion config', async () => {
    seedCollection({ occasion: 'memorial', shareToken: 'sh1' });
    const cfg = await resolveConfigByToken('sh1', 'share');
    expect(cfg).toBe(CONFIGS.memorial);
  });

  it('resolves by admin token to the collection occasion config', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad1' });
    const cfg = await resolveConfigByToken('ad1', 'admin');
    expect(cfg).toBe(CONFIGS.memorial);
  });

  it('throws NotFoundError when the db client is null (service unavailable)', async () => {
    store.dbNull = true;
    await expect(resolveConfigByToken('whatever', 'share')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when no collection matches the token', async () => {
    await expect(resolveConfigByToken('missing', 'admin')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when the collection occasion is unknown', async () => {
    seedCollection({ occasion: 'bogus', shareToken: 'sh-bogus' });
    await expect(resolveConfigByToken('sh-bogus', 'share')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('resolveConfigByTxn', () => {
  it('resolves via the redis txn->collection mapping under the occasion prefix', async () => {
    const prefix = CONFIGS.memorial.brand.redisKeyPrefix;
    await fakeRedis.set(`${prefix}:txn-collection:txn_abc`, 'col_1');
    const cfg = await resolveConfigByTxn('txn_abc');
    expect(cfg).toBe(CONFIGS.memorial);
  });

  it('falls back to the single live occasion when no mapping exists', async () => {
    const cfg = await resolveConfigByTxn('txn_unmapped');
    expect(cfg).toBe(CONFIGS.memorial); // only live occasion with collectionConfig
  });
});
