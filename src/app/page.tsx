import Link from 'next/link';
import type { Metadata } from 'next';
import OccasionPicker from '@/components/OccasionPicker';

// ---------------------------------------------------------------------------
// S1 — Root hub / occasion picker.
//
// Bespoke page (NOT venture-core LandingPage, which is single-product). Teaches
// the collaborative model once, then routes into each occasion's own landing.
// Built only from globals.css tokens + /ui-compatible primitives. No login field
// ever — re-entry is via the magic links we email organizers.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Words That Matter — Gather memories into one tribute',
  description:
    'No one person holds the whole of a life. Start a collection, invite everyone who knew them to add a memory, and weave them into one tribute. Free to create and collect. Pay once when you’re ready.',
  alternates: { canonical: 'https://wordsbywtm.com' },
};

// A short synthesized multi-voice excerpt — the model in miniature, above the fold.
const HUB_EXCERPT = `Ask anyone who knew her and the same word surfaces first: present. Some remember the way she'd put down whatever she was holding the moment you walked in. Others recall the recipe box that was never really about recipes — tucked between the cards were birthdays, the names of people's dogs, the date you'd started a new job so she'd know to ask. What comes through every memory gathered here is that she made people feel known. We carry that forward now. All of us. Together.`;

const STEPS = [
  { n: '01', t: 'Start a collection', b: 'Free. Tell us who you’re honoring; we email you a private link to manage it.' },
  { n: '02', t: 'Invite the circle', b: 'Share one link. Each person adds a memory in two minutes — no account, no payment.' },
  { n: '03', t: 'Review what came in', b: 'Read every memory. Everything’s included by default; leave out anything that doesn’t belong.' },
  { n: '04', t: 'Weave it together', b: 'When you’re ready, pay once and we synthesize it all into one tribute.' },
];

export default function HubPage() {
  return (
    <div className="flex min-h-screen flex-col">
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
              href="/memorial"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start a collection
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pb-16 pt-24 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <span className="mb-8 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Gathered · Woven · Read Aloud
            </span>
            <h1 className="font-serif text-5xl leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              When the words matter most,
              <br />
              <em className="italic text-primary">gather them together.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              No one person holds the whole of a life. Invite everyone who knew them to share a
              memory — and we weave the memories into one tribute, in a voice that belongs to all of
              you.
            </p>
            <p className="mt-8 text-sm font-medium text-muted-foreground">
              Free to create · Free to collect · Pay once when you’re ready
            </p>

            {/* Synthesized multi-voice excerpt — the model in miniature */}
            <div className="mx-auto mt-12 w-full max-w-2xl">
              <div className="relative rounded-2xl border border-border bg-card p-8 text-left shadow-lg md:p-10">
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    Woven from many memories
                  </span>
                </div>
                <div className="mb-2 select-none font-serif text-6xl leading-none text-border" aria-hidden>
                  &ldquo;
                </div>
                <p className="speech-text text-foreground">{HUB_EXCERPT}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Occasion picker */}
        <section className="border-y border-border bg-card px-4 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Choose the occasion</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">One way to honor every kind of moment</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Memorials are live today. Weddings and retirements are on the way — same idea, gather
              many voices into one.
            </p>
          </div>
          <OccasionPicker />
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
              Four steps, one tribute
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
        <section className="bg-foreground px-4 py-24 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="font-serif text-3xl text-primary-foreground md:text-4xl">
              Gather the memories before they scatter.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Start a collection now — it’s free. Invite the people who knew them, and weave their
              memories into one tribute when you’re ready.
            </p>
            <Link
              href="/memorial"
              className="mt-10 inline-block rounded-full bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start a Memorial Collection →
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
        <nav className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/refund" className="transition-colors hover:text-foreground">Refund Policy</Link>
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Words That Matter LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
