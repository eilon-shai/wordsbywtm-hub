import Link from 'next/link';

export default function LegalChrome({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
            Words That Matter
          </Link>
          <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Home</Link>
        </div>
      </nav>
      <main className="wrap" style={{ maxWidth: 720, paddingTop: '3rem', paddingBottom: '4rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>Last updated: {updated}</p>
        {children}
      </main>
    </div>
  );
}
