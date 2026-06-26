import Link from 'next/link';
import type { OccasionMeta } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Coming-soon screen for stub occasions (live:false). Quiet by design — no
// route into a /start whose config lacks collectionConfig. Re-themed by the
// per-occasion layout's accent CSS vars.
// ---------------------------------------------------------------------------

export default function ComingSoon({ occasion }: { occasion: OccasionMeta }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-xl text-foreground transition-opacity hover:opacity-80">
            Words That Matter
          </Link>
          <Link href="/memorial" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Memorial
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="mb-6 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Coming soon
          </span>
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
            {occasion.title} collections
            <br />
            <em className="italic text-primary">are on the way.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{occasion.blurb}</p>
          <p className="mt-8 text-sm text-muted-foreground">
            Our memorial collections are live today — built on the same idea: gather memories from
            everyone, weave them into one tribute.
          </p>
          <div className="mt-8">
            <Link
              href="/memorial"
              className="inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              See how it works on Memorial →
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card px-4 py-12 text-center">
        <p className="font-serif text-lg text-foreground">Words That Matter</p>
        <nav className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/refund" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Refund Policy</Link>
        </nav>
      </footer>
    </div>
  );
}
