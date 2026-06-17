'use client';

import { useEffect } from 'react';

// When the landing is opened with ?focus=<occasion> (an ad lands here), gently
// scroll the occasion picker into view after mount so the focused product is the
// first thing the visitor sees acting on.
export default function FocusScroll() {
  useEffect(() => {
    const el = document.getElementById('occasions');
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
