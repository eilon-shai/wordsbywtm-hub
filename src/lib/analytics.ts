// ---------------------------------------------------------------------------
// Lightweight analytics helpers. GA4 + Google Ads share gtag.js; Microsoft
// Clarity is its own snippet. Everything is gated on NEXT_PUBLIC_* env vars, so
// nothing loads (and no events fire) unless the corresponding id is set.
// ---------------------------------------------------------------------------

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
export const ADS_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID;
export const ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

type GtagFn = (...args: unknown[]) => void;
function gtag(): GtagFn | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { gtag?: GtagFn };
  return typeof w.gtag === 'function' ? w.gtag : null;
}

/**
 * Fire the purchase conversion: a GA4 `purchase` event (for analytics) and, if a
 * Google Ads tag + conversion label are set, the Ads `conversion` event (for
 * Smart Bidding / ROAS). Safe to call when nothing is configured (no-op).
 */
export function trackPurchase(opts: { value: number; occasion: string; transactionId?: string }): void {
  const g = gtag();
  if (!g) return;
  g('event', 'purchase', {
    value: opts.value,
    currency: 'USD',
    transaction_id: opts.transactionId,
    items: [{ item_id: opts.occasion, item_name: `${opts.occasion} collection` }],
  });
  if (ADS_TAG_ID && ADS_CONVERSION_LABEL) {
    g('event', 'conversion', {
      send_to: `${ADS_TAG_ID}/${ADS_CONVERSION_LABEL}`,
      value: opts.value,
      currency: 'USD',
      transaction_id: opts.transactionId,
    });
  }
}
