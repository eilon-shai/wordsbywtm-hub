import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { PartnersAdmin } from '@/components/PartnersAdmin';
import { OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Partner registry admin. Behind the same edge-middleware Basic-Auth as the rest
// of /support (see src/middleware.ts). Add partners, see everyone added, copy
// their referral + printable-card links, and activate/deactivate — the `partners`
// table is the live source of truth for the referral courtesy discount, so
// changes here take effect immediately with no code deploy.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Partners', robots: { index: false, follow: false } };

export default function PartnersAdminPage() {
  // Live occasions a partner can be scoped to (memorial pre-selected client-side).
  const occasions = OCCASIONS.filter((o) => o.live).map((o) => ({ slug: o.slug, title: o.title }));
  return (
    <>
      <SiteHeader />
      <PartnersAdmin occasions={occasions} />
    </>
  );
}
