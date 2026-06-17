import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, findOpenCollectionByOrganizer } from '@eilon-shai/venture-core/db';
import { getConfig } from '@/lib/registry';

// POST /api/collection/check-existing { email, occasion } -> { exists: boolean }
// Lets the create form warn the organizer BEFORE they fill out the whole form
// that they already have an open collection for this occasion. Returns only a
// boolean (no tokens) — the secure path back in is the emailed manage link.

export const maxDuration = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; occasion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ exists: false });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const config = getConfig((body.occasion ?? '').trim());
  if (!EMAIL_RE.test(email) || !config?.collectionConfig) {
    return NextResponse.json({ exists: false });
  }

  try {
    const db = getDbClient();
    if (db) {
      const existing = await findOpenCollectionByOrganizer(db, config.brand.paddleProductId, email);
      return NextResponse.json({ exists: !!existing });
    }
  } catch (err) {
    console.error('[check-existing] error (non-fatal):', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ exists: false });
}
