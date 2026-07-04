'use client';

// ---------------------------------------------------------------------------
// InviteBlock — the shared share-out surface used on BOTH the post-create
// invite screen (surface="create", now only a fallback) and the manage
// dashboard (surface="dashboard").
//
// SES-056 dashboard redesign: one calm invite card.
//   • Hero row: primary Copy + native Share + WhatsApp/Email text links. The
//     raw ~90-char URL is hidden behind a "Show link" toggle → a one-line
//     truncated pill (clipboard/share carry the full URL; manual pasters still
//     get it). No more 3-line-wrapping monospace box.
//   • Tier-3 expander "Need more than N people?" → the advance-pay upsell,
//     reframed capacity-first, its consent checkbox + waiver INSIDE the expander
//     directly above an OUTLINE pay button. Auto-opens only when the link is
//     full. Hidden entirely once paid (the header shows a "Paid" chip instead).
//   • Tier-3 expander "Prefer we send the invite for you?" → the direct-email
//     helper.
//
// All new props are optional so the InviteScreen fallback (surface="create")
// keeps working unchanged.
// ---------------------------------------------------------------------------

import * as React from 'react';
import { Button, Input } from '@eilon-shai/venture-core/ui';
import { initSharedPaddle, getSharedPaddle, setActiveTransaction } from '@eilon-shai/venture-core/components';
import { TERMS_VERSION, WITHDRAWAL_WAIVER_SENTENCE } from '@/lib/terms';
import { trackBeginCheckout } from '@/lib/analytics';
import { releaseCheckoutLock } from '@/lib/release-checkout-lock';

// Where Paddle returns after an ADVANCE payment. A clean path (no query) so the
// shared callback's `${path}?txnId=...` redirect stays well-formed; that page
// records the payment and bounces back to the dashboard.
const ADVANCE_RETURN_PATH = '/collect/paid';

export interface InviteBlockProps {
  /** Private admin token — authorizes server-sent email invites. */
  adminToken: string;
  /** Fully-derived public share link (already carries ?occasion=&src=invite). */
  shareLink: string;
  /** Paste-ready invite message (buildInviteText). */
  inviteText: string;
  /** wa.me share URL (generic, no recipient) for the hero text link. */
  whatsappUrl: string;
  /** mailto: composer URL for the hero text link. */
  emailUrl: string;
  /** Varies only the surrounding framing copy. */
  surface: 'create' | 'dashboard';
  /** Organizer's display name — personalizes the invite email ("{name} is…"). */
  organizerName?: string;
  /** Honoree name — used in the invite-email preview + WhatsApp text. */
  honoreeName?: string;
  /** Organizer's email — prefilled (read-only) into the advance-pay checkout. */
  organizerEmail?: string;
  /** True once the one payment has been made (in advance). Hides the pay CTA. */
  paid?: boolean;
  /** Price label for the advance-pay CTA (e.g. "$49"). */
  price?: string | null;
  /** Occasion slug — stashed before advance checkout so the return page can fire the purchase conversion. */
  occasion?: string;
  /** Numeric price (for the GA4/Ads purchase value on the advance-pay return). */
  priceValue?: number;
  /** What the finished piece is called for this occasion ("tribute" | "toast" | …). */
  deliverableNoun?: string;
  /**
   * When the collection has hit the real 12-person email backstop, render the
   * single disabled "coming soon" pack line. Defaults to false; the dashboard
   * may compute and pass this later. The hero link itself is always free and
   * unlimited regardless.
   */
  atCap?: boolean;
  /** Free-link cap for the current state (3 free / 10 paid). Defaults to paid?10:3. */
  linkCap?: number;
  /** The share link is at capacity (unpaid) — auto-open the advance-pay expander. */
  linkFull?: boolean;
  /** Copy-link button variant. `default` when the invite is the state's hero,
   *  `outline` when the invite is demoted (e.g. the finalize card is the hero). */
  copyVariant?: 'default' | 'outline';
  /** Compact hero — drop the descriptive line when the invite is demoted. */
  compact?: boolean;
}

export function InviteBlock({
  adminToken,
  shareLink,
  inviteText,
  whatsappUrl,
  emailUrl,
  organizerName,
  honoreeName,
  organizerEmail,
  paid = false,
  price = null,
  occasion,
  priceValue,
  atCap = false,
  deliverableNoun,
  linkCap,
  linkFull = false,
  copyVariant = 'default',
  compact = false,
}: InviteBlockProps) {
  const noun = (deliverableNoun ?? '').trim() || 'tribute';
  const cap = linkCap ?? (paid ? 10 : 3);
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const [showLink, setShowLink] = React.useState(false);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* nothing more to do */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({ text: inviteText });
    } catch {
      /* cancelled / unsupported — ignore */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------- HERO ROW --------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={copyVariant}
            size="lg"
            className="h-11"
            onClick={copyLink}
          >
            {copied ? 'Copied ✓' : 'Copy invite link'}
          </Button>
          {canNativeShare && (
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={nativeShare}>
              Share
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            or{' '}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:opacity-80">
              WhatsApp
            </a>{' '}
            ·{' '}
            <a href={emailUrl} className="font-medium text-primary hover:opacity-80">
              Email
            </a>
          </span>
        </div>

        {!compact ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Anyone with this link can add a memory — up to {cap} people.
          </p>
        ) : null}

        {/* Show-link toggle → one-line truncated pill. The full URL rides in the
            clipboard/native-share and in this pill's text (truncated visually,
            complete in the DOM) for manual pasters. */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowLink((v) => !v)}
            aria-expanded={showLink}
            className="self-start text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {showLink ? 'Hide link' : 'Show link'}
          </button>
          {showLink ? (
            <div className="min-w-0 flex-1 truncate rounded-full border border-input bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground" title={shareLink}>
              {shareLink}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------- TIER-3: advance-pay capacity expander ------------------- */}
      {/* Hidden once paid — the header carries the "Paid" chip. */}
      {!paid ? (
        <AdvancePayExpander
          adminToken={adminToken}
          organizerEmail={organizerEmail}
          price={price}
          occasion={occasion}
          priceValue={priceValue}
          cap={cap}
          defaultOpen={linkFull}
        />
      ) : null}

      {/* ------------- TIER-3: direct-email expander -------------------------- */}
      <DirectEmailExpander
        adminToken={adminToken}
        inviteText={inviteText}
        organizerName={organizerName}
        honoreeName={honoreeName}
        paid={paid}
        atCap={atCap}
        deliverableNoun={noun}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advance-pay, collapsed into a Tier-3 <details> expander. Reframed capacity-
// first ("make room for more people"), consent + waiver INSIDE the expander
// immediately above an OUTLINE pay button. The charge trigger never leaves the
// expander; payAdvance still validates consent before the checkout POST.
// ---------------------------------------------------------------------------
function AdvancePayExpander({
  adminToken,
  organizerEmail,
  price,
  occasion,
  priceValue,
  cap,
  defaultOpen,
}: {
  adminToken: string;
  organizerEmail?: string;
  price: string | null;
  occasion?: string;
  priceValue?: number;
  cap: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);
  const priceLabel = price ?? '$49';

  async function payAdvance() {
    if (!termsAccepted) {
      setTermsError(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/collection/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Transmit the EU/UK withdrawal-waiver acknowledgement so it can be
        // recorded server-side (with the checkout txn) rather than living only in
        // client state. NOTE: venture-core's checkout handler must thread this into
        // checkAndMarkTerms(waiverTimestamp/waiverVersion) to fully persist it —
        // tracked as a venture-core follow-up; the flag is sent here so the wiring
        // is ready the moment that lands.
        body: JSON.stringify({ adminToken, intent: 'advance', termsWaiver: true, termsVersion: TERMS_VERSION }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        transactionId?: string;
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.transactionId) {
        setError(json.error ?? "Payment couldn't start — please try again. You haven't been charged.");
        setBusy(false);
        return;
      }

      // Stash the purchase context so /collect/paid can fire the GA4/Ads
      // purchase conversion (that path returns to the dashboard, no result-page
      // PurchaseTracker).
      try {
        if (occasion) sessionStorage.setItem('wtm:advance-occasion', occasion);
        if (typeof priceValue === 'number') sessionStorage.setItem('wtm:advance-value', String(priceValue));
      } catch {
        /* sessionStorage unavailable — purchase event just won't fire */
      }

      // Mid-funnel: advance checkout is starting.
      trackBeginCheckout({ value: priceValue ?? 0, occasion: occasion ?? '' });

      // Mock mode: no overlay — record payment directly, then refresh.
      if (json.transactionId.startsWith('mock_')) {
        await fetch('/api/collection/mark-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: json.transactionId }),
        });
        window.location.reload();
        return;
      }

      try {
        sessionStorage.setItem('wtm:advance-admin', adminToken);
      } catch {
        /* sessionStorage may be unavailable — return page still records payment */
      }
      await initSharedPaddle(ADVANCE_RETURN_PATH);
      setActiveTransaction(json.transactionId, 'basic', ADVANCE_RETURN_PATH, () =>
        releaseCheckoutLock(adminToken),
      );
      const paddle = await getSharedPaddle();
      paddle.Checkout.open({
        transactionId: json.transactionId,
        ...(organizerEmail
          ? { customer: { email: organizerEmail }, settings: { allowLogout: false } }
          : {}),
      });
      setBusy(false);
    } catch {
      setError("Payment couldn't start — please try again. You haven't been charged.");
      setBusy(false);
    }
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-lg border border-border bg-background"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground">
        <span>Need more than {cap} people? Open your collection to 10 — same {priceLabel}, paid early</span>
        <span aria-hidden className="text-muted-foreground">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-border p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Make room for more voices — your share link opens from{' '}
          <span className="font-medium text-foreground">{cap} to 10</span> people. No one person holds the whole story,
          so this makes room to gather it. It’s the same one-time {priceLabel} whether you pay now or at the end.
        </p>

        {/* Consent + waiver — immediately above the pay button, only where the
            pay CTA exists. payAdvance validates it before the checkout POST. */}
        <label
          className={`flex max-w-full cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs text-muted-foreground transition-colors ${
            termsError ? 'border-destructive bg-destructive/5' : 'border-border'
          }`}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setTermsError(false);
            }}
            disabled={busy}
            aria-invalid={termsError}
            aria-describedby={termsError ? 'advance-terms-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span>
            I agree to the{' '}
            <a href="/terms" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            . My one-time fee is charged now. {WITHDRAWAL_WAIVER_SENTENCE}
          </span>
        </label>
        {termsError ? (
          <p id="advance-terms-error" role="alert" aria-live="polite" className="text-xs text-destructive">
            Please agree to the terms to continue.
          </p>
        ) : null}

        <Button type="button" variant="outline" size="default" className="w-full sm:w-auto" disabled={busy} onClick={() => void payAdvance()}>
          {busy ? 'Starting…' : `Pay now and open to 10 people${price ? ` — ${price}` : ''}`}
        </Button>
        <p className="text-xs text-muted-foreground">Same price either way — paying now just adds room.</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// "Prefer we send the invite for you?" — collapsed into a Tier-3 <details>.
// Backend caps: 1/day per recipient, 12/day per collection.
// ---------------------------------------------------------------------------
function DirectEmailExpander({
  adminToken,
  inviteText,
  organizerName,
  honoreeName,
  paid,
  deliverableNoun,
}: {
  adminToken: string;
  inviteText: string;
  organizerName?: string;
  honoreeName?: string;
  paid: boolean;
  atCap?: boolean;
  deliverableNoun?: string;
}) {
  const noun = (deliverableNoun ?? '').trim() || 'tribute';
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [showPhone, setShowPhone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const who = (honoreeName ?? 'them').trim() || 'them';
  const from = (organizerName ?? '').trim();
  const waDigits = phone.replace(/\D/g, '');
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(inviteText)}` : '';

  async function sendOne() {
    const addr = email.trim();
    if (!addr) {
      setNotice({ kind: 'err', text: 'Add an email address first.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) {
      setNotice({ kind: 'err', text: 'That email doesn’t look right — please check it.' });
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch('/api/collection/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, organizerName, recipients: [{ name: name.trim(), email: addr }] }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; skipped?: number; simulated?: boolean; error?: string };
      if (!res.ok) {
        setNotice({ kind: 'err', text: d.error ?? 'Could not send that invite. Please try again.' });
        return;
      }
      if ((d.sent ?? 0) > 0) {
        setNotice({ kind: 'ok', text: d.simulated ? `Preview — not actually emailed (${addr}).` : `Invite sent to ${addr}.` });
        setName('');
        setEmail('');
        setPhone('');
        setShowPhone(false);
      } else {
        setNotice({ kind: 'err', text: 'Already invited that address today — try again tomorrow.' });
      }
    } catch {
      setNotice({ kind: 'err', text: 'Network error — please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-lg border border-border bg-background">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground">
        <span>Prefer we send the invite for you?</span>
        <span aria-hidden className="text-muted-foreground">⌄</span>
      </summary>
      <div className="border-t border-border p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your link can be used by up to <span className="font-medium text-foreground">{paid ? 10 : 3} people</span>. Email or
          WhatsApp the invite one person at a time.
        </p>

        <p className="mt-4 text-xs font-medium text-muted-foreground">Invite someone</p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Input
              className="sm:flex-1"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              className="sm:flex-[1.3]"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {showPhone && (
              <Input
                type="tel"
                className="sm:flex-1"
                placeholder="WhatsApp #"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => void sendOne()} disabled={busy}>
              {busy ? 'Sending…' : 'Send email'}
            </Button>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                <Button type="button" variant="outline" size="sm" className="w-full">
                  Open WhatsApp
                </Button>
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setShowPhone(true)}
                title="opens a message you send yourself"
              >
                WhatsApp
              </Button>
            )}
          </div>
        </div>

        {notice && (
          <p className={`mt-2 text-sm ${notice.kind === 'ok' ? 'text-emerald-700' : 'text-destructive'}`} role={notice.kind === 'err' ? 'alert' : undefined}>
            {notice.text}
          </p>
        )}

        <p className="mt-2 text-xs text-muted-foreground">WhatsApp opens a message you send yourself.</p>

        {/* Preview of the email we send on the organizer's behalf. */}
        <details className="mt-3 rounded-lg border border-border bg-muted/20">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
            Preview the email
          </summary>
          <div className="border-t border-border px-4 py-4 text-sm leading-relaxed text-foreground/90">
            <p className="text-xs text-muted-foreground">Subject: Add a memory for {who}</p>
            <hr className="my-3 border-border" />
            <p>Hi,</p>
            <p className="mt-2">
              {from ? <><strong>{from}</strong> is</> : <>Family and friends are</>} putting together a {noun} for{' '}
              <strong>{who}</strong>, woven from memories shared by the people who knew them — and you’re invited to add yours.
            </p>
            <p className="mt-2">It takes about two minutes. No account, nothing to pay.</p>
            <p className="mt-3">
              {/* Outline chip so it can't read as the page CTA. */}
              <span className="inline-block rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">
                Add a memory of {who}
              </span>
            </p>
          </div>
        </details>
      </div>
    </details>
  );
}
