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

const guide = getGuide('retirement-tribute-stories')!;

export const metadata: Metadata = {
  title: guide.metaTitle,
  description: guide.metaDescription,
  alternates: { canonical: `https://www.wordsbywtm.com/guides/${guide.slug}` },
};

export default function RetirementTributeGuide() {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <GuideJsonLd slug={guide.slug} />
      <GuideHeader
        guide={guide}
        dek="A card signed by forty people says “we were told to sign this.” Forty short stories, gathered and woven into one send-off, say “we noticed you, for years.” Here is how to collect goodbye messages from coworkers that are actually worth keeping — and turn them into the best moment of the retirement party."
      />

      <P>
        Someone is retiring after fifteen, twenty, maybe forty years — and somehow the job of “doing
        something” has landed on you. The default options are familiar: a card that circulates the
        office collecting variations of <em>Congrats! Enjoy the golf!</em>, or a group gift with a
        printed note. Both are fine. Neither says anything.
      </P>
      <P>
        What a person actually wants to know at the end of a long working life is simple:{' '}
        <Strong>did it matter that I was here?</Strong> The only convincing answer is specific
        stories from the people who were there too. Collecting those stories takes about two weeks
        of light effort and a bit of structure. This guide gives you both.
      </P>

      <H2>Why stories beat signatures</H2>
      <P>
        A signature proves attendance. A story proves attention. “Thanks for everything, enjoy
        retirement!” could be written about anyone; “You stayed until 9pm helping me fix the
        quarter-end report in my first month, and you never once mentioned it again” could only be
        written about one person. When you gather twenty of those and weave them together, the
        pattern that emerges — the running jokes, the quiet habits, the things three different
        people say independently — is a portrait no single speech-writer could produce.
      </P>

      <H2>Step 1: Claim the organizer role and set a date</H2>
      <P>
        Group tributes fail from diffusion, not malice — everyone assumes someone else is
        collecting. Fix it by being explicit: you are gathering the messages, and they are due on a
        specific day. Work backwards from the retirement party or last day:
      </P>
      <UL>
        <li><Strong>2–3 weeks out:</Strong> send the invitation to contribute.</li>
        <li><Strong>1 week out:</Strong> one reminder — short, cheerful, no guilt.</li>
        <li><Strong>3–4 days out:</Strong> close the collection; weave the tribute.</li>
        <li><Strong>The day:</Strong> read it aloud, hand over the keepsake.</li>
      </UL>

      <H2>Step 2: Cast a wider net than the current team</H2>
      <P>
        The current team is the easy part — a message and a link reaches them today. But careers
        are long, and the best material often comes from further away:
      </P>
      <UL>
        <li>
          <Strong>Former colleagues</Strong> who moved on years ago. One message from someone who
          left in 2015 lands harder than five from people they will see at the party anyway.
        </li>
        <li>
          <Strong>People from other departments</Strong> — the ones they solved problems with, or
          argued productively with, across the org chart.
        </li>
        <li>
          <Strong>People they mentored</Strong> — anyone who would say “they taught me how to do
          this job.” These are reliably the most moving contributions.
        </li>
        <li>
          <Strong>Longtime clients, vendors, or partners</Strong>, where appropriate — a voice from
          outside the building says the reputation traveled.
        </li>
      </UL>
      <P>
        Ten to forty contributors is a good range. Beyond that, do not chase completeness — range
        matters more than volume.
      </P>

      <H2>Step 3: Ask for one story, not “a few words”</H2>
      <P>
        Busy coworkers respond to requests that are small, specific, and deadlined. “Share a few
        words” produces the clichés you are trying to avoid; “tell one story” produces material.
        Something like:
      </P>
      <Example>
        Hi all — as you know, Dana retires at the end of the month. Instead of just a card, we are
        collecting one short story or memory from each person who worked with her, and weaving them
        into a send-off for the party on the 26th. Think small and specific: a moment, a habit, a
        thing she always said. Two to five sentences is perfect. Please add yours by Friday the
        19th — link below. (And keep it quiet — it is a surprise.)
      </Example>
      <P>Prompts to include for anyone staring at the blank box:</P>
      <UL>
        <li>The first thing you remember about working with them.</li>
        <li>A time they saved the day — or saved yours, specifically.</li>
        <li>Something they always said in meetings that everyone could quote.</li>
        <li>A habit or ritual the office will miss (the whiteboard doodles, the Friday email, the exact coffee order).</li>
        <li>Something they taught you that you still use.</li>
        <li>The moment you realized what kind of colleague they were.</li>
      </UL>
      <P>
        <Strong>One etiquette note:</Strong> funny is welcome; embarrassing is not. Say so in the
        invitation — “roast-adjacent is fine, actual roasting is not” — and you will save yourself
        curation work later.
      </P>

      <H2>Step 4: Collect in one place, not in your inbox</H2>
      <P>
        If the stories arrive by reply-all, chat message, and hallway conversation, you become the
        collection system — copying, pasting, and chasing. Give people a single destination
        instead. A shared doc works for a small, tight team; a form is tidier. A collection link is
        the lightest of all: each person opens it, writes their story, and is done — no account, no
        app, nothing forwarded to the wrong person by accident.
      </P>

      <CtaCard
        title="One link for the whole team"
        body="Start a retirement collection with Words That Matter and share a single link — by email, chat, wherever the team lives. Everyone contributes free, no accounts needed, and you see each story as it arrives. When the collection closes, it gets woven into one send-off speech."
        href={guide.ctaHref}
        label="See how a retirement collection works"
      />

      <H2>Step 5: Weave the stories into a send-off</H2>
      <P>
        Reading forty messages aloud one by one takes half an hour and flattens the room. The
        stronger move is one woven speech that carries all the voices. If you are writing it
        yourself:
      </P>
      <OL>
        <li>
          <Strong>Find the repeats.</Strong> When four people independently mention the same
          phrase or habit, that is a theme — lead with it. “Ask anyone on the team and they will
          tell you about the spreadsheet…”
        </li>
        <li>
          <Strong>Arrange by arc, not by sender.</Strong> Early-career stories, the years in the
          middle, the mentor years — a career has a shape; let the speech follow it.
        </li>
        <li>
          <Strong>Quote sparingly and name the source.</Strong> A woven paragraph, then one direct
          quote with a name attached, hits harder than a wall of attributions.
        </li>
        <li>
          <Strong>End with the door open.</Strong> Not “goodbye” but “here is what stays with us.”
        </li>
      </OL>
      <P>
        If two weeks of collecting has used up your energy for the writing part, that step can be
        handed off: when you finalize a Words That Matter collection, the gathered stories are
        woven into one speech for you — with a printable keepsake PDF the retiree takes home, and
        an optional spoken-audio version. Gathering is free; it is a single $49 payment, only at
        finalize.
      </P>

      <H2>Presenting it on the day</H2>
      <UL>
        <li>
          <Strong>Read it aloud</Strong> at the party — ideally by someone comfortable in front of
          the room. Five to seven minutes is the sweet spot.
        </li>
        <li>
          <Strong>Hand over the printed keepsake</Strong> afterwards. The speech is the moment; the
          PDF is what survives it. This is the part that replaces the card — and outlives it.
        </li>
        <li>
          <Strong>If the retiree is remote</Strong>, an audio version means the send-off still
          happens as a moment, not as an attachment.
        </li>
      </UL>

      <H2>The short version</H2>
      <P>
        Claim the job, set a deadline two to three weeks out, invite wide, ask each person for one
        small specific story, collect everything through a single link, and weave the results into
        one speech with a keepsake to hand over. That is the whole method. The difference between a
        signed card and a woven tribute is about two weeks of gentle nudging — and it is the
        difference between “the office marked my leaving” and “the people I worked with told me
        what it meant.”
      </P>

      <CtaCard
        title="Ready to start collecting?"
        body="Create a retirement collection, share the link with everyone who worked with them, and watch the stories come in. When you finalize, we weave them into one send-off speech — plus a printable keepsake PDF and an optional spoken version. Free to gather; $49 once at finalize."
        href={guide.ctaHref}
        label="Start a retirement collection"
      />
    </article>
  );
}
