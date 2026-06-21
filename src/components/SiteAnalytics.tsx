import Script from 'next/script';
import { GA4_ID, ADS_TAG_ID } from '@/lib/analytics';

// Injects GA4 + Google Ads (gtag.js) with Google Consent Mode v2. Microsoft
// Clarity has no consent-mode, so it is NOT loaded here — the ConsentBanner loads
// it only after the visitor grants consent. Each gtag id is env-gated, so a
// missing id means that script simply doesn't load — no errors, no requests.
//
// Consent Mode v2: BEFORE any gtag('config', …) we set default consent to DENIED
// for ad_storage, analytics_storage, ad_user_data, ad_personalization (with
// wait_for_update). The ConsentBanner flips these to granted on Accept. Until
// then, gtag runs in consentless/cookieless mode (no cookies, pings only).
const CONSENT_DEFAULT = `gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`;

export function SiteAnalytics() {
  return (
    <>
      {GA4_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}${CONSENT_DEFAULT}gtag('js',new Date());gtag('config','${GA4_ID}');${ADS_TAG_ID ? `gtag('config','${ADS_TAG_ID}');` : ''}`}
          </Script>
        </>
      ) : null}

      {!GA4_ID && ADS_TAG_ID ? (
        // Ads tag without GA4 — still load gtag.js so conversions can fire.
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_TAG_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}${CONSENT_DEFAULT}gtag('js',new Date());gtag('config','${ADS_TAG_ID}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
