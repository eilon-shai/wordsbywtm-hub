'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tab nav shared across the Basic-Auth /support console. These links only ever
// render on already-authenticated /support pages, but we still set
// prefetch={false} so Next never background-fetches a Basic-Auth route (a prefetch
// 401 pops the browser credential dialog — see the footer-Support-link lesson).
const TABS = [
  { href: '/support', label: 'Support' },
  { href: '/support/metrics', label: 'Metrics' },
  { href: '/support/partners', label: 'Partners' },
] as const;

export function SupportTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border" aria-label="Support sections">
      <div className="mx-auto flex w-full max-w-4xl gap-1 px-4">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
