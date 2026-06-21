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

/**
 * sessionStorage flag key that dedupes the purchase conversion across BOTH pay
 * paths — the result-page PurchaseTracker (pay-at-finalize) and the advance-pay
 * /collect/paid return. Keying both on the txn id means the same transaction can
 * never be counted twice.
 */
export const purchaseTrackedKey = (transactionId: string): string =>
  `wtm:purchase-tracked:${transactionId}`;

/**
 * Fire the purchase conversion AT MOST ONCE per transaction. Guards on a
 * sessionStorage flag (shared key across both pay paths) so a refresh — or the
 * two pay paths overlapping — can't double-count. Returns true if it fired this
 * call. If sessionStorage is unavailable it fires anyway (worst case: a dup on
 * refresh) so a real sale is never silently dropped.
 */
export function trackPurchaseOnce(opts: {
  value: number;
  occasion: string;
  transactionId: string;
}): boolean {
  const key = purchaseTrackedKey(opts.transactionId);
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
    }
  } catch {
    /* sessionStorage unavailable — fall through and fire (worst case: dup on refresh) */
  }
  trackPurchase(opts);
  return true;
}

/**
 * MF-5: the Ads purchase conversion only fires when BOTH the tag id and the
 * conversion label are set (see trackPurchase). If the tag is set but the label
 * is missing, the conversion silently no-ops and Smart Bidding gets no signal —
 * the worst kind of analytics bug because nothing errors. True when misconfigured.
 */
export function adsMisconfigured(tagId?: string, conversionLabel?: string): boolean {
  return !!tagId && !conversionLabel;
}

// Surface the MF-5 misconfiguration loudly in the browser console (dev/preview
// only — never spam a production console) so it's caught before ad spend.
if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  adsMisconfigured(ADS_TAG_ID, ADS_CONVERSION_LABEL)
) {
  // eslint-disable-next-line no-console
  console.warn(
    '[analytics] NEXT_PUBLIC_GOOGLE_ADS_TAG_ID is set but NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL is not — the Ads purchase conversion will NOT fire, so Smart Bidding receives no signal. Set the conversion label before turning on ad spend.',
  );
}

/**
 * Fire a mid-funnel lead event when a collection is created (the free→paid
 * funnel's top micro-conversion). Safe no-op when GA4 isn't configured.
 */
export function trackLead(opts: { occasion: string }): void {
  const g = gtag();
  if (!g) return;
  g('event', 'collection_created', {
    items: [{ item_id: opts.occasion, item_name: `${opts.occasion} collection` }],
  });
}

/**
 * Fire a begin_checkout event when the Paddle overlay opens (either pay path).
 * Feeds Smart Bidding a micro-conversion during cold-start. No-op without GA4.
 */
export function trackBeginCheckout(opts: { value: number; occasion: string }): void {
  const g = gtag();
  if (!g) return;
  g('event', 'begin_checkout', {
    value: opts.value,
    currency: 'USD',
    items: [{ item_id: opts.occasion, item_name: `${opts.occasion} collection` }],
  });
}
