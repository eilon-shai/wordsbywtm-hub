import { NextRequest, NextResponse } from 'next/server';
import { createCollectionMarkPaidHandler } from '@eilon-shai/venture-core/api';
import { resolveConfigByTxn, NotFoundError } from '@/lib/resolver';

export const maxDuration = 30;

// POST /api/collection/mark-paid — record the one payment paid IN ADVANCE
// (from the invite panel "unlock up to 10 friends"). No generation. Resolve the
// occasion via the txn→collection Redis mapping (same as generate), then delegate;
// the handler re-verifies the Paddle txn server-side.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let transactionId: string | undefined;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    if (typeof body.transactionId === 'string') transactionId = body.transactionId;
  } catch {
    /* malformed — handler returns its own 400 */
  }
  if (!transactionId) {
    return NextResponse.json({ error: 'Missing transactionId', code: 'INVALID_SESSION', retryable: false }, { status: 400 });
  }

  let config;
  try {
    config = await resolveConfigByTxn(transactionId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'Collection not found for this payment.', code: 'NOT_FOUND', retryable: false }, { status: 404 });
    }
    throw err;
  }
  return createCollectionMarkPaidHandler(config)(request);
}
