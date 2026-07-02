'use client';

import { useEffect } from 'react';

// Fires one first-party funnel beacon per page view (mount) to
// /api/metrics/view. Deliberately NOT consent-gated: it stores nothing on the
// visitor (no cookie, no storage) and sends no identifier — the server only
// bumps an aggregate daily counter. sendBeacon survives quick navigations;
// fetch keepalive is the fallback. Best-effort: failures are swallowed.
export function PageBeacon({ occasion, step }: { occasion: string; step: 'landing' | 'start' }) {
  useEffect(() => {
    const body = JSON.stringify({ occasion, step });
    const url = '/api/metrics/view';
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon?.(url, blob)) return;
    } catch {
      /* fall through to fetch */
    }
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [occasion, step]);

  return null;
}
