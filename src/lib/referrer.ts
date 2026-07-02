import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { isValidRefSlug, REF_HEADER } from '@/lib/ref';

// ---------------------------------------------------------------------------
// Server side of partner referral attribution: after a successful create, stamp
// the (re-validated) x-wtm-ref slug onto the new collection row. The row is the
// durable carrier — the organizer pays days later via the emailed magic link,
// often on another device, so browser storage can't reach checkout.
//
// HARD CONSTRAINT: attribution is telemetry. This must never fail a create —
// every path is fail-silent, and it's a no-op without a valid header.
// ---------------------------------------------------------------------------

/** `t=` token from a venture-core adminUrl (`/collect/manage?t=<adminToken>`). */
function adminTokenFromUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value).searchParams.get('t');
  } catch {
    return null;
  }
}

/**
 * If `request` carries a valid x-wtm-ref slug and `response` is a successful
 * create (2xx, not the `existing` dedup ack), set `collections.referrer` on the
 * new row — first writer wins (`and referrer is null`). Fail-silent throughout.
 */
export async function attachReferrer(request: Request, response: Response): Promise<void> {
  try {
    const slug = request.headers.get(REF_HEADER);
    if (!isValidRefSlug(slug)) return;
    if (!response.ok) return;

    // Clone before reading — the caller still returns `response` to the client.
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    if (!body || body.existing === true) return;

    // The create handler doesn't return the row id — resolve it via the admin
    // token (returned directly, or embedded in adminUrl's `t=` param).
    const adminToken =
      typeof body.adminToken === 'string' && body.adminToken !== ''
        ? body.adminToken
        : adminTokenFromUrl(body.adminUrl);
    if (!adminToken) return;

    const db = getDbClient();
    if (!db) return;
    const meta = await getCollectionByAdminToken(db, adminToken);
    if (!meta) return;

    await db.query('update collections set referrer = $1 where id = $2 and referrer is null', [
      slug,
      meta.id,
    ]);
  } catch (err) {
    console.error('[ref] attach error (non-fatal):', err instanceof Error ? err.message : err);
  }
}
