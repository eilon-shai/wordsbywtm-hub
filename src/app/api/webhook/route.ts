import { createWebhookHandler } from '@eilon-shai/venture-core/api';
import { memorialConfig } from '@/products/memorial/config';

// Paddle webhook (transaction.completed). Reliability backstop: marks a
// collection paid (customData.collectionId → markCollectionPaid) even if the
// buyer never completes the redirect back to the app — so a second payment
// attempt is refused by the checkout handler and we avoid double charges.
//
// Configure in Paddle (Developer Tools → Notifications) to POST here, and set
// PADDLE_WEBHOOK_SECRET (signature verification happens inside the handler).
//
// NOTE: product-scoped. Memorial is the only live occasion today; when a second
// occasion goes live, give it its own Paddle webhook destination (or dispatch
// per live config here) — the handler ignores events for other products.
export const maxDuration = 60;
export const POST = createWebhookHandler(memorialConfig);
