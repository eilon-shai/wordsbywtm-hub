import { notFound } from 'next/navigation';
import {
  getDbClient,
  getCollectionByAdminToken,
} from '@eilon-shai/venture-core/db';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { ManageDashboard } from '@/components/ManageDashboard';
import { SiteHeader } from '@/components/SiteHeader';
import { partnerDiscountApplies } from '@/lib/partners';
import { getPartner } from '@/lib/partners-store';

// S6 + S7 — Organizer manage / review dashboard + finalize.
// Server component: reads the admin token from ?t=, resolves the collection to
// its occasion (for resultPath + accent theming), then hands off to the client
// dashboard. The dashboard fetches the actual data via the admin-scoped GET so
// no synthesized content ever passes through this server boundary.
// Path is baked into the backend (non-negotiable): /collect/manage?t={adminToken}.

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ t?: string; new?: string }>;
}

export default async function ManagePage({ searchParams }: PageProps) {
  const { t: adminToken, new: isNew } = await searchParams;
  const justCreated = isNew === '1';

  // Missing token — there is no public manage surface; send to a 404.
  if (!adminToken) notFound();

  const db = getDbClient();
  if (!db) {
    // DB unavailable at request time: let the client dashboard surface a retry
    // by rendering it with a placeholder occasion (its own load() will 503).
    return (
      <>
        <SiteHeader />
        <ManageDashboard adminToken={adminToken} resultPath="/memorial/result" occasion="memorial" justCreated={justCreated} />
      </>
    );
  }

  let collection;
  try {
    collection = await getCollectionByAdminToken(db, adminToken);
  } catch {
    collection = null;
  }

  // Unknown token — do not reveal whether a collection exists; the dashboard's
  // own NOT_FOUND copy directs the organizer back to their email link.
  const occasion = collection?.occasion ?? 'memorial';
  const config = getConfig(occasion);
  const meta = getOccasionMeta(occasion);
  const resultPath = config?.brand.resultPath ?? '/memorial/result';
  const accent = meta?.accent;

  // Partner-referral courtesy (durable, server-side from the collection row).
  // Passed to the dashboard so its price copy + advance-pay CTA reflect the
  // discounted price that Paddle will actually charge — never $49-then-$44.
  const referrer = collection?.referrer;
  const discountApplies = partnerDiscountApplies(referrer);
  const partnerName = (await getPartner(referrer))?.displayName;

  return (
    <main
      style={
        accent
          ? ({
              '--primary': accent,
              '--ring': accent,
              // Match [occasion]/layout.tsx semantics: --accent is a SOFT tint of
              // the hue and --accent-foreground is the accent itself — not raw-hex
              // + white, which over-saturated accent surfaces only on the dashboard.
              '--accent': `color-mix(in oklab, ${accent} 14%, var(--background))`,
              '--accent-foreground': accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      <SiteHeader />
      <ManageDashboard
        adminToken={adminToken}
        resultPath={resultPath}
        occasion={occasion}
        organizerEmail={collection?.organizerEmail}
        justCreated={justCreated}
        discountApplies={discountApplies}
        partnerName={partnerName}
      />
    </main>
  );
}
