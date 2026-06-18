'use client';

// ---------------------------------------------------------------------------
// InviteBlock — the single shared share-out surface used on BOTH the
// post-create invite screen (surface="create") and the manage dashboard
// (surface="dashboard"). The two surfaces differ only in surrounding copy so
// they read as one tool used at two moments, not two duplicate widgets.
//
// Spec: COLLECTION_SCREENS_REDESIGN.md §3 + §6.
//
//   Zone 1 — HERO: big copyable free/unlimited link + primary Copy, optional
//            native Share beside it, tiny "or via WhatsApp · Email" text links.
//   Zone 2 — SECONDARY card: "Prefer we email it for you? (optional)". Per-person
//            Name·Email rows with [Send email] + [WhatsApp] actions beside them.
//            Honest aggregate result ("Sent N of M"), no fake per-row marks.
//            Disabled "coming soon" line shown ONLY at the real 12-person cap.
// ---------------------------------------------------------------------------

import * as React from 'react';
import { Button, Card, Input, Separator, Badge } from '@eilon-shai/venture-core/ui';
import { initSharedPaddle, getSharedPaddle, setActiveTransaction } from '@eilon-shai/venture-core/components';

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
  /**
   * When the collection has hit the real 12-person email backstop, render the
   * single disabled "coming soon" pack line. Defaults to false; the dashboard
   * may compute and pass this later. The hero link itself is always free and
   * unlimited regardless.
   */
  atCap?: boolean;
}

export function InviteBlock({
  adminToken,
  shareLink,
  inviteText,
  whatsappUrl,
  emailUrl,
  surface,
  organizerName,
  honoreeName,
  organizerEmail,
  paid = false,
  price = null,
  atCap = false,
}: InviteBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

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

  const cap = paid ? 10 : 3;
  const heroHeadline = paid
    ? `Share this link — up to ${cap} people can add a memory.`
    : `Share this link — up to ${cap} people can add a memory. Need more? Unlock up to 10 below.`;

  return (
    <div className="flex flex-col gap-8">
      {/* ============================= ZONE 1 — HERO ============================= */}
      <div className="flex flex-col gap-3">
        <label className="block text-sm font-medium text-foreground">Your invite link</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1 truncate rounded-lg border border-input bg-muted/40 px-3 py-2.5 font-mono text-sm">
            {shareLink}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="lg" className="h-11 flex-1 sm:flex-none" onClick={copyLink}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </Button>
            {canNativeShare && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 flex-1 sm:flex-none"
                onClick={nativeShare}
              >
                Share
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{heroHeadline}</p>
        <p className="text-xs text-muted-foreground">
          or send via{' '}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:opacity-80"
          >
            WhatsApp
          </a>{' '}
          ·{' '}
          <a href={emailUrl} className="font-medium text-primary hover:opacity-80">
            Email
          </a>
        </p>
      </div>

      {/* ====================== ZONE 2 — SECONDARY EMAIL CARD ==================== */}
      <DirectEmailCard
        adminToken={adminToken}
        inviteText={inviteText}
        organizerName={organizerName}
        honoreeName={honoreeName}
        organizerEmail={organizerEmail}
        paid={paid}
        price={price}
        atCap={atCap}
      />
    </div>
  );
}

// Advance-pay: pay the one fee now to email up to 10 people a day (vs 3) and make
// finalizing free later. Same Paddle price as finalize — just paid up front.
function AdvancePayBlock({ adminToken, organizerEmail, paid, price }: { adminToken: string; organizerEmail?: string; paid: boolean; price: string | null }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);

  if (paid) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
        <Badge variant="secondary">Paid</Badge>
        Up to <span className="font-medium">10 people</span> can add a memory with your link, and finalizing is free.
      </div>
    );
  }

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
        body: JSON.stringify({ adminToken, intent: 'advance', termsWaiver: true, termsVersion: '2026-06-17' }),
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

      // Real mode: stash the admin token so the return page can bounce back to
      // this dashboard, then open the Paddle overlay.
      try {
        sessionStorage.setItem('wtm:advance-admin', adminToken);
      } catch {
        /* sessionStorage may be unavailable — return page still records payment */
      }
      await initSharedPaddle(ADVANCE_RETURN_PATH);
      setActiveTransaction(json.transactionId, 'basic', ADVANCE_RETURN_PATH);
      const paddle = await getSharedPaddle();
      // Prefill + lock the organizer's email so the payer can't change it.
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
    <div className="mt-3">
      <label
        className={`mb-2 flex w-fit max-w-full items-start gap-2 rounded-lg p-2 cursor-pointer text-xs text-muted-foreground ${
          termsError ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background' : ''
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
          className="mt-0.5 h-4 w-4 rounded border-border"
          aria-label="Agree to terms and start delivery"
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
          . My one-time fee is charged now; creating the finished piece is a digital service I ask to begin when I finalize, and I understand my EU/UK 14-day right to withdraw is lost once it’s created.
        </span>
      </label>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void payAdvance()}>
        {busy ? 'Starting…' : `Pay your one-time fee now${price ? ` — ${price}` : ''}`}
      </Button>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Settle the single fee now and <span className="font-medium text-foreground">finalizing later is free</span> — and your
        link opens up from <span className="font-medium text-foreground">3 to 10 people</span> who can add a memory. It’s the
        same one-time fee either way — and it covers the finished piece, a keepsake PDF, and a spoken version when you’re
        ready to create it.
      </p>
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

// "Prefer we send the invite for you? (optional)" — subordinate card. One send
// row (email or WhatsApp), a preview of the email, and the daily limits. The
// backend enforces 1/day per recipient + 12/day per collection.
function DirectEmailCard({
  adminToken,
  inviteText,
  organizerName,
  honoreeName,
  organizerEmail,
  paid,
  price,
}: {
  adminToken: string;
  inviteText: string;
  organizerName?: string;
  honoreeName?: string;
  organizerEmail?: string;
  paid: boolean;
  price: string | null;
  atCap?: boolean;
}) {
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
    <Card className="border bg-muted/30 p-4">
      <p className="text-sm font-medium text-foreground">Prefer we send the invite for you? (optional)</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        Your link can be used by up to <span className="font-medium text-foreground">{paid ? 10 : 3} people</span>. Email or
        WhatsApp the invite one person at a time — up to <span className="font-medium text-foreground">12 a day</span>, once per
        email address.
      </p>

      {/* Advance-pay: unlock 10/day + free finalize. */}
      <AdvancePayBlock adminToken={adminToken} organizerEmail={organizerEmail} paid={paid} price={price} />

      <p className="mt-3 text-xs font-medium text-muted-foreground">Invite someone</p>

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
          <Button type="button" size="sm" className="flex-1 sm:flex-none" onClick={() => void sendOne()} disabled={busy}>
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
      <details className="mt-3 rounded-lg border border-border bg-background">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
          Preview the email
        </summary>
        <div className="border-t border-border px-4 py-4 text-sm leading-relaxed text-foreground/90">
          <p className="text-xs text-muted-foreground">Subject: Add a memory for {who}</p>
          <hr className="my-3 border-border" />
          <p>Hi,</p>
          <p className="mt-2">
            {from ? <><strong>{from}</strong> is</> : <>Family and friends are</>} putting together a tribute for{' '}
            <strong>{who}</strong>, woven from memories shared by the people who knew them — and you’re invited to add yours.
          </p>
          <p className="mt-2">It takes about two minutes. No account, nothing to pay.</p>
          <p className="mt-3">
            <span className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Add a memory of {who}
            </span>
          </p>
        </div>
      </details>
    </Card>
  );
}
