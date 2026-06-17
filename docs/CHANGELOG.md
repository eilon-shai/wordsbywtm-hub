# wordsbywtm-hub — Collection App Changelog

A running, plain-English record of everything built in the collaborative-collection
app (organizer → invite contributors → review → pay once → AI synthesizes one
tribute). Newest at top. Design specs live in `venture-ops/docs/COLLECTION_*`.

---

## Architecture (current)

- **One Next.js app, many occasions.** A registry (`src/lib/registry.ts`) defines
  occasions (`memorial` live; `wedding`, `retirement` stubs). Dynamic routes under
  `src/app/[occasion]/…`. Each occasion has its own `ProductConfig` + `paddleProductId`,
  which isolates its collections.
- **Identity = capability tokens, no login.** `share_token` → public contributor link
  `/c/{token}`; `admin_token` → private manage link `/collect/manage?t={token}`. We
  never show the admin token on screen; re-entry is by emailing the magic link.
- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind v4, `@eilon-shai/venture-core`
  (pinned exact). Neon Postgres (collections + contributions; PII AES-256-GCM encrypted,
  AAD = contribution id). Upstash Redis (locks, rate limits, txn→collection map).
  Paddle (Merchant of Record, one-time). Anthropic Claude (synthesis). Resend (email).
- **Pay-before-generate is absolute** — Claude is never called until payment is proven
  server-side.

## Data model (Neon `collections`)

Core: `id, product, organizer_email, honoree_name, occasion, tier, status (open|closed|
generated), share_token, admin_token, price_shown, created_at, deadline, purge_after,
synthesis_prefs (jsonb)`.
Added for deadline/pay-in-advance: `paid_at, paid_txn_id, reminder_sent_at,
deadline_extended_count`. `contributions` holds the encrypted payload (`contributorName,
relationship, memory, isOrganizer`) + `status (pending|approved|removed)`.

> Migrations are additive (`alter table … add column if not exists`). The founder runs
> them on Neon when a new column ships.

---

## Changes by area

### Deadline auto-finalize + pay-in-advance *(venture-core PR #281; app wiring pending publish)*
- **One payment, two entry points.** Pay in advance from the invite panel ("unlock up
  to 10 friends") → marks the collection paid (no generation), raises the invite cap
  3→10, and turns the finalize button into **"Finalize"** (no second charge). Or pay at
  the end ("Pay & finalize").
- **Daily deadline cron.** 3 days before the deadline: unpaid → "deleted in 3 days";
  paid → "we'll generate with what we have". At the deadline: unpaid → **delete +
  'deleted' email**; paid + ≥1 memory → **auto-generate + email the tribute**; paid +
  empty → email + **extend** (capped). Auto-generation only runs for paid collections.
- Copy on the deadline field + ToS will state this behavior. *(app wiring is the next
  phase, after venture-core 1.13.0 publishes and the app re-pins.)*

### Result / tribute page
- Redesigned the finished-tribute screen: serif "printed page" styling, **Download as
  Word** (`.doc`), Copy text, and a **feedback widget that eases in after ~6s**
  (`/api/[occasion]/feedback` via venture-core `createFeedbackHandler`).
- Tone/length/avoid/context are chosen on the result page *after* payment, then merged
  into synthesis (not at create time).

### Organizer's own memory
- Pinned to the top of the dashboard, always included, **not** toggled; has an **Edit**
  button. Edit opens the memory with read-only name + relationship context above the
  editable text.
- "Add your own memory" prompt on the dashboard shows **only** until the organizer has
  added theirs (hidden once it exists).
- **Write-later path**: dashboard "Write a memory" link carries `?as=organizer&t={adminToken}`;
  the `/c` page validates the token matches the collection before trusting organizer
  mode, then flags the memory `isOrganizer` and shows "Back to your collection".

### Create form
- Single merged form, email fields **first** so the early dedup check (`check-existing`)
  runs before the whole form is filled.
- Confirm-email uses `autoComplete="new-password"` (Chrome ignores `off`); first email
  uses `autoComplete="email"`.
- **Deadline**: default +2 weeks, min today, **max +1 month**, now **clamped on manual
  typing** (native `max` only guards the picker).
- **"I'll write my own memory later"** no longer validates the memory fields — it only
  requires what's needed to create the collection, then moves to the dashboard.
- Consent error-ring hugs only the checkbox + text; finalize scrolls to the unchecked
  terms instead of being greyed out.

### Invites
- Free share link is unlimited. Emailed invites: up to **3/day** per collection (10 when
  paid), once per recipient/day, client + server dedup, personalized with the organizer's
  name (never "Someone").
- Resend manage-link limited to once per hour per email+occasion.

### Contributor thank-you
- Regular contributors: simple thank-you, **no "Share another memory"**, soft cross-sell
  kept. Organizer (write-later): "Back to your collection", no cross-sell.

### Landing / marketing
- Hub `?focus=<occasion-or-alias>` (e.g. `?focus=memories`) puts one occasion in focus:
  ordered first, ringed with a "What you're after" badge, and scrolled into view. Lets a
  single Google Ads campaign split keywords by topic (one ad group per occasion) and land
  each visitor on the right product. Aliases: memories/funeral/eulogy/tribute→memorial,
  vows/marriage→wedding, retire/career/farewell→retirement.

### Bug fixes
- **delete → "you already have a collection"**: was leftover open test rows from before
  create-time dedup existed; the create handler dedups correctly now, stale rows cleared.

---

## API routes (app)

`/api/[occasion]/collection/create`, `/api/[occasion]/feedback`,
`/api/collection/{contribute,check-existing,resend-link,invite,moderate,edit,delete,
generate}`. Pending (deadline feature): `/api/cron/collection-deadlines`,
`/api/collection/{mark-paid,finalize-paid}`.
