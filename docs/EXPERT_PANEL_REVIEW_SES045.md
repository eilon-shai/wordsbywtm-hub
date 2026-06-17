# Expert Panel Re-Review — SES-045

**Date:** 2026-06-18
**Subject:** Collaborative-Collection solution (wordsbywtm-hub), post-SES-044 remediation
**App version:** venture-core **1.20.1** (app pinned + installs 1.20.1 — ARCH-05 drift resolved)
**Method:** 8-lens panel + chair synthesis. Each expert reopened the real source (app branch `feat/support-tribute-availability` + venture-core source) and traced claims to `file:line`. Findings were the basis for this doc; no dynamic preview run was performed (still the main lever to 9.5+).

## What changed since SES-044
Shipped and code-verified this round: checkout moved to the final "Create my tribute" step (email-locked Paddle + terms only at the pay moment); double-charge prevention (already-paid guards on both intents + single NX checkout-lock); Paddle webhook backstop with multi-occasion dispatch + signature/product/price re-verification; a full set of data-loss guards (purge never deletes paid-not-generated, atomic conditional unpaid-delete with 6h grace, idempotent `markCollectionPaid` pushing `purge_after`, paid-but-empty single-nudge, atomic contributor cap); pay-at-finalize now records `paid_at`; support console behind Basic-Auth middleware; PDF attribution; standalone memorial header. SES-044 baseline: **Confidence 8.89, Quality 8.43, Prod-Readiness 8.10, Overall 8.47.**

---

## 1. Scorecard

| Expert | Confidence | Quality | Prod-Readiness |
|---|---|---|---|
| Frontend Engineer | 9.1 | 8.7 | 8.6 |
| Backend Engineer | 9.2 | 9.0 | 8.7 |
| Software Architect | 9.2 | 9.0 | 8.8 |
| Security Engineer | 9.2 | 9.0 | 8.7 |
| Legal / Compliance | 8.9 | 8.5 | 8.0 |
| UX Designer | 9.0 | 8.7 | 8.7 |
| Marketing / Growth | 9.0 | 8.5 | 7.5 ⚠ |
| QA / Test Engineer | 8.6 | 8.4 | 8.0 |
| **AVERAGE** | **9.03** | **8.60** | **8.38** |

**Overall (mean of the three dimension-averages): 8.67**

### Delta vs SES-044

| Dimension | SES-044 | SES-045 | Δ |
|---|---|---|---|
| Confidence | 8.89 | 9.03 | +0.14 |
| Quality | 8.43 | 8.60 | +0.17 |
| Prod-Readiness | 8.10 | 8.38 | +0.28 |
| **Overall** | **8.47** | **8.67** | **+0.20** |

⚠ Marketing Prod-Readiness 7.5 is the only sub-8 cell, held there by **founder-owned** MKT-002 (no conversion analytics on a live-ad money path) — not an engineering defect.

---

## 2. Mandatory-Minimum Status

**MET** — every dimension *average* ≥ 8 (Confidence 9.03, Quality 8.60, Prod-Readiness 8.38). Target of 9 is reached on Confidence only. The single sub-8 individual cell (Marketing 7.5) is founder-owned.

---

## 3. Verified Resolved (confirmed in code by the panel)
- Result re-view recovery + durable admin token (session+localStorage) so a fresh-tab payer reaches `/collect/manage`.
- Double-charge prevention: already-paid + already-generated 409 guards (both intents) + single per-collection NX checkout-lock, released on Paddle failure.
- Paddle webhook mounted, multi-occasion dispatch by `customData.product`, re-verifies signature + product + price before `markCollectionPaid`.
- Data-loss guards: `purgeExpired` never deletes paid-not-generated; `markCollectionPaid` idempotent + pushes `purge_after` to deadline+35d; deadline sweep atomic conditional unpaid-delete behind 6h grace; paid-but-empty single nudge; atomic contributor cap (INSERT…SELECT WHERE count<cap).
- Pay-before-generate enforced server-side (txn completed + product + known-price → else 403); pay-at-finalize now records `paid_at`/`paid_txn_id`.
- Crons fail-closed (CRON_SECRET, header-only); mock-payment fail-closed; mock collectionId from Redis map only.
- Prompt-injection escaping on all untrusted synthesis fields; capability-token design (no IDOR); AES-256-GCM + fail-closed keys; `hashEmail` fail-closed.
- Support console gated by edge Basic-Auth (503 if unset), parameterized SQL.
- LC-03 legal drafting complete (Terms collection clauses, Privacy data-inventory/retention); consent recorded server-side.
- Version drift (ARCH-05) resolved — pins + installs exactly 1.20.1.
- 70/70 app vitest + typecheck green (Node 20); CI runs build + render smoke.

---

## 4. Top Findings

### Founder-owned (not engineering defects)
- **HIGH — LC-03:** legal pages are AI-drafted, self-labelled PROVISIONAL; need attorney ratification + remove the headers. Drafting done; only sign-off remains.
- **HIGH — MKT-002:** no GA4/Ads conversion or funnel events on a live-ad money path (only Vercel pageviews). Biggest Prod-Readiness drag. Founder supplies keys.

### Engineering — minor, none launch-blocking for the single live occasion
- **MED** — Organizer EU-CRD/terms waiver is shown but **not persisted server-side** at checkout (ToS asserts a consent record that isn't written). Fix: send `termsAccepted`+version in the checkout POST and store it (mirror `createLogTermsHandler`). — ⏳ **DEFERRED** (legal track; bundle with LC-03 sign-off + consent-store decision).
- **MED** — **No app-level tests** for the webhook product-routing dispatch or `/api/support/delete`. — ✅ **RESOLVED** (PR #16: `test/integration/webhook.test.ts` + `support-delete.test.ts`; 80/80). Scheduled Tier-B E2E + CI version-pin guard still ⏳ deferred (CI infra).
- **MED** — ARCH-04: 2nd-occasion resolver uses Redis-probe + first-live-config fallback. **Fails closed today** (memorial only). — ⏳ **DEFERRED** (hard gate only before a 2nd occasion goes live).
- **MED** — coming-soon "Notify me" CTA has no waitlist capture. — ⏳ **DEFERRED** (marketing; with MKT-002).
- **LOW** — `paid_at` stamp on generate is best-effort, not atomic with `setCollectionGenerated`. — ✅ **RESOLVED** (venture-core PR #311: `setCollectionGenerated` now `paid_at = coalesce(paid_at, generated_at)` atomically).
- **LOW (SEC)** — escape names in the notify email; constant-time support compare; redact `customerEmail` from webhook logs. — ✅ **RESOLVED** (PR #16: HTML-escape + constant-time compare; venture-core PR #311: webhook email redacted). Per-IP support guess-limit ⏳ deferred (edge-runtime limitation; mitigated by high-entropy `SUPPORT_PASSWORD`).
- **LOW (a11y)** — edit-memory modal focus-trap/restore (FE-008); result "done" focus/announce (FE-009). — ✅ **RESOLVED** (PR #16).
- **LOW** — per-email dedup TOCTOU / no DB unique index. — ✅ **NOT AN ISSUE** (already covered: `contributions_email_uniq` partial unique index exists + 23505→`CONTRIBUTION_EXISTS`; the finding missed the existing index).
- **LOW** — spent `?txn=` refresh dead-ends on the generic error. — ✅ **RESOLVED** (PR #16: ALREADY_USED recovery re-fetches and shows the existing tribute).

---

## 4a. Post-SES-045 remediation — 2026-06-18

Shipped after the panel (verified: app 80/80 + build; venture-core 560):

**App — PR #16 (`fix/ses045-app-quickwins`)**
- SEC: HTML-escape contributor/honoree names in the organizer-notification email.
- SEC: constant-time support password compare (edge middleware).
- a11y FE-008: edit-memory modal focus-in + Tab-trap + focus-restore.
- a11y FE-009: result "done" heading moves focus / announces (generate + re-view).
- UX: ALREADY_USED recovery on the `?txn=` path (shows the existing tribute).
- QA: `webhook.test.ts` (dispatch: snake/camel/fallback/unparseable) + `support-delete.test.ts` (product guard, idempotent, 400/503).

**venture-core — PR #311 (`fix/ses045-core-quickwins`)**
- Atomic `paid_at` in `setCollectionGenerated` (coalesce).
- Webhook customer email redacted from logs.

**Still open**
- 👤 FOUNDER: LC-03 attorney ratification; MKT-002 GA4/Ads analytics.
- ⏳ DEFERRED: EU-CRD waiver persistence (legal track); scheduled Tier-B E2E + CI version-pin guard; ARCH-04 2nd-occasion resolver; coming-soon waitlist; UTM/first-touch attribution; per-IP support rate-limit.

---

## 5. Production env / config
Full checklist in **`docs/PRODUCTION_ENV.md`**. Panel emphasis: `PADDLE_ENVIRONMENT=production`, live `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` + `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` + `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL`, `REDIS_FORM_ENCRYPTION_KEY`/`CONTRIBUTION_HASH_SECRET` (fail-closed), `CRON_SECRET` on both crons, `SUPPORT_PASSWORD`, Upstash + Neon + Resend; `ENABLE_MOCK_PAYMENT`/`DISABLE_EMAIL`/edit-pack price OFF.

---

## 6. Path to 9
- **Backend/data:** fold `paid_at` stamp into `setCollectionGenerated` (atomic); add partial unique index on `(collection_id, contributor_email_hash)` + catch 23505.
- **QA:** tests for webhook dispatch + `/api/support/*`; scheduled Tier-B mock-payment E2E on a disposable Neon branch; CI version-pin guard.
- **Security:** escape names in the notify email; `timingSafeEqual` + per-IP limit on support; redact email from webhook logs.
- **FE/UX (a11y on money paths):** FE-008 modal focus-trap, FE-009 done-state focus/announce; ALREADY_USED recovery on the `?txn=` path.
- **Architecture (2nd-occasion gate):** durable occasion resolution from the Paddle txn; drop first-live-config fallback.
- **Legal (founder):** persist the EU-CRD/terms waiver at checkout; attorney ratifies → remove PROVISIONAL.
- **Marketing (founder):** GA4 + Ads conversion (server-confirmed purchase event); UTM + first-touch attribution; honest waitlist CTA; OG images.
- **All lenses:** convert static verification into a dynamic preview run (create → pay → generate → re-view; tampered-signature/wrong-price webhook rejection; dev-clock deadline sweep; keyboard/VoiceOver pass).

---

## 7. How to re-run (SES-046)
Re-pin to the reviewed venture-core version, run `npm test` + typecheck (Node 20), re-open the 8 lenses against the current source, re-score; target every dimension-average ≥ 9 with LC-03 + MKT-002 resolved and a green dynamic preview run.
