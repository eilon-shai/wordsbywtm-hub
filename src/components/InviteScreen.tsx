'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@eilon-shai/venture-core/ui';
import { Button } from '@eilon-shai/venture-core/ui';
import { Separator } from '@eilon-shai/venture-core/ui';

interface InviteScreenProps {
  occasion: string;
  /** Public contributor link: /c/{shareToken} */
  shareUrl: string;
  /** Private organizer dashboard link: /collect/manage?t={adminToken} */
  adminUrl: string;
  honoreeName: string;
  deadline: string | null;
}

/** Append a query param to a URL, preserving any existing query string. */
function withParam(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

function CopyButton({ value, label, size = 'lg' }: { value: string; label: string; size?: 'sm' | 'lg' }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for environments without clipboard API.
      const ta = document.createElement('textarea');
      ta.value = value;
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

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={size === 'lg' ? 'h-11 shrink-0' : 'shrink-0'}
      onClick={copy}
    >
      {copied ? 'Copied ✓' : label}
    </Button>
  );
}

interface Row {
  name: string;
  email: string;
  phone: string;
}

/** Up to 3 people: we email the invite on the organizer's behalf; WhatsApp opens
 *  a pre-filled per-person chat (Meta doesn't allow auto-send without the paid API). */
function DirectInvite({ adminToken, inviteText }: { adminToken: string; inviteText: string }) {
  const MAX = 3;
  const [rows, setRows] = React.useState<Row[]>([
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
  ]);
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function set(i: number, key: keyof Row, v: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function sendEmails() {
    const recipients = rows
      .filter((r) => r.email.trim())
      .map((r) => ({ name: r.name.trim(), email: r.email.trim() }))
      .slice(0, MAX);
    if (recipients.length === 0) {
      setError('Add at least one email address.');
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/collection/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, recipients }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? 'Could not send the invites. Please try again.');
        return;
      }
      setResult(
        `Sent ${d.sent} ${d.sent === 1 ? 'invite' : 'invites'}${d.simulated ? ' (preview — not actually emailed)' : ''}.`,
      );
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <p className="text-sm font-medium text-foreground">Invite people directly</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add up to {MAX} people — we’ll email the invite for you. Add a phone number to open a ready-to-send
        WhatsApp message instead.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r, i) => {
          const waDigits = r.phone.replace(/\D/g, '');
          const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(inviteText)}` : '';
          return (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.3fr_1fr_auto] sm:items-center">
              <input
                className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                placeholder="Name (optional)"
                value={r.name}
                onChange={(e) => set(i, 'name', e.target.value)}
              />
              <input
                type="email"
                className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                placeholder="email@example.com"
                value={r.email}
                onChange={(e) => set(i, 'email', e.target.value)}
              />
              <input
                type="tel"
                className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                placeholder="WhatsApp # (optional)"
                value={r.phone}
                onChange={(e) => set(i, 'phone', e.target.value)}
              />
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
                    WhatsApp
                  </Button>
                </a>
              ) : (
                <span className="hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {result && <p className="mt-2 text-sm text-emerald-700">{result}</p>}

      <Button type="button" size="sm" className="mt-3" onClick={sendEmails} disabled={sending}>
        {sending ? 'Sending…' : 'Send email invites'}
      </Button>
    </div>
  );
}

export function InviteScreen({ occasion, shareUrl, adminUrl, honoreeName, deadline }: InviteScreenProps) {
  // Share link carries occasion + viral-attribution UTM (§7 m5).
  const shareLink = withParam(withParam(shareUrl, 'occasion', occasion), 'src', 'invite');
  const dashboardLink = withParam(adminUrl, 'occasion', occasion);

  const inviteText = `I'm putting together a tribute for ${honoreeName} — add a memory here, takes 2 minutes: ${shareLink}`;
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  async function nativeShare() {
    try {
      await navigator.share({
        title: `A tribute for ${honoreeName}`,
        text: inviteText,
      });
    } catch {
      /* user cancelled or unsupported — ignore */
    }
  }

  const adminToken = React.useMemo(() => {
    try {
      return new URL(adminUrl).searchParams.get('t') ?? '';
    } catch {
      return '';
    }
  }, [adminUrl]);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Add a memory for ${honoreeName}`,
  )}&body=${encodeURIComponent(inviteText)}`;

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Your collection is ready</CardTitle>
        <CardDescription>
          Now invite the people who knew {honoreeName}. The more voices, the richer the tribute.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Share link + copy */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Your invite link</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1 truncate rounded-lg border border-input bg-muted/40 px-3 py-2.5 font-mono text-sm">
              {shareLink}
            </div>
            <CopyButton value={shareLink} label="Copy link" />
          </div>
          {canNativeShare && (
            <Button type="button" variant="ghost" size="lg" className="mt-2 h-10 w-full" onClick={nativeShare}>
              Share…
            </Button>
          )}
        </div>

        {/* Paste-ready invite templates */}
        <div>
          <p className="mb-2 text-sm font-medium">Send it however your people gather</p>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
            {inviteText}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                WhatsApp
              </Button>
            </a>
            <a href={emailUrl}>
              <Button type="button" variant="outline" size="sm">
                Email
              </Button>
            </a>
          </div>
        </div>

        {/* Direct invites — we email up to 3 people on your behalf */}
        <DirectInvite adminToken={adminToken} inviteText={inviteText} />

        {deadline && (
          <p className="text-sm text-muted-foreground">
            Memories close <span className="font-medium text-foreground">{deadline}</span>.
          </p>
        )}

        <Separator />

        {/* Re-entry reassurance + dashboard CTA */}
        <div className="rounded-lg border border-border bg-accent/40 px-4 py-3 text-sm text-accent-foreground">
          We also emailed <span className="font-medium">you</span> a private manage link — that’s how you’ll come back
          to review the memories and finish.
        </div>

        <a href={dashboardLink} className="block">
          <Button type="button" size="lg" className="h-11 w-full text-base">
            Go to your collection →
          </Button>
        </a>

        <p className="text-center text-xs text-muted-foreground">
          Tip: invite at least 3 people so the tribute holds more than one voice.
        </p>
      </CardContent>
    </Card>
  );
}
