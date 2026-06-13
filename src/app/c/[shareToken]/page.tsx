import { getDbClient, getCollectionByShareToken } from '@eilon-shai/venture-core/db';
import { getConfig, getOccasionMeta, OCCASIONS } from '@/products/registry';
import ContributeForm from './ContributeForm';

export const dynamic = 'force-dynamic';

export default async function ContributorPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const db = getDbClient();
  const collection = db ? await getCollectionByShareToken(db, shareToken).catch(() => null) : null;

  if (!collection) {
    return (
      <main className="wrap" style={{ maxWidth: 560, paddingTop: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Link not found</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          This collection link is invalid or has expired.
        </p>
      </main>
    );
  }

  const occasion = collection.occasion;
  const meta = getOccasionMeta(occasion) ?? OCCASIONS[0];
  const config = getConfig(occasion);
  const fields = config?.collectionConfig?.contributorFormFields ?? [];
  const consentVersion = config?.collectionConfig?.contributorConsentVersion ?? '';

  return (
    <main className="wrap" style={{ maxWidth: 560, paddingTop: '3rem', paddingBottom: '4rem' }}>
      <ContributeForm
        occasion={occasion}
        shareToken={shareToken}
        honoreeName={collection.honoreeName}
        accent={meta.accent}
        fields={fields}
        consentVersion={consentVersion}
        closed={collection.status !== 'open'}
      />
    </main>
  );
}
