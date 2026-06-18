import type { LandingPageConfig } from '@eilon-shai/venture-core';
import { retirementConfig } from '@/products/retirement/config';

// ---------------------------------------------------------------------------
// Retirement per-occasion landing page (S2). Collaborative send-off: gather
// stories from colleagues, friends, and family, then weave them into one speech
// to read aloud at the party. Copy describes what the product does, never who
// it is for (portfolio hard rule #7).
// ---------------------------------------------------------------------------

const FINALIZE_PRICE = `$${retirementConfig.tiers.full.displayPrice}`;

const SAMPLE_TEAM = `Ask anyone who worked with Dana and you'll hear the same thing before any title comes up: she was the person you went to. Not because it was her job — half the time it wasn't — but because she'd actually stop, turn her chair around, and help you think.

Someone from her first team remembers the launch that nearly didn't happen — the one Dana quietly rescued over a weekend without ever once mentioning it on Monday. A newer colleague remembers their first week, lost and afraid to ask, and Dana pulling up a chair with two coffees and the words, "Okay, ask me the dumb questions first."

Several people, independently, used the word steady. Through three reorgs, two systems migrations, and one very memorable office flood, Dana was the calm in the room — the one who'd say "alright, what do we actually know?" and somehow make the panic smaller.

She had her trademarks. The spreadsheet color-coding that no one else could decode. The fact that she remembered everyone's coffee order and no one's job title. The way she ended hard meetings with a terrible pun, on purpose, just to break the tension.

Thirty-one years. What she leaves behind isn't a list of projects — it's a whole generation of people who learned, from watching her, that competence and kindness were never a trade-off. Dana, the chair's yours to turn around now. Go enjoy it.`;

const SAMPLE_MANAGER = `When Robert started here, the building had a different name. Eleven of us in this room weren't born yet. That's not a statistic — it's the shape of a career most people don't get to have, and almost no one gets to have well.

His longtime manager remembers the negotiation everyone said couldn't be won, and Robert winning it not by being the loudest but by being the most prepared person in every room he ever walked into. Someone he mentored remembers being talked out of quitting — twice — and being very glad, now, that Robert was that stubborn about other people's potential.

What comes up again and again isn't the wins. It's how he carried them. He gave the credit away and kept the blame. He answered the phone at hours no one should answer the phone. When the work was thankless, he did it anyway, and somehow made you want to do it too.

He pretended to hate the nickname. He kept every conference badge in a drawer he swore he'd clean out. He had exactly one playlist for deadlines and we all know every song on it now.

Robert, you built more than results — you built the way this place treats people. That outlasts any quarter. Go be unreachable for a while. You've earned it, and we'll be fine, because you made sure of it.`;

const SAMPLE_MIXED = `Some of us know Patricia from the lab, some from the carpool, one of us from the front desk she made feel like the most important seat in the building. Put the stories together and the same person steps forward every time: curious, generous, and completely unbothered by what she was "supposed" to do.

A colleague of two decades remembers her teaching herself an entire new field at fifty-five because a problem annoyed her. Her daughter remembers her doing the exact same thing with the kitchen sink. A junior teammate remembers being the only one who laughed at her joke in a tense all-hands, and Patricia catching their eye like they were now co-conspirators for life.

The word that recurs is generous — with time, with credit, with the benefit of the doubt. She remembered birthdays and the names of people's dogs and exactly where you'd left off the last conversation, even if it was months ago.

She refused to retire quietly, and we wouldn't let her if she tried. Patricia, the problems will miss you most of all — there's no one left who gets that delighted by a hard one. Go find some new ones. Preferably far from a laptop.`;

export const retirementLandingConfig: LandingPageConfig = {
  brand: { name: 'Retirement Collection' },

  seo: {
    metaTitle: 'Retirement Collection — Gather stories into one send-off speech | Words That Matter',
    metaDescription:
      'Start a retirement collection, invite colleagues, friends, and family to add a story, then weave it all into one send-off speech to read aloud at the party. Free to create and collect. Pay once when you finalize. No account needed.',
    canonicalUrl: 'https://wordsbywtm.com/retirement',
    ogImageUrl: 'https://wordsbywtm.com/og-retirement.png',
  },

  hero: {
    badge: 'Gathered · Woven · Read Aloud',
    headline: 'One send-off,',
    headlineEmphasis: 'in everyone’s voice.',
    subheading:
      'No one person saw the whole career. Start a collection, invite the people who worked alongside them to each add a story, and we weave them into one warm send-off speech — ready to read aloud at the party.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80&auto=format&fit=crop',
    sampleExcerpt: SAMPLE_TEAM,
    sampleExcerptBadge: 'Woven from 8 stories',
    fullCtaLabel: 'Start a Retirement Collection →',
    trustNote: 'Free to create and collect · Pay once when you’re ready · No account needed',
  },

  howItWorks: {
    eyebrow: 'How it works',
    heading: 'Three steps, one send-off',
    steps: [
      {
        step: '01',
        title: 'Start a collection',
        body: 'Tell us who’s retiring and add your own first story. It’s free to create — we email you a private link to manage it.',
      },
      {
        step: '02',
        title: 'Invite the people who worked with them',
        body: 'Share one link with colleagues, friends, and family. Each person adds a story in about two minutes — no account, no payment — then you review every one and choose what to include.',
      },
      {
        step: '03',
        title: 'Weave them into one speech',
        body: 'When you’re ready, pay once and we weave the stories into one send-off speech — then it’s yours to read at the party, keep as a printable page, and hear in a warm voice.',
      },
    ],
  },

  vsAI: {
    eyebrow: 'Why gather instead of write',
    heading: 'A solo AI writes from one desk. This writes from the whole floor.',
    themLabel: 'Solo AI tool',
    usLabel: 'Retirement Collection',
    rows: [
      {
        aspect: 'Where the words come from',
        them: 'Whatever one person can recall and type into a box, usually the night before.',
        us: 'Real stories from everyone who worked with them — the rescued launch, the mentoring, the terrible puns — details no one person could supply.',
      },
      {
        aspect: 'Whose voice it carries',
        them: 'A single perspective on a decades-long career.',
        us: 'A genuine collective voice: “Everyone who worked with her will tell you…” — the chorus only many contributors can create.',
      },
      {
        aspect: 'What it asks of you',
        them: 'You do all the remembering and all the writing, alone.',
        us: 'You invite people and they show up — gathering the stories becomes something the whole team does together.',
      },
      {
        aspect: 'What it leaves behind',
        them: 'A speech.',
        us: 'A send-off woven from many colleagues — a page to print and keep, a spoken version to play at the party, plus the stories themselves, gathered in one place.',
      },
    ],
    closingLine: 'A whole career deserves more than one person’s memory of it.',
  },

  samples: {
    eyebrow: 'Sample send-offs',
    heading: 'Woven from many voices',
    subheading: 'Each of these was synthesized from real stories shared by a different group of people.',
    tabs: [
      { value: 'team', label: 'Team & colleagues', content: SAMPLE_TEAM },
      { value: 'manager', label: 'Long career', content: SAMPLE_MANAGER },
      { value: 'mixed', label: 'Work, friends & family', content: SAMPLE_MIXED },
    ],
  },

  pricing: {
    eyebrow: 'Simple, one-time pricing',
    heading: 'Free to gather.\nPay once to weave it together.',
    subheading:
      'Creating the collection and inviting people is free. You only pay when you finalize — one time, no subscription, no account.',
    full: {
      price: FINALIZE_PRICE,
      label: 'Retirement Send-Off',
      badge: 'Pay only at the end',
      description: 'One finished send-off speech, woven from the stories you choose — to read at the party, to keep as a page, and to hear in a warm voice.',
      features: [
        'One speech, woven from up to 10 people’s stories, in one collective voice',
        'A keepsake PDF to download, print, and keep',
        'A spoken version in a warm voice, to play at the party',
        'Emailed to you — free to create and collect, you pay once when you finalize',
      ],
      ctaLabel: 'Start a Retirement Collection →',
      featured: true,
    },
    basic: {
      price: '$0',
      label: 'To create & collect',
      description: 'Start a collection, invite people, and read every story — all free, with nothing due until you finalize.',
      features: [
        'Create a collection in under a minute',
        'Invite up to 3 people with one link (10 once you finalize/pay)',
        'Read and review every story as it arrives',
        'No account, no card, nothing due upfront',
      ],
      ctaLabel: 'Start a Retirement Collection →',
    },
  },

  faq: {
    heading: 'Common questions',
    items: [
      {
        q: 'Do the people I invite have to pay?',
        a: 'No. Contributors never pay and never make an account. They open your link, add a story in a couple of minutes, and they’re done. Only you, the organizer, pay — once, at the very end.',
      },
      {
        q: 'Can I see the stories before I pay?',
        a: 'Yes. Reading and reviewing every story is completely free. You only pay when you decide to finalize and have the send-off woven together. Nothing is generated before you pay.',
      },
      {
        q: 'Who can see what others wrote?',
        a: 'Only you. Stories are not published anywhere public. Each contributor sees only their own submission; you’re the one who reads them all and decides what to include.',
      },
      {
        q: 'What if someone shares something I don’t want in the speech?',
        a: 'You’re in control. Every story is included by default, but you can leave any of them out with one tap before you finalize.',
      },
      {
        q: 'What if only a few people contribute?',
        a: 'That’s fine. The send-off can be woven from even a single heartfelt story — we never hold your collection hostage to a quota. More voices make a richer speech, but a small, close circle is enough.',
      },
      {
        q: 'Can I set the tone?',
        a: 'Yes. When you finalize you choose the tone — formal, warm, or lighthearted — and the length, so the speech fits the room, whether it’s a party or a meeting.',
      },
      {
        q: 'How is this different from writing it with ChatGPT?',
        a: 'A solo AI tool can only work from what one person types. This gathers real stories from everyone who worked with them and weaves them into one collective voice — the “everyone who worked with her will tell you” register that only many contributions can create.',
      },
      {
        q: 'How long does it take?',
        a: 'Creating a collection takes under a minute. Collecting stories happens over hours or days as people respond. Once you finalize, the send-off is woven and emailed to you within a minute or two.',
      },
      {
        q: 'What if it’s not right?',
        a: 'If the finished send-off doesn’t feel right, email retirement@wordsbywtm.com and we’ll make it right. The stories you gathered are always yours.',
      },
    ],
  },

  finalCta: {
    heading: 'Gather the stories before the send-off.',
    subheading:
      'Start a collection now — it’s free. Invite the people who worked with them, and weave their stories into one speech when you’re ready.',
    ctaLabel: 'Start a Retirement Collection →',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80&auto=format&fit=crop',
    trustNote: 'Free to create and collect · Pay once when you finalize · No account needed',
  },

  legal: {
    termsUrl: '/terms',
    privacyUrl: '/privacy',
  },

  footer: {
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/refund', label: 'Refund Policy' },
    ],
    copyright: `© ${new Date().getFullYear()} Words That Matter LLC. All rights reserved.`,
  },
};
