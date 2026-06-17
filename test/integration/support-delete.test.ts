import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const MEMORIAL = process.env.PADDLE_PRODUCT_ID_MEMORIAL ?? 'pro_01kv1g5d6c4b3wcr74jswnnspa';

vi.mock('@eilon-shai/venture-core/db', () => ({
  getDbClient: vi.fn(() => ({})),
  getCollectionByAdminToken: vi.fn(),
  deleteCollection: vi.fn(async () => {}),
}));

import * as db from '@eilon-shai/venture-core/db';
import { POST } from '@/app/api/support/delete/route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/support/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getDbClient).mockReturnValue({} as never);
});

describe('support/delete route', () => {
  it('deletes a collection found for the product', async () => {
    vi.mocked(db.getCollectionByAdminToken).mockResolvedValue({ id: 'c1', product: MEMORIAL, honoreeName: 'Edi' } as never);
    const res = await POST(req({ occasion: 'memorial', adminToken: 'ad_1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
    expect(db.deleteCollection).toHaveBeenCalledWith(expect.anything(), 'c1');
  });

  it('does NOT delete when the token belongs to another product (idempotent ok)', async () => {
    vi.mocked(db.getCollectionByAdminToken).mockResolvedValue({ id: 'c2', product: 'pro_other', honoreeName: 'X' } as never);
    const res = await POST(req({ occasion: 'memorial', adminToken: 'ad_2' }));
    expect(res.status).toBe(200);
    expect(db.deleteCollection).not.toHaveBeenCalled();
  });

  it('idempotent ok when the collection is already gone', async () => {
    vi.mocked(db.getCollectionByAdminToken).mockResolvedValue(null as never);
    const res = await POST(req({ occasion: 'memorial', adminToken: 'ad_3' }));
    expect(res.status).toBe(200);
    expect(db.deleteCollection).not.toHaveBeenCalled();
  });

  it('400 on missing token', async () => {
    expect((await POST(req({ occasion: 'memorial' }))).status).toBe(400);
  });

  it('400 on unknown product', async () => {
    expect((await POST(req({ occasion: 'nope', adminToken: 'ad_4' }))).status).toBe(400);
  });

  it('503 when the DB is unavailable', async () => {
    vi.mocked(db.getDbClient).mockReturnValue(null as never);
    expect((await POST(req({ occasion: 'memorial', adminToken: 'ad_5' }))).status).toBe(503);
  });
});
