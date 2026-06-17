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

  it('falls back to the single live occasion for an unmapped txn (handler re-verifies payment)', async () => {
    // resolveConfigByTxn falls back to memorial; the generate fake acks. The
    // real handler would re-verify payment server-side and 404 an invalid txn —
    // that is venture-core's job, covered by its own tests.
    const res = await generate(makeRequest({ transactionId: 'txn_unmapped' }));
    expect(res.status).toBe(200);
  });
});
