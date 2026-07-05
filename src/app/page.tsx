import Link from 'next/link';
import type { Metadata } from 'next';
import OccasionPicker, { resolveFocusSlug } from '@/components/OccasionPicker';
import { getOccasionMeta, OCCASIONS } from '@/lib/registry';
import FocusScroll from '@/components/FocusScroll';
import RefCapture from '@/components/RefCapture';

// ---------------------------------------------------------------------------
// S1 — Root hub / occasion picker.
//
// Bespoke page (NOT venture-core LandingPage, which is single-product). Teaches
// the collaborative model once, then routes into each occasion's own landing.
// Built only from globals.css tokens + /ui-compatible primitives. No login field
// ever — re-entry is via the magic links we email organizers.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Words That Matter — Gather memories into one piece',
  description:
    'No one person holds the whole story. Start a collection for a memorial, wedding, retirement, or anniversary, invite the people who were there to each add a memory, and we weave them into one piece to read aloud. Free to create and collect; pay once when you’re ready.',
  alternates: { canonical: 'https://www.wordsbywtm.com' },
};

const STEPS = [
  { n: '01', t: 'Start a collection', b: 'Free. Tell us who you’re honoring; we email you a private link to manage it.' },
  { n: '02', t: 'Invite the circle', b: 'Share one link. Each person adds a memory in two minutes — no account, no payment.' },
  { n: '03', t: 'Review what came in', b: 'Read every memory. Everything’s included by default; leave out anything that doesn’t belong.' },
  { n: '04', t: 'Weave it together', b: 'When you’re ready, pay once and we synthesize it all into one piece.' },
];

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  // ?focus=<occasion-or-alias> (set per ad group) puts one product in focus.
  const { focus } = await searchParams;
  const focusSlug = resolveFocusSlug(focus);
  const focusMeta = focusSlug ? getOccasionMeta(focusSlug) : null;
  // Focus-aware primary CTA (nav + final): unknown intent → scroll to the
  // occasion picker (you can't "start" before choosing); known intent (ad
  // deep-link ?focus=) → straight into that occasion. Never hardcode an occasion.
  const ctaHref = focusSlug ? `/${focusSlug}` : '#occasions';
  const ctaLabel = focusMeta ? `Start a ${focusMeta.title} collection →` : 'Start a free collection →';

  // Occasion self-route pills — let occasion-intent visitors jump straight to
  // their landing instead of scrolling to the picker (SES-055 UX panel doNext).
  const livePills = OCCASIONS.filter((o) => o.live);

  return (
    <div className="flex min-h-screen flex-col">
      <RefCapture />
      {focusSlug ? <FocusScroll /> : null}
      {/* Nav — no login, ever */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-xl text-foreground transition-opacity hover:opacity-80">
            Words That Matter
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <a href="#how" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">
              How it works
            </a>
            <Link
              href={ctaHref}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — compact, mechanism-first. Occasion-neutral so the hub serves
            grief and celebration alike; the four accent cards below carry tone.
            (No occasion-coded copy/imagery here — that's the per-occasion
            landings' job. The picker is the primary CTA, just below.) */}
        <section className="relative overflow-hidden px-4 pb-10 pt-24 text-center">
          {/* Soft floral background — warm and occasion-neutral, with a scrim that
              fades into the page so the text stays legible. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.55]"
            style={{ backgroundImage: "url('/hero-hub.jpg')" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(to bottom, color-mix(in oklch, var(--background) 20%, transparent) 0%, color-mix(in oklch, var(--background) 35%, transparent) 55%, var(--background) 100%)',
            }}
          />
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <span className="mb-8 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Group memory collections
            </span>
            <h1 className="font-serif text-5xl leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              No one person holds the whole story.
              <br />
              <em className="italic text-primary">So gather everyone’s.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Invite the people who were there to each add one memory. We weave them into a single
              piece — written in a voice that belongs to all of you — ready to read aloud.
            </p>
            {/* The three tangible deliverables, as a scannable icon row (SES-055
                UX panel finding #7) — a 5-second visitor should register that
                they get a printable page and spoken audio, not just text. */}
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 2.5h5L15.5 7v10.5H6z" strokeLinejoin="round" /><path d="M11 2.5V7h4.5" strokeLinejoin="round" />
                </svg>
                <span>One woven piece</span>
              </li>
              <li className="flex items-center gap-2">
                <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M5.5 7.5V3h9v4.5M5.5 14.5h-2v-5h13v5h-2M6.5 12.5h7v4.5h-7z" strokeLinejoin="round" />
                </svg>
                <span>Keepsake PDF to print</span>
              </li>
              <li className="flex items-center gap-2">
                <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3.5 7.5v5h3l4 3.5v-12l-4 3.5z" strokeLinejoin="round" /><path d="M13.5 7q1.5 3 0 6M15.5 5q3 5 0 10" strokeLinecap="round" />
                </svg>
                <span>Spoken audio to play</span>
              </li>
            </ul>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              Free to create · Free to collect · $49 once when you’re ready
            </p>
            <a
              href={ctaHref}
              className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {ctaLabel}
            </a>
            {/* Occasion self-route pills — occasion-intent visitors jump straight
                to their landing instead of scrolling to the picker. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {livePills.map((o) => (
                <Link
                  key={o.slug}
                  href={`/${o.slug}`}
                  className="rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {o.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Explainer video — ~1 min "how it works", placed between the hook and
            the picker (hook → show → convert). Has narration, so it's click-to-
            play with a poster (no autoplay/muted). 720p, ~2.6MB, served locally. */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">See how it works</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">Watch a collection come together</h2>
            <p className="mx-auto mb-8 mt-3 max-w-xl text-sm text-muted-foreground">
              A one-minute look — from the first invite to the finished piece you’ll read aloud.
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <video
                className="aspect-video w-full"
                controls
                preload="metadata"
                playsInline
                poster="/words-that-matter-poster.jpg"
              >
                <source src="/words-that-matter.mp4" type="video/mp4" />
                Your browser doesn’t support embedded video.
              </video>
            </div>
          </div>
        </section>

        {/* Occasion picker — scroll target for the "Choose an occasion" CTA.
            scroll-mt offsets the sticky 4rem header so the section heading lands
            in view instead of the cards jamming under the nav. */}
        <section id="occasions" className="scroll-mt-20 border-y border-border bg-card px-4 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Choose the occasion</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">One way to honor every kind of moment</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Pick the moment you’re marking — it’s the same idea every time: gather many voices into
              one piece to read aloud.
            </p>
          </div>
          <OccasionPicker focus={focus} />
        </section>

        {/* How it differs from solo AI */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-serif text-2xl leading-relaxed text-foreground md:text-3xl">
              A solo AI tool writes from one person’s memory.
              <br />
              <em className="italic text-primary">This writes from everyone’s.</em>
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              The recipe box, the garage radio, the late laugh — details no one person could supply,
              gathered into a single collective voice: “Some remember… others recall…”
            </p>
          </div>
        </section>

        {/* 4-step strip */}
        <section id="how" className="border-y border-border bg-card px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mb-16 text-center font-serif text-3xl text-foreground md:text-4xl">
              Four steps, one piece
            </h2>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-6">
              {STEPS.map((s) => (
                <div key={s.n} className="flex flex-col items-center text-center md:items-start md:text-left">
                  <div className="mb-4 select-none font-serif text-6xl font-normal leading-none text-primary/20">
                    {s.n}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">{s.t}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Re-entry helper — replaces any login. No accounts exist. */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-secondary/40 p-8 text-center">
            <h2 className="font-serif text-2xl text-foreground">Got a link already?</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Invited to add a memory?</span> Open the link
              the organizer sent you — no account needed.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Managing a collection?</span> We emailed you a
              private link when you created it. Check your email to come back and finish.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">There are no passwords here — your link is your key.</p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden px-4 py-24 text-center">
          {/* dark base */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 bg-foreground" />
          {/* photographic texture (same image family as the per-occasion landings) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-35"
            style={{ backgroundImage: "url('/hero-finalcta.jpg')" }}
          />
          {/* dark scrim to keep the light text legible */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: 'color-mix(in oklch, var(--foreground) 45%, transparent)' }}
          />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-serif text-3xl text-primary-foreground md:text-4xl">
              Gather the words while everyone remembers.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Start a collection now — it’s free. Invite the people who were there, and weave their
              memories into one piece when you’re ready.
            </p>
            <Link
              href={ctaHref}
              className="mt-10 inline-block rounded-full bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {ctaLabel}
            </Link>
            <p className="mt-5 text-xs text-primary-foreground/40">
              Free to create and collect · Pay once when you finalize · No account needed
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-12 text-center">
        <p className="font-serif text-lg text-foreground">Words That Matter</p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/guides" className="transition-colors hover:text-foreground">Guides</Link>
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/refund" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Refund Policy</Link>
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">
          Questions before you start?{' '}
          <a href="mailto:hello@wordsbywtm.com" className="underline underline-offset-2 transition-colors hover:text-foreground">
            hello@wordsbywtm.com
          </a>{' '}
          — a real person answers.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Words That Matter LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
