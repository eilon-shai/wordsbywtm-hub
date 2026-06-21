'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { GA4_ID, ADS_TAG_ID, CLARITY_ID } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// ConsentBanner — Google Consent Mode v2 consent gate.
//
// Default consent is set to DENIED in SiteAnalytics (before gtag config). This
// banner lets the visitor accept or decline:
//   • Accept  → gtag('consent','update', {…granted}) + persist + load Clarity.
//   • Decline → stays denied (persist), Clarity never loads.
// The choice is stored in localStorage so the banner never reappears once set.
//
// Microsoft Clarity has no consent-mode, so it is loaded HERE (only once consent
// is granted), not in SiteAnalytics.
//
// Everything is env-gated: with no analytics ids configured there is nothing to
// consent to, so the banner does not render.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'wtm:consent';
const ANALYTICS_CONFIGURED = !!(GA4_ID || ADS_TAG_ID || CLARITY_ID);

type GtagFn = (...args: unknown[]) => void;
function gtag(): GtagFn | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { gtag?: GtagFn };
  return typeof w.gtag === 'function' ? w.gtag : null;
}

// Memorial is a sensitive-category (grief) context. Google's policies forbid
// building personalized remarketing / Customer Match audiences from sensitive-
// category traffic, so on memorial routes we never enable ad_personalization /
// ad_user_data — even after the visitor accepts. Conversion measurement still
// works (ad_storage + analytics_storage are granted); only the personalization
// signals stay denied. Note: this is path-based on /memorial (the ad-landing
// surface). Contributor share links (/c/[shareToken]) don't carry the occasion
// in the URL and aren't ad-driven, so they're out of scope here.
function isSensitivePath(pathname: string | null): boolean {
  return pathname === '/memorial' || (pathname?.startsWith('/memorial/') ?? false);
}

function grantConsent(pathname: string | null): void {
  const sensitive = isSensitivePath(pathname);
  gtag()?.('consent', 'update', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: sensitive ? 'denied' : 'granted',
    ad_personalization: sensitive ? 'denied' : 'granted',
  });
}

// Load Microsoft Clarity once (idempotent — guards on window.clarity). Only ever
// called after consent is granted.
function loadClarity(): void {
  if (!CLARITY_ID || typeof window === 'undefined') return;
  const w = window as unknown as { clarity?: unknown };
  if (w.clarity) return;
  (function (c: typeof window, l: Document, a: string, r: string, i: string) {
    const cc = c as unknown as Record<string, unknown>;
    cc[a] = cc[a] || function (...args: unknown[]) {
      ((cc[a] as { q?: unknown[] }).q = (cc[a] as { q?: unknown[] }).q || []).push(args);
    };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

export function ConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  // Runs on first load AND on every route change. A visitor who already accepted
  // gets their personalization signals re-evaluated as they move between the
  // memorial (sensitive) flow and the celebratory occasions — denied on memorial,
  // granted elsewhere — so a client-side navigation can't leak grief traffic into
  // a personalized remarketing audience.
  React.useEffect(() => {
    if (!ANALYTICS_CONFIGURED) return;
    let choice: string | null = null;
    try {
      choice = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable — show the banner (default denied stays in effect) */
    }
    if (choice === 'granted') {
      // Returning visitor who previously accepted: re-grant (path-aware) + load Clarity.
      grantConsent(pathname);
      loadClarity();
      setVisible(false);
      return;
    }
    if (choice === 'denied') {
      setVisible(false); // previously declined — stay denied, no banner
      return;
    }
    setVisible(true); // no stored choice — ask
  }, [pathname]);

  const persist = (value: 'granted' | 'denied') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* localStorage unavailable — choice just isn't remembered next visit */
    }
  };

  const onAccept = () => {
    persist('granted');
    grantConsent(pathname);
    loadClarity();
    setVisible(false);
  };

  const onDecline = () => {
    persist('denied');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-background/95 px-4 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use analytics cookies to understand how the site is used and to measure our ads. They load only if you
          accept. See our{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
