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
// Strict isolation: we route ONLY to the config whose Paddle product matches.
// There is no "first live config" fallback — an unmatched/missing product must
// never be dispatched to an arbitrary occasion (a payment for one product must
// never touch another's collections). Unmatched events 200 no-op.
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
    /* unparseable — treated as unmatched below (no-op) */
  }

  // No fallback: dispatch only on an exact product match. Missing/unmatched →
  // 200 no-op (nothing to mark; returning 200 stops Paddle retrying a
  // non-actionable event).
  const target = product ? LIVE_CONFIGS.find((c) => c.brand.paddleProductId === product) : undefined;
  if (!target) {
    return NextResponse.json({ ok: true, note: 'no matching live product for event' });
  }
  return createWebhookHandler(target)(request);
}
