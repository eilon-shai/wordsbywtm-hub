import { ImageResponse } from 'next/og';
import { getOccasionMeta } from '@/lib/registry';

// Per-occasion social card (replaces the 404 /og-<occasion>.png references).
// Uses the occasion's accent + blurb so a shared /[occasion] link renders a
// matched card. Generated at request time — no binary asset needed.
export const alt = 'Words That Matter';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage({ params }: { params: Promise<{ occasion: string }> }) {
  const { occasion } = await params;
  const meta = getOccasionMeta(occasion);
  const accent = meta?.accent ?? '#6b5a45';
  const title = meta?.title ?? 'Words That Matter';
  const blurb = meta?.blurb ?? 'Gather memories from everyone into one piece.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          backgroundColor: '#f5f0e8',
          color: '#2a2118',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, backgroundColor: accent }} />
          <div style={{ fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: '#6b5a45' }}>
            Words That Matter · {title}
          </div>
        </div>
        <div style={{ fontSize: 70, lineHeight: 1.12, marginTop: 30, maxWidth: 980 }}>{blurb}</div>
        <div style={{ fontSize: 28, marginTop: 30, color: '#5c4f3d' }}>
          Free to gather · Pay once when you’re ready
        </div>
      </div>
    ),
    size,
  );
}
