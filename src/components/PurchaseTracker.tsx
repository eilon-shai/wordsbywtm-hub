'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPurchaseOnce } from '@/lib/analytics';

// Fires the purchase conversion once when the organizer returns from Paddle with
// a ?txn= on the result page. Deduped per-transaction (shared sessionStorage key
// with the advance-pay return) so neither a refresh nor the other pay path can
// double-count. Rendered on the result page (it knows the occasion + price);
// independent of ResultFlow internals.
export function PurchaseTracker({ occasion, value }: { occasion: string; value: number }) {
  const params = useSearchParams();
  const txn = params.get('txn') ?? params.get('txnId') ?? '';

  useEffect(() => {
    if (!txn) return;
    trackPurchaseOnce({ value, occasion, transactionId: txn });
  }, [txn, occasion, value]);

  return null;
}
