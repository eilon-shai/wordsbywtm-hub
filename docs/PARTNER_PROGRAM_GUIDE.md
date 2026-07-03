# Partner Program Guide — wordsbywtm.com

**Owner:** Eilon (founder). **Written:** 2026-07-03 (SES-052).
**What this is:** the operating playbook for the funeral-home / hospice / celebrant partner channel — how partners work, how `?ref` attribution works, how to onboard a partner, and how to read the numbers.

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

Funeral directors, hospice bereavement coordinators, and celebrants meet grieving families at exactly the moment someone asks "how do we collect everyone's memories?" A partner hands the family a link (or a printed card). The family gathers memories free — no accounts, no app — and only pays $49 if they want the woven keepsake (tribute + printable PDF + audio). The partner's link carries their code, so every collection (and every sale) it produces is attributed to them. It costs the partner nothing and makes their aftercare offering better.

## 2. How `?ref` works (v1 mechanics)

**Link format:** `https://wordsbywtm.com/memorial?ref=<partner-slug>` — works on any occasion page, the homepage, and the `/guides` articles.

**Slug rules:** lowercase letters, digits, hyphens; 3–40 chars; must start/end with a letter or digit (regex `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`). Anything invalid is silently ignored — the link still works, attribution is just dropped.

**What happens under the hood:**
1. Visitor lands with `?ref=carmon-funeral` → the slug is stored in their browser (localStorage, 90-day expiry). A fresher visit's slug wins over a stale one.
2. Days later (same browser), they create a collection → the slug rides along on the create request and is written to the collection row (`referrer` column) in Neon.
3. From then on attribution lives **in the database, on the collection** — so it survives the multi-day funnel: the organizer can pay a week later from a magic-link email and the sale still counts for the partner.

**Known limits of v1 (be honest with yourself about these):**
- Attribution is **browser-bound at create time**: if the family member who clicked the card link is not the one who creates the collection (or creates it on a different device), the ref is lost. Fine at this scale; don't promise partners per-click perfection.
- **Not yet visible in Paddle.** The Paddle transaction does not carry `customData.ref` yet — that needs a small venture-core release (checkout handler injects it from the collection row). Until then, "who sent this customer" is answered by the summary endpoint below, not by the Paddle dashboard. Tracked as a follow-up on T-LAUNCH-015.

## 3. Reading the numbers

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://wordsbywtm.com/api/partners/summary
```

Returns, per partner slug: total collections created, generated count, **paid count** (this is the one that matters — cost-per-finalize thinking applies here too), and first/last created dates. Check it weekly alongside the funnel counters (`/api/metrics/summary`). `CRON_SECRET` is the same value used by the cron routes (in Vercel env).

## 4. Onboarding a partner (5 minutes each)

1. **Pick their slug.** Convention: org name, kebab-case, short — `carmon-funeral`, `sweetgrass-ceremonies`. There is no central registry in the app — ANY valid slug records — so the registry is **section 8 of this file**. Add a row the moment you issue a slug, or two partners may end up ambiguous.
2. **Send them their kit** (reply template is Touch-R below):
   - Their link: `https://wordsbywtm.com/memorial?ref=<slug>`
   - Their printable card page: `https://wordsbywtm.com/partners/card?code=<slug>` — tell them: open, hit Print, cut in half, keep a stack at the arrangement desk.
   - The program page for anything they want to double-check: `https://wordsbywtm.com/partners`
3. **Log it** in section 8.

**Reply template (Touch-R) — when a partner says yes:**

> Subject: your link
>
> Great. Here it is: https://wordsbywtm.com/memorial?ref=<slug>
>
> Printable cards for the arrangement desk: https://wordsbywtm.com/partners/card?code=<slug> (print, cut in half).
>
> Families gather memories free. If they want the keepsake at the end it's $49, and that's between them and us. Nothing for you to manage.
>
> Eilon

## 5. Outreach workflow (the founder-owned part)

- **Targets:** `docs/PARTNER_TARGETS.md` — canonical copy lives in **wordsbywtm-hub** (`docs/PARTNER_TARGETS.md`, added via PR #78); the venture-ops copy is the frozen original. Tiered; every email verified on the org's own site. Start with the "first 10 to contact" section — Tier A named contacts first, especially aftercare coordinators and celebrants.
- **Sequence:** `docs/PARTNER_OUTREACH_EMAILS.md` — 3 touches. Send from **hello@wordsbywtm.com** (the address the hub site uses everywhere — NOT hello@vocalvow.com, that's the other property). **10–15/day max**, personalize the first line from the Notes column (that's what it's for), plain text, no links in touch 1 beyond the site root if any.
- **Cadence:** touch 2 a week after touch 1; touch 3 a week after that; then stop — no exceptions, this audience punishes pushiness.
- **Replies:** any positive reply → Touch-R above + log the slug. A "tell me more" → point at `/partners` and offer a 10-minute call.
- **Bounces:** mark the row in PARTNER_TARGETS.md; the legacy mailboxes (aol/msn/hotmail rows) are flagged there as bounce-risks already.

## 6. Revenue share

The `/partners` page says a revenue share is *available on request* — deliberately uncommitted. If a partner asks: the old-product precedent was **$5 per referred sale** (DEC-P-009); at $49 with ~$44 kept, up to ~$10 is defensible for a channel with zero CAC. Decide per partner, confirm by email, and settle **manually and monthly**: pull paid counts per slug from the summary endpoint, pay via whatever they prefer. Do not build automation for this until a partner exceeds ~5 paid/month.

## 7. Tone rules (non-negotiable)

- Everything a partner hands to a family is grief-context: warm, plain, zero urgency, zero salesmanship. The card copy follows this; don't edit pressure into it.
- No demographic or identity-group language anywhere (portfolio hard rule #7).
- Never imply the family must buy anything. "Free to gather; the keepsake is there if they want it" is the entire pitch.

## 8. Partner registry (append a row per issued slug)

| Slug | Organization | Contact | Type | Issued | Rev-share | Notes |
|------|--------------|---------|------|--------|-----------|-------|
| _(none issued yet)_ | | | | | | |

## 9. Roadmap / follow-ups

- **Paddle `customData.ref`** — small venture-core minor: collection-checkout injects `ref` from the collection row into the Paddle transaction; then the Paddle dashboard answers "who sent this customer" directly. (T-LAUNCH-015 follow-up.)
- **Occasion expansion** — the same mechanics work for `?ref` on /wedding, /retirement, /anniversary; celebrant partners in particular serve weddings too. Nothing to build; just issue the links when relevant.
- **Partner dashboard** — only if the program proves out (≥10 active partners); until then the summary endpoint + this registry is the system.
