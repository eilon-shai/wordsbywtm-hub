import type { Metadata } from 'next';
import { getGuide } from '@/lib/guides';
import {
  GuideJsonLd,
  GuideHeader,
  H2,
  H3,
  P,
  UL,
  OL,
  Strong,
  Example,
  CtaCard,
} from '../_components';

const guide = getGuide('collect-memories-memorial')!;

export const metadata: Metadata = {
  title: guide.metaTitle,
  description: guide.metaDescription,
  alternates: { canonical: `https://wordsbywtm.com/guides/${guide.slug}` },
};

export default function CollectMemoriesMemorialGuide() {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <GuideJsonLd slug={guide.slug} />
      <GuideHeader
        guide={guide}
        dek="When someone dies, the people who loved them each hold a different piece of the story. Gathering those pieces — gently, and in one place — is one of the kindest things you can do for a memorial. Here is how to do it, step by step."
      />

      <P>
        Maybe you have been asked to speak at the service. Maybe you are planning a memorial
        gathering and want it to feel like the person, not like a template. Either way, you have
        probably already noticed the problem: <Strong>your own memory only covers your corner of
        their life.</Strong> The colleague who sat next to them for a decade, the neighbor who
        traded tomatoes over the fence, the friend from the choir — each of them knows a version of
        this person you never met.
      </P>
      <P>
        Collecting memories is how you bring those versions together. It takes a little
        organization, but it is not complicated, and the process itself is often comforting — both
        for you and for the people you ask. This guide walks through the whole thing: deciding what
        to gather, who to ask, how to ask, what to prompt people for, and how to weave what comes
        back into one tribute.
      </P>

      <H2>Step 1: Decide what the memories are for</H2>
      <P>
        Everything downstream gets easier when you know what you are making. The most common
        answers:
      </P>
      <UL>
        <li>
          <Strong>A eulogy or tribute to read aloud</Strong> at the service or gathering — the
          memories become raw material for one written piece.
        </li>
        <li>
          <Strong>A keepsake</Strong> — something printed that family and close friends can hold
          onto after the day itself has passed.
        </li>
        <li>
          <Strong>A reading for a later gathering</Strong> — memorials do not always happen within
          the week. Some families hold a celebration of life a month or a season later, which
          leaves more room to collect well.
        </li>
      </UL>
      <P>
        You do not have to pick just one — a tribute that is read aloud can also be printed and
        kept. But knowing the primary use tells you what to ask for. A spoken tribute wants short,
        specific stories. A keepsake can hold longer, quieter reflections.
      </P>

      <H2>Step 2: Make the list of who to ask</H2>
      <P>
        Think in circles, and go one circle wider than feels obvious. The memories that make a
        tribute feel whole usually come from the outer rings — the people you almost did not think
        to ask.
      </P>
      <UL>
        <li><Strong>The closest circle:</Strong> immediate family, lifelong friends.</li>
        <li>
          <Strong>Daily life:</Strong> coworkers past and present, neighbors, the people they saw
          every week without ceremony.
        </li>
        <li>
          <Strong>Their communities:</Strong> clubs, congregations, teams, volunteer groups, group
          chats — anywhere they showed up regularly.
        </li>
        <li>
          <Strong>The long-ago circle:</Strong> school friends, old roommates, colleagues from a
          job three careers back. These people hold the earliest stories, and they are often moved
          to be asked.
        </li>
      </UL>
      <P>
        Aim for a list of ten to thirty names. You do not need everyone — you need <em>range</em>.
        Five memories from five different decades of a life will do more for a tribute than twenty
        from the same dinner table.
      </P>

      <H2>Step 3: Ask in a way that is easy to answer</H2>
      <P>
        People want to help. What stops them is not unwillingness — it is the blank page, and the
        fear of getting it wrong. Your invitation should quietly remove both. Three things help:
      </P>
      <OL>
        <li>
          <Strong>Ask for one memory, not a speech.</Strong> “Could you share one memory of Ruth?”
          is answerable. “Please send thoughts and reflections” is homework.
        </li>
        <li>
          <Strong>Say it can be small.</Strong> The best material is almost always a small, specific
          moment. Give people permission to send something short.
        </li>
        <li>
          <Strong>Give a gentle date, and one place to send it.</Strong> A soft deadline (“by
          Thursday, if you can”) helps people actually do it, and one collection point saves you
          from chasing memories across texts, emails, and voicemails.
        </li>
      </OL>
      <P>Here is a message you can adapt:</P>
      <Example>
        Hi — as you may have heard, we are holding a memorial for Ruth on the 14th. I am putting
        together a tribute from the people who knew her, and I would love to include a memory from
        you. It does not need to be long or polished — one small moment is perfect. If you can send
        it by Thursday, I will make sure it is part of what we share. Thank you — it means a lot.
      </Example>

      <H2>Step 4: Prompt for moments, not summaries</H2>
      <P>
        If you ask “what was she like?”, you will get adjectives: kind, generous, funny. True, and
        interchangeable — the same words appear in every tribute for every person. What makes a
        tribute belong to one person is <Strong>specifics</Strong>. Offer your contributors a
        prompt or two:
      </P>
      <UL>
        <li>A moment with them you still think about.</li>
        <li>Something they always said — a phrase, a greeting, a piece of advice.</li>
        <li>A small habit or ritual that was completely them.</li>
        <li>The first time you met them, or the last ordinary day you spent together.</li>
        <li>Something they made, fixed, grew, or gave you.</li>
        <li>A time they showed up for you when they did not have to.</li>
        <li>What you find yourself doing differently because you knew them.</li>
      </UL>
      <P>
        One good prompt turns “she was so generous” into “she kept a drawer of birthday cards,
        already stamped, because she never wanted to miss anyone.” That is the sentence people will
        still remember on the drive home.
      </P>

      <H2>Step 5: Collect everything in one place</H2>
      <P>
        However you ask, the replies will try to scatter — some by email, some by text, one long
        voicemail, a paragraph pasted into a group chat. Scattered memories are how good material
        gets lost, so decide up front where everything lives:
      </P>
      <UL>
        <li>
          <Strong>A shared document</Strong> works if your group is small and comfortable with the
          tool — though people can see and be influenced by each other’s entries, and formatting
          drifts.
        </li>
        <li>
          <Strong>A single email address or form</Strong> keeps things tidy, but you will do the
          collating, reminding, and organizing by hand.
        </li>
        <li>
          <Strong>A purpose-built collection link</Strong> is the least friction for contributors:
          they open it, write their memory, and are done — no account to create, nothing to
          install.
        </li>
      </UL>

      <CtaCard
        title="A gentler way to gather"
        body="Words That Matter gives you one link to share. Each person opens it and adds their memory — no accounts, no app, nothing to set up. Contributing is free for everyone, and what people write is encrypted and automatically deleted about thirty days after the tribute is created."
        href={guide.ctaHref}
        label="See how a memorial collection works"
      />

      <H2>Step 6: Read everything, and curate gently</H2>
      <P>
        Once the memories are in, read them all in one sitting if you can. You are doing two
        things: noticing the themes that repeat across people who never met each other — those
        repetitions are the heart of the tribute — and deciding whether anything should be left
        aside. Most collections need almost no editing out. Occasionally a memory is lovely but
        deeply private, or an inside joke that will not survive being read to a room. Leaving
        something out of the spoken tribute is not erasing it; you can still pass it to the family
        directly.
      </P>

      <H2>Step 7: Weave the memories into one piece</H2>
      <P>
        A tribute is not a list of quotes read one after another — that flattens even wonderful
        material. What you want is a single piece of writing with many voices inside it. If you are
        writing it yourself:
      </P>
      <OL>
        <li>
          <Strong>Group by theme, not by person.</Strong> Their humor, their steadiness, the way
          they fed people — let each theme gather its supporting memories.
        </li>
        <li>
          <Strong>Let the voices speak inside your narration.</Strong> “Some remember her at the
          stove; others remember her at the door, always the last to say goodbye” carries five
          contributions in one breath.
        </li>
        <li>
          <Strong>Open small and close smaller.</Strong> Begin with one specific image, and end
          with a single line that gives the room something to carry out — often a phrase the person
          themselves used to say.
        </li>
        <li>
          <Strong>Read it aloud before the day.</Strong> Sentences that look fine on the page can
          be hard to say out loud. Shorten anything you stumble on.
        </li>
      </OL>
      <P>
        This weaving is the hardest step to do by hand, especially in a week that is already heavy.
        It is also the step Words That Matter was built for: when your collection is ready, it
        weaves the gathered memories into one written tribute, with a printable keepsake PDF and an
        optional spoken-audio version. Gathering is free; there is a single payment of $49 only
        when you choose to finalize.
      </P>

      <H2>A realistic timeline</H2>
      <P>If the service is about a week away, this rhythm works without adding pressure:</P>
      <UL>
        <li><Strong>Days 1–2:</Strong> make your list, send the invitation with one clear prompt.</li>
        <li><Strong>Days 3–5:</Strong> memories arrive; send one gentle reminder to anyone you especially hope to hear from.</li>
        <li><Strong>Day 6:</Strong> read everything, weave the tribute, and read it aloud once.</li>
        <li><Strong>Day 7:</Strong> rest. You have done the important part.</li>
      </UL>
      <P>
        And if the service has already passed — that is genuinely fine. Many people gather memories
        for a later celebration of life, for the first anniversary, or simply so the stories are
        not lost. There is no wrong time to ask people what they remember.
      </P>

      <CtaCard
        title="When you’re ready, we can help you weave it"
        body="Start a memorial collection, share one link with the people who knew them, and read every memory as it arrives. When it feels complete, we weave everything into one tribute — written to be read aloud, with a keepsake PDF and an optional spoken version. Free to gather; $49 once, only when you finalize."
        href={guide.ctaHref}
        label="Start a memorial collection"
      />
    </article>
  );
}
