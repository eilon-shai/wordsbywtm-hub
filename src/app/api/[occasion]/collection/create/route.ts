import { NextRequest, NextResponse } from 'next/server';
import { createCreateCollectionHandler } from '@eilon-shai/venture-core/api';
import { getConfig } from '@/lib/registry';

export const maxDuration = 60;

// POST /api/[occasion]/collection/create — handler 1.
// Occasion lives in the route, so config selection is trivial.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ occasion: string }> },
): Promise<NextResponse> {
  const { occasion } = await params;
  const config = getConfig(occasion);
  if (!config || !config.collectionConfig) {
    return NextResponse.json(
      { error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false },
      { status: 404 },
    );
  }
  return createCreateCollectionHandler(config)(request);
}
