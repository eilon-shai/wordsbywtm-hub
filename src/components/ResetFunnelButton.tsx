'use client';

import { useState } from 'react';

// Zeroes the first-party funnel counters (POST /api/support/metrics/reset, itself
// behind the /support Basic-Auth). Two-step confirm — it's a destructive prod
// action. Used after a round of test/preview traffic to start from a clean slate;
// going forward only production, non-excluded visits count.
export function ResetFunnelButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setDone(null);
    try {
      const res = await fetch('/api/support/metrics/reset', { method: 'POST' });
      const d = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
      setDone(res.ok ? `Cleared ${d.deleted ?? 0} counter keys — reload to see zeros.` : (d.error ?? 'Reset failed.'));
    } catch {
      setDone('Reset failed — network error.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (done) return <span className="text-xs text-muted-foreground">{done}</span>;

  return confirming ? (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Zero the funnel counters?</span>
      <button
        type="button"
        onClick={() => void reset()}
        disabled={busy}
        className="rounded-full border border-destructive/50 px-3 py-1 font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
      >
        {busy ? 'Resetting…' : 'Yes, reset'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-full border border-border px-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
    >
      Reset counters
    </button>
  );
}
