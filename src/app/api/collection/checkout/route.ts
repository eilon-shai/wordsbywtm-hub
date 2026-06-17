import { NextRequest, NextResponse } from 'next/server';
import { createCollectionCheckoutHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/checkout — handler 4. Admin-token scoped; starts Paddle.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createCollectionCheckoutHandler(resolved)(request);
}
