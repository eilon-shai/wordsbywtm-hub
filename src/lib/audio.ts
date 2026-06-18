import type { SqlClient } from '@eilon-shai/venture-core/db';

// ---------------------------------------------------------------------------
// Tribute audio (ElevenLabs TTS) — stored in Postgres so it auto-purges with the
// collection (ON DELETE CASCADE) and needs no extra infra. App-only; gated.
// ---------------------------------------------------------------------------

// Enabled only when an ElevenLabs key is set AND not explicitly disabled. Set
// DISABLE_TRIBUTE_AUDIO=true on preview to keep it off there (no TTS spend).
export function audioEnabled(): boolean {
  return !!process.env.ELEVENLABS_API_KEY && process.env.DISABLE_TRIBUTE_AUDIO !== 'true';
}

// Voice-appropriate MP3 (great for spoken word, modest size so the base64 row
// stays light over the Neon HTTP driver). All overridable via env.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // a warm default voice
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_96';
export const AUDIO_CONTENT_TYPE = 'audio/mpeg';

// Idempotent child table: one audio row per collection, deleted with it.
let tableEnsured = false;
export async function ensureAudioTable(db: SqlClient): Promise<void> {
  if (tableEnsured) return;
  await db.query(
    `create table if not exists collection_audio (
       collection_id uuid primary key references collections(id) on delete cascade,
       mp3_base64 text not null,
       content_type text not null default 'audio/mpeg',
       created_at timestamptz not null default now()
     )`,
  );
  tableEnsured = true;
}

export async function getStoredAudio(
  db: SqlClient,
  collectionId: string,
): Promise<{ base64: string; contentType: string } | null> {
  const rows = await db.query<{ mp3_base64: string; content_type: string }>(
    'select mp3_base64, content_type from collection_audio where collection_id = $1',
    [collectionId],
  );
  const r = rows[0];
  return r ? { base64: r.mp3_base64, contentType: r.content_type } : null;
}

// Synthesize the tribute via ElevenLabs and persist it. Returns the base64 mp3.
// Throws on a TTS failure (caller maps to a 502).
export async function generateAndStoreAudio(
  db: SqlClient,
  collectionId: string,
  text: string,
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: AUDIO_CONTENT_TYPE },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        // Steady, warm narration for a read-aloud at a service.
        voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
  }
  const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  await ensureAudioTable(db);
  await db.query(
    `insert into collection_audio (collection_id, mp3_base64, content_type)
     values ($1, $2, $3)
     on conflict (collection_id) do update set mp3_base64 = excluded.mp3_base64, content_type = excluded.content_type, created_at = now()`,
    [collectionId, base64, AUDIO_CONTENT_TYPE],
  );
  return base64;
}
