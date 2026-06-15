import { NextRequest, NextResponse } from 'next/server';
import { createCollectionGenerateHandler } from '@eilon-shai/venture-core/api';
import { resolveConfigByTxn, NotFoundError } from '@/lib/resolver';

export const maxDuration = 60;

// POST /api/collection/generate — handler 5. Called by ResultPage self-fetch
// with only { transactionId }. Resolve the occasion via the txn→collection
// Redis mapping written at checkout, then delegate. The handler re-verifies
// payment server-side (pay-before-generate).
export async function POST(request: NextRequest): Promise<NextResponse> {
  let transactionId: string | undefined;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    if (typeof body.transactionId === 'string') transactionId = body.transactionId;
  } catch {
    // Malformed body — let the handler return its own INVALID_SESSION/400.
  }
  if (!transactionId) {
    return NextResponse.json(
      { error: 'Missing transactionId', code: 'INVALID_SESSION', retryable: false },
      { status: 400 },
    );
  }

  let config;
  try {
    config = await resolveConfigByTxn(transactionId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Collection not found for this payment.', code: 'NOT_FOUND', retryable: false },
        { status: 404 },
      );
    }
    throw err;
  }
  return createCollectionGenerateHandler(config)(request);
}
