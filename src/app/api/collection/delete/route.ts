import { NextRequest, NextResponse } from 'next/server';
import { createDeleteCollectionHandler } from '@eilon-shai/venture-core/api';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/delete — admin-token scoped. Hard-deletes the collection
// and all contributor memories (ON DELETE CASCADE).
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;
  return createDeleteCollectionHandler(resolved)(request);
}
