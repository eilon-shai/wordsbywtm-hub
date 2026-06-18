# What's Left Before Paid Launch — wordsbywtm.com

**As of:** 2026-06-18 · **State:** four occasions live on `main` (memorial, retirement,
wedding, anniversary); multi-occasion homepage shipped.
**Latest review:** `docs/EXPERT_PANEL_REVIEW_SES046.md` (Overall 8.15, GO-conditional;
flows/abuse/data-loss all PASS). Engineering launch-gate fixes in PR #25.

> Supersedes the old SES-043/044 single-occasion version of this file.

---

## Launch sequence (founder's plan)
1. **Merge open PRs** — #23 (env doc), #24 (SES-046 review), **#25** (launch-gate fixes + analytics + these docs).
2. **Stage E2E** — `docs/MANUAL_E2E_TEST_PLAN.md` §1A per-occasion matrix + §1B isolation on Preview (Paddle sandbox).
3. **Prod E2E** — one **real $49 purchase per occasion** on prod, then refund. Confirms live Paddle + emails + conversion fires.
4. **Launch campaign** — `docs/GOOGLE_ADS_CAMPAIGN.md`.
5. **Attorney (LC-03)** — trigger on first paid volume.

---

## 🔴 Launch blockers (founder-owned)

### 1. LC-03 — Legal pages (attorney)
- Send `docs/ATTORNEY_BRIEF_COLLECTION_LC03.md` to the attorney. **Include the interim edits made in PR #25**: the **ElevenLabs sub-processor** disclosure (Privacy §4 / Terms §8) and the **EU-CRD waiver** wording for pay-in-advance + deferred generation.
- Get back ratified ToS Collections clauses + Privacy additions (PII inventory, 30-day retention, erasure, Anthropic + ElevenLabs sub-processors) + Refund/EU-CRD wording.
- Then (eng, ~30 min): paste ratified text, bump `termsVersion` + effective date. Legal copy is attorney-content only.

### 2. MKT-002 — Analytics IDs (code is DONE in PR #25; just needs the ids)
Set in Vercel (Production, **plain text not Sensitive**), then redeploy:
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (`G-XXXX`)
- `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID` (`AW-XXXX`) + `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` (Microsoft Clarity)

GA4 + Clarity load and the `purchase`/Ads `conversion` fire automatically once set (no-op until then). See `docs/GOOGLE_ADS_CAMPAIGN.md`.

### 3. Production Paddle — live money path
- ☑ Founder reports all prod env vars in place. **Verify in prod E2E:** live prices for all four occasions, `PADDLE_ENVIRONMENT=production`, live `PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET` / `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `CRON_SECRET` set, `ENABLE_MOCK_PAYMENT` off, edit-pack price unset. (Matrix: `docs/PRODUCTION_ENV.md`.)

---

## 🟠 Engineering follow-up (post-merge)
- **EU withdrawal-waiver server-side persistence** — PR #25 fixes the copy and **transmits** the waiver flag at checkout, but actually recording it needs a **venture-core** `checkAndMarkTerms(waiverTimestamp/waiverVersion)` wire-up + re-pin. (Next venture-core bump.)

## 🟡 Deferred to post-launch (not blockers)
- **ARCH-04** — durable txn→collection resolution (Redis map today; resolver now throws instead of mis-resolving — PR #25).
- **MKT-005** — waitlist on coming-soon occasions (n/a today; all four live).
- **MKT-007** — abandoned-funnel recovery emails.
- **QA-7 / E4** — scheduled Tier-B Playwright E2E (multi-actor, DB writes) in CI.
- **Domains** — vocalvow/tributewords/milestonescribe → hub routing (redirect vs SEO landers).

## 🛠️ Maintenance gate (implemented PR #25)
- `UNDER_CONSTRUCTION=true` now serves a "coming soon" 503 on all **page** routes
  (APIs/webhooks/cron + static assets stay live). **Bypass** to run prod E2E while
  the public is gated: visit `https://www.wordsbywtm.com/?preview=<SUPPORT_PASSWORD>`
  once — it sets a 24h cookie and you browse normally. Unset the var to go live.

## ✅ Done (reference) — do NOT redo
- Multi-occasion migration: 4 occasions live via the registry; per-occasion configs/synthesis/intake; strict per-product webhook routing + unique-product-id guard; create-route `meta.live` gate.
- SES-046 launch-gate (PR #25): per-occasion copy, ElevenLabs disclosure (interim), advance-pay copy + waiver flag, resolver no-fallback, invite HTML escaping, audio newest-voice, favicon + generated OG images, noindex on token pages, isolation/config/audio tests (→90), manual E2E rebuilt as per-occasion matrix.
- Analytics (PR #25): GA4 + Clarity + purchase/Ads conversion, env-gated.
- Prior: tribute re-view, post-gen purge + crons, consent recording, webhook backstop, fail-closed mock/crons, price verification, keyed dedup, deadline auto-finalize, audio narration (Postgres), support console.

## Reference docs
`PRODUCTION_ENV.md` · `MANUAL_E2E_TEST_PLAN.md` · `GOOGLE_ADS_CAMPAIGN.md` · `EXPERT_PANEL_REVIEW_SES046.md` · `ATTORNEY_BRIEF_COLLECTION_LC03.md`
