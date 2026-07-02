import Link from 'next/link';

// ---------------------------------------------------------------------------
// Chrome for the /guides SEO content section: the hub's sticky header and
// footer around a narrow article column. Static server component — no dynamic
// APIs, so every guide page prerenders and stays crawlable.
// ---------------------------------------------------------------------------

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-xl text-foreground transition-opacity hover:opacity-80">
            Words That Matter
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/guides"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              All guides
            </Link>
            <Link
              href="/#occasions"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start a collection
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20 pt-16">{children}</main>

      <footer className="border-t border-border bg-card px-4 py-12 text-center">
        <p className="font-serif text-lg text-foreground">Words That Matter</p>
        <nav className="mt-4 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
          <Link href="/guides" className="transition-colors hover:text-foreground">Guides</Link>
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/refund" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Refund Policy</Link>
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Words That Matter LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
