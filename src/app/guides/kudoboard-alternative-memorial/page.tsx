import type { Metadata } from 'next';
import { getGuide } from '@/lib/guides';
import {
  GuideJsonLd,
  GuideHeader,
  H2,
  P,
  UL,
  Strong,
  CtaCard,
} from '../_components';

const guide = getGuide('kudoboard-alternative-memorial')!;

export const metadata: Metadata = {
  title: guide.metaTitle,
  description: guide.metaDescription,
  alternates: { canonical: `https://wordsbywtm.com/guides/${guide.slug}` },
};

// Comparison rows. Kudoboard facts verified against kudoboard.com/pricing and
// kudoboard.com/online-memorial in July 2026 — hedged in copy with "at the time
// of writing". Our facts: free to gather, $49 at finalize, woven tribute +
// keepsake PDF + optional audio, magic links, ~30-day auto-deletion.
const ROWS: { label: string; kudoboard: string; wtm: string }[] = [
  {
    label: 'What you end up with',
    kudoboard: 'A visual board of individual posts — messages, photos, videos — plus a slideshow',
    wtm: 'One woven written tribute, ready to read aloud, plus a printable keepsake PDF and an optional spoken-audio version',
  },
  {
    label: 'Price',
    kudoboard: '$99 one-time for a full memorial board; a free mini board holds up to 10 posts (at the time of writing)',
    wtm: '$49 one-time, paid only when you finalize; gathering and contributing are free',
  },
  {
    label: 'Contributing',
    kudoboard: 'Contributors post to the board via a shared link',
    wtm: 'Contributors open a share link and write their memory — no accounts or app downloads (private magic links)',
  },
  {
    label: 'Photos & video',
    kudoboard: 'Central to the product — photo, video, and GIF posts, with a slideshow view',
    wtm: 'Not the focus — collections gather written memories, which become one written (and optionally spoken) piece',
  },
  {
    label: 'The writing itself',
    kudoboard: 'Each post stays separate; turning the board into a eulogy or tribute is still your job',
    wtm: 'The weaving is the product: the memories become a single tribute in one collective voice',
  },
  {
    label: 'How long it lives',
    kudoboard: 'Boards remain accessible indefinitely; printed hardbound books available at extra cost',
    wtm: 'Memories are encrypted and auto-deleted about 30 days after the tribute is generated; the tribute and PDF are yours to keep',
  },
];

export default function KudoboardAlternativeGuide() {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <GuideJsonLd slug={guide.slug} />
      <GuideHeader
        guide={guide}
        dek="Kudoboard is often the first name people find when they search for a way to gather memories after a loss. It is a good product — and depending on what you actually need, it may or may not be the right one. Here is an honest comparison."
      />

      <P>
        If you are organizing a memorial, you have probably been handed one job that is really two:
        <Strong> collect memories from everyone who knew the person</Strong>, and{' '}
        <Strong>turn those memories into something</Strong> — a tribute, a eulogy, a keepsake.
        Kudoboard and Words That Matter both help with the first job. They differ almost entirely
        on the second. This guide lays out what each one does, what each costs, and how to decide —
        including the cases where Kudoboard is simply the better choice.
      </P>

      <H2>What Kudoboard does well</H2>
      <P>
        Kudoboard’s memorial product is a <Strong>group memory board</Strong>: you create a board,
        share a link, and people post messages, photos, videos, and GIFs. Everything appears
        together as a visual wall, and there is a slideshow view that works well displayed at a
        service or reception. It deserves real credit for several things:
      </P>
      <UL>
        <li>
          <Strong>Photos and video are first-class.</Strong> If what your group holds is decades of
          pictures, a board is a natural home for them — a written tribute is not.
        </li>
        <li>
          <Strong>It is easy for contributors.</Strong> Posting to a board via a shared link is
          familiar and low-friction.
        </li>
        <li>
          <Strong>The board endures.</Strong> Boards remain accessible over time, so it doubles as
          an ongoing memorial page people can revisit, and you can have it printed as a hardbound
          book for an additional cost.
        </li>
        <li>
          <Strong>Practical group features</Strong> — multiple admins, moderation, an embeddable
          slideshow, and exportable content.
        </li>
      </UL>
      <P>
        On pricing: at the time of writing (July 2026), Kudoboard lists a{' '}
        <Strong>full memorial board at $99 one-time</Strong>, with unlimited posts and video, and a
        free “mini” memorial board capped at 10 posts. Their smaller general-occasion boards
        ($5.99–$19.99) carry post limits that make them a tight fit for a memorial with many
        contributors. Pricing changes, so check their site for current numbers.
      </P>

      <H2>Where a board stops short</H2>
      <P>
        A board is a collection of separate posts — and it stays that way. Fifty heartfelt messages
        on a wall are moving to scroll through, but when the service arrives and someone has to
        stand up and speak, <Strong>the board has not written anything.</Strong> Someone still sits
        down the night before, reads every post, finds the threads, and writes the eulogy. If you
        have done this, you know it is the hardest writing there is, at the worst possible time to
        do it.
      </P>
      <P>
        That gap — between gathered memories and a finished piece — is exactly what Words That
        Matter is built to close.
      </P>

      <H2>What Words That Matter does instead</H2>
      <P>
        Words That Matter is a <Strong>collection-to-tribute</Strong> service. The gathering part
        looks similar: you start a collection, share one link, and each person adds a memory —
        contributing is free, and nobody needs an account or an app; access works through private
        magic links. The difference is what happens next:
      </P>
      <UL>
        <li>
          You read every memory as it arrives, and everything is included by default — you can
          leave out anything that does not belong.
        </li>
        <li>
          When the collection feels complete, it is <Strong>woven into a single written
          tribute</Strong> — one piece, in one collective voice, built to be read aloud.
        </li>
        <li>
          You also get a <Strong>printable keepsake PDF</Strong> and an optional{' '}
          <Strong>spoken-audio version</Strong> of the tribute.
        </li>
        <li>
          You pay <Strong>$49, once, only at the moment you finalize</Strong>. Creating the
          collection and gathering memories cost nothing, however long that takes.
        </li>
        <li>
          Privacy runs the other direction from a public board: memories are{' '}
          <Strong>encrypted, and automatically deleted about 30 days</Strong> after the tribute is
          generated. The finished tribute and PDF are yours to keep; the raw contributions do not
          live on a website indefinitely.
        </li>
      </UL>

      <H2>What the gathering actually looks like</H2>
      <P>
        Because “collection service” can sound abstract, here is the workflow from the organizer’s
        side:
      </P>
      <UL>
        <li>
          <Strong>You start a collection</Strong> for the person being remembered — creating it is
          free, and there is no account to set up. You manage everything through a private link
          sent to your email.
        </li>
        <li>
          <Strong>You share one link</Strong> with family, friends, colleagues — by email, text, or
          however your circles communicate. Each person opens it and writes their memory.
          Contributing costs nothing and requires no sign-up.
        </li>
        <li>
          <Strong>You read the memories as they arrive</Strong> and decide what belongs. Everything
          is included by default; you can set anything aside.
        </li>
        <li>
          <Strong>When it feels complete, you finalize</Strong> — this is the one moment money
        changes hands ($49) — and the memories are woven into the tribute, the keepsake PDF, and
          the optional spoken version.
        </li>
      </UL>
      <P>
        There is no deadline pressure built into that flow: collections can gather for as long as
        you need, and paying happens only when you decide the collection is ready.
      </P>

      <CtaCard
        title="See a memorial collection in practice"
        body="One link to share, free for everyone to contribute, and a woven tribute when you’re ready — with a keepsake PDF and an optional spoken version."
        href={guide.ctaHref}
        label="How memorial collections work"
      />

      <H2>Side by side</H2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 pr-4 font-semibold text-foreground" />
              <th className="py-3 pr-4 font-semibold text-foreground">Kudoboard Memorial</th>
              <th className="py-3 font-semibold text-foreground">Words That Matter</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b border-border align-top">
                <td className="py-3 pr-4 font-medium text-foreground">{r.label}</td>
                <td className="py-3 pr-4 leading-relaxed text-muted-foreground">{r.kudoboard}</td>
                <td className="py-3 leading-relaxed text-muted-foreground">{r.wtm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Kudoboard details verified on kudoboard.com in July 2026; their pricing and features may
        change.
      </p>

      <H2>How to choose</H2>
      <P>
        <Strong>Choose Kudoboard if the memories are mostly visual, or you want a permanent
        page.</Strong> A lifetime of photographs, video messages from people who cannot attend, a
        slideshow playing at the reception, a link the family can revisit next year — that is a
        board’s home turf, and Kudoboard does it well.
      </P>
      <P>
        <Strong>Choose Words That Matter if someone has to stand up and speak</Strong> — or if what
        you really want to give the family is the words themselves. When the goal is a eulogy, a
        tribute at a celebration of life, or a written keepsake that reads as one piece rather than
        a stack of posts, the weaving is the whole point, and it is the part no board does for you.
        The privacy model matters to some families too: gathered memories are encrypted and
        auto-deleted after about 30 days rather than living online.
      </P>
      <P>
        And it is worth saying plainly: <Strong>some groups use both.</Strong> A board for the
        photos and the ongoing page; a collection for the tribute that gets read aloud. They answer
        different needs, and neither replaces the other completely.
      </P>

      <H2>A note on cost</H2>
      <P>
        At the time of writing, the full versions land at $99 for a Kudoboard memorial board and
        $49 for a Words That Matter collection — both one-time payments. But the more useful
        comparison is what the money buys: with Kudoboard you are paying for the board itself; with
        Words That Matter, gathering is free and the payment happens only at finalize, when the
        memories are woven into the tribute, the PDF, and the optional audio. If you gather
        memories and decide not to finalize, you have paid nothing.
      </P>

      <CtaCard
        title="If a written tribute is what you need"
        body="Start a memorial collection, invite the people who knew them with one link, and when the memories are in, we weave them into one tribute to read aloud — plus a printable keepsake PDF and an optional spoken version. Free to gather; $49 once at finalize."
        href={guide.ctaHref}
        label="Start a memorial collection"
      />
    </article>
  );
}
