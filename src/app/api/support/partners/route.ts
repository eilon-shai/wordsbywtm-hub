import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { addPartner, listPartners, setPartnerActive } from '@/lib/partners-store';
import { isPartnerToken } from '@/lib/partners';

// ---------------------------------------------------------------------------
// Support console — partner registry admin.
//   GET   → list every partner (active first), for /support/partners.
//   POST  { displayName }        → mint an opaque token + add the partner.
//   PATCH { token, active }      → activate / deactivate a partner.
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
  let body: { displayName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const displayName = typeof body.displayName === 'string' ? body.displayName : '';
  if (!displayName.trim()) {
    return NextResponse.json({ error: 'A partner display name is required.' }, { status: 400 });
  }
  try {
    const partner = await addPartner(displayName);
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
  let body: { token?: unknown; active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!isPartnerToken(token)) {
    return NextResponse.json({ error: 'Invalid partner token.' }, { status: 400 });
  }
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: '`active` must be true or false.' }, { status: 400 });
  }
  try {
    const partner = await setPartnerActive(token, body.active);
    if (!partner) {
      return NextResponse.json({ error: 'No partner with that token.' }, { status: 404 });
    }
    return NextResponse.json({ partner });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update partner.';
    console.error('[support/partners] update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
