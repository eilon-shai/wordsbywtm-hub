// ---------------------------------------------------------------------------
// PartnerEndorsement — server-rendered banner on the occasion landing, shown
// ONLY when a `?ref` resolves to a KNOWN, ACTIVE partner. Attacks the pre-form
// funnel leak (families bouncing before they start): the endorsement is the
// conversion lever, the discount is a pleasant confirmation days later at the
// paywall.
//
// PURE presentational component — the partner is resolved from the Postgres
// allowlist by the landing page (async getPartner) and passed in as props, so
// this file stays free of DB access and is trivially render-testable.
//
// Occasion-branched (PARTNER_DISCOUNT_DESIGN.md §UX):
//   - MEMORIAL: NO number, NO price — pure courtesy + care.
//   - CELEBRATORY (wedding/retirement/anniversary): warmer, a soft courtesy
//     mention allowed (only when the discount is live).
//
// House style: never "10% OFF"/SALE/urgency/scarcity/starbursts, no demographic
// language. Frame as courtesy / arranged / set up with care, attributed to the
// partner. NEVER rendered for non-referred or unknown-token traffic.
// ---------------------------------------------------------------------------

export function PartnerEndorsement({
  occasion,
  partnerName,
  courtesyLive = false,
}: {
  /** Occasion slug — drives the memorial vs celebratory branch. */
  occasion: string;
  /** Resolved partner display name, or null/undefined for organic/unknown/
   *  inactive traffic. When absent, the banner renders NOTHING. */
  partnerName: string | null | undefined;
  /** Whether the courtesy discount is actually live (Paddle discount configured).
   *  The celebratory endorsement only *softly* mentions a courtesy when true. */
  courtesyLive?: boolean;
}) {
  // Hard gate: only a resolved (known, active) partner gets an endorsement.
  // Absent → render nothing; no banner ever leaks to organic traffic.
  const name = partnerName?.trim() || null;
  if (!name) return null;

  const isMemorial = occasion === 'memorial';

  return (
    <div
      role="note"
      className="mx-auto mb-2 max-w-2xl rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-center"
      data-testid="partner-endorsement"
    >
      {isMemorial ? (
        // MEMORIAL — no number, no price. Courtesy + care only.
        <p className="text-sm leading-relaxed text-foreground/90">
          Shared with the care of <span className="font-semibold">{name}</span>. They set this up
          so your family can gather everyone&apos;s memories in one place — free to start.
        </p>
      ) : (
        // CELEBRATORY — warmer; a soft courtesy mention is allowed when it's live.
        <p className="text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold">{name}</span> set this up for you — a place to gather
          everyone&apos;s messages before the day. Free to start
          {courtesyLive ? ', and they’ve arranged a small courtesy toward your keepsake.' : '.'}
        </p>
      )}
    </div>
  );
}
