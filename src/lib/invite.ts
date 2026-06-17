// ---------------------------------------------------------------------------
// invite.ts — pure, framework-free helpers for deriving the contributor share
// link and the paste-ready invite copy. Centralizes the derivation that
// InviteScreen and ManageDashboard previously each hand-rolled, so the share
// link, UTM params, and invite text stay byte-identical across both surfaces.
// ---------------------------------------------------------------------------

/** Append a query param to a URL, preserving any existing query string. */
function withParam(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * Build the public contributor share link from an origin + share token,
 * carrying the occasion and viral-attribution UTM (`src=invite`).
 *
 * @param origin   Absolute base, e.g. `https://wordsbywtm.com` or
 *                 `window.location.origin`. Trailing slash is tolerated.
 * @param shareToken  The collection's public share token.
 * @param occasion    Occasion slug, e.g. `memorial`.
 */
export function buildShareLink(origin: string, shareToken: string, occasion: string): string {
  const base = `${origin.replace(/\/$/, '')}/c/${shareToken}`;
  return withParam(withParam(base, 'occasion', occasion), 'src', 'invite');
}

/**
 * The paste-ready invite message. Same copy used everywhere we surface a
 * shareable text (hero text links, WhatsApp/Email composers, direct emails).
 */
export function buildInviteText(honoreeName: string, shareLink: string): string {
  return `I'm putting together a tribute for ${honoreeName} — add a memory here, takes 2 minutes: ${shareLink}`;
}
