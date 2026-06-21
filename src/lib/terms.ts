// Single source of truth for the legal terms version. Every occasion config's
// `termsVersion` AND the client-sent waiver acknowledgement reference this, so a
// future bump (e.g. after LC-03 attorney ratification) updates everywhere at once.
//
// Why it matters: venture-core's collection-checkout-handler only RECORDS the
// EU/UK withdrawal-waiver when the client-sent termsVersion === config.termsVersion.
// If these ever drift, the waiver would silently stop being recorded. Keeping one
// constant prevents that.
export const TERMS_VERSION = '2026-06-17';

// Canonical EU/UK withdrawal-waiver sentence shown at BOTH pay surfaces (the
// pay-at-finalize checkbox in ResultFlow and the pay-in-advance checkbox in
// InviteBlock). Generation begins when the organizer finalizes in both flows, so
// the same acknowledgement applies; keeping one string avoids the two surfaces
// drifting to subtly different (and potentially inaccurate) wordings.
export const WITHDRAWAL_WAIVER_SENTENCE =
  'Creating the finished piece is a digital service I’m asking to begin when I finalize, and I understand that once it’s created I lose my EU/UK 14-day right to withdraw.';
