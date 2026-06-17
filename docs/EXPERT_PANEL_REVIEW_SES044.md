# Expert Panel Re-Review — SES-044

**Date:** 2026-06-17
**Subject:** Collaborative-Collection solution (wordsbywtm-hub), post-SES-043 remediation
**App version:** venture-core 1.15.2 (app pinned 1.15.2 — ARCH-05 version drift resolved)
**Method:** Re-review / verification. Each of the 8 experts reopened the actual source (app + venture-core 1.15.2) and traced every claimed SES-043 fix to concrete `file:line`. The venture-core test suite was executed (542/542 across 36 files, Node 20; the collection-handlers subset reported 63/63). No dynamic preview run was performed — that is the main lever remaining for 9.5+.

## What changed since SES-043
SES-043 surfaced CRITICAL/HIGH blockers across all lenses (result dead-end, paid edit-pack no-op, indefinite PII retention, fabricated testimonials, missing webhook backstop, version drift). The remediation shipped on venture-core 1.15.2 and was re-reviewed here. SES-043 baseline: **Confidence 8.19, Quality 7.56, Prod-Readiness 7.00, Overall 7.58** — two dimensions (Quality, Prod-Readiness) were below the mandatory 8.

---

## 1. Scorecard

| Expert | Confidence | Quality | Prod-Readiness |
|---|---|---|---|
| Frontend Engineer | 9.0 | 8.5 | 8.5 |
| Backend Engineer | 9.0 | 8.5 | 8.0 |
| Software Architect | 9.0 | 8.7 | 8.5 |
| Security Engineer | 9.0 | 8.7 | 8.3 |
| Legal / Compliance | 8.7 | 8.2 | 7.5 ⚠ |
| UX Designer | 9.0 | 8.5 | 8.5 |
| Marketing / Growth | 8.7 | 8.0 | 7.5 ⚠ |
| QA / Test Engineer | 8.7 | 8.3 | 8.0 |
| **AVERAGE** | **8.89** | **8.43** | **8.10** |

**Overall (mean of the three dimension-averages): 8.47**

### Delta vs SES-043 (on the averages)

| Dimension | SES-043 | SES-044 | Δ |
|---|---|---|---|
| Confidence | 8.19 | 8.89 | **+0.70** |
| Quality | 7.56 | 8.43 | **+0.87** |
| Prod-Readiness | 7.00 | 8.10 | **+1.10** |
| **Overall** | **7.58** | **8.47** | **+0.89** |

⚠ flags above mark individual experts whose Prod-Readiness still sits below 8 (Legal 7.5, Marketing 7.5). No dimension *average* is below 8.

---

## 2. Mandatory-Minimum Status

**PASS — all three dimension-averages are now ≥ 8.**

- Confidence 8.89 ✅
- Quality 8.43 ✅ (was 7.56, below minimum at SES-043)
- Prod-Readiness 8.10 ✅ (was 7.00, below minimum at SES-043)

Both previously-failing dimensions now clear the bar. The two individual experts still under 8 on Prod-Readiness (Legal, Marketing) are held there by **founder-owned** items (attorney ToS ratification; conversion analytics on a money path with live ad spend), not by unresolved engineering defects.

---

## 3. Verified Resolved (confirmed fixed in code by the panel)

- **FE-001 / UX-01 (CRITICAL result dead-end):** result re-view recovery — `ResultFlow.tsx` "checking" phase POSTs `/api/collection/tribute` with admin token, renders stored content read-only; dashboard link carries `?t={adminToken}`; backed by venture-core `get-tribute-handler.ts` + persisted `generated_content`.
- **FE-002 / MKT-006 / UX-02 (paid no-op):** EditPackCard fully unmounted (hard-commented, never imported; price prop dead). No live checkout for unbuilt regen in any env.
- **FE-003/004/005/006/007:** per-action invite scoping, edit-memory dialog (role/aria/Escape/click-outside), aria-live on generate/error, dedup-race guard, filename sanitize.
- **MKT-001 (fabricated testimonials):** removed; venture-core gates the section empty; honest synthesized "Woven from N memories" sample proof substituted.
- **MKT-003 / UX-06:** advance-pay reframed to "pay your one-time fee now — finalizing later is free."
- **QA-1:** webhook collection-paid backstop (`transaction.completed` → `markCollectionPaid`).
- **QA-2/QA-5:** mark-paid/finalize-paid/deadline-sweep handler tests + db dedup/HMAC/idempotency tests.
- **BE-01** lockTtlMs 90s; **BE-02/03/04** product scoping (sweep, get-collection, mark-paid); **BE-05** status-first finalize; **BE-06** SQLSTATE 23505 dedup.
- **ARCH-01** purge cron + non-partial index + purgeExpired deleting generated rows; **ARCH-02** product-scoped sweep; **ARCH-03** advance-pay NX lock; **ARCH-06** keyed HMAC dedup; **ARCH-07** atomic invite cap; **ARCH-05** version drift resolved (app pinned 1.15.2); **QA-6** registry startup guard.
- **SEC-01** fail-closed mock + encryption (PADDLE_ENVIRONMENT gate); **SEC-02/QA-3** deadline validate+clamp; **SEC-03** price-id verify (mark-paid + generate); **SEC-04** 96-bit share / 192-bit admin tokens; **SEC-05** occasion forced from route.
- **LC-01** post-generation purge_after stamped at finalize + purge cron; **LC-02** consent record {at, consentVersion} persisted encrypted; **LC-05** honest contributor email copy; **LC-07** deadline auto-use/delete disclosed in consent copy.

No CRITICAL or HIGH **regressions** were introduced by the fixes.

---

## 4. Remaining Caps (what holds each below-9 dimension back)

### FOUNDER-owned (legal / analytics / prod-env) — not engineering defects
- **LC-03 (HIGH):** Terms of Service not updated/ratified for the collection model — no clause for auto-generate / auto-delete / auto-extend; ToS still verbatim TributeWords single-user prose dated Apr 22. Single biggest legal prod-readiness blocker. *Attorney-owned.*
- **MKT-002 (HIGH):** No conversion/funnel analytics (only Vercel pageviews) while paid ads are already live — money path unmeasurable. *Founder must supply GA4/PostHog + Paddle conversion keys.*
- **LC-06 (MED):** Advance-pay + auto-finalize vs refund/EU-CRD withdrawal ambiguity. *Attorney-owned.*
- **Prod-env confirmation (all lenses):** CRON_SECRET set, ENABLE_MOCK_PAYMENT off, edit-pack price unset, REDIS_FORM_ENCRYPTION_KEY + PADDLE_WEBHOOK_SECRET present — code now fails-closed against these but they must be confirmed live.

### Engineering — minor, none launch-blocking single-occasion
- **Test coverage of destructive paths (QA-1b/QA-2b/QA-3b, MED):** webhook collection backstop, deadline validation, and sweep extend/cap/reminder-once branches have correct *code* but no *tests* — the remediation promised them.
- **BE-N1 (MED):** webhook collection branch skips the SEC-03 price assertion (only paid path that does).
- **BE-N4 / SEC-06 (MED/LOW):** crons run fully public when CRON_SECRET unset — should fail-closed in prod; drop `?key=` query-param secret fallback.
- **Multi-occasion gate (ARCH-02b/ARCH-04, MED):** deadline cron sweeps only `configs[0]`; txn→collection resolution prefix-probes Redis. Both single-occasion-safe; documented hard gate before a 2nd occasion.
- **UX-04 (MED, carried over):** create-form progress bar denominator contradicts the "write my own memory later" path.

---

## 5. New Findings (this round, isNew=true)

| ID | Sev | Issue | Location | Fix |
|---|---|---|---|---|
| BE-N1 | **MEDIUM** | Webhook collection-paid branch skips SEC-03 price/amount tier check (the one paid path with no test) | `webhook-handler.ts:67-82` | Assert `items[0].price.id` ∈ tier prices before `markCollectionPaid`, as mark-paid does |
| BE-N4 | **MEDIUM** | Both crons fully public when CRON_SECRET unset — purge can mass-delete memorial data | `cron/purge/route.ts:12-19`; `collection-deadline-sweep-handler.ts:64-70` | Fail-closed: require CRON_SECRET in production (503/401 + startup assertion) |
| ARCH-02b | **MEDIUM** | Deadline cron route sweeps only `configs[0]`, not every live config (silent no-sweep for 2nd occasion) | `cron/collection-deadlines/route.ts:24-29` | Loop over all live configs; add two-product test; part of 2nd-occasion hard gate |
| QA-1b | **MEDIUM** | Webhook collection backstop shipped with no test | `webhook-handler.test.ts` (0 collection refs) | Add webhook → markCollectionPaid integration tests |
| QA-3b | **MEDIUM** | Server-side deadline clamp/validation has no unit test | `create-collection-handler.ts:111-127` | Add invalid/past/far-future deadline cases |
| QA-2b | **MEDIUM** | Deadline-sweep tests cover 2 of 5 destructive branches | `collection-handlers.test.ts:387-416` | Add paid-empty-extend, extension-cap, reminder-once, valid-Bearer cases |
| ARCH-08 | LOW | purgeExpired hard-deletes with no batch cap / audit trail | `collections.ts:382-388` | Add LIMIT/loop + structured purge-audit log (no PII) |
| SEC-06 | LOW | Cron secret accepted via `?key=` query param; non-constant-time compare | `cron/purge/route.ts:16-18` | Header-only + `timingSafeEqual` |
| SEC-07 | LOW | Price guard skipped when Paddle omits txn items | `mark-paid:75-79`, `generate:104-113` | Treat missing txnPriceId as 403 |
| SEC-08 | LOW | hashEmail falls back to unsalted SHA-256 if no secret | `collections.ts:107-110` | Throw in prod if hash secret absent |
| FE-008 | LOW | Edit dialog: no focus trap/restore; Escape won't fire on open | `ManageDashboard.tsx:369-405` | Move focus into dialog, trap Tab, restore on close |
| FE-009 | LOW | Result "done" state doesn't move focus / announce to AT | `ResultFlow.tsx:110-145,258-270` | Focus heading or wrap in aria-live on done |
| FE-010 | LOW | Single-row invite send disables every send button | `InviteBlock.tsx:281,410-411` | Key disabled state per row, or document single-flight |
| UX-08 | LOW | Raw `?txn=` result refresh still dead-ends (recovery only via `?t=`) | `ResultFlow.tsx:85-95,147-191` | On ALREADY_USED render "already created — view it" recovery |
| LC-09 | LOW | Privacy §5 doesn't state the now-enforced 30-day post-generation retention | `privacy/page.tsx:56-65` | State actual 30-day retention; attorney ratify |

**CRITICAL: 0. HIGH: 0.** No new CRITICAL or HIGH findings this round. All new items are MEDIUM or LOW. (The HIGH items LC-03 and MKT-002 are carried-over, founder-owned, `isNew=false`.)

---

## 6. Path to 9 — per agent

- **Frontend (9.0 / 8.5 / 8.5):** land FE-008 (dialog focus trap + open-time Escape + restore), FE-009 (focus/announce done heading on both generate and read-back paths), decide per-row vs single-flight invites (FE-010); dynamically exercise create→pay(mock)→generate→refresh and dashboard re-view in a deployed preview.
- **Backend (9.0 / 8.5 / 8.0):** close BE-N1 (webhook price assertion), BE-N4 (CRON_SECRET fail-closed in prod), BE-N3 (release advance NX lock on Paddle failure); add the webhook + sweep tests (BE-N2); confirm founder-owned prod env live.
- **Architect (9.0 / 8.7 / 8.5):** ARCH-02b (loop cron over all live configs) + ARCH-04 (durable txn→collection / customData.occasion resolution) as the 2nd-occasion hard gate; ARCH-08 batch-cap + purge-audit log; run the suites and the create→advance-pay→finalize→purge path in a preview.
- **Security (9.0 / 8.7 / 8.3):** SEC-07 (missing items → 403), SEC-08 (hash secret fail-closed), SEC-06 (header-only constant-time cron auth); add a startup env-assertion/health endpoint; dynamically confirm wrong-price Paddle rejection + tampered-signature rejection + boot-throw without encryption key.
- **Legal (8.7 / 8.2 / 7.5):** **attorney ratify the collection ToS addendum (LC-03) and bump termsVersion/date** — the single blocker to 8 on prod-readiness; then LC-06 (advance-pay CRD acknowledgement), LC-04 (self-serve erasure token), LC-08 (IP/abuse purpose), LC-09 (state 30-day retention).
- **UX (9.0 / 8.5 / 8.5):** fix UX-04 (progress bar honors write-later path) and UX-08 (already-created recovery on spent-txn refresh); dynamically run the deferred-memory → contribute×2 (incl dup) → finalize(mock) → re-view E2E.
- **Marketing (8.7 / 8.0 / 7.5):** **add GA4/PostHog funnel + Paddle "completed" conversion event with UTM/`?focus=` capture (MKT-002, founder keys)** — the blocker to 8 prod-readiness while ads are live; then collapse the two-card pricing (MKT-003) and waitlist capture on coming-soon (MKT-005).
- **QA (8.7 / 8.3 / 8.0):** write the three missing destructive-path tests (QA-1b webhook, QA-3b deadline validation, QA-2b sweep extend/cap/reminder-once), the registry test (QA-6b), and a Playwright app-level E2E (QA-7) against the mock-payment build; confirm CRON_SECRET in prod.

---

## 7. How to re-run (SES-045)

1. Confirm founder/attorney-owned items have landed: **ToS collection addendum ratified + termsVersion bumped (LC-03)**, **conversion analytics live (MKT-002)**, and prod env verified (CRON_SECRET set on both crons, ENABLE_MOCK_PAYMENT off/unset, edit-pack price unset, REDIS_FORM_ENCRYPTION_KEY + PADDLE_WEBHOOK_SECRET present).
2. Land the engineering MEDIUMs: BE-N1 webhook price assertion, BE-N4/SEC-06 cron fail-closed, and the missing destructive-path tests (QA-1b/QA-2b/QA-3b).
3. Run the full venture-core suite (`npm test` in `packages/core`, Node 20) and confirm green at the pinned version.
4. **Dynamic verification (the lever for 9.5+):** spin up a deployed preview and exercise create → advance-pay/finalize (mock + real Paddle sandbox) → generate → refresh → dashboard "View your tribute" re-view end-to-end; confirm the purge cron fires and deletes a finalized row past purge_after.
5. Re-score all 8 lenses; target every dimension-average ≥ 9 and zero remaining HIGH (LC-03, MKT-002 resolved).
