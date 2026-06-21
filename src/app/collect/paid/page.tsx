'use client';

import { Suspense } from 'react';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPurchase } from '@/lib/analytics';

// /collect/paid — return target after an ADVANCE Paddle payment. The shared
// callback redirects here as `/collect/paid?txnId=...`. We record the payment
// (mark-paid resolves the collection from the txn) and bounce back to the
// organizer's dashboard (admin token stashed in sessionStorage before checkout).
function PaidReturnInner() {
  const params = useSearchParams();
  const txnId = params.get('txnId') ?? params.get('txn') ?? '';

  React.useEffect(() => {
    let cancelled = false;
    const admin = (() => {
      try {
        return sessionStorage.getItem('wtm:advance-admin') ?? '';
      } catch {
        return '';
      }
    })();
    const backToDashboard = () => {
      if (admin) window.location.href = `/collect/manage?t=${encodeURIComponent(admin)}`;
      else window.location.href = '/';
    };

    if (!txnId) {
      backToDashboard();
      return;
    }

    (async () => {
      // Paddle may still be settling the txn (202). Retry a few times before
      // handing off — the webhook backstop records it server-side regardless.
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch('/api/collection/mark-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: txnId }),
          });
          if (res.status === 202) {
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          if (res.ok) {
            // Fire the GA4/Ads purchase conversion for the ADVANCE payment — the
            // post-checkout PurchaseTracker never runs on this path (it returns to
            // the dashboard, not the result page with ?txn=). Deduped on the txn id
            // with the SAME sessionStorage key PurchaseTracker uses, so the two can
            // never double-count the same transaction. Occasion + value were
            // stashed by the advance-pay block before checkout.
            try {
              const key = `wtm:purchase-tracked:${txnId}`;
              if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                const occasion = sessionStorage.getItem('wtm:advance-occasion') ?? '';
                const value = Number(sessionStorage.getItem('wtm:advance-value') ?? '0') || 0;
                trackPurchase({ value, occasion, transactionId: txnId });
              }
            } catch {
              /* sessionStorage/analytics unavailable — skip the conversion event */
            }
          }
          break; // 200 (recorded) or a terminal error — stop retrying
        } catch {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      if (cancelled) return;
      try {
        sessionStorage.removeItem('wtm:advance-admin');
        sessionStorage.removeItem('wtm:advance-occasion');
        sessionStorage.removeItem('wtm:advance-value');
      } catch {
        /* ignore */
      }
      backToDashboard();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <h1 className="font-serif text-2xl text-foreground">Recording your payment…</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          One moment — we’re taking you back to your collection.
        </p>
      </div>
    </main>
  );
}

export default function PaidReturnPage() {
  return (
    <Suspense fallback={<main className="px-4 py-20 text-center text-muted-foreground">Loading…</main>}>
      <PaidReturnInner />
    </Suspense>
  );
}
