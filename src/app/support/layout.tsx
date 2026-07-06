import { SiteHeader } from '@/components/SiteHeader';
import { SupportTabs } from '@/components/SupportTabs';

// Shared chrome for the whole Basic-Auth /support console: the site header and a
// tab bar (Support · Metrics · Partners) render once here so every /support/*
// route gets consistent navigation without duplicating it per page. Auth is still
// the edge middleware; this layout adds no gating of its own.
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <SupportTabs />
      {children}
    </>
  );
}
