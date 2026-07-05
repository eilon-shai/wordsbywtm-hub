# Partner Program Guide — wordsbywtm.com

**Owner:** Eilon (founder). **Written:** 2026-07-03 (SES-052). **Updated:** 2026-07-03 (SES-053) — model changed from commission to **discount-only** (10% courtesy), tokens are now **opaque**.
**What this is:** the operating playbook for the funeral-home / hospice / celebrant partner channel — how partners work, how `?ref` attribution works, how the 10% courtesy discount works, how to onboard a partner, and how to read the numbers.

> **Model (locked, SES-053):** there is **no commission and no revenue share.** A
> partner's referred families get a **10% courtesy discount** ($49 → $44),
> pre-applied automatically at checkout, framed as a kindness the partner
> arranged. The partner is paid nothing — so there are **zero payouts, no W-9/1099,
> no cross-border transfers**, and no back-office. This is deliberate: a per-sale
> kickback on grief is something most funeral directors and (especially non-profit)
> hospice staff can't ethically accept. The discount is a gift they *give*, not
> money they *manage*.

> ✅ **Go-live status — SHIPPED & LIVE:** the whole channel is in production. Ref
> capture + the `referrer` column + the report endpoint are merged to `main` and
> deployed; the `/partners` page + printable card are live. The additive Neon
> migration (`alter table collections add column if not exists referrer text;`)
> has already been run in prod — the `referrer` column exists, and `?ref` links
> record attribution today. Nothing on this list is outstanding.
>
> ⚠ **Standing reminder — no auto-migration:** the repo still has NO auto-migration
> on deploy. Any *future* schema change must be run manually in the **Neon SQL
> editor** before the code that depends on it ships, or the deployed code errors.

---

## 1. The program in one paragraph

Funeral directors, hospice bereavement coordinators, and celebrants meet grieving families at exactly the moment someone asks "how do we collect everyone's memories?" A partner hands the family a link (or a printed card). The family gathers memories free — no accounts, no app — and only pays if they want the woven keepsake (tribute + printable PDF + audio). Because the family arrived through the partner's link, they get a **10% courtesy** ($49 → $44), pre-applied at checkout and framed as something the partner arranged. It costs the partner nothing, pays them nothing to manage, and makes their aftercare offering a little kinder.

## 2. How `?ref` works (mechanics + the discount)

**Link format:** `https://wordsbywtm.com/memorial?ref=<token>` — works on any occasion page, the homepage, and the `/guides` articles.

**Tokens are OPAQUE (leak control).** A `?ref` link is a public URL, so a *readable* slug (`?ref=smith-funeral`) is effectively a public coupon the moment it's shared. So partner tokens are **opaque random strings** — e.g. `p-8f3a2`. A leaked link is meaningless without the display-name mapping (section 8), and the discount is capped/expirable in Paddle.

**Token shape (HARD):** lowercase letters, digits, hyphens; 3–40 chars; start/end alphanumeric (regex `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`). **Use a hyphen, never an underscore** — `p-8f3a2`, NOT `p_8f3a2`. An underscore fails the regex and is silently dropped at every boundary, so it would never record attribution or earn a discount. Anything invalid is ignored — the link still works, the ref is just dropped.

**The allowlist is the gate.** Only tokens present in the `PARTNERS` map (`src/lib/partners.ts`) get an endorsement banner or a discount. An unknown or absent token = organic traffic, full price, no banner. This is what keeps the discount from ever leaking to public traffic.

**What happens under the hood:**
1. Visitor lands with `?ref=p-8f3a2` → if that token is in `PARTNERS`, a server-rendered **endorsement banner** appears near the hero ("[Partner] set this up…"). The token is also stored in their browser (localStorage, 90-day expiry).
2. Days later (same browser), they create a collection → the token rides along on the create request and is written to the collection row (`referrer` column) in Neon.
3. At finalize (or advance-pay), venture-core's checkout handler calls the hub's `resolvePartnerDiscount(referrer)`. If the token is a known partner **and** `PARTNER_DISCOUNT_ID` is set in Vercel, it threads that single shared Paddle discount onto the transaction (**price ID unchanged** — tier, verification, webhooks all untouched). The organizer sees $49 → $44, pre-applied, no coupon field.

**Known limits (be honest):**
- Attribution is **browser-bound at create time**: if the family member who clicked the card isn't the one who creates the collection (or creates it on a different device), the ref is lost. Fine at this scale; don't promise per-click perfection.
- **The discount is off until `PARTNER_DISCOUNT_ID` is set.** With it unset, the whole feature is inert (safe default) — banners still don't show for unknown tokens, and referred collections just pay full price. Set it once the Paddle discount exists (section 5).

## 3. Reading the numbers

Attribution rides on `collections.referrer` and is echoed into Paddle `customData.ref` at checkout, so a referred sale is visible **both** in the hub metrics and in the Paddle dashboard.

- **Hub:** the **/support/metrics** console (Basic-Auth) is the primary read — per-token collections created / generated / **paid** (the count that matters). Check it weekly alongside the funnel counters.
- **Paddle:** each referred transaction carries `customData.ref = <token>`, so "who sent this customer" is answerable directly in the Paddle dashboard, and the applied discount shows on the transaction.

## 4. Onboarding a partner (5 minutes each)

1. **Generate an opaque token.** A short random hyphenated string, e.g. `p-` + 5–6 random lowercase-alphanumeric chars (`p-8f3a2`). Never encode the org name into the token — that's the whole point of opacity. (`openssl rand -hex 3` → `p-<hex>` works; keep it ≤ 40 chars, hyphen only.)
2. **Add it to the allowlist.** In `src/lib/partners.ts`, add a row to `PARTNERS`:
   ```ts
   export const PARTNERS: Record<string, Partner> = {
     'p-8f3a2': { displayName: 'Smith Funeral Home' },
   };
   ```
   The `displayName` is what grieving families see in the endorsement/courtesy copy — the raw token is never shown. Ship it in a PR; until it's deployed, the token records nothing.
3. **Log it** in the registry (section 8) — token, org, contact, type, issued date.
4. **Send them their kit** (reply template is Touch-R below):
   - Their link: `https://wordsbywtm.com/memorial?ref=<token>`
   - Their printable card page: `https://wordsbywtm.com/partners/card?code=<token>` — open, hit Print, cut in half, keep a stack at the arrangement desk.
   - The program page: `https://wordsbywtm.com/partners`

**Reply template (Touch-R) — when a partner says yes:**

> Subject: your link
>
> Great. Here it is: https://wordsbywtm.com/memorial?ref=<token>
>
> Printable cards for the arrangement desk: https://wordsbywtm.com/partners/card?code=<token> (print, cut in half).
>
> Families gather memories free. Because they came through you, they get 10% off the keepsake if they want it — already applied, nothing for them or you to enter. Nothing for you to manage, and nothing changes hands between us.
>
> Eilon

## 5. Outreach workflow (the founder-owned part)

- **Targets:** `docs/PARTNER_TARGETS.md` — canonical copy lives in **wordsbywtm-hub** (`docs/PARTNER_TARGETS.md`, added via PR #78); the venture-ops copy is the frozen original. Tiered; every email verified on the org's own site. Start with the "first 10 to contact" section — Tier A named contacts first, especially aftercare coordinators and celebrants.
- **Sequence:** `docs/PARTNER_OUTREACH_EMAILS.md` — 3 touches. Send from **hello@wordsbywtm.com** (the address the hub site uses everywhere — NOT hello@vocalvow.com, that's the other property). **10–15/day max**, personalize the first line from the Notes column (that's what it's for), plain text, no links in touch 1 beyond the site root if any.
- **Cadence:** touch 2 a week after touch 1; touch 3 a week after that; then stop — no exceptions, this audience punishes pushiness.
- **Replies:** any positive reply → Touch-R above + log the slug. A "tell me more" → point at `/partners` and offer a 10-minute call.
- **Bounces:** mark the row in PARTNER_TARGETS.md; the legacy mailboxes (aol/msn/hotmail rows) are flagged there as bounce-risks already.

## 6. The 10% courtesy discount

**There is no commission.** The perk is a **10% discount to the family** ($49 → $44), never money to the partner. Nothing to settle, no payouts, no 1099s.

**How families see it.** Two escalating surfaces, occasion-branched:
- **Endorsement banner** on the referred landing (server-rendered, above the CTA). Memorial: pure courtesy + care, **no number, no price**. Celebratory (wedding/retirement/anniversary): warmer, with a soft mention that a courtesy was arranged.
- **Courtesy line at the paywall**, days later, where the discount actually applies: *"The courtesy [Partner] arranged is already included — your one-time keepsake is $44 instead of $49."* Pre-applied, positive framing, **no coupon field**.

House style holds throughout: no "10% OFF"/SALE/starbursts/urgency/scarcity, no struck-through-anchor tricks, no demographic language. It's a kindness, not a promotion.

**Paddle setup (one-time, manual).** Create the discount in the Paddle dashboard, then set the env var:
1. Discounts → create a **percentage** discount, **amount = 10**.
2. **Restrict** it to the four occasion **finalize** price IDs (memorial/wedding/retirement/anniversary) so it can't be applied to anything else.
3. Add a **usage_limit** (redemption ceiling) and **expires_at** (time-box) for leak control — a leaked link stays bounded and revocable.
4. Copy the discount id (`dsc_...`) and set **`PARTNER_DISCOUNT_ID`** in Vercel (Production; server-side only, **not** `NEXT_PUBLIC_`). See `docs/PRODUCTION_ENV.md`.
5. One shared discount is fine. Use one-per-partner only if you later want per-partner caps or reporting.

**Two things must both be true for a family to actually get the discount:** (a) `PARTNER_DISCOUNT_ID` is set in Vercel, and (b) the partner's opaque token is in the `PARTNERS` allowlist. Either missing = full price.

## 7. Tone rules (non-negotiable)

- Everything a partner hands to a family is grief-context: warm, plain, zero urgency, zero salesmanship. The card copy follows this; don't edit pressure into it.
- No demographic or identity-group language anywhere (portfolio hard rule #7).
- Never imply the family must buy anything. "Free to gather; the keepsake is there if they want it, with a courtesy already applied" is the entire pitch.
- Memorial endorsement copy carries **no number** — courtesy and care only. The price only ever appears later, at the paywall.

## 8. Partner registry (append a row per issued token)

Tokens are opaque, so this table is the **only** place a token maps to an org. Add a row the moment you issue a token — and it must match the `PARTNERS` map in `src/lib/partners.ts` exactly.

| Token (opaque) | Organization | Contact | Type | Issued | Notes |
|----------------|--------------|---------|------|--------|-------|
| _(none issued yet)_ | | | | | |

## 9. Roadmap / follow-ups

- **Occasion expansion** — the same mechanics work for `?ref` on /wedding, /retirement, /anniversary; celebrant partners in particular serve weddings too. Nothing to build; just issue the tokens and restrict the Paddle discount to those price IDs too.
- **Per-partner reporting** — only if the program proves out: swap the single shared discount for one-per-partner Paddle discounts (each with its own `usage_limit`), and key `resolvePartnerDiscount` off the token → per-partner `dsc_` map. Until then, `customData.ref` + /support/metrics + this registry is the system.
- **Partner dashboard** — only at ≥10 active partners.
