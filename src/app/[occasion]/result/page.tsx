import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ResultPage } from '@/components/vc/ClientResultPage';
import type { ResultPageConfig } from '@eilon-shai/venture-core/types';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { EditPackCard } from './EditPackCard';

// ---------------------------------------------------------------------------
// S8 — Synthesized Result (COLLECTION_FLOW_DESIGN.md §S8)
//
// Reuses venture-core's `ResultPage` UNMODIFIED. The component self-fetches its
// own result: on mount it looks in sessionStorage, and if absent POSTs to
// `autoGenerate.endpoint` (= /api/collection/generate) with { transactionId }.
// It reads the txn from ?txn= / ?txnId= itself (ResultPageInner, txnParam).
//
// After the B1 reshape, /api/collection/generate returns the basic-tier
// `GenerateResult` shape ({ tier:'basic', content, ... }) so ResultPage's basic
// path renders `content` directly. The app never sees this JSON — ResultPage
// owns the fetch and parses it internally. We only hand it config.
//
// The 202 PAYMENT_NOT_VERIFIED poll (webhook lag) is handled inside ResultPage
// (retries with backoff, "Confirming your payment…"); 409 ALREADY_USED and 500
// GENERATION_FAILED are surfaced by the component's error states too.
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ occasion: string }>;
}

const SUPPORT_EMAIL = 'hello@wordsbywtm.com';

function buildResultPageConfig(
  occasion: string,
  productName: string,
  redisKeyPrefix: string,
): ResultPageConfig {
  return {
    brand: {
      name: 'Words That Matter',
      homeHref: `/${occasion}`,
    },
    // sessionStorage cache key for the rendered result, keyed by txn.
    resultKey: `${redisKeyPrefix}_result_<txnId>`,
    // ResultPage reads ?txn= (and falls back to ?txnId=) itself.
    txnParam: 'txn',
    // Single-output basic tier (B1): no output-type or tone tabs.
    outputTypes: [{ key: 'tribute', label: 'Tribute' }],
    tones: [],
    productSlug: occasion,
    supportEmail: SUPPORT_EMAIL,
    copyLabel: 'Copy tribute',
    success: {
      basicHeadline: 'The tribute is ready',
      fullHeadline: 'The tribute is ready',
      basicSubheading:
        'Woven from the memories everyone shared. Read it, make it yours, and read it aloud when the moment comes.',
      fullSubheading:
        'Woven from the memories everyone shared. Read it, make it yours, and read it aloud when the moment comes.',
    },
    // ResultPage self-generates when no cached result is found.
    autoGenerate: {
      endpoint: '/api/collection/generate',
      sessionKeyPrefix: redisKeyPrefix,
    },
    footer: {
      links: [
        { href: '/terms', label: 'Terms' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/refund', label: 'Refund Policy' },
      ],
    },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { occasion } = await params;
  const meta = getOccasionMeta(occasion);
  const title = meta ? `${meta.title} tribute — Words That Matter` : 'Words That Matter';
  return { title, robots: { index: false, follow: false } };
}

export default async function OccasionResultPage({ params }: PageProps) {
  const { occasion } = await params;

  const config = getConfig(occasion);
  const meta = getOccasionMeta(occasion);

  // Unknown occasion, or an occasion with no live collection flow → 404.
  // (Memorial is the only live occasion; results never exist for stubs.)
  if (!config || !meta || !meta.live || !config.collectionConfig) {
    notFound();
  }

  const resultConfig = buildResultPageConfig(
    occasion,
    config.brand.productName,
    config.brand.redisKeyPrefix,
  );

  // §4 — Optional one-time Edit/Refine pack upsell. Rendered ONLY when a Paddle
  // price id is configured; otherwise nothing renders (we never imply a regen
  // path that doesn't exist yet). The regen wiring is a backend follow-up — the
  // card opens checkout but does not yet trigger regeneration.
  const editPackPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK;

  return (
    <>
      <ResultPage config={resultConfig} />
      {editPackPriceId ? (
        <EditPackCard priceId={editPackPriceId} resultPath={config.brand.resultPath} />
      ) : null}
    </>
  );
}
