import Script from 'next/script';
import { GA4_ID, ADS_TAG_ID, CLARITY_ID } from '@/lib/analytics';

// Injects GA4 + Google Ads (gtag.js) and Microsoft Clarity. Each is gated on its
// env id, so a missing id means that script simply doesn't load — no errors, no
// requests. Rendered once from the root layout. `afterInteractive` keeps these
// off the critical path.
export function SiteAnalytics() {
  return (
    <>
      {GA4_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');${ADS_TAG_ID ? `gtag('config','${ADS_TAG_ID}');` : ''}`}
          </Script>
        </>
      ) : null}

      {!GA4_ID && ADS_TAG_ID ? (
        // Ads tag without GA4 — still load gtag.js so conversions can fire.
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_TAG_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ADS_TAG_ID}');`}
          </Script>
        </>
      ) : null}

      {CLARITY_ID ? (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      ) : null}
    </>
  );
}
