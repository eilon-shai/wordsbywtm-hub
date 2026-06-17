import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { NextRequest } from 'next/server';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks, fakeRedis, sentEmails } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as createRoute } from '@/app/api/[occasion]/collection/create/route';
import { POST as contributeRoute } from '@/app/api/collection/contribute/route';
import { POST as moderateRoute } from '@/app/api/collection/moderate/route';
import { POST as checkoutRoute } from '@/app/api/collection/checkout/route';
import { POST as markPaidRoute } from '@/app/api/collection/mark-paid/route';
import { POST as finalizeRoute } from '@/app/api/collection/finalize-paid/route';

const params = (occasion: string) => ({ params: Promise.resolve({ occasion }) });

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
});

describe('happy path — full collection lifecycle (create → contribute → moderate → checkout → mark-paid → finalize)', () => {
  it('drives one collection through every stage with shared mock-db state', async () => {
    // 1. create (occasion in path)
    const createRes = await createRoute(makeRequest({ organizerEmail: 'org@example.com', honoreeName: 'Jane' }), params('memorial'));
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.occasion).toBe('memorial');

    // Seed the canonical collection the rest of the flow reads (the create fake
    // returns tokens; we seed a stable collection with those tokens).
    const meta = seedCollection({
      occasion: 'memorial',
      shareToken: 'sh-life',
      adminToken: 'ad-life',
      organizerEmail: 'org@example.com',
    });

    // 2. contribute — organizer + 2 contributors
    for (const c of [
      { email: 'org@example.com', memory: 'm0' },
      { email: 'a@example.com', memory: 'm1' },
      { email: 'b@example.com', memory: 'm2' },
    ]) {
      const res = await contributeRoute(
        makeRequest({ shareToken: 'sh-life', consent: true, ...c }),
      );
      expect(res.status).toBe(200);
    }
    expect(store.contributorCounts.get(meta.id)).toBe(3);

    // 3. moderate
    const modRes = await moderateRoute(makeRequest({ adminToken: 'ad-life', action: 'include', contributionId: 'x' }));
    expect(modRes.status).toBe(200);

    // 4. checkout — writes redis txn->collection mapping
    const checkoutRes = await checkoutRoute(makeRequest({ adminToken: 'ad-life' }));
    expect(checkoutRes.status).toBe(200);
    const { transactionId } = await checkoutRes.json();
    expect(transactionId).toBe(`MOCK_${meta.id}`);
    const prefix = 'wtm-memorial';
    expect(await fakeRedis.get(`${prefix}:txn-collection:${transactionId}`)).toBe(meta.id);

    // 5. mark-paid — sets paid_at (resolves occasion via redis mapping)
    expect(meta.paidAt).toBeNull();
    const markRes = await markPaidRoute(makeRequest({ transactionId }));
    expect(markRes.status).toBe(200);
    expect(meta.paidAt).toBeTruthy();

    // 6. finalize-paid — enforces paid_at gate, returns canned synthesis + emails tribute
    const finRes = await finalizeRoute(makeRequest({ adminToken: 'ad-life' }));
    expect(finRes.status).toBe(200);
    const fin = await finRes.json();
    expect(fin.tribute).toContain('tribute');
    expect(sentEmails.some((e) => e.kind === 'tribute')).toBe(true);
  });

  it('finalize-paid is blocked (402) before mark-paid sets paid_at', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad-unpaid' });
    const res = await finalizeRoute(
      new NextRequest('http://localhost/api/collection/finalize-paid', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken: 'ad-unpaid' }),
      }),
    );
    expect(res.status).toBe(402);
    expect((await res.json()).code).toBe('PAYMENT_REQUIRED');
  });
});
