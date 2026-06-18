// Single source of truth for the legal terms version. Every occasion config's
// `termsVersion` AND the client-sent waiver acknowledgement reference this, so a
// future bump (e.g. after LC-03 attorney ratification) updates everywhere at once.
//
// Why it matters: venture-core's collection-checkout-handler only RECORDS the
// EU/UK withdrawal-waiver when the client-sent termsVersion === config.termsVersion.
// If these ever drift, the waiver would silently stop being recorded. Keeping one
// constant prevents that.
export const TERMS_VERSION = '2026-06-17';
