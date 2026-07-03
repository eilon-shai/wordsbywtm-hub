import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { PartnersAdmin } from '@/components/PartnersAdmin';

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
  return (
    <>
      <SiteHeader />
      <PartnersAdmin />
    </>
  );
}
