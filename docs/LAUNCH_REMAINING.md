# Collection App — What's Left Before Paid Launch

**As of:** 2026-06-17 · **Branch:** `feat/collection-app` · **venture-core pinned:** `1.15.4`
**Status:** Engineering 100% complete (all SES-043 + SES-044 review findings resolved & shipped). Launch is gated **only** on founder-owned items below.

Reviews: `docs/EXPERT_PANEL_REVIEW_SES043.md` (baseline 7.58) → `docs/EXPERT_PANEL_REVIEW_SES044.md` (8.47, mandatory-8 met). Attorney brief: `docs/ATTORNEY_BRIEF_COLLECTION_LC03.md`.

---

## 🔴 Launch blockers (founder-owned)

### 1. LC-03 — Legal pages (attorney)
- **Action:** send `docs/ATTORNEY_BRIEF_COLLECTION_LC03.md` to the attorney.
- **Get back:** ratified ToS "Collections" clauses (auto-generate / auto-delete / auto-extend authorization + disclaimer), Privacy additions (contributor email + PII inventory, encryption, **retention period — we proposed 30 days**, erasure, IP/abuse purpose, Anthropic sub-processor), Refund/EU-CRD wording for pay-in-advance + deferred generation.
- **Then (engineering, ~30 min):** update rendered pages (`src/app/terms`, `privacy`, `refund` — or wherever they render; legal pages are attorney-content only, we paste their text) and **bump `termsVersion` + effective date** (consent records store the version, so the bump matters). Hard rule: do not author legal copy ourselves.

### 2. MKT-002 — Conversion analytics
- **Need from founder:** a **GA4 property → Measurement ID** (`G-XXXXXXX`) and a **Google Ads conversion action → conversion label**; optionally a **PostHog** project key.
- **Then (engineering):** scaffold the analytics layer — provider script in `src/app/layout.tsx`, a `track(event, props)` helper, UTM + `?focus` capture stashed on first landing, funnel events (landing → start → created → invite → finalize → **purchase** → generated), and a GA4 `purchase` conversion on payment success (+ optional server-side confirm from the Paddle webhook). Reads IDs from `NEXT_PUBLIC_GA4_MEASUREMENT_ID` etc. Can be scaffolded BEFORE keys exist (activates on env paste).

### 3. Prod-env confirmation (Vercel, wordsbywtm-hub project)
- `CRON_SECRET` set (Production) — required or the deadline + purge crons refuse to run (fail-closed).
- `ENABLE_MOCK_PAYMENT` **off/unset** in Production.
- Edit-pack price id (`NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK`) **unset** (regen not built).
- `REDIS_FORM_ENCRYPTION_KEY` + `PADDLE_WEBHOOK_SECRET` present; Neon `DATABASE_URL`, Upstash, `ANTHROPIC_API_KEY`, Paddle vars present.
- `CONTRIBUTION_HASH_SECRET` (optional — falls back to `REDIS_FORM_ENCRYPTION_KEY`; `hashEmail` throws in prod if neither set).

---

## 🟡 Deferred to post-launch (not blockers; in review docs)
- **ARCH-04** — durable txn→collection resolution (currently Redis map + customData). **Hard gate before a 2nd occasion (wedding/retirement) goes live**, alongside confirming the deadline cron loops all live configs (done) and the sweep is product-scoped (done).
- **MKT-005** — waitlist capture on coming-soon occasions ("Notify me" is currently a dead link); gate `?focus=` for non-live.
- **MKT-007** — abandoned-funnel recovery emails (partial-create nudges via Resend).
- **QA-7** — app-level Playwright E2E (multi-actor create→contribute→finalize against the mock-payment build).
- **LC-04** — self-serve per-contributor erasure token (today: rights line + email-us SOP; organizer can delete the whole collection).
- **MKT-003** — collapse the "two pricing cards = one $49 product" presentation (advance-pay framing already fixed).

---

## ✅ Done (reference) — do NOT redo
- All 5 CRITICAL + all HIGH + most MED/LOW from SES-043/044. Highlights: tribute re-view (FE-001), post-generation purge + cron (LC-01), consent recording (LC-02), webhook payment backstop (QA-1), deadline validation (SEC-02), fail-closed mock + crons (SEC-01/BE-N4), price verification (SEC-03/BE-N1), keyed HMAC dedup (ARCH-06), product-scoping (BE-02/03/04), advance double-charge guard (ARCH-03), required contributor email + one-per-person dedup, organizer rich-form everywhere + edit, deadline auto-finalize/delete/extend. venture-core test suite 551 passing at 1.15.4.

## How to resume
1. If venture-core changed, re-pin app (`npm pkg set ...@1.15.x` + install) and re-pin note. Branch is `feat/collection-app` (not yet merged to main / promoted to prod domain — confirm deploy/promotion plan).
2. Knock out the 3 founder items above (legal paste + version bump; analytics scaffold + keys; env confirm).
3. Re-run the expert panel as **SES-045** (prompt template in `EXPERT_PANEL_REVIEW_SES044.md` §7) to confirm Legal + Marketing prod-readiness clear 8 and target 9s.
