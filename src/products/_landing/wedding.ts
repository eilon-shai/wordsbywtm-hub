import type { LandingPageConfig } from '@eilon-shai/venture-core';
import { weddingConfig } from '@/products/wedding/config';

// ---------------------------------------------------------------------------
// Wedding per-occasion landing (S2). Collaborative toast: gather stories and
// well-wishes from both sides, then weave them into one toast for the couple,
// read aloud at the reception. Copy describes what the product does, never who
// it is for (portfolio hard rule #7).
// ---------------------------------------------------------------------------

const FINALIZE_PRICE = `$${weddingConfig.tiers.full.displayPrice}`;

const SAMPLE_BOTH_SIDES = `Ask anyone here — and we asked a lot of you — and the same thing comes up about Sam and Alex before anything else: they make each other braver. Sam's college roommate put it best: "Alex is the reason Sam finally booked the one-way ticket he'd been talking about for years." And Alex's sister, from the other side of the room and the other side of their lives, wrote almost the same sentence about Sam.

The how-they-met stories don't quite agree, which is perfect. One of you swears it was the world's worst karaoke duet. Another insists it was a spilled coffee and a borrowed napkin. Both stories end the same way: neither of them stopped talking for the rest of the night, and, honestly, they still haven't.

What everyone noticed — friends, family, the groomsman who's known Sam since they were six — is how at home people feel around the two of them. The open-door apartment. The extra place always set. The way an ordinary Tuesday at their kitchen table somehow becomes the best part of your week.

Alex, you've made Sam softer and surer at the same time. Sam, you've made Alex laugh in that helpless, undignified way the rest of us have come to love. So from both sides, all of us: to Sam and Alex — to the bravery you give each other, and the home you make for everyone lucky enough to sit at your table. Cheers.`;

const SAMPLE_FUNNY = `I was warned not to tell the snorkeling story, so I'll just say this: Maya and Jordan's first vacation together involved a rented kayak, a questionable map, and a level of teamwork that several witnesses described as "concerning." They have not improved at kayaking. They have gotten extraordinarily good at everything else.

The stories came in from everywhere. Jordan's brother remembers the exact moment he knew — Jordan rehearsing how to ask Maya's dad for the recipe to her favorite dish, more nervous about that than the proposal. Maya's best friend remembers Maya describing a first date that ran seven hours and calling it "efficient."

Underneath all the bits, the same thing kept surfacing: they show up. For each other, for all of us. Jordan is the friend who answers at 2 a.m. Maya is the one who remembers your dog's birthday. Together they are somehow even more themselves.

So here's to Maya and Jordan: may your love be as steady as your kayaking is not. We're all so happy to be here. To the couple.`;

const SAMPLE_FAMILY = `Some of us have known Priya since she was small enough to fall asleep under the dinner table, and some of us met Daniel only recently — but every single story we gathered lands in the same place: these two were going to find each other.

Priya's mother remembers her as a girl who gave away her umbrella in the rain. Daniel's oldest friend remembers him driving four hours, twice, just to be in the same room as her for an afternoon. The generosity runs in both of them; it's the first thing the two families recognized in each other.

What recurs, story after story, is calm. Priya is the one who steadies a room. Daniel is the one who makes her laugh when she's the one who needs steadying. You can see, watching them, that each finally found the person who lets them set the weight down.

To Priya and Daniel — from both families, now one: thank you for letting us all be part of this. May your home always be the one with the umbrella by the door. To the couple.`;

export const weddingLandingConfig: LandingPageConfig = {
  brand: { name: 'Wedding Collection' },

  seo: {
    metaTitle: 'Wedding Collection — Gather stories from both sides into one toast | Words That Matter',
    metaDescription:
      'Start a wedding collection, invite the wedding party, family, and friends from both sides to add a story or well-wish, then weave it all into one toast for the couple. Free to create and collect. Pay once when you finalize. No account needed.',
    canonicalUrl: 'https://wordsbywtm.com/wedding',
  },

  hero: {
    badge: 'Gathered · Woven · Read Aloud',
    headline: 'One toast,',
    headlineEmphasis: 'from both sides.',
    subheading:
      'No one person knows the whole love story. Start a collection, invite the wedding party, family, and friends from both sides to each add a story, and we weave them into one toast for the couple — ready to read aloud at the reception.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80&auto=format&fit=crop',
    sampleExcerpt: SAMPLE_BOTH_SIDES,
    sampleExcerptBadge: 'Woven from 11 stories',
    fullCtaLabel: 'Start a Wedding Collection →',
    trustNote: 'Free to create and collect · Pay once when you’re ready · No account needed',
  },

  howItWorks: {
    eyebrow: 'How it works',
    heading: 'Four steps, one toast',
    steps: [
      {
        step: '01',
        title: 'Start a collection',
        body: 'Tell us who’s getting married and add your own first story. It’s free to create — we email you a private link to manage it.',
      },
      {
        step: '02',
        title: 'Invite both sides',
        body: 'Share one link with the wedding party, family, and friends. Each person adds a story in about two minutes — no account, no payment.',
      },
      {
        step: '03',
        title: 'Review what came in',
        body: 'Read every story as it arrives. Everything’s included by default — leave out anything that doesn’t fit.',
      },
      {
        step: '04',
        title: 'Weave them into one toast',
        body: 'When you’re ready, pay once and we weave the stories into one toast — then it’s yours to read at the reception, keep as a printable page, and hear in a warm voice.',
      },
    ],
  },

  vsAI: {
    eyebrow: 'Why gather instead of write',
    heading: 'A solo AI writes from one seat at the wedding. This writes from the whole room.',
    themLabel: 'Solo AI tool',
    usLabel: 'Wedding Collection',
    rows: [
      {
        aspect: 'Where the words come from',
        them: 'Whatever one nervous speaker can recall and type the night before.',
        us: 'Real stories from both sides — how they met, the proposal, the small moments — details no one person could supply.',
      },
      {
        aspect: 'Whose voice it carries',
        them: 'A single perspective on a shared love story.',
        us: 'A genuine collective voice from both sides: “Ask anyone here and they’ll tell you…” — the chorus only many contributors can create.',
      },
      {
        aspect: 'What it asks of you',
        them: 'You do all the remembering and all the writing, alone, under pressure.',
        us: 'You invite people and they show up — gathering the stories becomes something both sides do together.',
      },
      {
        aspect: 'What it leaves behind',
        them: 'A speech.',
        us: 'A toast woven from both sides — a page to print and keep, a spoken version to play at the reception, plus the stories themselves, gathered in one place.',
      },
    ],
    closingLine: 'A love story this big shouldn’t be told from one seat.',
  },

  samples: {
    eyebrow: 'Sample toasts',
    heading: 'Woven from many voices',
    subheading: 'Each of these was synthesized from real stories shared by a different group of people.',
    tabs: [
      { value: 'both', label: 'Both sides', content: SAMPLE_BOTH_SIDES },
      { value: 'funny', label: 'Funny & warm', content: SAMPLE_FUNNY },
      { value: 'family', label: 'Two families, now one', content: SAMPLE_FAMILY },
    ],
  },

  pricing: {
    eyebrow: 'Simple, one-time pricing',
    heading: 'Free to gather.\nPay once to weave it together.',
    subheading:
      'Creating the collection and inviting people is free. You only pay when you finalize — one time, no subscription, no account.',
    full: {
      price: FINALIZE_PRICE,
      label: 'Wedding Toast',
      badge: 'Pay only at the end',
      description: 'One finished toast, woven from the stories you choose — to read at the reception, to keep as a page, and to hear in a warm voice.',
      features: [
        'One toast, woven from up to 10 people’s stories, in one collective voice',
        'A keepsake PDF to download, print, and keep',
        'A spoken version in a warm voice, to play at the reception',
        'Emailed to you — free to create and collect, you pay once when you finalize',
      ],
      ctaLabel: 'Start a Wedding Collection →',
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
      ctaLabel: 'Start a Wedding Collection →',
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
        a: 'Yes. Reading and reviewing every story is completely free. You only pay when you decide to finalize and have the toast woven together. Nothing is generated before you pay.',
      },
      {
        q: 'Who can see what others wrote?',
        a: 'Only you. Stories are not published anywhere public. Each contributor sees only their own submission; you’re the one who reads them all and decides what to include.',
      },
      {
        q: 'What if someone shares something I don’t want in the toast?',
        a: 'You’re in control. Every story is included by default, but you can leave any of them out with one tap before you finalize.',
      },
      {
        q: 'What if only a few people contribute?',
        a: 'That’s fine. The toast can be woven from even a single heartfelt story — we never hold your collection hostage to a quota. More voices make a richer toast, but a small, close circle is enough.',
      },
      {
        q: 'Can I set the tone?',
        a: 'Yes. When you finalize you choose the tone — heartfelt, funny, or balanced — and the length, so the toast fits the room.',
      },
      {
        q: 'How is this different from writing it with ChatGPT?',
        a: 'A solo AI tool can only work from what one speaker types. This gathers real stories from both sides and weaves them into one collective voice — the “ask anyone here and they’ll tell you” register that only many contributions can create.',
      },
      {
        q: 'How long does it take?',
        a: 'Creating a collection takes under a minute. Collecting stories happens over hours or days as people respond. Once you finalize, the toast is woven and emailed to you within a minute or two.',
      },
      {
        q: 'What if it’s not right?',
        a: 'If the finished toast doesn’t feel right, email wedding@wordsbywtm.com and we’ll make it right. The stories you gathered are always yours.',
      },
    ],
  },

  finalCta: {
    heading: 'Gather the stories before the big day.',
    subheading:
      'Start a collection now — it’s free. Invite both sides, and weave their stories into one toast when you’re ready.',
    ctaLabel: 'Start a Wedding Collection →',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=80&auto=format&fit=crop',
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
