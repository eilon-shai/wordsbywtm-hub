import Link from 'next/link';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// /partners — partner-facing program page.
//
// Audience: funeral directors, hospice bereavement coordinators, and
// celebrants/officiants — professionals, not grieving families. They hand a
// family one link at the arrangement meeting; the family gathers memories
// free and only pays if they want the woven keepsake. Partner links carry
// ?ref=<partner-slug> (attribution handled elsewhere — this page only uses
// the format). Static server component, indexable, hub design tokens only.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Partner Program — Words That Matter',
  description:
    'Give families a free, simple way to gather memories from everyone who knew their loved one. A shared link for funeral homes, hospice teams, and celebrants.',
  alternates: { canonical: 'https://wordsbywtm.com/partners' },
};

const SUPPORT_EMAIL = 'hello@wordsbywtm.com';

const FAMILY_STEPS = [
  {
    n: '01',
    t: 'They open your link',
    b: 'It takes them to a memorial collection page. Starting one is free and takes about a minute — no account, no app, nothing to install.',
  },
  {
    n: '02',
    t: 'They share one link with their circle',
    b: 'Family, friends, colleagues, neighbors — each person opens it and adds a memory in a couple of minutes. Contributing is always free.',
  },
  {
    n: '03',
    t: 'They keep the memories — or have them woven',
    b: 'The family reads everything that comes in. If they want, a single payment of $49 weaves it all into one written tribute, with a printable keepsake PDF and optional audio narration. If not, they simply gathered the memories — at no cost.',
  },
];

const FAQ = [
  {
    q: 'Is it free for families?',
    a: 'Yes. Creating a collection is free, and every person who adds a memory contributes free. The only payment is a one-time $49, and only if the family chooses to have the memories woven into the written tribute and keepsake. There is no charge for gathering.',
  },
  {
    q: 'Do families or contributors need accounts?',
    a: 'No. There are no accounts and no passwords anywhere. The organizer gets a private link by email, and contributors just open the shared link and write. Nothing to sign up for, nothing to install.',
  },
  {
    q: 'What does the family get?',
    a: 'All the gathered memories in one place, readable any time. If they choose to finalize, they receive one woven written tribute ready to read aloud, a printable keepsake PDF, and an optional spoken-audio version.',
  },
  {
    q: 'What does it cost my business?',
    a: 'Nothing. There is no fee to become a partner, no minimum, and no obligation. You share a link; that is the whole arrangement. A revenue-share is available on request if you would like one.',
  },
  {
    q: 'Is this appropriate to hand someone who is grieving?',
    a: 'It was built for exactly that moment. There is no urgency, no countdown, and no pressure anywhere in the family experience. Gathering is free and unhurried, and many families find that asking people for memories is itself a comfort.',
  },
];

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav — matches the hub header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-xl text-foreground transition-opacity hover:opacity-80">
            Words That Matter
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <a href="#how" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">
              How it works
            </a>
            <a
              href="#get-your-link"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get your link
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pb-14 pt-24 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <span className="mb-8 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For funeral homes · Hospice teams · Celebrants
            </span>
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Families ask you how to gather memories.
              <br />
              <em className="italic text-primary">Now you have an answer to hand them.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A free link you can give a family at the arrangement meeting. Everyone who knew their
              loved one adds a memory in one place — no accounts, no app, and no cost to gather.
            </p>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              Free for your business · Free for families to gather · No obligation
            </p>
            <a
              href="#get-your-link"
              className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get your partner link
            </a>
          </div>
        </section>

        {/* What it is */}
        <section className="border-y border-border bg-card px-4 py-20">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">What it is</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              One place for everyone&rsquo;s memories
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Words That Matter is a memory collection the family runs themselves. One person starts
              it, shares a single link, and everyone who knew their loved one — near and far — adds a
              memory in their own words, in their own time. No one has to chase stories across texts,
              emails, and voicemails during the hardest week of their life.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Gathering is <span className="font-semibold text-foreground">completely free</span>.
              When the collection feels whole, the family can choose — once, and only if they want
              to — to pay <span className="font-semibold text-foreground">$49</span> to have every
              memory woven into a single written tribute, with a printable keepsake PDF and an
              optional spoken-audio version. If they never pay, they still gathered the memories.
              There is no subscription and nothing recurring.
            </p>
          </div>
        </section>

        {/* Why partners share it */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Why partners share it</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              It answers a question you already get
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Families often ask some version of <em>&ldquo;how do we collect everyone&rsquo;s
              memories?&rdquo;</em> — for the eulogy, for the service, or simply so the stories
              aren&rsquo;t lost. Until now the honest answer was a shared document or a pile of
              emails. Handing them a link is a kinder answer, and it makes the care you provide feel
              that much more complete.
            </p>
            <ul className="mt-6 space-y-3 leading-relaxed text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">Zero cost to you.</span> No fees, no
                minimums, no software to adopt. You share a link; that&rsquo;s all.
              </li>
              <li>
                <span className="font-semibold text-foreground">Zero friction for the family.</span>{' '}
                No accounts and no app — contributors just open the link and write.
              </li>
              <li>
                <span className="font-semibold text-foreground">Zero pressure in a grief setting.</span>{' '}
                Gathering is free and unhurried. The family only ever pays if they choose the woven
                keepsake, and nothing in the experience pushes them to.
              </li>
              <li>
                <span className="font-semibold text-foreground">Your link is yours.</span> Partner
                links carry your own reference code, so we know which families came through you.
              </li>
            </ul>
          </div>
        </section>

        {/* Explainer video — same ~1-min asset as the homepage/occasion landings.
            For a partner the question is "what will my families experience?", so
            it's framed as a preview. Narrated → click-to-play with poster, never
            autoplay (grief-adjacent audience, quiet page). */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
              What the family sees
            </p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              Preview it before you share it
            </h2>
            <p className="mx-auto mb-8 mt-3 max-w-xl text-sm text-muted-foreground">
              About a minute — from the first invite to the finished keepsake.
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
                Your browser doesn&rsquo;t support embedded video.
              </video>
            </div>
          </div>
        </section>

        {/* How it works for the family */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-card px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-primary">
              How it works for the family
            </p>
            <h2 className="mb-16 text-center font-serif text-3xl text-foreground md:text-4xl">
              Three steps, at their own pace
            </h2>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
              {FAMILY_STEPS.map((s) => (
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

        {/* Get your link */}
        <section id="get-your-link" className="scroll-mt-20 px-4 py-20">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-secondary/40 p-8 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Get your link</p>
            <h2 className="font-serif text-2xl text-foreground md:text-3xl">
              One email, and you&rsquo;re set up
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Email us at{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Partner link request')}`}
                className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              with your business name and ask for a partner link. We&rsquo;ll reply with your own
              link — something like{' '}
              <span className="whitespace-nowrap font-mono text-xs text-foreground">
                wordsbywtm.com/memorial?ref=your-name
              </span>{' '}
              — plus a{' '}
              <Link href="/partners/card" className="underline underline-offset-4 transition-colors hover:text-primary">
                printable card
              </Link>{' '}
              you can hand to families at the arrangement meeting.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Partner link request')}`}
              className="mt-7 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Request your partner link
            </a>
            <p className="mt-5 text-xs text-muted-foreground">
              A revenue-share arrangement is available on request — just ask when you write.
            </p>
          </div>
        </section>

        {/* Soft FAQ */}
        <section className="border-t border-border bg-card px-4 py-20">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Common questions</p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">Answers for partners</h2>
            <dl className="mt-10 space-y-8">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="text-base font-semibold text-foreground">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      {/* Footer — matches the hub footer */}
      <footer className="border-t border-border bg-background px-4 py-12 text-center">
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
