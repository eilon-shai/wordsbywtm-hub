import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolve } from '@/lib/handlers';

export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ occasion: string }> }) {
  const { occasion } = await ctx.params;
  const handler = resolve(occasion, 'get');
  if (!handler) return NextResponse.json({ error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false }, { status: 404 });
  return handler(req);
}
