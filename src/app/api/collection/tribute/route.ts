import { NextRequest, NextResponse } from 'next/server';
import { createGetTributeHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 30;

// POST /api/collection/tribute — re-view a generated tribute (admin-token scoped).
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createGetTributeHandler(resolved)(request);
}
