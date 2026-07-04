import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  addPartner,
  deletePartner,
  listPartners,
  updatePartner,
  type PartnerPatch,
} from '@/lib/partners-store';
import { isPartnerToken } from '@/lib/partners';
import { OCCASIONS } from '@/lib/registry';

// Slugs a partner may be scoped to — only live occasions with a collection flow.
const LIVE_OCCASION_SLUGS = new Set(OCCASIONS.filter((o) => o.live).map((o) => o.slug));

// ---------------------------------------------------------------------------
// Support console — partner registry admin.
//   GET    → list every partner (active first), for /support/partners.
//   POST   { displayName, occasions? } → mint an opaque token + add the partner.
//   PATCH  { token, active?, displayName?, occasions? } → toggle and/or edit.
//   DELETE { token }                   → permanently remove a partner.
//
// The `partners` table is the source of truth for the referral courtesy discount
// (an active partner's ?ref token earns the family a 10% courtesy at pay). Adding
// or deactivating here takes effect immediately — no code deploy.
//
// SECURITY: behind the same middleware Basic-Auth as the rest of /api/support/*.
// There is no app-level auth here by design; do not move this route out of
// /api/support/ or it loses its guard.
// ---------------------------------------------------------------------------

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const partners = await listPartners();
    return NextResponse.json({ partners });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load partners.';
    console.error('[support/partners] list error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { displayName?: unknown; occasions?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const displayName = typeof body.displayName === 'string' ? body.displayName : '';
  if (!displayName.trim()) {
    return NextResponse.json({ error: 'A partner display name is required.' }, { status: 400 });
  }
  // Occasion scope: only known live occasions; empty (or omitted) = all occasions.
  const occasions = Array.isArray(body.occasions)
    ? body.occasions.filter((o): o is string => typeof o === 'string' && LIVE_OCCASION_SLUGS.has(o))
    : [];
  try {
    const partner = await addPartner(displayName, occasions);
    return NextResponse.json({ partner }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add partner.';
    console.error('[support/partners] add error:', message);
    // Bad input (name too long/empty) → 400; anything else → 500.
    const status = /required|characters|long/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: { token?: unknown; active?: unknown; displayName?: unknown; occasions?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!isPartnerToken(token)) {
    return NextResponse.json({ error: 'Invalid partner token.' }, { status: 400 });
  }
  // Build the patch from whichever editable fields are present. active toggles the
  // partner; displayName/occasions edit its details (any subset may be sent).
  const patch: PartnerPatch = {};
  if (typeof body.active === 'boolean') patch.active = body.active;
  if (typeof body.displayName === 'string') patch.displayName = body.displayName;
  if (Array.isArray(body.occasions)) {
    patch.occasions = body.occasions.filter(
      (o): o is string => typeof o === 'string' && LIVE_OCCASION_SLUGS.has(o),
    );
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Nothing to update — send active, displayName, and/or occasions.' },
      { status: 400 },
    );
  }
  try {
    const partner = await updatePartner(token, patch);
    if (!partner) {
      return NextResponse.json({ error: 'No partner with that token.' }, { status: 404 });
    }
    return NextResponse.json({ partner });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update partner.';
    console.error('[support/partners] update error:', message);
    const status = /required|characters|long|nothing to update/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!isPartnerToken(token)) {
    return NextResponse.json({ error: 'Invalid partner token.' }, { status: 400 });
  }
  try {
    const deleted = await deletePartner(token);
    if (!deleted) {
      return NextResponse.json({ error: 'No partner with that token.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete partner.';
    console.error('[support/partners] delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
