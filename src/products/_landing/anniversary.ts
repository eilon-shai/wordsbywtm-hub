import type { LandingPageConfig } from '@eilon-shai/venture-core';
import { anniversaryConfig } from '@/products/anniversary/config';

// ---------------------------------------------------------------------------
// Anniversary per-occasion landing (S2). Collaborative MILESTONE toast:
// gather memories from the couple's circle (children, grandchildren, friends),
// then weave them into one toast read aloud at the anniversary party. Copy
// describes what the product does, never who it is for (portfolio hard rule #7).
// ---------------------------------------------------------------------------

const FINALIZE_PRICE = `$${anniversaryConfig.tiers.full.displayPrice}`;

const SAMPLE_FAMILY = `Fifty years. Say it fast and it's nothing; watch George and Ruth move around a kitchen and you understand exactly how long it is — and how short it still feels to them.

Their daughter remembers never once hearing a door slammed, but plenty of laughter through the walls. Their son remembers the Sunday drives with no destination, the two of them up front still talking like they'd just met. A grandchild, who only ever knew them already old and already in love, wrote: "I thought everyone's grandparents held hands at the grocery store. Turns out that was just mine."

What everyone said, in their own way, is that George and Ruth made love look like a verb. The notes left on the counter. The way she finishes his sentences and he lets her, even when she's wrong, especially when she's wrong. The standing argument about the thermostat that is, clearly, the secret to the whole thing.

They didn't have an easy fifty years. Nobody does. They had a chosen fifty years — chosen again every ordinary morning. To George and Ruth: thank you for showing all of us what staying looks like. Here's to the next chapter, and to the thermostat war that will surely outlive us all.`;

const SAMPLE_REFLECTIVE = `Twenty-five years ago, nobody at the wedding would have bet on the karaoke marriage lasting this long. Twenty-five years later, here we all are, and the joke's on us.

What came through in every story people sent is how unshowy it's been. Maria's sister remembers the year things were hard — money, a move, a scare — and how David just quietly got smaller in his own needs so Maria could get through hers. Maria did the same the next year, without either of them ever calling it a sacrifice. They just call it Tuesday.

A friend of both wrote: "They're not the couple that posts. They're the couple that shows up — at the hospital, at the airport, at your worst." That recurs in almost every memory here. Steady. Present. Unspectacular in the way that turns out to be the whole point.

To Maria and David, twenty-five years in: you made something quiet and real, and it held. Here's to the next twenty-five, and to never, ever singing in public again.`;

const SAMPLE_CELEBRATORY = `The official story is that Amara and Tunde met at a wedding. The unofficial story, told by no fewer than four people who sent in memories, is that Tunde spent the entire reception "accidentally" ending up wherever Amara was standing. Forty years later, he still does it. We've all seen it. It's adorable and slightly ridiculous and the truest thing about them.

Their kids remember a house that was always full — extra plates, extra beds, the door that didn't really lock. Their oldest friend remembers that the secret to their parties was simple: the two of them were so obviously glad to see everyone that you couldn't help being glad too.

The word that came up again and again was generous — with their home, their time, their absolutely unsolicited advice. To be loved by Amara and Tunde, together, is to be fed, teased, and looked after all at once.

To Amara and Tunde: forty years of accidentally standing next to each other on purpose. We're all so lucky you found the spot. To many more.`;

export const anniversaryLandingConfig: LandingPageConfig = {
  brand: { name: 'Anniversary Collection' },

  seo: {
    metaTitle: 'Anniversary Collection — Gather memories into one toast for the couple | Words That Matter',
    metaDescription:
      'Start an anniversary collection, invite family and friends to add a memory of the couple, then weave it all into one toast read aloud at the celebration. Free to create and collect. Pay once when you finalize. No account needed.',
    canonicalUrl: 'https://wordsbywtm.com/anniversary',
  },

  hero: {
    badge: 'Gathered · Woven · Read Aloud',
    headline: 'A milestone toast,',
    headlineEmphasis: 'in everyone’s voice.',
    subheading:
      'A long marriage touches everyone around it. Start a collection, invite family and friends to each add a memory of the couple, and we weave them into one toast — ready to read aloud at the celebration.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=1600&q=80&auto=format&fit=crop',
    sampleExcerpt: SAMPLE_FAMILY,
    sampleExcerptBadge: 'Woven from 9 memories',
    fullCtaLabel: 'Start a collection →',
    trustNote: 'Free to create and collect · Pay once when you’re ready · No account needed',
  },

  howItWorks: {
    eyebrow: 'How it works',
    heading: 'Four steps, one toast',
    steps: [
      {
        step: '01',
        title: 'Start a collection',
        body: 'Tell us which couple you’re celebrating and add your own first memory. It’s free to create — we email you a private link to manage it.',
      },
      {
        step: '02',
        title: 'Invite family and friends',
        body: 'Share one link with everyone who knows the couple. Each person adds a memory in about two minutes — no account, no payment.',
      },
      {
        step: '03',
        title: 'Review what came in',
        body: 'Read every memory as it arrives. Everything’s included by default — leave out anything that doesn’t belong.',
      },
      {
        step: '04',
        title: 'Weave them into one toast',
        body: 'When you’re ready, pay once and we weave the memories into one toast — then it’s yours to read at the celebration, keep as a printable page, and hear in a warm voice.',
      },
    ],
  },

  vsAI: {
    eyebrow: 'Why gather instead of write',
    heading: 'A solo AI writes from one memory. A marriage this long deserves all of them.',
    themLabel: 'Solo AI tool',
    usLabel: 'Anniversary Collection',
    rows: [
      {
        aspect: 'Where the words come from',
        them: 'Whatever one person can recall and type into a box.',
        us: 'Real memories from across the years and the family — the Sunday drives, the door that never locked — details no one person could supply.',
      },
      {
        aspect: 'Whose voice it carries',
        them: 'A single perspective on a decades-long marriage.',
        us: 'A genuine collective voice: “Everyone who has spent time around them will tell you…” — the chorus only many contributors can create.',
      },
      {
        aspect: 'What it asks of you',
        them: 'You do all the remembering and all the writing, alone.',
        us: 'You invite people and they show up — gathering the memories becomes something the whole family does together.',
      },
      {
        aspect: 'What it leaves behind',
        them: 'A speech.',
        us: 'A toast woven from the whole family — a page to print and keep, a spoken version to play at the party, plus the memories themselves, gathered in one place.',
      },
    ],
    closingLine: 'A marriage this long was never just about two people.',
  },

  samples: {
    eyebrow: 'Sample toasts',
    heading: 'Woven from many voices',
    subheading: 'Each of these was synthesized from real memories shared by a different group of people.',
    tabs: [
      { value: 'family', label: 'Family', content: SAMPLE_FAMILY },
      { value: 'reflective', label: 'Reflective', content: SAMPLE_REFLECTIVE },
      { value: 'celebratory', label: 'Celebratory', content: SAMPLE_CELEBRATORY },
    ],
  },

  pricing: {
    eyebrow: 'Simple, one-time pricing',
    heading: 'Free to gather.\nPay once to weave it together.',
    subheading:
      'Creating the collection and inviting people is free. You only pay when you finalize — one time, no subscription, no account.',
    full: {
      price: FINALIZE_PRICE,
      label: 'Anniversary Toast',
      badge: 'Pay only at the end',
      description: 'One finished toast, woven from the memories you choose — to read at the celebration, to keep as a page, and to hear in a warm voice.',
      features: [
        'One toast, woven from up to 10 people’s memories, in one collective voice',
        'A keepsake PDF to download, print, and keep',
        'A spoken version in a warm voice, to play at the party',
        'Emailed to you — free to create and collect, you pay once when you finalize',
      ],
      ctaLabel: 'Start an Anniversary Collection →',
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
      ctaLabel: 'Start an Anniversary Collection →',
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
        a: 'Yes. Reading and reviewing every memory is completely free. You only pay when you decide to finalize and have the toast woven together. Nothing is generated before you pay.',
      },
      {
        q: 'Who can see what others wrote?',
        a: 'Only you. Memories are not published anywhere public. Each contributor sees only their own submission; you’re the one who reads them all and decides what to include.',
      },
      {
        q: 'What if someone shares something I don’t want in the toast?',
        a: 'You’re in control. Every memory is included by default, but you can leave any of them out with one tap before you finalize.',
      },
      {
        q: 'What if only a few people contoast?',
        a: 'That’s fine. The toast can be woven from even a single heartfelt memory — we never hold your collection hostage to a quota. More voices make a richer toast, but a small, close circle is enough.',
      },
      {
        q: 'Can I set the tone?',
        a: 'Yes. When you finalize you choose the tone — heartfelt, celebratory, or reflective — and the length, so the toast fits the celebration.',
      },
      {
        q: 'How is this different from writing it with ChatGPT?',
        a: 'A solo AI tool can only work from what one person types. This gathers real memories from the whole family and weaves them into one collective voice — the “everyone will tell you” register that only many contributions can create.',
      },
      {
        q: 'How long does it take?',
        a: 'Creating a collection takes under a minute. Collecting memories happens over hours or days as people respond. Once you finalize, the toast is woven and emailed to you within a minute or two.',
      },
      {
        q: 'What if it’s not right?',
        a: 'If the finished toast doesn’t feel right, email anniversary@wordsbywtm.com and we’ll make it right. The memories you gathered are always yours.',
      },
    ],
  },

  finalCta: {
    heading: 'Gather the memories before the celebration.',
    subheading:
      'Start a collection now — it’s free. Invite family and friends, and weave their memories into one toast when you’re ready.',
    ctaLabel: 'Start an Anniversary Collection →',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1600&q=80&auto=format&fit=crop',
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
