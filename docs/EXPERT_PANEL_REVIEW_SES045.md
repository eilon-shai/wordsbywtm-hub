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
- **MED** — Organizer EU-CRD/terms waiver is shown but **not persisted server-side** at checkout (ToS asserts a consent record that isn't written). Fix: send `termsAccepted`+version in the checkout POST and store it (mirror `createLogTermsHandler`).
- **MED** — **No app-level tests** for the webhook product-routing dispatch or `/api/support/delete` (destructive); money/data-loss invariants only proven in the (un-run-in-CI) venture-core suite. Add integration coverage + a scheduled Tier-B mock-payment E2E on a disposable Neon branch + a CI guard pinning the reviewed venture-core version.
- **MED** — ARCH-04: 2nd-occasion resolver uses Redis-probe + first-live-config fallback. **Fails closed today** (memorial only); HARD GATE before a 2nd occasion goes live.
- **MED** — coming-soon "Notify me" CTA has no waitlist capture (wasted wedding/retirement ad clicks).
- **LOW** — `paid_at` stamp on generate is best-effort (non-fatal catch), not atomic with `setCollectionGenerated` (fold into it with coalesce).
- **LOW (SEC)** — HTML-escape `contributorName`/`honoreeName` in the organizer-notification email; support password compare not constant-time + no guess rate-limit; `customerEmail` echoed to webhook stdout logs (redact).
- **LOW (a11y)** — edit-memory modal lacks focus-trap/restore (FE-008); result "done" state doesn't move focus/announce (FE-009).
- **LOW** — per-email dedup is read-then-write (TOCTOU) with no DB unique index on `email_hash` (cap + idempotency still bound it); add partial unique index + catch 23505.
- **LOW** — spent `?txn=` refresh in a fresh device dead-ends on the generic error (mostly mitigated by the localStorage token fallback); add an ALREADY_USED recovery branch.

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
