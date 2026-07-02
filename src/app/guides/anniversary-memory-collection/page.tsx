import type { Metadata } from 'next';
import { getGuide } from '@/lib/guides';
import {
  GuideJsonLd,
  GuideHeader,
  H2,
  P,
  UL,
  OL,
  Strong,
  Example,
  CtaCard,
} from '../_components';

const guide = getGuide('anniversary-memory-collection')!;

export const metadata: Metadata = {
  title: guide.metaTitle,
  description: guide.metaDescription,
  alternates: { canonical: `https://wordsbywtm.com/guides/${guide.slug}` },
};

export default function AnniversaryMemoryGuide() {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <GuideJsonLd slug={guide.slug} />
      <GuideHeader
        guide={guide}
        dek="A milestone anniversary deserves more than a restaurant reservation. The most moving gift for a couple decades in is the one made of other people’s memories of them — gathered quietly from family and friends, and woven into one piece. Here is how to pull off the surprise."
      />

      <P>
        By a twenty-fifth or fiftieth anniversary, a couple owns everything they need. What they do
        not have — what nobody has — is a view of their marriage from the outside:{' '}
        <Strong>what it looked like to everyone watching.</Strong> The dinners hosted, the moves
        helped with, the example quietly set. Dozens of people hold those observations, and none of
        them has ever said it out loud.
      </P>
      <P>
        Collecting those memories is a gift that costs mostly coordination. It also has a
        complication the other occasions do not: <Strong>it usually has to stay secret</Strong>{' '}
        from two well-connected people who know everyone you are about to contact. This guide
        covers both halves — the collecting and the not-getting-caught.
      </P>

      <H2>Step 1: Decide the moment it is for</H2>
      <P>How the piece gets delivered shapes everything upstream:</P>
      <UL>
        <li>
          <Strong>A toast at the anniversary party</Strong> — the classic. The gathered memories
          become one speech, read to the couple in front of the people who contributed.
        </li>
        <li>
          <Strong>A quiet presentation</Strong> — no party, just the couple and a printed keepsake
          over dinner at home. Some couples would trade every party for this.
        </li>
        <li>
          <Strong>A recorded version</Strong> — a spoken rendition of the piece, for the couple to
          listen to together. This also travels: it works even if the celebration is scattered
          across time zones.
        </li>
      </UL>

      <H2>Step 2: Build the list from every era</H2>
      <P>
        A long marriage has geological layers, and each layer has witnesses. Try to draw at least
        one voice from each:
      </P>
      <UL>
        <li><Strong>The origin witnesses</Strong> — anyone who was there before or when they met. Their stories are irreplaceable, and this is the era most at risk of being lost.</li>
        <li><Strong>The wedding guests</Strong> — people who remember the couple at the start.</li>
        <li><Strong>The building years</Strong> — longtime neighbors, old coworkers, the friends from the years of small apartments and big plans.</li>
        <li><Strong>Family across generations</Strong> — including the youngest members. One line from the newest generation next to a story from the oldest friend shows the whole span in two sentences.</li>
        <li><Strong>The recent circle</Strong> — newer friends who prove the couple never stopped making them.</li>
      </UL>
      <P>
        Fifteen to forty contributors covers most families. Range beats volume: five decades
        represented by five voices outweighs thirty memories from the same era.
      </P>

      <H2>Step 3: Keep the surprise intact</H2>
      <P>This is where anniversary collections get tactical:</P>
      <OL>
        <li>
          <Strong>Say “surprise” in the first line of every message.</Strong> Not the last line —
          people forward things before finishing them.
        </li>
        <li>
          <Strong>Avoid channels the couple can see.</Strong> No shared family group chats, no
          public posts. Direct messages and email only.
        </li>
        <li>
          <Strong>Recruit one accomplice per circle</Strong> — someone in the extended family,
          someone from the old neighborhood — to pass the link along quietly. It spreads reach
          without spreading risk.
        </li>
        <li>
          <Strong>Use a collection method with no public surface.</Strong> A link that only invited
          people hold, rather than a page that can be stumbled onto, keeps the secret structurally
          rather than by luck.
        </li>
      </OL>

      <H2>Step 4: Prompt for the marriage, not just the couple</H2>
      <P>
        The invitation follows the usual rules — one memory, a size hint, a deadline, a single
        link:
      </P>
      <Example>
        Hi! Ruth and Sam turn fifty years married this September, and we are quietly collecting one
        memory from everyone who has been part of their life — to be woven into a tribute at the
        party. (It is a surprise — please keep it off the family chat!) One small story or memory
        is perfect, a few sentences. Could you add yours by August 20th? Link below.
      </Example>
      <P>
        Then the prompts. For an anniversary, the strongest ones point at the marriage itself —
        the thing between the two people, which guests have watched for decades:
      </P>
      <UL>
        <li>The story of how they met, as you heard it — or watched it happen.</li>
        <li>A moment between the two of them you were lucky enough to witness.</li>
        <li>What their table, their door, or their phone line has meant to you over the years.</li>
        <li>Something one of them always says about the other.</li>
        <li>A hard season they carried well, told kindly.</li>
        <li>What watching their marriage has taught you about your own.</li>
        <li>A wish for their next decade together.</li>
      </UL>
      <P>
        That sixth prompt — <em>what their example taught you</em> — reliably produces the
        sentences that make the room go quiet. Ask it explicitly.
      </P>

      <H2>Step 5: Give people one quiet place to send it</H2>
      <P>
        Secrecy multiplies the usual scattering problem: contributions arrive by private message
        precisely because you told everyone to avoid the group chat, and now they live in six
        inboxes. Set up a single collection point before the first invitation goes out. A
        collection link works well here: each person opens it, writes their memory, and is done —
        no account to create, nothing to install, and nothing sitting on a public page where the
        couple might find it.
      </P>

      <CtaCard
        title="Built for quiet gathering"
        body="Start an anniversary collection with Words That Matter and share one private link through your accomplices. Everyone contributes free — no accounts, no app — and memories stay encrypted, then are automatically deleted about thirty days after the piece is generated."
        href={guide.ctaHref}
        label="See how an anniversary collection works"
      />

      <H2>Step 6: Weave the decades into one piece</H2>
      <P>
        Anniversary material has a natural gift: <Strong>chronology.</Strong> Memories from the
        meeting, the wedding, the middle years, and last summer want to be arranged as the story of
        the marriage — told by everyone who watched it. If you are weaving by hand, walk it through
        time: open with an origin story, let each era hand off to the next, and close with the
        collected wishes for the years ahead. Blend the voices as you go — “the old friends
        remember the apartment with the broken radiator; the newer ones know the house where
        everyone ends up on Sunday” — and end on a single line, ideally one a contributor gave
        you.
      </P>
      <P>
        If you would rather spend your energy on the gathering and the party, the weaving can be
        handed off: when you finalize a Words That Matter collection, the memories become one woven
        tribute — with a printable keepsake PDF and an optional spoken-audio version for the
        couple to keep. Gathering is free; there is one $49 payment, only at finalize.
      </P>

      <H2>A timeline that keeps the secret</H2>
      <UL>
        <li><Strong>6–8 weeks out:</Strong> pick the delivery moment, recruit accomplices, set up the collection.</li>
        <li><Strong>5–6 weeks out:</Strong> invitations go out through private channels.</li>
        <li><Strong>3 weeks out:</Strong> one reminder, nudged through the accomplices.</li>
        <li><Strong>2 weeks out:</Strong> close the collection, weave, and read it aloud once.</li>
        <li><Strong>The day:</Strong> the toast, the keepsake, and — reliably — the request from the couple to read it again themselves.</li>
      </UL>
      <P>
        The generous margin is deliberate: anniversary contributors often span generations and time
        zones, and the older stories sometimes need a phone call and a transcription. Leave room
        for that — those are usually the memories that anchor the whole piece.
      </P>

      <H2>If there is no party planned</H2>
      <P>
        Not every milestone anniversary comes with a gathering — sometimes the couple prefers it
        quiet, and sometimes the family is simply too scattered for one room. The collection works
        just as well without an event. The printed keepsake can arrive with the anniversary card;
        the spoken version can be sent for the couple to listen to together over their anniversary
        dinner; a video call with the piece read aloud turns a scattered family into an audience
        for ten minutes. The gathering of the memories is the gift — the party was only ever one
        way to hand it over.
      </P>

      <CtaCard
        title="Start gathering their story"
        body="Create an anniversary collection, share one private link with family and friends, and read every memory as it arrives. When it feels complete, we weave it all into one tribute — with a printable keepsake PDF and an optional spoken version. Free to gather; $49 once at finalize."
        href={guide.ctaHref}
        label="Start an anniversary collection"
      />
    </article>
  );
}
