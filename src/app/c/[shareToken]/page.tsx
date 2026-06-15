// ---------------------------------------------------------------------------
// S5 — Contributor share page. PUBLIC, per contributor (baked backend path).
// Server component: resolves the collection from the shareToken to learn the
// occasion + status, then renders the (client) ContributorForm. No payment.
// Pre-submit copy is generic by design — no public read of the honoree name
// exists; the warm thank-you uses honoreeName from the submit response (§S5).
// ---------------------------------------------------------------------------

import { getDbClient, getCollectionByShareToken } from '@eilon-shai/venture-core/db';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { ContributorForm } from '@/components/ContributorForm';

export const dynamic = 'force-dynamic';

function ClosedScreen({ kind }: { kind: 'closed' | 'notfound' }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6" aria-hidden="true">
          {kind === 'closed' ? '🕯️' : '🔗'}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          {kind === 'closed' ? 'This collection has closed' : 'This link isn’t active'}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {kind === 'closed'
            ? 'It’s no longer accepting new memories. If you’d still like to share something, reach out to whoever invited you.'
            : 'We couldn’t find a collection for this link. Ask whoever invited you for a fresh one.'}
        </p>
      </div>
    </main>
  );
}

export default async function ContributorSharePage({
  params,
}: {
  // Next 15 — params is a Promise.
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const db = getDbClient();
  if (!db) {
    // DB unavailable — present a calm not-found rather than a crash.
    return <ClosedScreen kind="notfound" />;
  }

  let collection: Awaited<ReturnType<typeof getCollectionByShareToken>> | null = null;
  try {
    collection = await getCollectionByShareToken(db, shareToken);
  } catch {
    return <ClosedScreen kind="notfound" />;
  }

  if (!collection) return <ClosedScreen kind="notfound" />;
  if (collection.status !== 'open') return <ClosedScreen kind="closed" />;

  const config = getConfig(collection.occasion);
  const meta = getOccasionMeta(collection.occasion);
  const fields = config?.collectionConfig?.contributorFormFields;

  if (!config || !meta || !fields) {
    // Token maps to an occasion we don't render (e.g. a retired/stub config).
    return <ClosedScreen kind="notfound" />;
  }

  return (
    <ContributorForm
      shareToken={shareToken}
      occasionTitle={meta.title}
      honoreeLabel={meta.honoreeLabel}
      fields={fields}
      homeHref="/"
    />
  );
}
