import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../../../../../test/helpers/mock-db';
import { resetStore, seedCollection, store } from '../../../../../test/helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());

import { POST as checkExisting } from './route';

beforeEach(() => resetStore());

describe('check-existing — never an existence oracle', () => {
  it('{exists:false} for a malformed body', async () => {
    const res = await checkExisting(makeRequest('not json{' as unknown));
    expect(await res.json()).toEqual({ exists: false });
  });

  it('{exists:false} for an invalid email', async () => {
    const res = await checkExisting(makeRequest({ email: 'bad', occasion: 'memorial' }));
    expect(await res.json()).toEqual({ exists: false });
  });

  it('{exists:false} for an unknown occasion', async () => {
    const res = await checkExisting(makeRequest({ email: 'a@example.com', occasion: 'nope' }));
    expect(await res.json()).toEqual({ exists: false });
  });

  it('{exists:true} when an open collection exists for the organizer', async () => {
    seedCollection({ occasion: 'memorial', organizerEmail: 'org@example.com' });
    const res = await checkExisting(makeRequest({ email: 'org@example.com', occasion: 'memorial' }));
    expect(await res.json()).toEqual({ exists: true });
  });

  it('swallows db errors and returns {exists:false}', async () => {
    store.lookupThrows = true;
    const res = await checkExisting(makeRequest({ email: 'org@example.com', occasion: 'memorial' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: false });
  });
});
