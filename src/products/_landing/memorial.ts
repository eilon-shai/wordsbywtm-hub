import type { LandingPageConfig } from '@eilon-shai/venture-core';
import { memorialConfig } from '@/products/memorial/config';

// ---------------------------------------------------------------------------
// Memorial per-occasion landing page config (S2).
//
// Reuses venture-core's LandingPage in formFirst nav mode — every CTA routes to
// `/memorial/start?tier=` with no Paddle init. The collaborative-collection
// narrative replaces the single-author eulogy story: gather many voices, review,
// pay once to weave them into one tribute read aloud at the service.
//
// All copy describes what the product does (gather, weave, read aloud), never
// who it is for (portfolio hard rule #7 — no demographic/identity language).
// ---------------------------------------------------------------------------

const FINALIZE_PRICE = `$${memorialConfig.tiers.full.displayPrice}`;

// The single most important conversion asset: a real synthesized multi-voice
// tribute in the collective "Some remember… others recall…" register that only
// the collaborative model can produce.
const SAMPLE_MIXED = `Ask anyone who knew Eleanor and the same word surfaces before any other: present. Not busy, not performing — present. Some remember the way she'd put down whatever she was holding the moment you walked into a room, as if the rest of the day could wait. Others recall that she did this for the mail carrier and the cardiologist alike, with no detectable change in warmth.

Her granddaughter remembers the index cards. Eleanor kept a recipe box that was never really about recipes — tucked between the cards for pot roast and lemon bars were birthdays, the names of people's dogs, the date someone had started a new job so she'd know to ask about it next time. "She didn't have a good memory," one of us wrote. "She had a system, because remembering mattered to her that much."

A colleague of thirty years recalls a different Eleanor entirely, and yet exactly the same one: the one who, in a meeting full of people talking past each other, would wait, and then ask the one question that made everyone realize what they'd actually been arguing about. She was not loud. She was, several people independently noted, almost never the first to speak — and almost always the last word anyone remembered.

There are the small things, too many to fit, that together make a life. The way she hummed while she gardened, off-key and unbothered. The standing Sunday calls she made to three different people in three different time zones. The fact that she signed every card, even the store-bought ones, with a line of her own so it wouldn't be only Hallmark's words.

What comes through most, across every memory gathered here, is that Eleanor made people feel known. Not flattered, not entertained — known. To be on the receiving end of her attention was to feel, however briefly, that you were the most interesting thing in her day.

She is not gone from this room. She's in the recipe box, in the unasked questions her family will now learn to ask, in the off-key humming someone in this family will catch themselves doing years from now without knowing where it came from. We carry that forward. All of us. Together.`;

const SAMPLE_FAMILY = `Some of us knew Tom as a father, some as a brother, one of us as the man who taught half the neighborhood to ride a bike. Put the memories side by side and a single figure steps forward: steady, dry-humored, quietly unshakeable.

His son remembers the garage — the radio always on a baseball game, the coffee can of mismatched screws Tom swore he could find anything in, and somehow could. His sister remembers a much younger Tom, the one who covered for her more than once and never once mentioned it again. A neighbor remembers being new on the street, knowing no one, and Tom appearing at the door with a rake and the words, "Looked like you could use a hand."

Several people used almost the same phrase, without coordinating: he showed up. Not with speeches. With a rake, a ride to the airport at 4 a.m., a folding chair carried over to whoever was setting up. He believed, as one memory put it, that love was mostly a verb.

He had his particulars. The dishwasher had a correct loading order known only to him. He pronounced certain words wrong on purpose, for forty years, purely to be told he was wrong. He kept every ticket stub from every game he ever attended in a shoebox no one was allowed to throw out — and which, it turns out, none of us will ever throw out now.

What gathers from all of it is a man who made the people around him feel safe — that whatever broke, Tom would help fix it, and whatever happened, Tom would show up. That is not a small thing to leave behind. It may be the largest thing there is.`;

const SAMPLE_FRIENDS = `Margaret collected people the way other people collect stamps — carefully, with genuine delight, and a memory for exactly where each one came from. The memories gathered here come from a book club, a hiking group, two former coworkers, and a woman she met in a hospital waiting room in 1994 and never stopped calling. That range is the point.

Her oldest friend remembers the laugh first — the real one, the one that started silent and arrived a full second late. Several people remember her advice, which was unsolicited, frequently correct, and impossible to be angry about. "She'd tell you the truth," one wrote, "and then make you a sandwich, so you couldn't stay mad."

A hiking companion remembers her at the back of the group, not because she was slow but because she'd stop for every overlook, every odd mushroom, every dog on the trail. "She refused to hurry through a good day," the memory reads. More than one person, it turns out, learned how to slow down from watching Margaret.

She was generous in the unglamorous ways — the rides, the casseroles, the phone calls on the anniversaries other people forgot. She remembered. That recurs across nearly every memory here: she remembered what mattered to you, and she brought it up, sometimes years later, so you'd know it had stayed with her.

To have been chosen by Margaret — and everyone here was, specifically, chosen — was to be kept. That is what we hold now. Not the absence of her, but the long evidence that we were, each of us, kept.`;

export const memorialLandingConfig: LandingPageConfig = {
  brand: { name: 'Memorial Collection' },

  seo: {
    metaTitle: 'Memorial Collection — Gather memories into one tribute | Words That Matter',
    metaDescription:
      'Start a memorial collection, invite everyone who knew them to add a memory, then weave it all into one tribute read aloud at the service. Free to create and collect. Pay once when you finalize. No account needed.',
    canonicalUrl: 'https://wordsbywtm.com/memorial',
    ogImageUrl: 'https://wordsbywtm.com/og-memorial.png',
  },

  // No cross-occasion nav: Memorial is a standalone product and must not
  // cross-link to Wedding/Retirement (especially inappropriate in a grief
  // context). A multi-type product (e.g. a wedding hub with vows/anniversary/
  // speech) would populate nav.links with ITS sub-types. Omitting nav leaves a
  // clean header: wordmark + Pricing + the Start CTA.

  hero: {
    badge: 'Gathered · Woven · Read Aloud',
    headline: 'One tribute,',
    headlineEmphasis: 'in everyone’s voice.',
    subheading:
      'No one person holds the whole of a life. Start a collection, invite the people who knew them to each add a memory, and we weave them into one moving tribute — ready to read aloud at the service.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80&auto=format&fit=crop',
    sampleExcerpt: SAMPLE_MIXED,
    sampleExcerptBadge: 'Woven from 9 memories',
    fullCtaLabel: 'Start a Memorial Collection →',
    trustNote: 'Free to create and collect · Pay once when you’re ready · No account needed',
  },

  howItWorks: {
    eyebrow: 'How it works',
    heading: 'Three steps, one tribute',
    steps: [
      {
        step: '01',
        title: 'Start a collection',
        body: 'Tell us who you’re honoring and add your own first memory. It’s free to create — we email you a private link to manage it.',
      },
      {
        step: '02',
        title: 'Invite the people who knew them',
        body: 'Share one link with family and friends. Each person adds a memory in about two minutes — no account, no payment, then you review every one and choose what to include.',
      },
      {
        step: '03',
        title: 'Weave them into one tribute',
        body: 'When you’re ready, pay once and we weave the memories into one tribute — then it’s yours to read at the service, keep as a printable page, and hear in a calm voice.',
      },
    ],
  },

  vsAI: {
    eyebrow: 'Why gather instead of write',
    heading: 'A solo AI writes from one memory. This writes from everyone’s.',
    themLabel: 'Solo AI tool',
    usLabel: 'Memorial Collection',
    rows: [
      {
        aspect: 'Where the words come from',
        them: 'Whatever one grieving person can manage to type into a box, often through tears, often alone.',
        us: 'Real memories from everyone who knew them — the recipe box, the garage radio, the late laugh — details no one person could supply.',
      },
      {
        aspect: 'Whose voice it carries',
        them: 'A single perspective, however heartfelt — one angle on a whole life.',
        us: 'A genuine collective voice: “Some remember… others recall…” — the chorus only many contributors can create.',
      },
      {
        aspect: 'What it asks of you in grief',
        them: 'You do all the remembering and all the writing, by yourself, in the hardest week of your life.',
        us: 'You invite people and they show up — gathering memories becomes something the whole circle does together.',
      },
      {
        aspect: 'What it leaves behind',
        them: 'A document.',
        us: 'A tribute woven from many hands — a page you can print and keep, and a spoken version to play at the service, plus the memories themselves, gathered in one place.',
      },
    ],
    closingLine: 'No one should have to remember a whole life alone.',
  },

  samples: {
    eyebrow: 'Sample tributes',
    heading: 'Woven from many voices',
    subheading: 'Each of these was synthesized from real memories shared by a different group of people.',
    tabs: [
      { value: 'mixed', label: 'Family & friends', content: SAMPLE_MIXED },
      { value: 'family', label: 'Mostly family', content: SAMPLE_FAMILY },
      { value: 'friends', label: 'Friends & circles', content: SAMPLE_FRIENDS },
    ],
  },

  pricing: {
    eyebrow: 'Simple, one-time pricing',
    heading: 'Free to gather.\nPay once to weave it together.',
    subheading:
      'Creating the collection and inviting people is free. You only pay when you finalize — one time, no subscription, no account.',
    full: {
      price: FINALIZE_PRICE,
      label: 'Memorial Tribute',
      badge: 'Pay only at the end',
      description: 'One finished tribute, woven from the memories you choose — to read at the service, to keep as a page, and to hear in a calm voice.',
      features: [
        'One tribute, woven from up to 10 people’s memories, in one collective voice',
        'A keepsake PDF to download, print, and keep',
        'A spoken version in a calm voice, to play at the service',
        'Emailed to you — free to create and collect, you pay once when you finalize',
      ],
      ctaLabel: 'Start a Memorial Collection →',
      featured: true,
    },
    basic: {
      price: '$0',
      label: 'To create & collect',
      description: 'Start a collection, invite people, and read every memory — all free, with nothing due until you finalize.',
      features: [
        'Create a collection in under a minute',
        'Invite up to 3 people with one link (10 once you finalize/pay)',
        'Read and review every memory as it arrives',
        'No account, no card, nothing due upfront',
      ],
      ctaLabel: 'Start a Memorial Collection →',
    },
  },

  faq: {
    heading: 'Common questions',
    items: [
      {
        q: 'Do the people I invite have to pay?',
        a: 'No. Contributors never pay and never make an account. They open your link, add a memory in a couple of minutes, and they’re done. Only you, the organizer, pay — once, at the very end.',
      },
      {
        q: 'Can I see the memories before I pay?',
        a: 'Yes. Reading and reviewing every memory is completely free. You only pay when you decide to finalize and have the tribute woven together. Nothing is generated before you pay.',
      },
      {
        q: 'Who can see what others wrote?',
        a: 'Only you. Memories are not published anywhere public. Each contributor sees only their own submission; you’re the one who reads them all and decides what to include.',
      },
      {
        q: 'What if someone shares something I don’t want in the tribute?',
        a: 'You’re in control. Every memory is included by default, but you can leave any of them out with one tap before you finalize. Nothing you exclude appears in the tribute.',
      },
      {
        q: 'What is the link — do people need an account?',
        a: 'It’s a private link, no account required. You share one link with everyone you invite. We also email you a separate, private link so you can come back to manage and finish whenever you’re ready.',
      },
      {
        q: 'What if only a few people contribute?',
        a: 'That’s fine. The tribute can be woven from even a single heartfelt memory — we never hold your collection hostage to a quota. More voices make a richer tribute, but a small, close circle is enough.',
      },
      {
        q: 'How is this different from writing it with ChatGPT?',
        a: 'A solo AI tool can only work from what one grieving person manages to type. This gathers real memories from everyone who knew them and weaves them into one collective voice — the “some remember, others recall” register that only many contributions can create.',
      },
      {
        q: 'Is using AI for something this personal appropriate?',
        a: 'The words come from the people who loved them — the memories are real and theirs. We help organize and weave those genuine memories into one coherent tribute. What everyone feels is real; we help it be said well.',
      },
      {
        q: 'How long does it take?',
        a: 'Creating a collection takes under a minute. Collecting memories happens over hours or days as people respond. Once you finalize, the tribute is woven and emailed to you within a minute or two.',
      },
      {
        q: 'What if it’s not right?',
        a: 'If the finished tribute doesn’t feel right, email memorial@wordsbywtm.com and we’ll make it right. The memories you gathered are always yours.',
      },
    ],
  },

  finalCta: {
    heading: 'Gather the memories before they scatter.',
    subheading:
      'Start a collection now — it’s free. Invite the people who knew them, and weave their memories into one tribute when you’re ready.',
    ctaLabel: 'Start a Memorial Collection →',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80&auto=format&fit=crop',
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
