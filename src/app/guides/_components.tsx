import Link from 'next/link';
import { GUIDES_HOST, getGuide, type GuideMeta } from '@/lib/guides';

// ---------------------------------------------------------------------------
// Shared presentation primitives for the /guides articles. Server components
// only — no client code, no dynamic APIs, so every guide stays statically
// rendered and crawlable. Styling uses the same globals.css token classes as
// the root hub (font-serif headings, muted-foreground body, primary CTAs).
// ---------------------------------------------------------------------------

/** Article JSON-LD for a guide, built from the guide registry. */
export function GuideJsonLd({ slug }: { slug: string }) {
  const guide = getGuide(slug);
  if (!guide) return null;
  const url = `${GUIDES_HOST}/guides/${guide.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.datePublished,
    dateModified: guide.datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'Words That Matter', url: GUIDES_HOST },
    publisher: { '@type': 'Organization', name: 'Words That Matter LLC', url: GUIDES_HOST },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** Article header: occasion chip, serif H1, dek, read time. */
export function GuideHeader({ guide, dek }: { guide: GuideMeta; dek: string }) {
  return (
    <header className="mb-12">
      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">
        Guide · {guide.occasionLabel}
      </p>
      <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
        {guide.title}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{dek}</p>
      <p className="mt-4 text-xs text-muted-foreground">{guide.readMinutes} minute read</p>
    </header>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 font-serif text-3xl text-foreground">{children}</h2>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 text-base font-semibold text-foreground">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">{children}</ul>;
}

export function OL({ children }: { children: React.ReactNode }) {
  return <ol className="mt-4 list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">{children}</ol>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

/** Blockquote-style example message people can copy. */
export function Example({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-4 rounded-2xl border border-border bg-card p-6 text-sm italic leading-relaxed text-muted-foreground">
      {children}
    </blockquote>
  );
}

/**
 * Soft CTA card. Used once mid-article and once at the end. Deliberately quiet:
 * no urgency, no scarcity — just the product as the natural way to do the thing
 * the article describes.
 */
export function CtaCard({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <aside className="mt-10 rounded-2xl border border-border bg-secondary/40 p-8">
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {label}
      </Link>
      <p className="mt-4 text-xs text-muted-foreground">
        Free to create and collect · Pay once when you finalize · No accounts needed
      </p>
    </aside>
  );
}
