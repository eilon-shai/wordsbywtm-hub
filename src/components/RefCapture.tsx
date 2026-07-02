'use client';

import * as React from 'react';
import { captureRefFromSearch } from '@/lib/ref';

// Captures ?ref=<partner-slug> from the URL into localStorage on mount, so the
// create POST can attach it days later (see src/lib/ref.ts). Renders nothing —
// mounted on the pages partners link to (hub home, occasion landings, guides).
export default function RefCapture() {
  React.useEffect(() => {
    captureRefFromSearch(window.location.search);
  }, []);
  return null;
}
