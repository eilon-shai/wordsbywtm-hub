import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { audioEnabled } from '@/lib/audio';
import { ResultFlow } from './ResultFlow';
import { SiteHeader } from '@/components/SiteHeader';

// ---------------------------------------------------------------------------
// S8 — Synthesized Result (COLLECTION_SCREENS_REDESIGN.md §4)
//
// Post-payment, the organizer picks how the tribute should read (tone/length/
// avoid/context) and we generate WITH those prefs — venture-core
// collection-generate-handler accepts synthesisPrefs in the POST body and merges
// them before synthesis. The custom ResultFlow owns prefs → generate → display
// (instead of venture-core's auto-generating ResultPage, which can't carry prefs
// in its self-fetch). Pay-before-generate + one-time-use stay server-enforced.
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ occasion: string }>;
  searchParams: Promise<{ t?: string; txn?: string; txnId?: string }>;
}

const SUPPORT_EMAIL = 'hello@wordsbywtm.com';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { occasion } = await params;
  const meta = getOccasionMeta(occasion);
  const title = meta ? `${meta.title} tribute — Words That Matter` : 'Words That Matter';
  return { title, robots: { index: false, follow: false } };
}

export default async function OccasionResultPage({ params, searchParams }: PageProps) {
  const { occasion } = await params;
  const { t: adminToken } = await searchParams;

  const config = getConfig(occasion);
  const meta = getOccasionMeta(occasion);

  // Unknown occasion, or one with no live collection flow → 404.
  if (!config || !meta || !meta.live || !config.collectionConfig) {
    notFound();
  }

  // §4 — Optional one-time Edit/Refine pack: only when a Paddle price id exists.
  const editPackPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK;

  // When the dashboard hands us ?t={adminToken}, resolve the collection
  // server-side so the prefs step knows the organizer's email (Paddle prefill)
  // and whether they already paid in advance (no Terms/no charge). On the
  // txn-only return there's no token, so both stay undefined/false — fine.
  let organizerEmail: string | undefined;
  let paidInAdvance = false;
  // Paddle txn that paid for this collection — used as the feedback id on the
  // paid-in-advance path (there's no per-finalize txn there, and the feedback
  // handler rejects non-txn ids like the admin token).
  let paidTxnId: string | undefined;
  if (adminToken) {
    try {
      const db = getDbClient();
      if (db) {
        const collection = await getCollectionByAdminToken(db, adminToken);
        organizerEmail = collection?.organizerEmail;
        paidInAdvance = !!collection?.paidAt;
        paidTxnId = collection?.paidTxnId ?? undefined;
      }
    } catch {
      /* lookup failed — leave defaults; the client re-checks via the API */
    }
  }

  return (
    <>
      <SiteHeader />
      <ResultFlow
        occasion={occasion}
        occasionTitle={meta.title}
        accent={meta.accent}
        supportEmail={SUPPORT_EMAIL}
        homeHref={`/${occasion}`}
        resultPath={config.brand.resultPath}
        editPackPriceId={editPackPriceId}
        organizerEmail={organizerEmail}
        paidInAdvance={paidInAdvance}
        paidTxnId={paidTxnId}
        audioEnabled={audioEnabled()}
      />
    </>
  );
}
