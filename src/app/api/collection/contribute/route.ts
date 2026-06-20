import { NextRequest, NextResponse, after } from 'next/server';
import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { createSubmitContributionHandler } from '@eilon-shai/venture-core/api';
import { getDbClient, getCollectionByShareToken, verifyInviteEmail } from '@eilon-shai/venture-core/db';
import { getResendClient, sendEmail } from '@eilon-shai/venture-core/email';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

function appBase(domain: string): string {
  return domain.startsWith('http') ? domain.replace(/\/$/, '') : `https://${domain}`;
}

// Escape untrusted values before interpolating into email HTML. contributorName
// (and honoreeName) are attacker-controllable via the public share link, so an
// unescaped value could inject markup/phishing into a trust-sensitive email that
// also carries the admin-token manage URL.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Notify the organizer that a (non-organizer) contributor added a memory, so they
// know to come back and review. Best-effort: never blocks or fails the
// contribution. Runs after the response via after().
async function notifyOrganizer(
  config: ProductConfig,
  shareToken: string,
  contributorName: string,
): Promise<void> {
  const db = getDbClient();
  if (!db) return;
  const collection = await getCollectionByShareToken(db, shareToken).catch(() => null);
  if (!collection) return;

  const resend = getResendClient();
  if (!resend || process.env.DISABLE_EMAIL === 'true') return;

  const manageUrl = `${appBase(config.brand.domain)}/collect/manage?t=${collection.adminToken}`;
  const who = contributorName.trim() || 'Someone';
  const accent = config.email.brandColor;
  try {
    await sendEmail(resend, {
      from: config.email.fromEmail,
      to: collection.organizerEmail,
      subject: `A new memory was added for ${collection.honoreeName}`,
      html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a2118;line-height:1.6;">
        <p><strong>${esc(who)}</strong> just added a memory to your collection for <strong>${esc(collection.honoreeName)}</strong>.</p>
        <p style="margin:24px 0;"><a href="${manageUrl}" style="background:${accent};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;">Review the memories</a></p>
        <p style="font-size:13px;color:#8c7c68;">When you're ready, you can review everything and create the tribute from your collection.</p>
      </div>`,
      text: `${who} added a memory to your collection for ${collection.honoreeName}. Review: ${manageUrl}`,
    });
  } catch (err) {
    console.warn('[contribute] organizer notify failed:', err instanceof Error ? err.message : err);
  }
}

// POST /api/collection/contribute — handler 2. Public; share-token scoped.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'shareToken', 'share');
  if (resolved instanceof NextResponse) return resolved;

  // Peek at the body (clone) BEFORE the handler consumes it, so we can notify the
  // organizer after a successful, non-organizer contribution.
  let peek: {
    shareToken?: unknown;
    contributorName?: unknown;
    contributorEmail?: unknown;
    inviteToken?: unknown;
    isOrganizer?: unknown;
  } = {};
  try {
    peek = await request.clone().json();
  } catch {
    /* unparseable — the handler will reject it; no notify */
  }

  // The organizer's email is reserved for the organizer's own (dashboard) memory —
  // it must never be used to add a memory through the public share link. Block any
  // non-organizer contribution whose effective email is the organizer's. The
  // effective email is the inviteToken-derived one when present (tamper-proof),
  // else the typed contributorEmail. We compare server-side and never expose the
  // organizer's address to the client.
  if (peek.isOrganizer !== true && typeof peek.shareToken === 'string' && peek.shareToken) {
    let email =
      typeof peek.contributorEmail === 'string' ? peek.contributorEmail.trim().toLowerCase() : '';
    if (typeof peek.inviteToken === 'string' && peek.inviteToken) {
      const verified = verifyInviteEmail(peek.inviteToken);
      if (verified) email = verified.trim().toLowerCase();
    }
    if (email) {
      const db = getDbClient();
      const collection = db ? await getCollectionByShareToken(db, peek.shareToken).catch(() => null) : null;
      if (collection && email === collection.organizerEmail.trim().toLowerCase()) {
        return NextResponse.json(
          {
            error:
              'That’s the organizer’s email. If you’re the organizer, add your memory from your collection dashboard — otherwise please use your own email.',
            code: 'INVALID_EMAIL',
            retryable: false,
          },
          { status: 400 },
        );
      }
    }
  }

  const res = await createSubmitContributionHandler(resolved)(request);

  if (
    res.ok &&
    peek.isOrganizer !== true &&
    typeof peek.shareToken === 'string' &&
    peek.shareToken
  ) {
    const shareToken = peek.shareToken;
    const contributorName = typeof peek.contributorName === 'string' ? peek.contributorName : '';
    try {
      after(() => notifyOrganizer(resolved, shareToken, contributorName));
    } catch {
      /* not in a request scope (e.g. unit tests) — skip the deferred notify */
    }
  }

  return res;
}
