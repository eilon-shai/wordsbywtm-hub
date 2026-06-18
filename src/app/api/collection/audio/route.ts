import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken, getGeneratedContentByAdminToken } from '@eilon-shai/venture-core/db';
import { audioEnabled, ensureAudioTable, getStoredAudio, generateAndStoreAudio, AUDIO_CONTENT_TYPE } from '@/lib/audio';

// Tribute audio narration (ElevenLabs → Postgres). Admin-token scoped.
//   POST { adminToken }      → generate (if missing) + store; returns { ok }.
//   GET  ?t=token[&download] → stream the stored MP3.
// Gated by audioEnabled(); disabled (404) when off (e.g. preview without a key).

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!audioEnabled()) {
    return NextResponse.json({ error: 'Audio narration is not available.', code: 'AUDIO_DISABLED', retryable: false }, { status: 404 });
  }
  let body: { adminToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const adminToken = (body.adminToken ?? '').trim();
  if (!adminToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable', retryable: true }, { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Only a generated tribute has content to read — also the pay-before-generate gate.
  const gen = await getGeneratedContentByAdminToken(db, adminToken).catch(() => null);
  if (!gen?.content) {
    return NextResponse.json({ error: 'No tribute generated yet.', code: 'NOT_GENERATED', retryable: false }, { status: 409 });
  }

  try {
    await ensureAudioTable(db);
    const existing = await getStoredAudio(db, collection.id);
    if (existing) return NextResponse.json({ ok: true, cached: true });
    await generateAndStoreAudio(db, collection.id, gen.content);
    return NextResponse.json({ ok: true, cached: false });
  } catch (err) {
    console.error('[collection/audio] generate error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not create the audio. Please try again.', code: 'AUDIO_FAILED', retryable: true }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  if (!audioEnabled()) return new NextResponse('Not found', { status: 404 });
  const url = new URL(req.url);
  const adminToken = (url.searchParams.get('t') ?? '').trim();
  const download = url.searchParams.get('download') != null;
  if (!adminToken) return new NextResponse('Missing token', { status: 400 });

  const db = getDbClient();
  if (!db) return new NextResponse('Service unavailable', { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) return new NextResponse('Not found', { status: 404 });

  let stored: Awaited<ReturnType<typeof getStoredAudio>> = null;
  try {
    await ensureAudioTable(db);
    stored = await getStoredAudio(db, collection.id);
  } catch (err) {
    console.error('[collection/audio] read error:', err instanceof Error ? err.message : err);
    return new NextResponse('Service unavailable', { status: 503 });
  }
  if (!stored) return new NextResponse('No audio', { status: 404 });

  const bytes = Buffer.from(stored.base64, 'base64');
  const safeName = (collection.honoreeName || 'tribute').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'tribute';
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': stored.contentType || AUDIO_CONTENT_TYPE,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
      ...(download ? { 'Content-Disposition': `attachment; filename="Tribute for ${safeName}.mp3"` } : {}),
    },
  });
}
