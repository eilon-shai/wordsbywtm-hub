import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { createWebhookHandler } from '@eilon-shai/venture-core/api';
import { OCCASIONS, getConfig } from '@/lib/registry';

// Paddle webhook (transaction.completed). Reliability backstop: marks a
// collection paid (customData.collectionId → markCollectionPaid) even if the
// buyer never completes the redirect back to the app.
//
// Multi-occasion: a single Paddle account (and webhook destination) delivers
// events for EVERY occasion's product. They share one signing secret, so any
// occasion config verifies the signature — we route to the config whose
// paddleProductId matches the event's customData.product so each occasion's
// collections get marked paid. The chosen handler still re-verifies the
// signature and re-checks the product (defense in depth).
//
// Configure in Paddle (Developer Tools → Notifications) to POST here, and set
// PADDLE_WEBHOOK_SECRET[_SANDBOX] + PADDLE_API_KEY[_SANDBOX].

export const maxDuration = 60;

const LIVE_CONFIGS: ProductConfig[] = OCCASIONS.filter((o) => o.live)
  .map((o) => getConfig(o.slug))
  .filter((c): c is ProductConfig => !!c?.collectionConfig);

export async function POST(request: NextRequest): Promise<Response> {
  if (LIVE_CONFIGS.length === 0) {
    return NextResponse.json({ ok: true, note: 'no live occasion' });
  }

  // Read the product from a clone to route (does NOT grant anything — the chosen
  // handler still verifies the signature + product). Raw Paddle payloads are
  // snake_case (custom_data); be tolerant of camelCase too.
  let product: string | undefined;
  try {
    const body = (await request.clone().json()) as {
      data?: { custom_data?: { product?: string }; customData?: { product?: string } };
    };
    product = body?.data?.custom_data?.product ?? body?.data?.customData?.product;
  } catch {
    /* unparseable — fall back to the first live config so the signature is still checked */
  }

  const target = (product && LIVE_CONFIGS.find((c) => c.brand.paddleProductId === product)) || LIVE_CONFIGS[0];
  return createWebhookHandler(target)(request);
}
