import { NextRequest, NextResponse } from 'next/server';
import { createCollectionFinalizePaidHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/finalize-paid — "Finalize" for a collection paid in
// advance. Admin-token scoped. No new charge: the handler requires paid_at (set
// by mark-paid), preserving pay-before-generate, then synthesizes.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createCollectionFinalizePaidHandler(resolved)(request);
}
