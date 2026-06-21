// ---------------------------------------------------------------------------
// Pure Google Consent Mode v2 helpers — no React, no DOM — so the MF-1
// sensitive-route rule is unit-testable in the node test env. ConsentBanner
// imports these and only owns the React/gtag plumbing.
// ---------------------------------------------------------------------------

export type ConsentValue = 'granted' | 'denied';

export interface ConsentState {
  ad_storage: ConsentValue;
  analytics_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
}

// Memorial is a sensitive-category (grief) context. Google's policies forbid
// building personalized remarketing / Customer Match audiences from sensitive-
// category traffic, so on memorial routes we never enable ad_personalization /
// ad_user_data — even after the visitor accepts. Conversion measurement still
// works (ad_storage + analytics_storage are granted); only the personalization
// signals stay denied. Note: this is path-based on /memorial (the ad-landing
// surface). Contributor share links (/c/[shareToken]) don't carry the occasion
// in the URL and aren't ad-driven, so they're out of scope here.
export function isSensitivePath(pathname: string | null | undefined): boolean {
  return pathname === '/memorial' || (pathname?.startsWith('/memorial/') ?? false);
}

/**
 * The consent payload to send on Accept (or on re-grant for a returning visitor),
 * given the current route. On sensitive (memorial) routes the personalization
 * signals stay denied even though the visitor accepted.
 */
export function grantedConsentState(pathname: string | null | undefined): ConsentState {
  const sensitive = isSensitivePath(pathname);
  return {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: sensitive ? 'denied' : 'granted',
    ad_personalization: sensitive ? 'denied' : 'granted',
  };
}
