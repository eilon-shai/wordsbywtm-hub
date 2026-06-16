'use client';

import { Suspense } from 'react';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';

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
      try {
        await fetch('/api/collection/mark-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: txnId }),
        });
      } catch {
        /* non-fatal — webhook/retry can still record it; show a soft message */
      }
      if (cancelled) return;
      try {
        sessionStorage.removeItem('wtm:advance-admin');
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
