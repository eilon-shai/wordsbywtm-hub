import { getPartner, partnerDiscountApplies } from '@/lib/partners';

// ---------------------------------------------------------------------------
// PartnerEndorsement — server-rendered banner on the occasion landing, shown
// ONLY when a `?ref` resolves to a KNOWN partner. Attacks the pre-form funnel
// leak (families bouncing before they start): the endorsement is the conversion
// lever, the discount is a pleasant confirmation days later at the paywall.
//
// Occasion-branched (PARTNER_DISCOUNT_DESIGN.md §UX):
//   - MEMORIAL: NO number, NO price — pure courtesy + care.
//   - CELEBRATORY (wedding/retirement/anniversary): warmer, a soft courtesy
//     mention allowed.
//
// House style: never "10% OFF"/SALE/urgency/scarcity/starbursts, no demographic
// language. Frame as courtesy / arranged / set up with care, attributed to the
// partner. NEVER rendered for non-referred or unknown-token traffic.
// ---------------------------------------------------------------------------

export function PartnerEndorsement({
  occasion,
  referrer,
}: {
  /** Occasion slug — drives the memorial vs celebratory branch. */
  occasion: string;
  /** The raw `?ref` value from the landing URL (may be absent/unknown). */
  referrer: string | null | undefined;
}) {
  const partner = getPartner(referrer);
  // Hard gate: only known, allowlisted partners get an endorsement. Unknown or
  // absent tokens render nothing — no banner ever leaks to organic traffic.
  if (!partner) return null;

  // Defensive fallback: getPartner already guarantees a displayName, but if a
  // future entry ever lacked one, suppress the name rather than show a raw token.
  const name = partner.displayName?.trim() || null;
  const isMemorial = occasion === 'memorial';
  // Whether the courtesy discount is actually live (Paddle discount configured).
  // The celebratory endorsement only *softly* mentions a courtesy when it's real.
  const courtesyLive = partnerDiscountApplies(referrer);

  return (
    <div
      role="note"
      className="mx-auto mb-2 max-w-2xl rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-center"
      data-testid="partner-endorsement"
    >
      {isMemorial ? (
        // MEMORIAL — no number, no price. Courtesy + care only.
        <p className="text-sm leading-relaxed text-foreground/90">
          {name ? (
            <>
              Shared with the care of <span className="font-semibold">{name}</span>. They set this up
              so your family can gather everyone&apos;s memories in one place — free to start.
            </>
          ) : (
            <>Set up with the care of your funeral home. Free to start, and free to gather.</>
          )}
        </p>
      ) : (
        // CELEBRATORY — warmer; a soft courtesy mention is allowed when it's live.
        <p className="text-sm leading-relaxed text-foreground/90">
          {name ? (
            <>
              <span className="font-semibold">{name}</span> set this up for you — a place to gather
              everyone&apos;s messages before the day. Free to start
              {courtesyLive ? ', and they’ve arranged a small courtesy toward your keepsake.' : '.'}
            </>
          ) : (
            <>
              Set up for you with care — a place to gather everyone&apos;s messages before the day.
              Free to start{courtesyLive ? ', with a small courtesy toward your keepsake.' : '.'}
            </>
          )}
        </p>
      )}
    </div>
  );
}
