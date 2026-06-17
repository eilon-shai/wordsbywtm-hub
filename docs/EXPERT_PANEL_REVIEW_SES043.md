# Expert Panel Pre-Launch Review — SES-043

**Date:** 2026-06-17
**Reviewed:** wordsbywtm-hub collaborative-collection app + venture-core 1.14.0 collection layer (memorial pilot)
**Review method:** 8 independent expert agents reviewed the collection app (`wordsbywtm-hub`) and the venture-core collection handlers/db/crypto source (read as `vc-collection-db` 1.13.1 — see ARCH-05 on version drift). All agents traced the create → contribute → manage → finalize → result flows, the payment/cron handlers, the schema, and the three legal pages before scoring.
**Scoring rule:** Minimum **8 mandatory per dimension**. Above 9 recommended. For any score below 9, a path-to-9 is required.

---

## Scorecard

| Expert | Confidence | Quality | Prod Ready |
|--------|:----------:|:-------:|:----------:|
| Frontend Engineer | 8.5 | 8.0 | 7.0 ⚠ |
| Backend Engineer | 8.0 | 8.0 | 8.0 |
| Software Architect | 8.0 | 8.0 | 7.0 ⚠ |
| Security Engineer | 8.5 | 8.0 | 8.0 |
| Legal / Compliance | 8.0 | 6.5 ⚠ | 6.0 ⚠ |
| UX Designer | 8.5 | 8.0 | 8.0 |
| Marketing / Growth | 8.0 | 7.0 ⚠ | 6.0 ⚠ |
| QA / Test Engineer | 8.0 | 7.0 ⚠ | 6.0 ⚠ |
| **AVERAGE** | **8.19** | **7.56** ⚠ | **7.00** ⚠ |

**Overall: 7.58 / 10** (mean of the three dimension averages)

⚠ **Two of three dimensions are below the mandatory 8 minimum: Quality (7.56) and Prod Readiness (7.00).** Confidence (8.19) meets minimum. This solution is **NOT launch-ready** as scored.

---

## P0 / Critical Issues

Four CRITICAL findings, from three experts.

### FE-001 / UX-01 — Already-generated tribute cannot be re-viewed (dead "View your tribute" link)
**Severity:** CRITICAL (Frontend + UX, same defect)
**Location:** `src/components/ManageDashboard.tsx:479`; `src/app/[occasion]/result/ResultFlow.tsx:83-157`
A paying organizer who already generated **cannot reopen their tribute**. The dashboard's "View your tribute" anchor points at `${resultPath}` with no `?txn=` and no `?t=`. `ResultFlowInner` computes `txnId`/`adminToken` from those params; with both empty, `canStart` is false (FE) or `phase` resets to `prefs` and re-POSTs the spent txn (UX), landing on "We couldn't find your tribute session" / the generic "We hit a snag" error. Any refresh/reload of the result page after generation also dead-ends — the one-time-use txn is consumed server-side and there is **no read-back path** for stored content. Only safety net is the emailed copy.
**Fix:** Carry the admin token on the link (`href={`${resultPath}?t=${encodeURIComponent(adminToken)}`}`); on an already-generated/ALREADY_USED response render a read-only recovery state ("Your tribute has already been created — [view it]") and add a server route returning persisted synthesized content for an admin token so re-view and refresh both work.

### LC-01 — Finalized collections retain contributor PII indefinitely (contradicts Privacy Policy)
**Severity:** CRITICAL (Legal/Compliance)
**Location:** `vc-collection-db/.../db/collections.ts:336-339` (purgeAbandoned); `schema.sql` `collections_purge_idx` (`where status <> 'generated'`); `collection-finalize-core.ts`
`purge_after` is set only at creation and the purge sweep + partial index both **exclude** `status='generated'`. Nothing sets a purge date or deletes a collection once generated. Every contributor's name, relationship, memory, and email-hash (plus the AES-GCM payload with plaintext email) is stored in Neon **forever**. This directly contradicts Privacy Policy §5 retention promise and GDPR storage-limitation (Art 5(1)(e)), making the published policy factually false. (See also ARCH-01: no purge cron is even registered.)
**Fix:** Set `purge_after = generated_at + N days` at finalize (manual and cron), add a purge path for generated collections past that window, register a `/api/cron/purge` route, and state the actual retention days in the Privacy Policy.

### LC-02 — Consent is not recorded (no proof, timestamp, version, or policy reference)
**Severity:** CRITICAL (Legal/Compliance)
**Location:** `vc-collection-db/.../api/submit-contribution-handler.ts:95-97`; `schema.sql` contributions table
The handler checks `consent===true` and rejects otherwise, but the boolean is **never persisted** — no timestamp, no consent-text version, no Privacy-Policy version. GDPR Art 7(1) requires the controller to demonstrate consent. The consent copy also does not link the Privacy Policy or disclose that an email is collected/retained, so it is arguably not "informed."
**Fix:** Persist a consent record per contribution (timestamp, consent_text_version, privacy_policy_version, optionally IP), reusing the existing log-terms pattern; add an inline Privacy-Policy link at the consent checkbox and disclose email storage at point of consent.

### MKT-001 — Fabricated testimonials render on the live, paid memorial landing page
**Severity:** CRITICAL (Marketing/Growth)
**Location:** `src/app/[occasion]/page.tsx` (`testimonials={MOCK_TESTIMONIALS}`) → venture-core `LandingPage.tsx:560-561`
The live memorial landing passes `MOCK_TESTIMONIALS` into the real `TestimonialsSection`, rendering **invented customer quotes** to paying customers in a grief context — a textbook FTC/ASA deceptive-endorsement violation and a brand-trust failure for a sincerity product. It also poisons any conversion read.
**Fix:** Remove the testimonials prop entirely (section auto-hides when empty) until real, attributed, consented testimonials exist; substitute honest non-endorsement proof (synthesized multi-voice excerpt, money-back guarantee) if social proof is needed now.

### QA-1 — No webhook backstop for collection payments
**Severity:** CRITICAL (QA/Test)
**Location:** `vc-collection-db/.../api/webhook-handler.ts` (no collection branch); `wordsbywtm-hub/src/app/collect/paid/page.tsx:41-48`
`webhook-handler.ts` has **zero** references to `markCollectionPaid` / txn-collection mapping. Collection payment is recorded ONLY by the browser calling `/api/collection/mark-paid` or `/api/collection/generate` on the return page. If the user closes the tab, loses connectivity, or the Paddle redirect is interrupted after the charge clears, `paid_at` is never set and there is **no server-side recovery** — the customer is charged but the collection stays unpaid, and the deadline sweep may even delete it. The in-code comment ("webhook/retry can still record it") is false.
**Fix:** Add a `transaction.completed` branch to the Paddle webhook that reads `customData.collectionId` (or the Redis mapping) and calls `markCollectionPaid` server-side, making the return page a best-effort accelerator. Add an integration test asserting webhook → `paid_at` set.

### QA-2 — Entire pay-in-advance + deadline-sweep flow is untested
**Severity:** CRITICAL (QA/Test)
**Location:** `vc-collection-db/.../api/collection-handlers.test.ts` (covers only create/submit/get/checkout/generate/moderate)
`createCollectionMarkPaidHandler`, `createCollectionFinalizePaidHandler`, and the **entire** `createCollectionDeadlineSweepHandler` have ZERO unit tests. The sweep is the most destructive code in the system — it DELETES unpaid collections at deadline, auto-generates paid ones, and extends paid-empty ones. Untested branches: unpaid-delete, paid-generate, paid-empty-extend, extension cap, reminder idempotency, CRON_SECRET auth. A regression here silently deletes irreplaceable memorial memories.
**Fix:** Add handler tests mirroring the existing mock style for mark-paid, finalize-paid, and all five deadline-sweep branches plus auth and reminder-once.

---

## Cross-Agent Findings (raised by 3+ experts)

### A. Result-page dead-end after successful generation — **2 experts** (FE-001 CRITICAL, UX-01 HIGH)
Re-view/refresh of a generated tribute lands on an error with no read-back path. *(Listed here for visibility though just under the 3-expert bar; it is a P0.)*

### B. Edit & Refine pack charges for unimplemented regeneration — **3 experts** (FE-002 HIGH, UX-02 HIGH, MKT-006 MEDIUM)
`EditPackCard` opens a real Paddle checkout with copy promising "regenerate with a different tone or length" / "Refinements are applied after purchase," but the component's own header comment says the regen wiring is an unbuilt backend follow-up. FE adds that it reuses the shared Paddle singleton callback with a synthetic `editpack_...` txn id, so a successful purchase either silently does nothing or would try to generate against an edit-pack txn. A paid dead-end on a grief product. **Consensus fix:** do not set `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK` in prod (keep the card unmounted) until regen ships; if shown, use true coming-soon copy with no live checkout.

### C. Deadline is stored unvalidated → cron cascade-deletes on a bad date — **3 experts** (SEC-02 HIGH, QA-3 HIGH, ARCH-03/BE adjacent)
`create-collection-handler.ts:121` stores `deadline` raw with no parse, no past-date guard, no min/max bound. A past or malformed-but-parseable date makes the daily sweep immediately hard-delete the collection and all contributions; a non-parseable string yields NaN → also falls into the unpaid-delete branch. **Consensus fix:** parse with `Date`, reject NaN/past, clamp to `[now+1d, now+maxDays]`, return 400 on violation, normalize to ISO, and add tests.

### D. Deadline sweep / handlers are not product-scoped — multi-occasion data-loss & PII-leak landmine — **3 experts** (BE-02 HIGH, ARCH-02 HIGH, SEC-05/BE-03 adjacent)
`listOpenCollectionsWithDeadline` filters only by status+deadline, never by product, and the sweep runs under a single ProductConfig. All three products share one Neon DB. Safe **only** because exactly one occasion is live (cron route enforces it). The moment a 2nd occasion goes live, the first cron will DELETE the other product's unpaid collections, email its organizers, and misroute paid auto-finalize under the wrong config. `get-collection` (BE-03) and the mock mark-paid path (BE-04) similarly lack the product guard the other handlers have. **Consensus fix:** add a `product` filter to `listOpenCollectionsWithDeadline`, loop the cron over every live config, and add an explicit per-collection product guard — **as a hard gate before any second occasion goes live.**

### E. No conversion/event analytics; payment verification leans on fragile single points — **2 experts** (MKT-002 HIGH, QA-1 CRITICAL)
Only `@vercel/analytics` pageviews exist — no GA4/PostHog, no Paddle purchase conversion event, no UTM/`?focus=` capture — so the already-running paid ads cannot be measured (MKT-002); and payment recording itself has no webhook backstop (QA-1). *(Different remedies, shared root: the money path is unobserved/unrecoverable server-side.)*

### F. Advance-pay value framing & double-charge risk — **3 experts** (ARCH-03 MEDIUM double-charge, MKT-003/UX-06 framing)
ARCH-03: advance-pay creates a NEW Paddle txn on every click with idempotency only at the DB write, opening a real double-charge window on a Merchant-of-Record bereavement product. MKT-003/UX-06: the CTA sells the one-time fee as an "email-quota unlock" (3→10/day), burying the real benefit (free finalize later). **Fix:** re-check `paidAt` + short Redis lock before creating an advance txn; re-frame copy around "pay your one-time fee now — finalizing later is free."

---

## Findings by Agent

### Frontend Engineer (conf 8.5 / qual 8 / prod 7)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| FE-001 | CRITICAL | Generated tribute cannot be re-viewed (dead "View your tribute") | ManageDashboard.tsx:479; ResultFlow.tsx:84-101 | Carry admin token on link; render stored content read-only via admin token on ALREADY_USED | ✅ Resolved |
| FE-002 | HIGH | Edit-pack checkout hijacks result page via shared Paddle singleton callback (synthetic txn) | EditPackCard.tsx:43-50; paddle.ts:46-61 | Don't reuse synthesis callback; dedicated return path or don't mount until regen wired | ✅ Resolved |
| FE-003 | MEDIUM | Invite card shares one `sending` boolean + result/error across all rows + Send-all | InviteBlock.tsx:275-355,400-451 | Per-action in-flight state; scope/ label result-error; client email validation | ✅ Resolved (per-action busy + client email check) |
| FE-004 | MEDIUM | Edit-memory modal not an accessible dialog (no role/focus-trap/Escape) | ManageDashboard.tsx:369-398 | Real dialog: role/aria-modal, focus trap+restore, Escape, inert background | ✅ Resolved |
| FE-005 | MEDIUM | Result-page phase transitions not announced to AT | ResultFlow.tsx:160-212 | aria-live status region; role=alert on error; focus result heading on done | ✅ Resolved |
| FE-006 | LOW | Dedup-on-blur races submit; confirm-email autocomplete hack | CreateForm.tsx:307-324,607,616 | Guard checkExisting during submit; autoComplete="off" | ✅ Resolved |
| FE-007 | LOW | Word download filename not sanitized | ResultFlow.tsx:39 | Strip illegal chars from honoree name before a.download | ✅ Resolved |

### Backend Engineer (conf 8 / qual 8 / prod 8)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| BE-01 | HIGH | Lock TTL 30s < 60s synthesis budget → concurrent double-synthesis / double Claude spend | collection-finalize-core.ts:62,71-92; memorial/config.ts:149 | Set lockTtlMs ≥ maxDuration+margin (≥90s); or flip a 'generating' status sentinel inside lock | ✅ Resolved |
| BE-02 | HIGH | Deadline sweep not product-scoped → cross-product delete/email in shared DB | collection-deadline-sweep-handler.ts:89,138-179; collections.ts:402-411 | Add product param + explicit per-collection product guard before 2nd occasion | ✅ Resolved |
| BE-03 | MEDIUM | get-collection lacks product guard (returns other product's PII) | get-collection-handler.ts:30-37 | 404 if collection.product !== config product | ✅ Resolved |
| BE-04 | MEDIUM | mark-paid mock path skips product guard + status check | collection-mark-paid-handler.ts:49-53,80-85 | Verify product in mock branch; short-circuit if already generated | ✅ Resolved (#293) |
| BE-05 | LOW | Crash window between markUsed and setCollectionStatus leaves status='open' | collection-finalize-core.ts:92-95 | Make status the durable idempotency signal; alert when checkUsed true but status≠generated | ✅ Resolved (#295 — status-first finalize) |
| BE-06 | LOW | Dedup race mapping relies on regex over Neon error text | submit-contribution-handler.ts:140-173; schema.sql:66-72 | Match SQLSTATE 23505 / err.constraint instead of message regex | ✅ Resolved |

### Software Architect (conf 8 / qual 8 / prod 7)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| ARCH-01 | HIGH | No purge cron registered → abandoned encrypted memories never deleted | vercel.json:3-8; collections.ts:336; schema.sql | Add /api/cron/purge calling purgeAbandoned; register daily; reconcile privacy/terms | ✅ Resolved |
| ARCH-02 | HIGH | Deadline sweep not product/occasion-scoped — breaks on 2nd occasion | collections.ts:402; deadline-sweep-handler; cron route:18-37 | Product filter + loop cron over every live config; test with two products | ✅ Resolved (sweep product-scoped; cron loops live configs deferred) |
| ARCH-03 | MEDIUM | Advance-pay has no charge-level idempotency → double-charge window | collection-checkout-handler.ts (advance); collections.ts:350 | Re-check paidAt + Redis in-flight lock before creating txn; webhook reconcile | ✅ Resolved |
| ARCH-04 | MEDIUM | txn→collection resolution via prefix-probing across configs; wrong-occasion fallback | resolver.ts:60-92 | Carry occasion in customData / durable Postgres txn→collection record | ⏳ Deferred (redis+customData resolution adequate while single-occasion; durable record post-launch) |
| ARCH-05 | MEDIUM | Reviewed source (1.13.1) ≠ shipped pinned version (1.14.0); stale 1.6.0 comments | package.json:16; core package.json | Review exact pinned version; CI check pin==published tag; update comments | ✅ Resolved (now on 1.15.x) |
| ARCH-06 | LOW | Contributor dedup key = unsalted SHA-256(email), queryable | collections.ts:96; schema.sql | Use keyed HMAC-SHA256 with server secret | ✅ Resolved |
| ARCH-07 | LOW | Invite daily-cap counter non-atomic (get-then-incr) | invite/route.ts | INCR first then check; or use Redis rate-limiter | ✅ Resolved |

### Security Engineer (conf 8.5 / qual 8 / prod 8)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| SEC-01 | HIGH | ENABLE_MOCK_PAYMENT single var disables BOTH payment verification AND real encryption (public key) | aes.ts:21-33,53; mark-paid:36,49; generate:62,76; finalize-core:61 | Fail-closed in prod; decouple encryption key from the mock flag; loud startup log | ✅ Resolved |
| SEC-02 | HIGH | create-collection does not validate/bound organizer deadline → cron cascade-delete | create-collection-handler.ts:121; collections.ts:137 | Parse, reject NaN/past, clamp window, 400 on violation | ✅ Resolved |
| SEC-03 | MEDIUM | mark-paid/generate verify txn completion+product but not amount/tier price | mark-paid:55-74; generate:87-110 | Assert priceId/total matches config.tiers[tier].priceId for env | ✅ Resolved (price-id verified) |
| SEC-04 | MEDIUM | share_token ~48 bits + valid/invalid oracle + IP-spoofable rate limit | collections.ts:125; submit-contribution-handler.ts:128-130,175 | Bump to ≥12 bytes; key rate-limit on trusted client IP | ✅ Resolved (token→96-bit; IP rate-limit unchanged) |
| SEC-05 | LOW | Stored `occasion` is client-supplied, not validated vs live config | create-collection-handler.ts:117 | Derive occasion from validated route/registry, not body | ✅ Resolved (route forces occasion) |

### Legal / Compliance (conf 8 / qual 6.5 / prod 6)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| LC-01 | CRITICAL | Finalized collections retain PII indefinitely — contradicts Privacy Policy | collections.ts:336-339; collections_purge_idx; finalize-core | Set post-generation purge_after; purge generated rows; state real days in policy | ✅ Resolved (code; policy wording → LC-03 attorney) |
| LC-02 | CRITICAL | Consent checked but never recorded (no timestamp/version/policy ref) | submit-contribution-handler.ts:95-97; schema.sql | Persist consent record; add Privacy link + email-storage disclosure at consent | ✅ Resolved |
| LC-03 | HIGH | ToS/Privacy not updated for auto-delete/auto-generate; flagged not-attorney-reviewed | terms/page.tsx; privacy/page.tsx | Attorney ratify addendum; add ToS clauses; surface auto-generate at create | 👤 Founder (attorney) |
| LC-04 | HIGH | No right-to-erasure path for contributors (only organizer can delete) | delete-collection-handler.ts; privacy §7 | Per-contribution capability token or documented erasure SOP + rights line on form | 🟡 Partial (erasure-rights line + SOP email added; per-contribution self-serve token deferred) |
| LC-05 | HIGH | "No account / won't sign you up" copy while email is required and retained | ContributorForm.tsx:467,507,558 | Make reassurance accurate; link Privacy at collection | ✅ Resolved |
| LC-06 | MEDIUM | Pay-in-advance + auto-finalize creates refund / CRD withdrawal ambiguity | refund/page.tsx; deadline-sweep; terms §3 | Clarify 14-day window from purchase; capture CRD ack at generation | 👤 Founder (attorney) |
| LC-07 | MEDIUM | Contributors not notified on auto-delete/auto-use of their data | deadline-sweep-handler.ts:148-205 | Email contributors or disclose auto-delete/auto-include in consent/privacy copy | ✅ Resolved (deadline auto-use/delete disclosed in consent copy) |
| LC-08 | LOW | IP used for rate-limiting/logging not disclosed as processing purpose | submit-contribution-handler.ts:33-37; privacy §2 | Add "abuse prevention/rate limiting (legitimate interest)" to policy | 👤 Founder (attorney) |

### UX Designer (conf 8.5 / qual 8 / prod 8)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| UX-01 | HIGH | Result-page reload after success is a dead end (no already-generated recovery) | ResultFlow.tsx:83-157 | Render recovery state on spent-txn; re-fetch + show stored content read-only | ✅ Resolved |
| UX-02 | HIGH | Edit & Refine pack copy promises regeneration backend doesn't deliver | EditPackCard.tsx:11-15,61-87 | Don't set edit-pack price id in prod; or true coming-soon with no live checkout | ✅ Resolved |
| UX-03 | MEDIUM | InviteScreen renders deadline as raw ISO string | InviteScreen.tsx:95-99 | Reuse formatDeadline / toLocaleDateString | ✅ Resolved |
| UX-04 | MEDIUM | Create-form progress bar + CTA contradict "write memory later" path | CreateForm.tsx:251-262,801-818 | Exclude deferred fields from denominator; equalize the two valid paths | ⏳ Open |
| UX-05 | MEDIUM | Contributor duplicate caught only after full memory, shown as tiny email error | ContributorForm.tsx:132-141,274-277 | On CONTRIBUTION_EXISTS show warm "already shared" terminal screen | ✅ Resolved |
| UX-06 | MEDIUM | Advance-pay framing sells fee as email-quota unlock, buries real benefit | InviteBlock.tsx:174-248,359-362 | Lead with "one-time fee now — finalizing later is free" | ✅ Resolved |
| UX-07 | LOW | Feedback widget never appears for paid-in-advance finalize | ResultFlow.tsx:273-281 | Allow widget in paidFinalize path keyed on admin token/collection id | ✅ Resolved |

### Marketing / Growth (conf 8 / qual 7 / prod 6)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| MKT-001 | CRITICAL | Fabricated MOCK_TESTIMONIALS render on live paid landing | [occasion]/page.tsx; LandingPage.tsx:560-561 | Remove testimonials prop until real/consented; use honest non-endorsement proof | ✅ Resolved |
| MKT-002 | HIGH | No conversion/event analytics — only Vercel pageviews; ad spend unmeasurable | layout.tsx:4,30 | Add GA4/PostHog funnel events + Paddle purchase conversion + UTM/?focus= capture | 👤 Founder (keys) |
| MKT-003 | HIGH | One $49 tier dressed as two cards; weak advance-pay framing | memorial/config.ts:126-139; _landing/memorial.ts:149-172 | Collapse to one honest $49 (or truly differentiate); re-frame advance-pay on outcome | 🟡 Partial (advance-pay reframed; two-card pricing not yet collapsed) |
| MKT-004 | MEDIUM | Required contributor email adds friction to highest-volume step | ContributorForm.tsx:449-476,185-188 | Make email optional / soft-required; strengthen why; use as cross-sell hook | ➖ Accepted (email kept required by product decision) |
| MKT-005 | MEDIUM | Coming-soon occasions capture no demand; "Notify me" is a dead link | OccasionPicker.tsx:33,113; ComingSoon.tsx | Add waitlist email capture; relabel until functional; gate ?focus= for non-live | ⏳ Deferred (waitlist — post-launch) |
| MKT-006 | MEDIUM | Edit & Refine upsell charges for unbuilt refinement | EditPackCard.tsx:1-16,42-55,83-86 | Leave price id unset in prod until regen ships | ✅ Resolved |
| MKT-007 | LOW | No abandoned-funnel recovery for partial create path | page.tsx:169-183; CreateForm.tsx | Lifecycle nudges keyed off collection state via Resend | ⏳ Deferred (lifecycle recovery — post-launch) |

### QA / Test Engineer (conf 8 / qual 7 / prod 6)
| ID | Sev | Issue | Location | Fix | Status |
|----|-----|-------|----------|-----|--------|
| QA-1 | CRITICAL | No webhook backstop for collection payments | webhook-handler.ts; collect/paid/page.tsx:41-48 | Add transaction.completed → markCollectionPaid server-side + test | ✅ Resolved |
| QA-2 | CRITICAL | Entire pay-in-advance + deadline-sweep flow untested | collection-handlers.test.ts | Add mark-paid/finalize-paid/all 5 sweep-branch tests + auth + reminder-once | ✅ Resolved (handler tests added) |
| QA-3 | HIGH | Deadline accepted with no validation → immediate data loss on next cron | create-collection-handler.ts:121 | Parse, reject NaN/past, clamp [now+min, now+max]; test | ✅ Resolved |
| QA-4 | HIGH | Advance-pay return page ignores mark-paid response (no 202 polling) | collect/paid/page.tsx:41-58 | Mirror ResultFlow 202 retry loop; surface settling message; test | ✅ Resolved |
| QA-5 | HIGH | New dedup/identity logic has no db-level tests | collections.test.ts | Add email-hash/organizer/partial-index dup tests; verify error regex | ✅ Resolved (#295 — db-level dedup tests) |
| QA-6 | MEDIUM | Stub occasions default paddleProductId to '' → dedup/guards collapse if enabled | wedding/config.ts:35; retirement/config.ts:35 | Fail fast when enabled but product id empty; registry test | ✅ Resolved (registry startup guard) |
| QA-7 | MEDIUM | App has zero automated tests; no E2E for multi-actor / mock-vs-sandbox | wordsbywtm-hub (no *.test.*) | Playwright happy-path E2E + resolver token-scoping unit test | ⏳ Deferred (app E2E — post-launch) |
| QA-8 | LOW | Cross-product txn guard uses `!== undefined` — productless txn bypasses | collection-generate-handler.ts; mark-paid-handler.ts | Treat missing product as mismatch when resolving collectionId; test | ✅ Resolved (#293 — collection-level product guard) |

---

## Mandatory-Minimum Status (dimensions below 8)

### Quality — 7.56 ⚠ (need +0.44 to 8)
Driven down by Legal (6.5), Marketing (7), QA (7). To reach 8:
- **Legal:** record consent per contribution (LC-02) and define a post-generation retention/purge so the policy isn't internally contradictory (LC-01).
- **Marketing:** re-frame the advance-pay upsell on a real benefit and resolve the one-tier-shown-as-two pricing (MKT-003); reduce/justify required contributor email (MKT-004).
- **QA:** add the deadline-validation clamp (QA-3) and fail-fast on empty stub paddleProductId (QA-6) so destructive paths can't be reached with bad input.

### Prod Readiness — 7.00 ⚠ (need +1.00 to 8)
Lowest dimension; Legal (6), Marketing (6), QA (6), plus Frontend (7) and Architect (7). To reach 8:
- **Frontend/UX:** fix the generated-tribute re-view/refresh dead end (FE-001/UX-01) and stop the edit-pack from charging for a no-op (FE-002/UX-02/MKT-006).
- **Architect:** register a purge cron (ARCH-01) and close the advance-pay double-charge window (ARCH-03).
- **Legal:** post-generation purge (LC-01) + persist consent (LC-02) + attorney ratification of the collection addendum and ToS update for auto-delete/auto-generate (LC-03).
- **Marketing:** remove MOCK_TESTIMONIALS (MKT-001), confirm edit-pack price id unset in prod (MKT-006), ship a Paddle purchase conversion event + UTM/focus attribution (MKT-002).
- **QA:** add the webhook collection-paid branch + test (QA-1), handler tests for mark-paid/finalize-paid/deadline-sweep (QA-2), validate/clamp deadline (QA-3), add 202 polling to the advance return page (QA-4).

### Confidence — 8.19 ✅ (meets minimum) — but note ARCH-05: source reviewed (1.13.1) ≠ shipped pin (1.14.0); confirm the delta doesn't change pay-before-generate or sweep logic.

---

## Path to 9 — per agent

**Frontend (8.5 / 8 / 7)** — Conf→9: run the app and confirm FE-002 post-purchase behavior; verify no server route returns stored tribute for an admin token (FE-001). Qual→9: shared per-action in-flight pattern (FE-003), real Dialog primitive (FE-004), aria-live across state machines (FE-005). Prod→8: FE-001 + FE-002. Prod→9: a11y fixes + invite state + verify real-Paddle finalize→result→refresh in preview.

**Backend (8 / 8 / 8)** — Conf→9: read acquireLock/checkUsed/markUsed TTL semantics; run collection-handlers.test.ts. Qual→9: BE-01 lock TTL + BE-06 SQLSTATE 23505. Prod→9: land BE-01; add BE-02/03/04 product scoping as a hard gate before any 2nd occasion.

**Architect (8 / 8 / 7)** — Conf→9: review shipped 1.14.0 dist, reconcile comment drift (ARCH-05). Qual→9: atomic invite counter (ARCH-07), keyed HMAC dedup (ARCH-06), resolve config from customData (ARCH-04). Prod→8: purge cron (ARCH-01) + advance-pay double-charge (ARCH-03). Prod→9: product-scope sweep + durable txn→collection resolution before 2nd occasion (ARCH-02/04).

**Security (8.5 / 8 / 8)** — Conf→9: execute flows; read Paddle client / redis lock internals; confirm txn customData immutable. Qual→9: validate deadline (SEC-02) + bind payment honoring to tier price (SEC-03). Prod→9: fail-closed on ENABLE_MOCK_PAYMENT in prod + decouple encryption key (SEC-01); bound deadline (SEC-02); add txn amount verification (SEC-03); widen share token (SEC-04).

**Legal (8 / 6.5 / 6)** — Conf→9: confirm no external purge job; compare attorney .docx vs rendered pages. Qual→8: LC-02 + LC-01. Qual/Prod→9: contributor erasure (LC-04), accurate "no account/email" copy (LC-05), refund/CRD alignment (LC-06). Prod→8: LC-01 + LC-02 + LC-03 attorney ratification.

**UX (8.5 / 8 / 8)** — Conf→9: confirm exact spent-txn / CONTRIBUTION_EXISTS responses; check edit-pack price id in prod env. Qual→9: UX-03 ISO date, UX-04 progress/CTA, UX-05 warm terminal screen. Prod→9: UX-01 + UX-02.

**Marketing (8 / 7 / 6)** — Conf→9: run funnel live with analytics; confirm prod env for editpack/testimonials. Qual→8: MKT-003 + MKT-004. Qual→9: MKT-007 lifecycle nudges + MKT-005 demand capture. Prod→8: MKT-001 + MKT-006 + MKT-002. Prod→9: full GA4/PostHog coverage + waitlist + recovery emails.

**QA (8 / 7 / 6)** — Conf→9: run venture-core suite; grep webhook+Paddle to confirm no out-of-band paid path. Qual→8: QA-3 + QA-6. Qual→9: QA-5 dedup/index tests. Prod→8: QA-1 webhook + QA-2 handler tests + QA-3 + QA-4. Prod→9: app-level E2E + db dedup tests + fail-fast on empty stub ids.

---

## Consolidated Action List

### 🔴 Must-do before launch (blocks the mandatory 8 minimum)
1. **MKT-001** — Remove MOCK_TESTIMONIALS from the live memorial landing. *(CRITICAL, deceptive endorsement)*
2. **LC-01 / ARCH-01** — Set post-generation `purge_after` at finalize and register a purge cron; reconcile Privacy/Terms retention claims. *(CRITICAL)*
3. **LC-02** — Persist a consent record (timestamp + version + policy ref) and add Privacy link + email-storage disclosure at the consent checkbox. *(CRITICAL)*
4. **QA-1** — Add Paddle webhook `transaction.completed` → `markCollectionPaid` backstop + test. *(CRITICAL, charged-but-unrecorded)*
5. **QA-2** — Add handler tests for mark-paid / finalize-paid / all five deadline-sweep branches. *(CRITICAL, deletes memories untested)*
6. **FE-001 / UX-01** — Fix re-view/refresh of a generated tribute (carry admin token + read-back route). *(CRITICAL/HIGH, paying customer dead end)*
7. **FE-002 / UX-02 / MKT-006** — Do not set edit-pack price id in prod until regen is wired (stop charging for a no-op).
8. **SEC-02 / QA-3** — Validate and clamp the deadline server-side (reject NaN/past) to prevent cron cascade-delete.
9. **SEC-01** — Fail-closed on ENABLE_MOCK_PAYMENT in production and decouple the encryption key from that flag.
10. **LC-03** — Attorney ratification of the collection addendum + ToS clauses for auto-delete/auto-generate/auto-extend.
11. **ARCH-03** — Close the advance-pay double-charge window (re-check paidAt + in-flight Redis lock).
12. **QA-4** — Add 202-polling to the advance-pay return page (no silent bounce).
13. **BE-01** — Raise lockTtlMs ≥ synthesis budget (or 'generating' sentinel) to prevent double Claude spend.

### 🟡 Before paid traffic
- **MKT-002** — GA4/PostHog funnel events + Paddle purchase conversion + UTM/`?focus=` capture.
- **MKT-003 / UX-06** — Collapse the false two-tier pricing; re-frame advance-pay around "finalizing later is free."
- **MKT-005** — Waitlist capture on coming-soon occasions; relabel/gate "Notify me" and `?focus=` aliases.
- **MKT-004** — Reduce/justify required contributor email.
- **LC-04 / LC-05 / LC-06** — Contributor erasure path; accurate "no account/email" copy; refund/CRD alignment.

### 🟢 Path-to-9
- **BE-02 / BE-03 / BE-04 / ARCH-02 / ARCH-04 / SEC-05** — Product-scope every handler + durable txn→collection resolution **(hard gate before any 2nd occasion).**
- **FE-003/004/005, UX-03/04/05/07** — Invite per-action state, accessible dialog, aria-live, ISO-date format, write-later path, warm dup screen, paid-finalize feedback.
- **ARCH-05** — Review the exact shipped 1.14.0 dist; CI check pin==published tag.
- **ARCH-06 / ARCH-07 / BE-06 / SEC-03 / SEC-04 / QA-5 / QA-6 / QA-7 / QA-8** — Keyed HMAC dedup, atomic invite counter, SQLSTATE matching, txn amount verification, wider share token, dedup/db tests, fail-fast stub ids, app E2E, productless-txn guard.
- **LC-07 / LC-08 / MKT-007 / FE-006 / FE-007** — Contributor notifications, IP disclosure, abandoned-funnel nudges, dedup-on-blur race, filename sanitization.

---

## Pre-Launch Blockers Summary

| # | Finding(s) | Expert(s) | Severity | Theme | Status |
|---|-----------|-----------|----------|-------|--------|
| 1 | MKT-001 | Marketing | CRITICAL | Fake testimonials on live paid page | OPEN |
| 2 | LC-01 / ARCH-01 | Legal, Architect | CRITICAL | No PII purge — policy violation | OPEN |
| 3 | LC-02 | Legal | CRITICAL | Consent not recorded | OPEN |
| 4 | QA-1 | QA | CRITICAL | No webhook payment backstop | OPEN |
| 5 | QA-2 | QA | CRITICAL | Pay-advance + sweep untested | OPEN |
| 6 | FE-001 / UX-01 | Frontend, UX | CRITICAL/HIGH | Generated tribute dead end | OPEN |
| 7 | FE-002 / UX-02 / MKT-006 | Frontend, UX, Marketing | HIGH | Edit-pack charges for no-op | OPEN |
| 8 | SEC-02 / QA-3 | Security, QA | HIGH | Unvalidated deadline → cascade delete | OPEN |
| 9 | SEC-01 | Security | HIGH | Mock flag disables payment + encryption | OPEN |
| 10 | LC-03 | Legal | HIGH | ToS/Privacy not attorney-ratified for collection model | OPEN |
| 11 | ARCH-03 | Architect | MEDIUM | Advance-pay double-charge window | OPEN |
| 12 | QA-4 | QA | HIGH | Advance return page no 202 polling | OPEN |
| 13 | BE-01 | Backend | HIGH | Lock TTL < synthesis → double spend | OPEN |
| 14 | MKT-002 | Marketing | HIGH | No conversion analytics | OPEN (before paid traffic) |
| — | BE-02/03/04, ARCH-02/04 | Backend, Architect | HIGH/MED | Not product-scoped | Gate before 2nd occasion |

**Counts:** 5 CRITICAL findings (FE-001, LC-01, LC-02, MKT-001, QA-1) · 14 HIGH findings (FE-002, BE-01, BE-02, ARCH-01, ARCH-02, SEC-01, SEC-02, LC-03, LC-04, LC-05, UX-01, UX-02, MKT-002, MKT-003, QA-3, QA-4, QA-5 — note several experts overlap on the same themes).

---

## Remediation Status — updated 2026-06-17 (post-review fixes)

Fixes shipped across app branch `feat/collection-app` and venture-core PRs **#289 (→1.15.0)** and **#291 (→1.15.1)**. App re-pinned to **1.15.0** (re-pin to 1.15.1 after #291 publishes).

### All 5 CRITICALs — resolved ✅
| Finding | Fix | Where |
|---|---|---|
| MKT-001 fake testimonials | removed `MOCK_TESTIMONIALS` from live landing | app `0689f8f` |
| FE-001 tribute re-view dead end | store `generated_content` + `createGetTributeHandler`; `/api/collection/tribute` + dashboard `?t=` link + ResultFlow read-back | core #289 + app `f2cd923` |
| LC-01 PII kept forever | post-gen `purge_after` (30d) + `purgeExpired` + `/api/cron/purge` daily | core #289 + app `f2cd923` |
| LC-02 consent not recorded | per-contribution consent record (ts + version) | core #289 |
| QA-1 no webhook backstop | `transaction.completed` → `markCollectionPaid` | core #289 |

### HIGH — resolved ✅
FE-002/UX-02/MKT-006 edit-pack no-op charge (app `0689f8f`) · BE-01 lock TTL 90s (app `cf3c3ae`) · BE-02/ARCH-02 sweep product-scoped + BE-03 get-collection guard (#289) · SEC-02/QA-3 deadline validation (#289) · UX-01 result recovery (app `f2cd923`) · LC-05 accurate copy (app `0689f8f`) · QA-4 202 polling (app `0689f8f`) · MKT-003/UX-06 advance-pay reframe (app `5eed25a`) · SEC-01 fail-closed mock (#291) · ARCH-03 double-charge guard (#291) · QA-2 handler tests (#291).

### Path-to-9 — resolved ✅
ARCH-06 keyed HMAC dedup · SEC-03 price verification · SEC-04 wider share token · BE-06 SQLSTATE dup match (all #291) · FE-004 dialog a11y · FE-005 aria-live · FE-006 dedup-race guard · FE-007 filename sanitize · UX-03 ISO date · UX-05 warm dup screen · UX-07 paid-finalize feedback · ARCH-05 review-vs-shipped version reconciled (now 1.15.x).

### Still open
- **Founder-owned:** LC-03 (attorney ratification of collection ToS/Privacy — retention is **30 days**) · MKT-002 (GA4/PostHog keys) · prod env (`ENABLE_MOCK_PAYMENT` off, edit-pack price unset, set `CRON_SECRET`) · run the 1.15.0 ALTER TABLE (done).
- **Remaining engineering (lower severity / path-to-9):** LC-04 contributor erasure path · BE-04 mark-paid mock product guard · BE-05 finalize crash-window sentinel · ARCH-04 durable txn→collection resolution · ARCH-07 atomic invite counter · SEC-05 occasion from route not body · UX-04 progress-bar/CTA for write-later · MKT-004 email friction · MKT-005 waitlist capture · QA-5 db-level dedup tests · QA-6 fail-fast empty stub product id · QA-7 app E2E · QA-8 productless-txn guard.

---

## How to re-run this review (SES-044)

1. **Land the 🔴 must-do fixes** (especially the 5 CRITICALs + SEC-01/SEC-02 + LC-03 attorney ratification), publish a new venture-core version, and pin wordsbywtm-hub to it.
2. **Re-review against the exact shipped version** (resolve ARCH-05): tag venture-core at the pinned release; confirm pay-before-generate and sweep logic match the dist the app runs.
3. **Re-run the 8 agents concurrently** with the same prompt, pointing each at: `wordsbywtm-hub/src/` (app) + the published venture-core collection source (handlers/db/crypto/schema) + the three legal pages. Each agent reads all source before scoring.
4. **Enforce the scoring rule:** minimum 8 per dimension; path-to-9 required for any score < 9. Compute AVERAGE per dimension and Overall = mean of the three averages.
5. **Verify dynamically this round** (the gaps that capped confidence): run the venture-core test suite; run the app happy-path E2E (create → contribute ×2 incl duplicate → exclude → pay(mock) → generate); confirm in a deployed preview the real-Paddle finalize → result → refresh path; and confirm prod env state for `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK` (unset) and testimonials (removed).
6. **Hard gate:** do not flip a 2nd occasion live until BE-02/03/04 + ARCH-02/04 product-scoping fixes land and are tested with two products' collections present.
