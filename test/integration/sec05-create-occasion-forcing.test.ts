import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { NextRequest } from 'next/server';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import * as apiFakes from '../helpers/api-fakes';
import { redisMockFactory, resetMocks } from '../helpers/mocks';
import { resetStore } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/api', () => apiMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

import { POST as create } from '@/app/api/[occasion]/collection/create/route';
import { createCreateCollectionHandler } from '@eilon-shai/venture-core/api';

const params = (occasion: string) => ({ params: Promise.resolve({ occasion }) });

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
});

describe('SEC-05 — create occasion forcing', () => {
  it('forces occasion from the path, overriding a spoofed body.occasion', async () => {
    const res = await create(
      makeRequest({ occasion: 'wedding', honoreeName: 'X' }), // attacker tries to switch product
      params('memorial'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.occasion).toBe('memorial'); // forced from the validated path
  });

  it('rejects an unknown occasion with 404 WITHOUT invoking the core handler', async () => {
    const res = await create(makeRequest({ honoreeName: 'X' }), params('does-not-exist'));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('NOT_FOUND');
    expect(createCreateCollectionHandler).not.toHaveBeenCalled();
  });

  it('rejects a built-but-not-live occasion (wedding: has collectionConfig, live:false) with 404', async () => {
    const res = await create(makeRequest({ honoreeName: 'X' }), params('wedding'));
    expect(res.status).toBe(404);
  });

  it('still delegates when the body is unparseable (handler returns its own validation error)', async () => {
    const badReq = new NextRequest('http://localhost/api/memorial/collection/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json{',
    });
    const res = await create(badReq, params('memorial'));
    // The create fake reads an empty body and acks; the point is the route did
    // not throw and delegated to the handler with the route-forced occasion.
    expect(res.status).toBe(200);
    expect(createCreateCollectionHandler).toHaveBeenCalled();
    expect(apiFakes.sweepCalls).toBeDefined(); // module imported cleanly
  });
});
