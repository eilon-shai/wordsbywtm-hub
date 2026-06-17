import { NextRequest, NextResponse } from 'next/server';
import { createModerateContributionHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/moderate — handler 6. Admin-token scoped (include/exclude).
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createModerateContributionHandler(resolved)(request);
}
