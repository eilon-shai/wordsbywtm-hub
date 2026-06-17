import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks, fakeRedis } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as markPaid } from '@/app/api/collection/mark-paid/route';
import { POST as finalize } from '@/app/api/collection/finalize-paid/route';
import { POST as contribute } from '@/app/api/collection/contribute/route';

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
});

describe('pay-in-advance', () => {
  it('mark-paid with a MOCK_ txn + seeded redis mapping sets paid_at', async () => {
    const meta = seedCollection({ occasion: 'memorial', shareToken: 'sh', adminToken: 'ad' });
    const txn = `MOCK_${meta.id}`;
    await fakeRedis.set(`wtm-memorial:txn-collection:${txn}`, meta.id);

    const res = await markPaid(makeRequest({ transactionId: txn }));
    expect(res.status).toBe(200);
    expect(meta.paidAt).toBeTruthy();
  });

  it('honors the 202-retry contract for a still-pending txn', async () => {
    const meta = seedCollection({ occasion: 'memorial' });
    const txn = `MOCK_${meta.id}`;
    await fakeRedis.set(`wtm-memorial:txn-collection:${txn}`, meta.id);
    const res = await markPaid(makeRequest({ transactionId: txn, pending: true }));
    expect(res.status).toBe(202);
    expect((await res.json()).retryable).toBe(true);
  });

  it('raises the contributor cap from 3 to 10 once paid in advance', async () => {
    const meta = seedCollection({ occasion: 'memorial', shareToken: 'sh', paidAt: new Date().toISOString() });
    store.contributorCounts.set(meta.id, 3); // would be full on the free plan
    const res = await contribute(makeRequest({ shareToken: 'sh', email: 'fourth@example.com', consent: true, memory: 'm' }));
    expect(res.status).toBe(200); // allowed because paid cap is 10
  });

  it('finalize-paid requires paid_at and does not start a new charge', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad', paidAt: new Date().toISOString() });
    const res = await finalize(makeRequest({ adminToken: 'ad' }));
    expect(res.status).toBe(200);
    expect((await res.json()).tribute).toBeTruthy();
    // mark-paid was never called in this test — no fresh checkout/charge path.
    expect(meta.paidTxnId).toBeUndefined();
  });
});
