import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingPage } from '@/components/vc/ClientLandingPage';
import type { LandingPageConfig } from '@eilon-shai/venture-core';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { memorialLandingConfig } from '@/products/_landing/memorial';
import { retirementLandingConfig } from '@/products/_landing/retirement';
import { weddingLandingConfig } from '@/products/_landing/wedding';
import { anniversaryLandingConfig } from '@/products/_landing/anniversary';
import ComingSoon from '@/components/ComingSoon';
import { PageBeacon } from '@/components/PageBeacon';
import RefCapture from '@/components/RefCapture';
import { PartnerEndorsement } from '@/components/PartnerEndorsement';
import { ProductShowcase } from '@/components/ProductShowcase';
import { discountConfigured } from '@/lib/partners';
import { getPartnerForOccasion } from '@/lib/partners-store';

// ---------------------------------------------------------------------------
// S2 — Per-occasion landing page.
//
// LIVE occasions (memorial) render venture-core's LandingPage in formFirst nav
// mode: every CTA routes to `${formPath}?tier=` with no Paddle init. Stub
// occasions (live:false) render a quiet coming-soon screen — we never route into
// a /start whose config has no collectionConfig.
// ---------------------------------------------------------------------------

// Per-occasion landing configs. Only live occasions need one.
const LANDING_CONFIGS: Record<string, LandingPageConfig> = {
  memorial: memorialLandingConfig,
  retirement: retirementLandingConfig,
  wedding: weddingLandingConfig,
  anniversary: anniversaryLandingConfig,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ occasion: string }>;
}): Promise<Metadata> {
  const { occasion } = await params;
  const landing = LANDING_CONFIGS[occasion];
  const meta = getOccasionMeta(occasion);
  if (!landing || !meta) {
    return { title: meta ? `${meta.title} — Words That Matter` : 'Words That Matter' };
  }
  return {
    title: landing.seo?.metaTitle,
    description: landing.seo?.metaDescription,
    alternates: landing.seo?.canonicalUrl ? { canonical: landing.seo.canonicalUrl } : undefined,
    openGraph: {
      title: landing.seo?.metaTitle,
      description: landing.seo?.metaDescription,
      images: landing.seo?.ogImageUrl ? [landing.seo.ogImageUrl] : undefined,
      type: 'website',
    },
  };
}

export default async function OccasionLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ occasion: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { occasion } = await params;
  const { ref } = await searchParams;
  const meta = getOccasionMeta(occasion);
  const config = getConfig(occasion);

  // Unknown slug → 404.
  if (!meta || !config) notFound();

  // Stub occasion → coming-soon (never route into a /start without collectionConfig).
  if (!meta.live || !config.collectionConfig) {
    return <ComingSoon occasion={meta} />;
  }

  const landing = LANDING_CONFIGS[occasion];
  if (!landing) notFound();

  // Resolve the partner endorsement from the live allowlist (Postgres), scoped to
  // THIS occasion. Only a known, ACTIVE partner whose scope permits this occasion
  // yields a banner; organic/unknown/out-of-scope `?ref` → null → no banner.
  // courtesyLive gates the soft celebratory courtesy mention (a family referred by
  // an in-scope active partner will get the discount at pay iff it's set).
  const partner = await getPartnerForOccasion(ref, occasion);
  const courtesyLive = !!partner && discountConfigured();

  // Resolve Paddle price IDs for type-safety. Unused in formFirst nav mode (CTAs
  // navigate to formPath), but LandingPage requires both props.
  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT !== 'production';
  const resolvePrice = (tier: 'basic' | 'full') =>
    (isSandbox ? config.tiers[tier].priceIdSandbox : config.tiers[tier].priceId) ?? '';

  // The explainer video now renders natively inside LandingPage (between the
  // hero and "How it works") via the venture-core `config.video` slot — set per
  // occasion in the _landing configs. No app-level video band here.
  return (
    <>
      <PageBeacon occasion={occasion} step="landing" />
      <RefCapture />
      {/* Partner endorsement — rendered near the hero, above the CTA, ONLY when
          ?ref resolves to a known partner. No-op for organic/unknown traffic. */}
      <div className="px-4 pt-6">
        <PartnerEndorsement
          occasion={occasion}
          partnerName={partner?.displayName}
          courtesyLive={courtesyLive}
        />
      </div>
      <LandingPage
        config={landing}
        formPath={`/${occasion}/start`}
        basicPriceId={resolvePrice('basic')}
        fullPriceId={resolvePrice('full')}
        showcase={<ProductShowcase meta={meta} />}
        formFirst
      />
    </>
  );
}
