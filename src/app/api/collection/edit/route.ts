import { NextRequest, NextResponse } from 'next/server';
import { createEditContributionHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/edit — admin-token scoped. Edits a contribution's memory.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createEditContributionHandler(resolved)(request);
}
