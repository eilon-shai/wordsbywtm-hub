import { NextRequest, NextResponse } from 'next/server';
import { createSubmitContributionHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/contribute — handler 2. Public; share-token scoped.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'shareToken', 'share');
  if (resolved instanceof NextResponse) return resolved;
  return createSubmitContributionHandler(resolved)(request);
}
