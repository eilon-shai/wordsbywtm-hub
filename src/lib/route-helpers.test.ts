import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { dbMockFactory } from '../../test/helpers/mock-db';
import { resetStore, seedCollection } from '../../test/helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());

import { resolveForTokenPost } from './route-helpers';
import { CONFIGS } from './registry';

function postJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/collection/contribute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => resetStore());

describe('resolveForTokenPost', () => {
  it('resolves a share token to the config and leaves the body readable', async () => {
    seedCollection({ occasion: 'memorial', shareToken: 'sh1' });
    const req = postJson({ shareToken: 'sh1', memory: 'hi' });
    const resolved = await resolveForTokenPost(req, 'shareToken', 'share');
    expect(resolved).toBe(CONFIGS.memorial);
    // request.clone() was used, so the original body is still consumable.
    const body = await req.json();
    expect(body).toEqual({ shareToken: 'sh1', memory: 'hi' });
  });

  it('returns a canonical 404 NextResponse when the token is missing', async () => {
    const req = postJson({ memory: 'no token here' });
    const resolved = await resolveForTokenPost(req, 'shareToken', 'share');
    expect(resolved).toBeInstanceOf(NextResponse);
    const res = resolved as NextResponse;
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'NOT_FOUND', retryable: false });
  });

  it('returns 404 NextResponse when the token does not resolve (NotFoundError)', async () => {
    const req = postJson({ adminToken: 'nonexistent' });
    const resolved = await resolveForTokenPost(req, 'adminToken', 'admin');
    expect((resolved as NextResponse).status).toBe(404);
  });

  it('returns 404 for an unparseable body (token cannot be read)', async () => {
    const req = new NextRequest('http://localhost/api/collection/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json{',
    });
    const resolved = await resolveForTokenPost(req, 'shareToken', 'share');
    expect((resolved as NextResponse).status).toBe(404);
  });
});
