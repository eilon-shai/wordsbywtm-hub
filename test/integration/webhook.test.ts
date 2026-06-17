import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// createWebhookHandler is replaced with a spy that echoes which occasion config it
// was handed — so we can assert the route's product-routing without the real
// signature-verifying handler.
vi.mock('@eilon-shai/venture-core/api', () => ({
  createWebhookHandler: vi.fn((config: { brand: { paddleProductId: string } }) =>
    vi.fn(async () => NextResponse.json({ routedTo: config.brand.paddleProductId })),
  ),
}));

import { POST } from '@/app/api/webhook/route';

const MEMORIAL = process.env.PADDLE_PRODUCT_ID_MEMORIAL ?? 'pro_01kv1g5d6c4b3wcr74jswnnspa';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('webhook route — multi-occasion dispatch', () => {
  it('routes to the matching occasion config (snake_case custom_data.product)', async () => {
    const res = await POST(req({ event_type: 'transaction.completed', data: { custom_data: { product: MEMORIAL } } }));
    expect(res.status).toBe(200);
    expect((await res.json()).routedTo).toBe(MEMORIAL);
  });

  it('reads camelCase customData.product too', async () => {
    const res = await POST(req({ data: { customData: { product: MEMORIAL } } }));
    expect((await res.json()).routedTo).toBe(MEMORIAL);
  });

  it('falls back to the first live config when product is unknown', async () => {
    const res = await POST(req({ data: { custom_data: { product: 'pro_not_a_real_one' } } }));
    expect(res.status).toBe(200);
    expect((await res.json()).routedTo).toBe(MEMORIAL);
  });

  it('still invokes a handler on an unparseable body (signature gets re-checked)', async () => {
    const bad = new NextRequest('http://localhost/api/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    const res = await POST(bad);
    expect(res.status).toBe(200);
  });
});
