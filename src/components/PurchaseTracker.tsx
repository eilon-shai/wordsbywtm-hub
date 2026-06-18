'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPurchase } from '@/lib/analytics';

// Fires the purchase conversion once when the organizer returns from Paddle with
// a ?txn= on the result page. Deduped per-transaction via sessionStorage so a
// refresh of the post-payment URL doesn't double-count. Rendered on the result
// page (it knows the occasion + price); independent of ResultFlow internals.
export function PurchaseTracker({ occasion, value }: { occasion: string; value: number }) {
  const params = useSearchParams();
  const txn = params.get('txn') ?? params.get('txnId') ?? '';

  useEffect(() => {
    if (!txn) return;
    const key = `wtm:purchase-tracked:${txn}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* sessionStorage unavailable — fire anyway (worst case: a dup on refresh) */
    }
    trackPurchase({ value, occasion, transactionId: txn });
  }, [txn, occasion, value]);

  return null;
}
