import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolve } from '@/lib/handlers';

// Synthesis can take longer than a single generation — N memories into one piece.
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ occasion: string }> }) {
  const { occasion } = await ctx.params;
  const handler = resolve(occasion, 'generate');
  if (!handler) return NextResponse.json({ error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  return handler(req);
}
