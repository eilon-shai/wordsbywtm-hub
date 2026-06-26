import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { getIntake } from '@/lib/intake';
import { CreateForm } from '@/components/CreateForm';

// The create funnel is not a search-landing surface; keep it out of the index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface StartPageProps {
  params: Promise<{ occasion: string }>;
  searchParams: Promise<{ tier?: string }>;
}

export default async function StartPage({ params, searchParams }: StartPageProps) {
  const { occasion } = await params;
  const { tier: tierParam } = await searchParams;

  const meta = getOccasionMeta(occasion);
  const config = getConfig(occasion);

  // Unknown or not-yet-live occasion → never enter a /start whose config
  // lacks collectionConfig. Bounce back to the per-occasion landing, which
  // renders the coming-soon state (S2).
  if (!meta || !config || !meta.live || !config.collectionConfig) {
    redirect(`/${occasion}`);
  }

  // One anchored finalize tier; ?tier= is read harmlessly. Default to 'full'.
  const tier = tierParam === 'basic' ? 'basic' : 'full';
  const priceShown = config.tiers[tier].displayPrice;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16">
      {/* No page-level header here — CreateForm renders its own occasion eyebrow +
          single H1. A second H1 (and the memorial-coded "when the words matter
          most" copy) was a duplicate-heading a11y + tone issue. */}
      <CreateForm
        occasion={occasion}
        honoreeLabel={meta.honoreeLabel}
        priceShown={priceShown}
        tier={tier}
        occasionTitle={meta.title}
        contributorFields={config.collectionConfig.contributorFormFields}
        intake={getIntake(occasion)}
      />

      {/* Open legal pages in a new tab so a visitor mid-form doesn't lose their entries. */}
      <footer className="mt-auto pt-8 text-center text-xs text-muted-foreground">
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Terms
        </a>
        <span className="mx-2">·</span>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Privacy
        </a>
        <span className="mx-2">·</span>
        <a href="/refund" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Refund
        </a>
      </footer>
    </main>
  );
}
