import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { audioEnabled } from '@/lib/audio';
import { ResultFlow } from './ResultFlow';
import { SiteHeader } from '@/components/SiteHeader';
import { PurchaseTracker } from '@/components/PurchaseTracker';
import { partnerDiscountApplies, resolvePrice } from '@/lib/partners';
import { getPartner } from '@/lib/partners-store';

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

// Token/payment route: never statically optimize. Parity with the sibling token
// routes (collect/manage, c/[shareToken]) — this page reads an admin token + txn
// from searchParams and must always render dynamically. (Safe today via awaited
// searchParams; declared explicitly to remove the intent footgun.)
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ occasion: string }>;
  searchParams: Promise<{ t?: string; txn?: string; txnId?: string }>;
}

const SUPPORT_EMAIL = 'hello@wordsbywtm.com';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { occasion } = await params;
  const meta = getOccasionMeta(occasion);
  const title = meta ? `${meta.title} ${meta.deliverableNoun} — Words That Matter` : 'Words That Matter';
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
  // When the lookup DEFINITIVELY returns no collection for a real admin token
  // (e.g. the organizer deleted it), show a calm not-found instead of the
  // prefs/checkout flow. We only set this on a clean null result — a DB error is
  // swallowed below so a transient hiccup doesn't hard-block (the client re-checks).
  let collectionMissing = false;
  // Partner-referral courtesy. Read server-side from the durable collection row
  // (never localStorage) so the paywall applies the discount deterministically.
  let referrer: string | null | undefined;
  if (adminToken) {
    try {
      const db = getDbClient();
      if (db) {
        const collection = await getCollectionByAdminToken(db, adminToken);
        if (!collection) {
          collectionMissing = true;
        } else {
          organizerEmail = collection.organizerEmail;
          paidInAdvance = !!collection.paidAt;
          paidTxnId = collection.paidTxnId ?? undefined;
          referrer = collection.referrer;
        }
      }
    } catch {
      /* lookup failed — leave defaults; the client re-checks via the API */
    }
  }

  // Resolve the price shown/tracked on this collection: base $49, or the 10%
  // courtesy when a known partner referred it AND PARTNER_DISCOUNT_ID is set.
  // resolvePrice is the single source of truth so on-screen, per-person, and the
  // GA4/Ads purchase value all agree with what Paddle actually charges.
  const basePrice = config.tiers.full.displayPrice;
  const discountApplies = partnerDiscountApplies(referrer);
  const resolvedPrice = resolvePrice(basePrice, discountApplies);
  const partnerName = (await getPartner(referrer))?.displayName;

  // A deleted/expired collection reached via its ?t={adminToken} tribute link:
  // its memories are gone, so there's nothing to finalize. Mirror the contributor
  // share page's calm "couldn't open this" rather than rendering the prefs form.
  if (collectionMissing) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[60vh] bg-background flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="text-5xl mb-6" aria-hidden="true">{meta.successIcon}</div>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
              This collection is no longer available
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              It looks like this collection has been deleted, so there’s nothing left to finalize —
              the memories that were gathered have been removed. If this isn’t what you expected,
              reach out at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">{SUPPORT_EMAIL}</a>.
            </p>
            <a
              href={`/${occasion}`}
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Start a new collection
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      {/* Fires GA4 purchase + Google Ads conversion once on the post-Paddle
          return (?txn=), deduped per transaction. No-op until analytics ids set.
          PurchaseTracker reads useSearchParams, so it owns its own Suspense
          boundary rather than relying on the dynamic route to cover it. */}
      <Suspense fallback={null}>
        {/* Track the DISCOUNTED amount on referred+discounted collections so
            GA4/Ads purchase value isn't over-reported to Smart Bidding. */}
        <PurchaseTracker occasion={occasion} value={resolvedPrice.value} />
      </Suspense>
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
        deliverableNoun={meta.deliverableNoun}
        readAloudContext={meta.readAloudContext}
        priceValue={resolvedPrice.value}
        basePrice={basePrice}
        discountApplies={discountApplies}
        partnerName={partnerName}
      />
    </>
  );
}
