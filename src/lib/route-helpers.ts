import { NextRequest, NextResponse } from 'next/server';
import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { resolveConfigByToken, NotFoundError } from '@/lib/resolver';

const NOT_FOUND = NextResponse.json(
  { error: 'Not found', code: 'NOT_FOUND', retryable: false },
  { status: 404 },
);

/**
 * Resolve a ProductConfig for a token-scoped POST route by reading the token
 * from a CLONE of the request body (so the venture-core handler can still read
 * the original body). Returns either the config or a 404 NextResponse.
 */
export async function resolveForTokenPost(
  request: NextRequest,
  tokenField: 'shareToken' | 'adminToken',
  kind: 'share' | 'admin',
): Promise<ProductConfig | NextResponse> {
  let token: string | undefined;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    const value = body[tokenField];
    if (typeof value === 'string') token = value;
  } catch {
    // Malformed body — let the handler return its own INVALID_SESSION/400.
  }
  if (!token) return NOT_FOUND;

  try {
    return await resolveConfigByToken(token, kind);
  } catch (err) {
    if (err instanceof NotFoundError) return NOT_FOUND;
    throw err;
  }
}
