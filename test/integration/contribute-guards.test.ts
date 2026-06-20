import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks } from '../helpers/mocks';
import { resetStore, seedCollection, seedContributions, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as contribute } from '@/app/api/collection/contribute/route';

const base = { shareToken: 'sh', consent: true, memory: 'A memory.' };

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
  seedCollection({ occasion: 'memorial', shareToken: 'sh' });
});

describe('contribute guards', () => {
  it('accepts a valid contribution', async () => {
    const res = await contribute(makeRequest({ ...base, email: 'a@example.com' }));
    expect(res.status).toBe(200);
  });

  it('dedups one email per person (409 ALREADY_CONTRIBUTED)', async () => {
    await contribute(makeRequest({ ...base, email: 'dup@example.com' }));
    const res = await contribute(makeRequest({ ...base, email: 'dup@example.com' }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('ALREADY_CONTRIBUTED');
  });

  it('returns full at the free cap of 3 contributors', async () => {
    const meta = [...store.collections.values()][0];
    seedContributions(meta.id, 3);
    const res = await contribute(makeRequest({ ...base, email: 'fourth@example.com' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('COLLECTION_FULL');
    expect(body.status).toBe('full');
  });

  it('rejects an invalid email (INVALID_EMAIL)', async () => {
    const res = await contribute(makeRequest({ ...base, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_EMAIL');
  });

  it('requires consent (CONSENT_REQUIRED)', async () => {
    const res = await contribute(makeRequest({ ...base, email: 'c@example.com', consent: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('CONSENT_REQUIRED');
  });

  it('rejects contributions to a closed collection (COLLECTION_CLOSED)', async () => {
    const meta = [...store.collections.values()][0];
    meta.status = 'closed';
    const res = await contribute(makeRequest({ ...base, email: 'late@example.com' }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('COLLECTION_CLOSED');
  });

  it('rejects a public contribution that uses the organizer’s own email (INVALID_EMAIL)', async () => {
    // seeded organizerEmail is organizer@example.com — case-insensitive match.
    const res = await contribute(makeRequest({ ...base, contributorEmail: 'Organizer@Example.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_EMAIL');
  });

  it('allows the organizer’s own memory via isOrganizer (email guard does not apply)', async () => {
    const res = await contribute(
      makeRequest({ ...base, isOrganizer: true, contributorEmail: 'organizer@example.com', email: 'organizer@example.com' }),
    );
    expect(res.status).toBe(200);
  });
});
