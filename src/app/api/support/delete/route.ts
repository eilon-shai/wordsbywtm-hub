import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken, deleteCollection } from '@eilon-shai/venture-core/db';
import { getConfig } from '@/lib/registry';

// Support console — delete a customer's collection (cascades to all memories).
// Support CAN delete paid/generated collections (the customer-facing delete is
// guarded against that). MUST sit behind Vercel Password Protection.

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { occasion?: string; adminToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const config = getConfig((body.occasion ?? '').trim());
  const adminToken = (body.adminToken ?? '').trim();
  if (!config?.collectionConfig) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  if (!adminToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection || collection.product !== config.brand.paddleProductId) {
    // Idempotent: already gone (or wrong product) — report success.
    return NextResponse.json({ ok: true, deleted: true });
  }

  try {
    await deleteCollection(db, collection.id);
  } catch (err) {
    console.error('[support/delete] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: true, honoreeName: collection.honoreeName });
}
