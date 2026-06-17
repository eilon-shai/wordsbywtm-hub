import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { ResultFlow } from './ResultFlow';

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
}

const SUPPORT_EMAIL = 'hello@wordsbywtm.com';

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

  // Unknown occasion, or one with no live collection flow → 404.
  if (!config || !meta || !meta.live || !config.collectionConfig) {
    notFound();
  }

  // §4 — Optional one-time Edit/Refine pack: only when a Paddle price id exists.
  const editPackPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK;

  return (
    <ResultFlow
      occasion={occasion}
      occasionTitle={meta.title}
      accent={meta.accent}
      supportEmail={SUPPORT_EMAIL}
      homeHref={`/${occasion}`}
      resultPath={config.brand.resultPath}
      editPackPriceId={editPackPriceId}
    />
  );
}
