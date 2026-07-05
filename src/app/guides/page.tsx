import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES } from '@/lib/guides';

// ---------------------------------------------------------------------------
// /guides — index for the SEO content section. Static; lists every guide as a
// card. Articles carry the search intent; this page just organizes them.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Guides — Collecting Memories for Life’s Occasions',
  description:
    'Practical guides to gathering memories from a group — for memorials, weddings, retirements, and anniversaries — and weaving them into one piece.',
  alternates: { canonical: 'https://www.wordsbywtm.com/guides' },
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-14 text-center">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">Guides</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
          Collecting memories, done well
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Practical, step-by-step guides to gathering memories and stories from a group — who to
          ask, how to ask, and how to weave what comes back into one piece worth reading aloud.
        </p>
      </header>

      <div className="space-y-6">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="block rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/40"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {g.occasionLabel}
            </p>
            <h2 className="mt-3 font-serif text-2xl leading-snug text-foreground">{g.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.blurb}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {g.readMinutes} minute read <span aria-hidden>·</span>{' '}
              <span className="font-medium text-primary">Read the guide →</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
