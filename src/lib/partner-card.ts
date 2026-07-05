// ---------------------------------------------------------------------------
// Partner hand-to-family card copy, keyed by occasion.
//
// The printable card at /partners/card is handed to a family (memorial) or to
// whoever's organizing the toast/send-off (celebratory occasions). It lands in
// very different emotional registers, so each occasion gets its own hand-authored
// copy — the grief-context reassurance line is wrong at a wedding, the
// celebratory framing is wrong at a memorial. Unknown occasions fall back to
// memorial (the original, always-safe card).
//
// This module is pure (no DB, no React) so the occasion-resolution + copy
// selection are unit-testable without a database.
// ---------------------------------------------------------------------------

export interface CardCopy {
  /** Occasion slug this copy is for. */
  occasion: string;
  /** Human title for the on-screen operator note ("set up for {title} collections"). */
  title: string;
  /** Card headline — the promise, one line. */
  headline: string;
  /** Step 2 wording (step 1 is shared; step 3 names the deliverable). */
  step2: string;
  /** Step 3 wording — names the woven deliverable + where it's used. */
  step3: string;
  /** Closing reassurance line — tone-matched to the occasion. */
  reassurance: string;
}

/** Shared first step across every occasion. */
export const CARD_STEP1 = 'Open the link below and start a collection. It’s free.';

const MEMORIAL: CardCopy = {
  occasion: 'memorial',
  title: 'Memorial',
  headline: 'Gather everyone’s memories of your loved one — in one place, free',
  step2: 'Share your link — everyone adds a memory. No accounts needed.',
  step3: 'Keep the memories, or have them woven into one written tribute.',
  reassurance: 'Take your time. The memories will be there when you’re ready.',
};

// Keyed by occasion slug. Add a sibling entry when an occasion goes live.
export const CARD_COPY: Record<string, CardCopy> = {
  memorial: MEMORIAL,
  wedding: {
    occasion: 'wedding',
    title: 'Wedding',
    headline: 'Gather everyone’s stories and well-wishes for the couple — in one place, free',
    step2: 'Share your link — everyone adds a story or a well-wish. No accounts needed.',
    step3: 'Keep them, or have them woven into one toast for the reception.',
    reassurance: 'Everyone who loves them, in one place.',
  },
  retirement: {
    occasion: 'retirement',
    title: 'Retirement',
    headline: 'Gather stories from colleagues, friends, and family — in one place, free',
    step2: 'Share your link — everyone adds a story or a memory. No accounts needed.',
    step3: 'Keep them, or have them woven into one send-off speech.',
    reassurance: 'A whole career’s worth of people, in one place.',
  },
  anniversary: {
    occasion: 'anniversary',
    title: 'Anniversary',
    headline: 'Gather memories from family and friends for the couple — in one place, free',
    step2: 'Share your link — everyone adds a memory or a wish. No accounts needed.',
    step3: 'Keep them, or have them woven into one toast for the celebration.',
    reassurance: 'Everyone who’s been part of their story, in one place.',
  },
};

/**
 * The occasion a partner's card should be set up for: their first scoped
 * occasion that we have card copy for, else 'memorial'. Mirrors the admin's
 * referral-link occasion choice (occasions[0] ?? 'memorial') but additionally
 * requires the occasion to be one we can render a card for, so the card, the
 * baked link, and the create-time gate all agree on the same occasion. An empty
 * scope (unrestricted partner) or an unknown/absent code resolves to memorial.
 */
export function pickCardOccasion(occasions: string[] | null | undefined): string {
  const first = occasions?.[0];
  return first && first in CARD_COPY ? first : 'memorial';
}

/** Card copy for an occasion, falling back to the memorial card. */
export function cardCopyFor(occasion: string | null | undefined): CardCopy {
  return (occasion && CARD_COPY[occasion]) || MEMORIAL;
}
