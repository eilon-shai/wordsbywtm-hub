import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks, fakeRedis } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as del } from '@/app/api/collection/delete/route';
import { POST as generate } from '@/app/api/collection/generate/route';

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
});

describe('delete (admin-token scoped)', () => {
  it('deletes the collection via its admin token', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const res = await del(makeRequest({ adminToken: 'ad' }));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(meta.id);
    expect(store.collections.has(meta.id)).toBe(false);
  });

  it('404s for an unknown admin token (resolver fallback)', async () => {
    const res = await del(makeRequest({ adminToken: 'missing' }));
    expect(res.status).toBe(404);
  });
});

describe('generate — txn resolve', () => {
  it('400 when transactionId is missing', async () => {
    const res = await generate(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_SESSION');
  });

  it('delegates when a seeded redis txn->collection mapping resolves the occasion', async () => {
    const meta = seedCollection({ occasion: 'memorial' });
    const txn = `MOCK_${meta.id}`;
    await fakeRedis.set(`wtm-memorial:txn-collection:${txn}`, meta.id);
    const res = await generate(makeRequest({ transactionId: txn }));
    expect(res.status).toBe(200);
    expect((await res.json()).generated).toBe(true);
  });

  it('404s an unmapped txn — never falls back to an arbitrary occasion (cross-occasion safety)', async () => {
    // resolveConfigByTxn now throws NotFoundError when no occasion holds the
    // txn→collection mapping (with four live occasions, guessing could resolve to
    // the wrong product). The route maps that to 404; the client recovers via the
    // admin-token /tribute path.
    const res = await generate(makeRequest({ transactionId: 'txn_unmapped' }));
    expect(res.status).toBe(404);
  });

  it('resolves the correct occasion among several for a mapped txn (no cross-occasion bleed)', async () => {
    const meta = seedCollection({ occasion: 'wedding' });
    const txn = `MOCK_${meta.id}`;
    await fakeRedis.set(`wtm-wedding:txn-collection:${txn}`, meta.id);
    const res = await generate(makeRequest({ transactionId: txn }));
    expect(res.status).toBe(200);
    expect((await res.json()).generated).toBe(true);
  });
});
