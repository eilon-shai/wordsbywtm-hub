import type { SqlClient } from '@eilon-shai/venture-core/db';

// ---------------------------------------------------------------------------
// Tribute audio (ElevenLabs TTS) — stored in Postgres so it auto-purges with the
// collection (ON DELETE CASCADE) and needs no extra infra. App-only; gated.
// One cached MP3 per (collection, voice) so switching voices doesn't re-bill.
// ---------------------------------------------------------------------------

export type Voice = 'female' | 'male';
export function normalizeVoice(v: unknown): Voice {
  return v === 'male' ? 'male' : 'female';
}

// Enabled only when an ElevenLabs key is set AND not explicitly disabled. Set
// DISABLE_TRIBUTE_AUDIO=true on preview to keep it off there (no TTS spend).
export function audioEnabled(): boolean {
  return !!process.env.ELEVENLABS_API_KEY && process.env.DISABLE_TRIBUTE_AUDIO !== 'true';
}

// Warm ElevenLabs voices; override per gender via env.
// NOTE: these are PREMADE voices, which the free/lower API tiers can synthesize.
// Library voices (e.g. Rachel/Josh) return HTTP 402 paid_plan_required via the
// API unless the account is on a paid plan — do not default to those.
const VOICE_IDS: Record<Voice, string> = {
  female: process.env.ELEVENLABS_VOICE_ID_FEMALE || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Sarah — mature, reassuring
  male: process.env.ELEVENLABS_VOICE_ID_MALE || 'JBFqnCBsd6RMkjVDRZzb', // George — warm, captivating storyteller
};
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_96';
export const AUDIO_CONTENT_TYPE = 'audio/mpeg';

// Idempotent child table: one audio row per (collection, voice), deleted with the
// collection.
let tableEnsured = false;
export async function ensureAudioTable(db: SqlClient): Promise<void> {
  if (tableEnsured) return;
  await db.query(
    `create table if not exists collection_audio (
       collection_id uuid not null references collections(id) on delete cascade,
       voice text not null default 'female',
       mp3_base64 text not null,
       content_type text not null default 'audio/mpeg',
       created_at timestamptz not null default now(),
       primary key (collection_id, voice)
     )`,
  );
  tableEnsured = true;
}

// Which voices already have audio for this collection (for re-view: show the
// player without regenerating).
export async function listAudioVoices(db: SqlClient, collectionId: string): Promise<Voice[]> {
  const rows = await db.query<{ voice: string }>(
    'select voice from collection_audio where collection_id = $1',
    [collectionId],
  );
  return rows.map((r) => normalizeVoice(r.voice));
}

export async function getStoredAudio(
  db: SqlClient,
  collectionId: string,
  voice: Voice,
): Promise<{ base64: string; contentType: string } | null> {
  const rows = await db.query<{ mp3_base64: string; content_type: string }>(
    'select mp3_base64, content_type from collection_audio where collection_id = $1 and voice = $2',
    [collectionId, voice],
  );
  const r = rows[0];
  return r ? { base64: r.mp3_base64, contentType: r.content_type } : null;
}

// Synthesize the tribute via ElevenLabs and persist it for the chosen voice.
export async function generateAndStoreAudio(
  db: SqlClient,
  collectionId: string,
  text: string,
  voice: Voice,
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_IDS[voice]}?output_format=${OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: AUDIO_CONTENT_TYPE },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        // Lower stability + some style = warmer, more emotional delivery (0.6/0.0
        // sounded flat/robotic). We generate once and cache, so the slight
        // run-to-run variation from lower stability is fine.
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
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
    `insert into collection_audio (collection_id, voice, mp3_base64, content_type)
     values ($1, $2, $3, $4)
     on conflict (collection_id, voice) do update set mp3_base64 = excluded.mp3_base64, content_type = excluded.content_type, created_at = now()`,
    [collectionId, voice, base64, AUDIO_CONTENT_TYPE],
  );
}
