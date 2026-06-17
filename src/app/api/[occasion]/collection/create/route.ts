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
  // SEC-05: the stored occasion is derived from the validated route, never the
  // client body. Rebuild the request with occasion forced to the route value.
  let forwarded = request;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    body.occasion = occasion;
    forwarded = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Unparseable body — let the handler return its own validation error.
  }
  return createCreateCollectionHandler(config)(forwarded);
}
