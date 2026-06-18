import { redirect } from 'next/navigation';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { getIntake } from '@/lib/intake';
import { CreateForm } from '@/components/CreateForm';

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
      <header className="text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {meta.title} Collection
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
          When the words matter most, gather them together.
        </h1>
      </header>

      <CreateForm
        occasion={occasion}
        honoreeLabel={meta.honoreeLabel}
        priceShown={priceShown}
        tier={tier}
        occasionTitle={meta.title}
        contributorFields={config.collectionConfig.contributorFormFields}
        intake={getIntake(occasion)}
      />

      <footer className="mt-auto pt-8 text-center text-xs text-muted-foreground">
        <a href="/terms" className="hover:underline">
          Terms
        </a>
        <span className="mx-2">·</span>
        <a href="/privacy" className="hover:underline">
          Privacy
        </a>
        <span className="mx-2">·</span>
        <a href="/refund" className="hover:underline">
          Refund
        </a>
      </footer>
    </main>
  );
}
