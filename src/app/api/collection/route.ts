import { NextRequest, NextResponse } from 'next/server';
import { createGetCollectionHandler } from '@eilon-shai/venture-core/api';
import { resolveConfigByToken, NotFoundError } from '@/lib/resolver';

export const maxDuration = 60;

// GET /api/collection?t={adminToken} — handler 3. Organizer dashboard data.
// Admin-token scoped via query param (no body to clone).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminToken = new URL(request.url).searchParams.get('t');
  if (!adminToken) {
    return NextResponse.json(
      { error: 'Not found', code: 'NOT_FOUND', retryable: false },
      { status: 404 },
    );
  }
  let config;
  try {
    config = await resolveConfigByToken(adminToken, 'admin');
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 },
      );
    }
    throw err;
  }
  return createGetCollectionHandler(config)(request);
}
