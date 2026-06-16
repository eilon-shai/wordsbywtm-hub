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

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(inviteText)}`;
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
            <a href={smsUrl}>
              <Button type="button" variant="outline" size="sm">
                Text message
              </Button>
            </a>
            <a href={emailUrl}>
              <Button type="button" variant="outline" size="sm">
                Email
              </Button>
            </a>
            <CopyButton value={inviteText} label="Copy message" size="sm" />
          </div>
        </div>

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
