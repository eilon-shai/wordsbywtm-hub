import { NextRequest, NextResponse } from 'next/server';
import { createFeedbackHandler } from '@eilon-shai/venture-core/api';
import { getConfig } from '@/lib/registry';

export const maxDuration = 30;

// POST /api/[occasion]/feedback — the result-page feedback widget posts here.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ occasion: string }> },
): Promise<NextResponse> {
  const { occasion } = await params;
  const config = getConfig(occasion);
  if (!config) {
    return NextResponse.json({ error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  }
  return createFeedbackHandler(config)(request);
}
