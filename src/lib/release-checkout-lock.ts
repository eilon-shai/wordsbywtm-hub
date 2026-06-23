// Fire-and-forget release of the server-side `checkout-lock` for a collection.
// Wired as the venture-core shared-Paddle `onClose` callback so that closing the
// Paddle overlay WITHOUT paying frees the lock immediately, instead of blocking a
// retry for the lock's full TTL ("A payment for this collection is already in
// progress."). Best-effort: keepalive lets it complete even if the page navigates,
// and any failure is harmless — the lock also expires on its own TTL.
export function releaseCheckoutLock(adminToken: string): void {
  try {
    void fetch('/api/collection/checkout/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminToken }),
      keepalive: true,
    });
  } catch {
    /* non-fatal */
  }
}
