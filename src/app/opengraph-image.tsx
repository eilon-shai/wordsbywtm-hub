import { ImageResponse } from 'next/og';

// Default social card for the hub root (replaces the 404 /og-*.png references).
// Generated at the edge — no binary asset needed.
export const alt = 'Words That Matter — gather memories into one piece';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
        <div style={{ fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: '#6b5a45' }}>
          Words That Matter
        </div>
        <div style={{ fontSize: 76, lineHeight: 1.1, marginTop: 28, maxWidth: 980 }}>
          No one person holds the whole story. So gather everyone’s.
        </div>
        <div style={{ fontSize: 30, marginTop: 32, color: '#5c4f3d' }}>
          Memorials · Weddings · Retirements · Anniversaries
        </div>
      </div>
    ),
    size,
  );
}
