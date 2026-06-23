import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const del = vi.fn(async () => 1);

vi.mock('@eilon-shai/venture-core/redis', () => ({
  getRedisClient: vi.fn(() => ({ del })),
}));
vi.mock('@eilon-shai/venture-core/db', () => ({
  getDbClient: vi.fn(() => ({})),
  getCollectionByAdminToken: vi.fn(),
}));
vi.mock('@/lib/route-helpers', () => ({
  resolveForTokenPost: vi.fn(),
}));

import * as redisMod from '@eilon-shai/venture-core/redis';
import * as dbMod from '@eilon-shai/venture-core/db';
import * as helpers from '@/lib/route-helpers';
import { POST } from '@/app/api/collection/checkout/release/route';

const CONFIG = { brand: { redisKeyPrefix: 'wtm-memorial' } };

function req(body: unknown) {
  return new NextRequest('http://localhost/api/collection/checkout/release', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(helpers.resolveForTokenPost).mockResolvedValue(CONFIG as never);
  vi.mocked(redisMod.getRedisClient).mockReturnValue({ del } as never);
  vi.mocked(dbMod.getDbClient).mockReturnValue({} as never);
});

describe('collection/checkout/release route', () => {
  it('deletes the checkout-lock for the resolved collection', async () => {
    vi.mocked(dbMod.getCollectionByAdminToken).mockResolvedValue({ id: 'c1' } as never);
    const res = await POST(req({ adminToken: 'ad_1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    // key prefix + collection id must match the venture-core checkout handler's lock key
    expect(del).toHaveBeenCalledWith('wtm-memorial:checkout-lock:c1');
  });

  it('ok no-op when the collection is not found', async () => {
    vi.mocked(dbMod.getCollectionByAdminToken).mockResolvedValue(null as never);
    const res = await POST(req({ adminToken: 'ad_2' }));
    expect(res.status).toBe(200);
    expect(del).not.toHaveBeenCalled();
  });

  it('404 when the token does not resolve a config', async () => {
    vi.mocked(helpers.resolveForTokenPost).mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 }) as never,
    );
    const res = await POST(req({ adminToken: 'bad' }));
    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });

  it('400 when adminToken is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(del).not.toHaveBeenCalled();
  });

  it('ok (no throw) when redis is unavailable — nothing to release', async () => {
    vi.mocked(redisMod.getRedisClient).mockReturnValue(null as never);
    const res = await POST(req({ adminToken: 'ad_3' }));
    expect(res.status).toBe(200);
    expect(del).not.toHaveBeenCalled();
  });
});
