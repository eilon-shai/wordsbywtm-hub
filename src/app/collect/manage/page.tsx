import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { getOccasionMeta, OCCASIONS } from '@/products/registry';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: adminToken } = await searchParams;

  if (!adminToken) {
    return (
      <main className="wrap" style={{ maxWidth: 640, paddingTop: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Missing link</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          Open the manage link from your email to view your collection.
        </p>
      </main>
    );
  }

  const db = getDbClient();
  const collection = db ? await getCollectionByAdminToken(db, adminToken).catch(() => null) : null;

  if (!collection) {
    return (
      <main className="wrap" style={{ maxWidth: 640, paddingTop: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Collection not found</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          This manage link is invalid or has expired.
        </p>
      </main>
    );
  }

  const meta = getOccasionMeta(collection.occasion) ?? OCCASIONS[0];

  return (
    <main className="wrap" style={{ maxWidth: 640, paddingTop: '3rem', paddingBottom: '4rem' }}>
      <Dashboard occasion={collection.occasion} adminToken={adminToken} accent={meta.accent} />
    </main>
  );
}
