// ---------------------------------------------------------------------------
// Guide registry — metadata for the /guides SEO content section.
//
// One entry per guide article. Consumed by:
//   - src/app/guides/page.tsx        (index cards)
//   - src/app/guides/<slug>/page.tsx (metadata + Article JSON-LD)
//   - src/app/sitemap.ts             (crawlable URLs)
//
// All pages are static marketing content — no dynamic APIs, no tokens.
// ---------------------------------------------------------------------------

export const GUIDES_HOST = 'https://wordsbywtm.com';

export interface GuideMeta {
  slug: string;
  /** On-page H1. */
  title: string;
  /** <title> — keep ≤60 chars. */
  metaTitle: string;
  /** Meta description — keep ≤155 chars. */
  metaDescription: string;
  /** Display label for the occasion chip on the index + article header. */
  occasionLabel: string;
  /** Occasion landing the guide's CTAs route to. */
  ctaHref: string;
  /** Short blurb for the index card. */
  blurb: string;
  /** ISO date for JSON-LD datePublished. */
  datePublished: string;
  readMinutes: number;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'collect-memories-memorial',
    title: 'How to collect memories for a memorial service — a step-by-step guide',
    metaTitle: 'How to Collect Memories for a Memorial Service',
    metaDescription:
      'A step-by-step guide to gathering memories for a memorial — who to ask, how to ask, prompts that help, and how to weave everything into one tribute.',
    occasionLabel: 'Memorial',
    ctaHref: '/memorial',
    blurb:
      'Who to ask, how to ask, what to prompt people for, and how to bring every memory together into one tribute — at a pace that respects the moment.',
    datePublished: '2026-07-02',
    readMinutes: 9,
  },
  {
    slug: 'kudoboard-alternative-memorial',
    title: 'Kudoboard alternatives for memorials — an honest comparison',
    metaTitle: 'Kudoboard Alternatives for Memorials — Compared',
    metaDescription:
      'Kudoboard Memorial vs Words That Matter, honestly compared: pricing, what each produces, privacy, and which fits the tribute you need.',
    occasionLabel: 'Memorial',
    ctaHref: '/memorial',
    blurb:
      'A fair look at Kudoboard’s memorial boards — what they do well, what they cost, and when a woven written tribute is the better fit.',
    datePublished: '2026-07-02',
    readMinutes: 8,
  },
  {
    slug: 'retirement-tribute-stories',
    title: 'Retirement tribute: how to gather stories from the whole team',
    metaTitle: 'Retirement Tribute: Gather Stories From the Team',
    metaDescription:
      'How to collect goodbye messages and real stories from coworkers for a retirement send-off — prompts, timelines, and weaving them into one speech.',
    occasionLabel: 'Retirement',
    ctaHref: '/retirement',
    blurb:
      'Get past “happy retirement!” — prompts that pull real stories out of busy coworkers, and a timeline that gets it done before the party.',
    datePublished: '2026-07-02',
    readMinutes: 8,
  },
  {
    slug: 'collect-wedding-wishes',
    title: 'How to collect wedding wishes and memories from guests',
    metaTitle: 'How to Collect Wedding Wishes From Guests',
    metaDescription:
      'Collect wedding wishes and memories from guests before the big day — who to ask, prompts that work, and how to turn it all into one toast or keepsake.',
    occasionLabel: 'Wedding',
    ctaHref: '/wedding',
    blurb:
      'Guest books get skimmed once. Here’s how to gather wishes and stories before the wedding and turn them into something the couple keeps.',
    datePublished: '2026-07-02',
    readMinutes: 8,
  },
  {
    slug: 'anniversary-memory-collection',
    title: 'Anniversary surprise: collecting memories from family and friends',
    metaTitle: 'Anniversary Surprise: Collecting Memories',
    metaDescription:
      'Plan an anniversary surprise built from memories — how to quietly gather stories from family and friends and weave them into one toast or tribute.',
    occasionLabel: 'Anniversary',
    ctaHref: '/anniversary',
    blurb:
      'The logistics of a memory-based surprise: who to loop in, how to keep it quiet, and how to shape decades of stories into one piece.',
    datePublished: '2026-07-02',
    readMinutes: 8,
  },
];

export const getGuide = (slug: string): GuideMeta | undefined =>
  GUIDES.find((g) => g.slug === slug);
