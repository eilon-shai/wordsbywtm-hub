import type { Metadata } from 'next';
import { SupportConsole } from '@/components/SupportConsole';

// ---------------------------------------------------------------------------
// Internal support console. Look up a customer's collections by email across ALL
// occasions (results grouped by occasion) and restore links / delete. This page
// (and /api/support/*) is protected by the edge middleware Basic-Auth — there is
// no app-level auth, and it exposes admin tokens + a delete action.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Support', robots: { index: false, follow: false } };

export default function SupportPage() {
  return <SupportConsole />;
}
