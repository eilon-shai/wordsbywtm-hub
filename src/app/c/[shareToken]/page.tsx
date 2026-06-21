// ---------------------------------------------------------------------------
// S5 — Contributor share page. PUBLIC, per contributor (baked backend path).
// Server component: resolves the collection from the shareToken to learn the
// occasion + status, then renders the (client) ContributorForm. No payment.
// Invited contributors see the honoree name + occasion deliverable (they already
// know who they're honoring) and the organizer's name ("{name} is gathering…"),
// now persisted on the collection. Emailed invites also carry a signed ?inv token
// that locks the contributor's email to the verified recipient address.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next';
import { getDbClient, getCollectionByShareToken, countContributors, contributorCap, verifyInviteEmail } from '@eilon-shai/venture-core/db';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { ContributorForm } from '@/components/ContributorForm';
import { OrganizerMemoryForm } from '@/components/OrganizerMemoryForm';

export const dynamic = 'force-dynamic';
// Token-bearing private link — keep it out of search indexes (token hygiene).
export const metadata: Metadata = { title: 'Add a memory — Words That Matter', robots: { index: false, follow: false } };

function ClosedScreen({ kind }: { kind: 'closed' | 'notfound' }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6" aria-hidden="true">
          {kind === 'closed' ? '🤍' : '🔗'}
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
  searchParams,
}: {
  // Next 15 — params and searchParams are Promises.
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ as?: string; t?: string; inv?: string }>;
}) {
  const { shareToken } = await params;
  const sp = await searchParams;

  // Emailed invites carry ?inv=<signed email token>. Verify it server-side and,
  // only when valid, lock the contributor's email to the verified address. A
  // missing/tampered token simply degrades to the open form (editable email) —
  // it never blocks contributing, and the contribute handler re-verifies the
  // token, so a forged value can't be used to submit under someone else's email.
  const invToken = typeof sp.inv === 'string' && sp.inv ? sp.inv : undefined;
  const lockedEmail = invToken ? verifyInviteEmail(invToken) : null;

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

  // Organizer write-later path: the dashboard "Write a memory" link carries
  // ?as=organizer&t={adminToken}. Only when that token actually matches THIS
  // collection do we treat the writer as the organizer (flag isOrganizer on the
  // contribution, pin/editable, and return them to their dashboard afterward).
  const isOrganizer = sp.as === 'organizer' && !!sp.t && sp.t === collection.adminToken;

  // Organizer writing their own memory later → the RICH customer form (same
  // fields as create), returning them to their dashboard afterward.
  if (isOrganizer) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {meta.title} collection
          </p>
          <h1 className="mb-3 font-serif text-3xl text-foreground md:text-4xl">Add your own memory</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Your memory of {collection.honoreeName} is pinned to the top of your collection and is
            always part of the final {meta.deliverableNoun}.
          </p>
        </header>
        <OrganizerMemoryForm
          mode="create"
          shareToken={shareToken}
          organizerEmail={collection.organizerEmail}
          honoreeLabel={collection.honoreeName}
          returnHref={`/collect/manage?t=${encodeURIComponent(collection.adminToken)}`}
        />
      </main>
    );
  }

  // Pre-check the contributor cap so a full collection shows the "full" screen
  // BEFORE the visitor fills out the form (the submit handler also enforces it).
  const cap = contributorCap(!!collection.paidAt);
  const contributorCount = await countContributors(db, collection.id).catch(() => 0);
  if (contributorCount >= cap) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6" aria-hidden="true">🤍</div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">This collection is full</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Thank you for wanting to share a memory of {collection.honoreeName}. This collection has reached the
            number of memories it can take — please let whoever invited you know if you’d still like yours included.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ContributorForm
      shareToken={shareToken}
      occasionTitle={meta.title}
      honoreeLabel={meta.honoreeLabel}
      honoreeName={collection.honoreeName}
      deliverableNoun={meta.deliverableNoun}
      organizerName={collection.organizerName ?? undefined}
      lockedEmail={lockedEmail ?? undefined}
      inviteToken={lockedEmail ? invToken : undefined}
      fields={fields}
      homeHref="/"
    />
  );
}
