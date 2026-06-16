'use client';

// ---------------------------------------------------------------------------
// InviteScreen — post-create success state of /[occasion]/start.
// "You're set up — get the link out." Share-out only; no review, no finalize.
//
// Spec: COLLECTION_SCREENS_REDESIGN.md §3. Three zones, strict hierarchy:
//   Zone 1 — HERO: the free/unlimited link + Copy/Share (owned by InviteBlock).
//   Zone 2 — SECONDARY: "Prefer we email it for you?" (owned by InviteBlock).
//   Zone 3 — FOOTER: quiet manage-link reassurance ABOVE the promoted
//            "Go to your collection →" CTA, then the share-widely tip.
//
// The standalone "Share…" button, the "Send it however your people gather"
// block, and the inline DirectInvite all moved into InviteBlock — this file
// no longer owns any of them.
// ---------------------------------------------------------------------------

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@eilon-shai/venture-core/ui';
import { Button } from '@eilon-shai/venture-core/ui';
import { Separator } from '@eilon-shai/venture-core/ui';
import { InviteBlock } from './InviteBlock';
import { buildShareLink, buildInviteText } from '@/lib/invite';

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

export function InviteScreen({ occasion, shareUrl, adminUrl, honoreeName, deadline }: InviteScreenProps) {
  // Derive the share token from the public contributor URL, then rebuild the
  // canonical share link (occasion + viral-attribution UTM) via the shared
  // helper so it stays byte-identical to the dashboard surface.
  const shareLink = React.useMemo(() => {
    try {
      const u = new URL(shareUrl);
      const token = u.pathname.split('/c/')[1] ?? '';
      return buildShareLink(u.origin, token, occasion);
    } catch {
      // Fallback for relative/odd inputs — preserve old behavior.
      return withParam(withParam(shareUrl, 'occasion', occasion), 'src', 'invite');
    }
  }, [shareUrl, occasion]);

  const inviteText = buildInviteText(honoreeName, shareLink);

  const dashboardLink = withParam(adminUrl, 'occasion', occasion);

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
          Get started now — invite the people who knew {honoreeName}. The more voices, the richer the tribute.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {/* Zones 1 + 2 — shared share-out surface. */}
        <InviteBlock
          adminToken={adminToken}
          shareLink={shareLink}
          inviteText={inviteText}
          whatsappUrl={whatsappUrl}
          emailUrl={emailUrl}
          surface="create"
        />

        {deadline && (
          <p className="text-sm text-muted-foreground">
            Memories close <span className="font-medium text-foreground">{deadline}</span>.
          </p>
        )}

        <Separator />

        {/* ============================ ZONE 3 — FOOTER =========================== */}
        <div className="flex flex-col gap-3">
          {/* Quieter re-entry reassurance, placed ABOVE the terminal CTA. */}
          <p className="rounded-lg bg-accent/40 px-4 py-3 text-sm text-accent-foreground">
            We also emailed <span className="font-medium">you</span> a private manage link — that’s how you’ll come
            back to review the memories and finish.
          </p>

          <a href={dashboardLink} className="block">
            <Button type="button" size="lg" className="h-11 w-full text-base">
              Go to your collection →
            </Button>
          </a>

          <p className="text-center text-xs text-muted-foreground">
            Tributes read best with a few voices — share the link widely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
