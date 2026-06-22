import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as del } from '@/app/api/collection/delete/route';

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
});

// The result-page "Delete this collection + tribute" sends confirmPaidDeletion:true.
// The hub wrapper must honor it ONLY for an already-generated collection — a paid
// collection whose tribute hasn't been created yet stays protected (the organizer
// paid for a deliverable they haven't received).
describe('delete — generated-only confirmed deletion (result page)', () => {
  it('FORBIDS deleting a paid-but-ungenerated collection even with confirmPaidDeletion (409 PAID_NOT_GENERATED)', async () => {
    const meta = seedCollection({
      occasion: 'memorial',
      adminToken: 'paid-open',
      status: 'open',
      paidAt: '2026-06-22T00:00:00Z',
    });
    const res = await del(makeRequest({ adminToken: 'paid-open', confirmPaidDeletion: true }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('PAID_NOT_GENERATED');
    expect(store.collections.has(meta.id)).toBe(true); // untouched
  });

  it('ALLOWS deleting a GENERATED (paid) collection with confirmPaidDeletion', async () => {
    const meta = seedCollection({
      occasion: 'memorial',
      adminToken: 'gen',
      status: 'generated',
      paidAt: '2026-06-22T00:00:00Z',
    });
    const res = await del(makeRequest({ adminToken: 'gen', confirmPaidDeletion: true }));
    expect(res.status).toBe(200);
    expect(store.collections.has(meta.id)).toBe(false);
  });

  it('still deletes an unpaid/open collection (no confirm flag needed)', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'unpaid', status: 'open', paidAt: null });
    const res = await del(makeRequest({ adminToken: 'unpaid' }));
    expect(res.status).toBe(200);
    expect(store.collections.has(meta.id)).toBe(false);
  });
});
