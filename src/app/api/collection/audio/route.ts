import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken, getGeneratedContentByAdminToken } from '@eilon-shai/venture-core/db';
import { audioEnabled, ensureAudioTable, getStoredAudio, generateAndStoreAudio, listAudioVoices, normalizeVoice, AUDIO_CONTENT_TYPE } from '@/lib/audio';
import { getOccasionMeta } from '@/lib/registry';

// Tribute audio narration (ElevenLabs → Postgres). Admin-token scoped.
//   POST { adminToken }      → generate (if missing) + store; returns { ok }.
//   GET  ?t=token[&download] → stream the stored MP3.
// Gated by audioEnabled(); disabled (404) when off (e.g. preview without a key).

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!audioEnabled()) {
    return NextResponse.json({ error: 'Audio narration is not available.', code: 'AUDIO_DISABLED', retryable: false }, { status: 404 });
  }
  let body: { adminToken?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const adminToken = (body.adminToken ?? '').trim();
  const voice = normalizeVoice(body.voice);
  if (!adminToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable', retryable: true }, { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Only a generated deliverable has content to read — also the pay-before-generate gate.
  const gen = await getGeneratedContentByAdminToken(db, adminToken).catch(() => null);
  if (!gen?.content) {
    const noun = getOccasionMeta(collection.occasion)?.deliverableNoun ?? 'tribute';
    return NextResponse.json({ error: `No ${noun} generated yet.`, code: 'NOT_GENERATED', retryable: false }, { status: 409 });
  }

  try {
    await ensureAudioTable(db);
    const existing = await getStoredAudio(db, collection.id, voice);
    if (existing) return NextResponse.json({ ok: true, cached: true, voice });
    await generateAndStoreAudio(db, collection.id, gen.content, voice);
    return NextResponse.json({ ok: true, cached: false, voice });
  } catch (err) {
    console.error('[collection/audio] generate error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not create the audio. Please try again.', code: 'AUDIO_FAILED', retryable: true }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  if (!audioEnabled()) return new NextResponse('Not found', { status: 404 });
  const url = new URL(req.url);
  const adminToken = (url.searchParams.get('t') ?? '').trim();
  const voice = normalizeVoice(url.searchParams.get('voice'));
  const download = url.searchParams.get('download') != null;
  const info = url.searchParams.get('info') != null;
  if (!adminToken) return new NextResponse('Missing token', { status: 400 });

  const db = getDbClient();
  if (!db) return new NextResponse('Service unavailable', { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection) return new NextResponse('Not found', { status: 404 });

  // info mode: report which voices already exist (re-view shows the player without
  // re-generating). JSON, not audio bytes.
  if (info) {
    try {
      await ensureAudioTable(db);
      const voices = await listAudioVoices(db, collection.id);
      return NextResponse.json({ voices });
    } catch {
      return NextResponse.json({ voices: [] });
    }
  }

  let stored: Awaited<ReturnType<typeof getStoredAudio>> = null;
  try {
    await ensureAudioTable(db);
    stored = await getStoredAudio(db, collection.id, voice);
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
