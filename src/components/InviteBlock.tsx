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

const MAX_EMAIL_ROWS = 3;

interface PersonRow {
  name: string;
  email: string;
  phone: string;
}

export function InviteBlock({
  adminToken,
  shareLink,
  inviteText,
  whatsappUrl,
  emailUrl,
  surface,
  organizerName,
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

  const heroHeadline =
    surface === 'create'
      ? 'Send this to anyone — it’s free, with no limit on who can add a memory.'
      : 'Still gathering? Share this with anyone — it’s free, with no limit on who can add a memory.';

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
        paid={paid}
        price={price}
        atCap={atCap}
      />
    </div>
  );
}

// Advance-pay: pay the one fee now to email up to 10 people a day (vs 3) and make
// finalizing free later. Same Paddle price as finalize — just paid up front.
function AdvancePayBlock({ adminToken, paid, price }: { adminToken: string; paid: boolean; price: string | null }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (paid) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
        <Badge variant="secondary">Paid</Badge>
        You can email up to <span className="font-medium">10 people a day</span>, and finalizing is free.
      </div>
    );
  }

  async function payAdvance() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/collection/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, intent: 'advance' }),
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
      paddle.Checkout.open({ transactionId: json.transactionId });
      setBusy(false);
    } catch {
      setError("Payment couldn't start — please try again. You haven't been charged.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void payAdvance()}>
        {busy ? 'Starting…' : `Pay your one-time fee now${price ? ` — ${price}` : ''}`}
      </Button>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Settle the single fee now and <span className="font-medium text-foreground">finalizing later is free</span> — plus
        we’ll email up to 10 people a day for you (instead of 3). Sharing your link is always free and unlimited.
      </p>
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

// "Prefer we email it for you? (optional)" — subordinate card. Honest copy
// (no "3 free" framing); the 3 rows are a starter convenience, not a cap.
function DirectEmailCard({
  adminToken,
  inviteText,
  organizerName,
  paid,
  price,
  atCap,
}: {
  adminToken: string;
  inviteText: string;
  organizerName?: string;
  paid: boolean;
  price: string | null;
  atCap: boolean;
}) {
  const [rows, setRows] = React.useState<PersonRow[]>(
    Array.from({ length: MAX_EMAIL_ROWS }, () => ({ name: '', email: '', phone: '' })),
  );
  // Reveal a phone field per-row only when the organizer wants WhatsApp.
  const [showPhone, setShowPhone] = React.useState<boolean[]>(
    Array.from({ length: MAX_EMAIL_ROWS }, () => false),
  );
  // Per-action in-flight state (FE-003): only the clicked button shows "Sending…".
  // `busy` is the row index being sent, 'all' for Send-all, or null when idle.
  const [busy, setBusy] = React.useState<number | 'all' | null>(null);
  const [result, setResult] = React.useState<{ sent: number; of: number; skipped: number; simulated: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const sending = busy !== null;

  function set(i: number, key: keyof PersonRow, v: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  function revealPhone(i: number) {
    setShowPhone((prev) => prev.map((s, idx) => (idx === i ? true : s)));
  }

  async function sendEmail(i: number) {
    const r = rows[i];
    const email = r.email.trim();
    if (!email) {
      setError('Add an email address for that person first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('That email doesn’t look right — please check it.');
      return;
    }
    setError(null);
    setResult(null);
    setBusy(i);
    try {
      const res = await fetch('/api/collection/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, organizerName, recipients: [{ name: r.name.trim(), email }] }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; skipped?: number; simulated?: boolean; error?: string };
      if (!res.ok) {
        setError(d.error ?? 'Could not send that invite. Please try again.');
        return;
      }
      setResult({ sent: d.sent ?? 0, of: 1, skipped: d.skipped ?? 0, simulated: !!d.simulated });
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    const filled = rows.filter((r) => r.email.trim()).map((r) => ({ name: r.name.trim(), email: r.email.trim() }));
    // #2 — de-duplicate the same address entered twice, and warn.
    const seen = new Set<string>();
    const recipients: { name: string; email: string }[] = [];
    let dupes = 0;
    for (const r of filled) {
      const key = r.email.toLowerCase();
      if (seen.has(key)) { dupes += 1; continue; }
      seen.add(key);
      recipients.push(r);
    }
    if (recipients.length === 0) {
      setError('Add at least one email address.');
      return;
    }
    setError(dupes > 0 ? `Removed ${dupes} duplicate ${dupes === 1 ? 'address' : 'addresses'}.` : null);
    setResult(null);
    setBusy('all');
    try {
      const res = await fetch('/api/collection/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, organizerName, recipients }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; skipped?: number; simulated?: boolean; error?: string };
      if (!res.ok) {
        setError(d.error ?? 'Could not send the invites. Please try again.');
        return;
      }
      setResult({ sent: d.sent ?? 0, of: recipients.length, skipped: d.skipped ?? 0, simulated: !!d.simulated });
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border bg-muted/30 p-4">
      <p className="text-sm font-medium text-foreground">Prefer we email it for you? (optional)</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        We’ll email up to {paid ? 10 : 3} people a day on your behalf (once each). Everyone else: just share your link above — no limit.
      </p>

      {/* Advance-pay: unlock 10/day + free finalize. */}
      <AdvancePayBlock adminToken={adminToken} paid={paid} price={price} />

      <p className="mt-2 text-xs font-medium text-muted-foreground">Email a few people directly</p>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r, i) => {
          const waDigits = r.phone.replace(/\D/g, '');
          const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(inviteText)}` : '';
          return (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Input
                  className="sm:flex-1"
                  placeholder="Name (optional)"
                  value={r.name}
                  onChange={(e) => set(i, 'name', e.target.value)}
                />
                <Input
                  type="email"
                  className="sm:flex-[1.3]"
                  placeholder="email@example.com"
                  value={r.email}
                  onChange={(e) => set(i, 'email', e.target.value)}
                />
                {showPhone[i] && (
                  <Input
                    type="tel"
                    className="sm:flex-1"
                    placeholder="WhatsApp #"
                    value={r.phone}
                    onChange={(e) => set(i, 'phone', e.target.value)}
                  />
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => void sendEmail(i)}
                  disabled={sending}
                >
                  {busy === i ? 'Sending…' : 'Send email'}
                </Button>
                {waUrl ? (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      WhatsApp
                    </Button>
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => revealPhone(i)}
                    title="opens a message you send yourself"
                  >
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-2 text-sm text-emerald-700">
          Sent {result.sent} of {result.of}
          {result.skipped > 0 ? ` — skipped ${result.skipped} already invited today` : ''}
          {result.simulated ? ' (preview — not actually emailed)' : ''}.
        </p>
      )}
      {sending && !result && (
        <p className="mt-2 text-sm text-muted-foreground">Sending {busy === 'all' ? 'invites' : 'invite'}…</p>
      )}

      <Button type="button" size="sm" className="mt-3" onClick={() => void sendAll()} disabled={sending}>
        {busy === 'all' ? 'Sending…' : 'Send all emails'}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        WhatsApp opens a message you send yourself.
      </p>

      {atCap && (
        <>
          <Separator className="my-3" />
          <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
            <Badge variant="outline" className="opacity-70">
              Coming soon
            </Badge>
            Need to email more?
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Sharing your link is always free and unlimited.
          </p>
        </>
      )}
    </Card>
  );
}
