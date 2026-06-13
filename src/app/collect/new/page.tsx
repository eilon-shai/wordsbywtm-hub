import Link from 'next/link';
import { getOccasionMeta } from '@/products/registry';
import CreateForm from './CreateForm';

export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string }>;
}) {
  const { occasion: slug } = await searchParams;
  const occasion = slug ? getOccasionMeta(slug) : null;

  if (!occasion || !occasion.live) {
    return (
      <main className="wrap" style={{ maxWidth: 560, paddingTop: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Choose an occasion to begin</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          That occasion isn&rsquo;t available yet.
        </p>
        <Link href="/" className="btn" style={{ marginTop: '1.5rem' }}>Back to start</Link>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 560, paddingTop: '3rem', paddingBottom: '4rem' }}>
      <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>← Start over</Link>
      <div style={{ marginTop: '1rem' }}>
        <CreateForm occasion={occasion} />
      </div>
    </main>
  );
}
