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

const guide = getGuide('collect-wedding-wishes')!;

export const metadata: Metadata = {
  title: guide.metaTitle,
  description: guide.metaDescription,
  alternates: { canonical: `https://wordsbywtm.com/guides/${guide.slug}` },
};

export default function CollectWeddingWishesGuide() {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <GuideJsonLd slug={guide.slug} />
      <GuideHeader
        guide={guide}
        dek="The guest book gets signed in a hurry between dinner and dancing, read once on the honeymoon, and shelved. There is a better way: collect wishes and memories from guests before the wedding, and turn them into something the couple actually keeps — a toast, a reading, a keepsake."
      />

      <P>
        Every wedding already has a mechanism for collecting words from guests. The trouble is that
        it runs at the worst possible moment: people scribble in the guest book while balancing a
        drink, with a line forming behind them. The results are warm and nearly identical —{' '}
        <em>So happy for you both! Best day ever!</em>
      </P>
      <P>
        Ask the same people the same question <Strong>two weeks earlier, at their own kitchen
        table</Strong>, and something different comes back: the story of the phone call after the
        first date, the road trip disaster, the moment a friend realized this one was different.
        This guide covers how to collect those — who to ask, when, what to prompt for, and what to
        do with the answers.
      </P>

      <H2>First: who is collecting, and for what?</H2>
      <P>Wishes-gathering usually happens in one of three shapes. Decide which one is yours:</P>
      <UL>
        <li>
          <Strong>Someone giving a toast</Strong> collects memories to build a speech that speaks
          for the whole room, not just their own friendship.
        </li>
        <li>
          <Strong>A person close to the couple</Strong> gathers wishes as a gift — a surprise
          reading at the rehearsal dinner, or a keepsake presented at the reception.
        </li>
        <li>
          <Strong>The couple themselves</Strong> collect memories from guests as a keepsake of the
          people around them — especially meaningful for guests who cannot attend in person.
        </li>
      </UL>
      <P>
        Everything below works for all three; only the invitation wording changes. (If it is a
        surprise, say so in every message you send — one enthusiastic reply-all can end the
        secret.)
      </P>

      <H2>Who to invite</H2>
      <P>
        Aim for range across the couple’s life, not just headcount. A strong list draws from each
        partner’s circles:
      </P>
      <UL>
        <li>Close family on each side — including the elders, whose contributions are often the ones the couple treasures most.</li>
        <li>The oldest friends: childhood, school, the era before the couple met.</li>
        <li>The friends who witnessed the relationship start — the ones who heard about the first date within hours.</li>
        <li>Guests traveling from far away, and invitees who cannot attend. A collected memory is how absent people get to be present.</li>
      </UL>
      <P>
        Fifteen to forty contributors is plenty. Two or three voices from each era of each
        partner’s life beats sixty variations of “congratulations.”
      </P>

      <H2>When to ask</H2>
      <UL>
        <li>
          <Strong>4–6 weeks before the wedding:</Strong> send the invitation. Guests are already
          thinking about the couple, and nobody is travel-frazzled yet.
        </li>
        <li>
          <Strong>2 weeks before:</Strong> one friendly reminder to the people you most want to
          hear from.
        </li>
        <li>
          <Strong>1 week before:</Strong> close the collection and weave. Do not leave this for
          wedding week — yours or theirs.
        </li>
      </UL>

      <H2>How to ask, and what to prompt for</H2>
      <P>
        Keep the request small and specific. One memory or wish, a size hint, a deadline, one link.
        For example:
      </P>
      <Example>
        Hi! Ahead of Maya and Jordan’s wedding, I am gathering short memories and wishes from the
        people who love them — to be woven into a toast at the reception (it is a surprise!). Could
        you add one memory of them — together or separately — or a wish for their marriage? A few
        sentences is perfect. Please add it by the 10th using the link below.
      </Example>
      <P>
        Then give people prompts, because “write something for the couple” freezes even the
        eloquent ones:
      </P>
      <UL>
        <li>The moment you realized they were right for each other.</li>
        <li>The story of when you first heard about this person they were seeing.</li>
        <li>A favorite memory of the two of them together — ordinary counts double.</li>
        <li>A memory of one of them from long before they met.</li>
        <li>One piece of advice for the marriage — earned, not borrowed.</li>
        <li>A wish for them ten years from now.</li>
      </UL>
      <P>
        Note the last two: <Strong>wishes and advice deserve their own prompt.</Strong> Memories
        look backward, wishes look forward, and the best collections carry both directions.
      </P>

      <H2>Collect in one place</H2>
      <P>
        Replies scattered across texts, emails, and social threads are how the best contribution
        gets lost in someone’s drafts. Set up a single destination before you send anything. A
        shared document works for a small group; a form is tidier; a collection link is the
        lightest — guests open it, write, and are done, with no account to create and nothing to
        download. That matters when your contributors span every level of comfort with technology:
        the link is the whole interface.
      </P>

      <CtaCard
        title="One link for every guest"
        body="Start a wedding collection with Words That Matter and share a single link with both circles. Everyone contributes free — no accounts, no app — and you read each memory as it arrives, including anything a guest sends from the other side of the world."
        href={guide.ctaHref}
        label="See how a wedding collection works"
      />

      <H2>Turning wishes into something</H2>
      <P>A pile of lovely paragraphs still needs a shape. The classic options:</P>
      <OL>
        <li>
          <Strong>A woven toast.</Strong> The gathered memories become one speech: the early years,
          the meeting, what everyone sees in them now, and the room’s collective wishes as the
          closing. “Some of us remember the phone call after the first date; others just remember
          the grin that week” — one sentence, six contributors.
        </li>
        <li>
          <Strong>A reading.</Strong> At the rehearsal dinner or during the reception, a single
          woven piece read aloud — often by the person who organized it — lands as the emotional
          center of the evening.
        </li>
        <li>
          <Strong>A keepsake.</Strong> The woven piece, printed. Unlike the guest book, it reads as
          one story rather than a stack of signatures, and it survives the honeymoon unpacking.
        </li>
      </OL>
      <P>
        If you would rather not do the weaving yourself the week before a wedding, that step can be
        handed off: when you finalize a Words That Matter collection, the memories and wishes are
        woven into one piece — with a printable keepsake PDF and an optional spoken-audio version.
        Gathering is free for everyone; there is a single $49 payment, only when you finalize.
      </P>

      <H2>Common pitfalls (all avoidable)</H2>
      <UL>
        <li>
          <Strong>Asking too late.</Strong> A request that lands during wedding week competes with
          travel plans and gift shopping, and loses. Six weeks out, the same request is a pleasure
          to answer.
        </li>
        <li>
          <Strong>Asking too vaguely.</Strong> “Send something for Maya and Jordan!” produces
          three replies and a lot of good intentions. One memory, a size hint, a date, one link.
        </li>
        <li>
          <Strong>Blowing the surprise by channel choice.</Strong> If it is a secret, nothing goes
          in any group thread the couple can see — and “this is a surprise” goes in the first line
          of every message, because people forward before they finish reading.
        </li>
        <li>
          <Strong>Holding the collection open for stragglers.</Strong> There will always be one
          more person who meant to write something. Close on the date you named; a late memory can
          still be passed to the couple on its own.
        </li>
        <li>
          <Strong>Reading everything aloud at the reception.</Strong> Forty separate messages is a
          seating-chart-length experience. One woven piece, five to seven minutes, keeps the room
          with you the whole way.
        </li>
      </UL>

      <H2>Small details that make it better</H2>
      <UL>
        <li>
          <Strong>Ask guests to sign with how they know the couple.</Strong> “Roommate, the messy
          years” does narrative work all by itself.
        </li>
        <li>
          <Strong>Do not over-edit.</Strong> Distinct voices are the charm. Fix typos; keep the odd
          phrasing that sounds exactly like the person who wrote it.
        </li>
        <li>
          <Strong>Keep one surprise back.</Strong> If a contribution is extraordinary, let it be
          its own moment rather than folding it into the weave.
        </li>
        <li>
          <Strong>Privacy is worth a sentence in your invite.</Strong> With Words That Matter,
          memories are encrypted and automatically deleted about 30 days after the piece is
          generated — guests are writing for the couple, not for a public wall.
        </li>
      </UL>

      <CtaCard
        title="Give them the words, not just the party"
        body="Start a wedding collection, invite guests with one link, and when the wishes are in, we weave them into one toast or keepsake — written to be read aloud, with a printable PDF and an optional spoken version. Free to gather; $49 once at finalize."
        href={guide.ctaHref}
        label="Start a wedding collection"
      />
    </article>
  );
}
