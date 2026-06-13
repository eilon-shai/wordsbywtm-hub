import Link from 'next/link';
import { OCCASIONS } from '@/products/registry';

export default function LandingPage() {
  return (
    <main>
      <header className="wrap" style={{ paddingTop: '4rem', paddingBottom: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
          Words That Matter
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: '1rem 0 1rem', lineHeight: 1.1 }}>
          The best tributes are written by everyone who was there.
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
          Start a collection, invite the people who matter to share a memory, and we&rsquo;ll weave them
          into one tribute worth reading aloud.
        </p>
      </header>

      <section className="wrap" style={{ paddingBottom: '4rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.4rem', margin: '2rem 0 1.5rem', color: 'var(--text-secondary)' }}>
          Start a collection
        </h2>
        <div
          style={{
            display: 'grid',
            gap: '1.25rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {OCCASIONS.map((o) => {
            const card = (
              <div
                className="card"
                style={{
                  height: '100%',
                  borderTop: `3px solid ${o.accent}`,
                  opacity: o.live ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ fontSize: '1.35rem', color: o.accent, marginBottom: '0.5rem' }}>{o.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55, flex: 1 }}>{o.blurb}</p>
                <p style={{ marginTop: '1.25rem', fontWeight: 600, color: o.live ? o.accent : 'var(--text-muted)' }}>
                  {o.live ? 'Start →' : 'Coming soon'}
                </p>
              </div>
            );
            return o.live ? (
              <Link key={o.slug} href={`/collect/new?occasion=${o.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {card}
              </Link>
            ) : (
              <div key={o.slug}>{card}</div>
            );
          })}
        </div>
      </section>

      <footer className="wrap" style={{ paddingBottom: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>
          <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link> ·{' '}
          <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link> ·{' '}
          <Link href="/refund" style={{ color: 'inherit' }}>Refunds</Link>
        </p>
        <p style={{ marginTop: '0.5rem' }}>© Words That Matter LLC</p>
      </footer>
    </main>
  );
}
