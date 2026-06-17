import type { Metadata } from 'next';
import { OCCASIONS } from '@/lib/registry';
import { SiteHeader } from '@/components/SiteHeader';
import { SupportConsole } from '@/components/SupportConsole';

// ---------------------------------------------------------------------------
// Internal support console. Look up a customer's collections by email + product
// and restore links / delete. This page (and /api/support/*) MUST be protected
// at the platform level (Vercel Password Protection) — there is no app-level
// auth, and it exposes admin tokens + a delete action.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Support', robots: { index: false, follow: false } };

export default function SupportPage() {
  // Only occasions with a live collection flow are operable.
  const products = OCCASIONS.filter((o) => o.live).map((o) => ({ slug: o.slug, title: o.title }));
  return (
    <>
      <SiteHeader />
      <SupportConsole products={products} />
    </>
  );
}
