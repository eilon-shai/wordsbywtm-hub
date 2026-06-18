# Expert Panel Final Review — SES-046

**Date:** 2026-06-18
**Subject:** Collaborative-Collection hub (wordsbywtm-hub) after the "fold all products into one hub" migration — **four live occasions** (memorial, retirement, wedding, anniversary) + redesigned multi-occasion homepage.
**Reviewed state:** `review/ses046-integration` (main + the homepage PR), all four occasions `live: true`.
**Method:** 8-lens panel → adversarial verification of every CRITICAL/HIGH finding (skeptics tried to refute against real code) → chair synthesis. Findings traced to `file:line`.
**Focus mandates (per founder):** (1) end-to-end **flows**, (2) **abuse / double-usage**, (3) **data / payment loss**.

---

## 0. Remediation status (2026-06-18, post-review — PR #25 + venture-core 1.21.0)

The engineering findings below were remediated in **PR #25** (app) and
**venture-core 1.21.0** (re-pinned). Status:

- ✅ **HIGH — ElevenLabs sub-processor disclosure** — added to interim Privacy §4 + Terms §8 (still pending LC-03 attorney ratification).
- ✅ **MEDIUM — EU withdrawal-waiver server-side** — app transmits the flag; venture-core **1.21.0** `collection-checkout-handler` now records it via `checkAndMarkTerms`. App re-pinned to 1.21.0.
- ✅ **MEDIUM — per-occasion copy** — `OccasionMeta.deliverableNoun`/`readAloudContext`; no more "tribute/play at the service" on toast/send-off.
- ✅ **MEDIUM — advance-pay checkbox copy** — deferred-performance model.
- ✅ **MEDIUM — manual E2E** — rebuilt as a per-occasion matrix + isolation rows.
- ✅ **MEDIUM — test coverage** — cross-product isolation + occasion-config + audio tests (→90).
- ✅ **MEDIUM — OG/favicon 404** — favicon + generated `opengraph-image` (root + per-occasion) + `metadataBase`.
- ✅ **MEDIUM — share/start metadata** — `robots:noindex` on `/c/[shareToken]` + `/[occasion]/start`.
- ✅ **MEDIUM — homepage pillars** — hero now names woven piece + PDF + audio.
- ✅ **LOW** — resolver no-arbitrary-fallback; registry unique-product-id guard; invite-email HTML escaping; audio newest-voice; duplicate H1; accent-token parity (manage); stale comments. Plus: `UNDER_CONSTRUCTION` gate implemented (was a no-op).
- ⏳ **Founder-owned (unchanged):** production Paddle live prices, MKT-002 analytics ids (code shipped — GA4 + Clarity + Ads conversion), LC-03 attorney ratification (must include the ElevenLabs + waiver edits).

Net: every engineering finding closed; remaining items are founder-owned + the live preview run (the 9+ lever).

---

## 1. Scorecard

| Expert | Confidence | Quality | Prod-Readiness |
|---|---|---|---|
| Frontend Engineer | 8.0 | 8.4 | 8.3 |
| Backend Engineer | 8.0 | 8.6 | 8.3 |
| Software Architect | 8.5 | 8.4 | 7.8 |
| Security Engineer | 9.0 | 8.7 | 8.6 |
| Legal / Compliance | 8.0 | 8.0 | 7.5 ⚠ |
| UX Designer | 8.0 | 8.2 | 8.1 |
| Marketing / Growth | 8.0 | 8.2 | 7.6 ⚠ |
| QA / Test Engineer | 8.0 | 8.0 | 7.5 ⚠ |
| **AVERAGE** | **8.19** | **8.31** | **7.96** |

**Overall (mean of the three dimension-averages): 8.15**

### Delta vs SES-045

| Dimension | SES-045 | SES-046 | Δ |
|---|---|---|---|
| Confidence | 9.03 | 8.19 | −0.84 |
| Quality | 8.60 | 8.31 | −0.29 |
| Prod-Readiness | 8.38 | 7.96 | −0.42 |
| **Overall** | **8.67** | **8.15** | **−0.52** |

The regression is **expected for a migration that quadrupled the surface area**. It is driven by breadth-of-coverage and migration-residue — memorial-coded copy leaking onto celebratory occasions, an undisclosed audio sub-processor, an unrecorded EU waiver, a stale memorial-only manual test plan, and no automated coverage for the 3 migrated occasions or audio — **not by new correctness or safety holes**. Cross-product isolation, pay-before-generate, and data-durability were preserved or improved (strict webhook routing replaced the first-live-config fallback).

## 2. Mandatory-Minimum Status

**NOT MET** — solely because **Prod-Readiness averages 7.96** (< 8). Confidence (8.19) and Quality (8.31) clear the bar. Three lenses sit at 7.5–7.6 Prod-Readiness (Legal, Marketing, QA), pulled down by the founder-owned items + the two confirmed compliance-text gaps + test-coverage debt — not by engineering defects.

## 3. Go / No-Go

**GO for production, conditional.** No CRITICAL or surviving-HIGH *engineering correctness/safety* defect blocks the migration: typecheck clean, 82 tests green, isolation sound, pay-before-generate and data-durability intact. Both HIGH "paid customer loses deliverable" findings were verified **down to LOW/MEDIUM** (unreachable / recoverable). The launch-gating engineering items are the **two confirmed legal-text gaps** (small edits). Ship once those land + the founder-owned checklist clears.

## 4. Focus-mandate verdicts

- **FLOWS — PASS.** All four occasions trace cleanly end to end (homepage focus-aware CTA → landing → /start → invite → contribute → review → finalize via checkout-at-finalize AND pay-in-advance → generate → PDF + audio → email → token re-view). Error/terminal states thorough. Dominant defect is a **copy/tone regression** (shared post-create UI says "tribute"/"play at the service" for all occasions while emails correctly say toast/send-off), not a functional break.
- **ABUSE — PASS.** Cross-product isolation holds: 4 distinct paddleProductIds + redisKeyPrefixes + from-addresses (no collisions), strict no-fallback webhook routing re-verifying signature+product+price, create route forces occasion from the validated path (SEC-05), generate/mark-paid re-verify `customData.product`. Pay-before-generate enforced in depth and retry-safe; one-time-use locked; double-charge prevented (idempotent coalesce); invite/contributor caps atomic; support console fail-closed; prompt-injection neutralized identically across occasions. No HIGH abuse defect survived verification.
- **DATA/PAYMENT LOSS — PASS (one narrow latent defect).** purgeExpired never deletes paid-ungenerated work; purge_after pushed on pay/extend; generated content + audio durable in Postgres (audio ON DELETE CASCADE); paid_at integrity via coalesce on both webhook + finalize; admin token mirrored to session+localStorage; generate retries + falls back to /tribute. Both HIGH "lose deliverable" findings downgraded: the `resolveConfigByTxn` memorial-fallback is real but reached only by the txn-scoped generate path seconds after checkout (Redis mapping still present); pay-in-advance + re-view resolve by DB token and are immune; paid work persists 30 days reachable by admin link. Net: recoverable, time-gated first-generation edge case (LOW/MEDIUM).

## 5. Must-fix before launch (engineering)

1. **[HIGH] Disclose ElevenLabs as a sub-processor** in Privacy §4 + §2A inventory and Terms §8, and extend the no-training assurance — tribute content (often special-category for memorials/eulogies) is sent to `api.elevenlabs.io` (`src/lib/audio.ts:84`) but named in no legal page. GDPR Art 13/14 recipient-disclosure gap.
2. **[MEDIUM] Record the EU withdrawal-waiver server-side** — thread the advance-pay waiver flag through `/api/collection/checkout` into venture-core `checkAndMarkTerms` (`waiverTimestamp`/`waiverVersion`) so the present-tense Privacy §2 / Terms §3 promise is true (`src/components/InviteBlock.tsx:199`).
3. **[MEDIUM] Genericize shared post-create copy** — derive the deliverable noun + "play at the service" phrasing from the occasion in `ResultFlow.tsx` (:589,:598,:623,:824) and `ManageDashboard.tsx:627` so wedding/retirement/anniversary stop reading as funerals on screen.
4. **[MEDIUM] Fix advance-pay checkbox copy** to mirror the deferred-performance model (`InviteBlock.tsx:277`).
5. **[MEDIUM] Rebuild the manual E2E plan as a per-occasion + cross-product-isolation matrix**, and add minimal automated coverage for the 3 migrated occasions, cross-product isolation, and the audio feature (`docs/MANUAL_E2E_TEST_PLAN.md`; `test/integration/webhook.test.ts`; audio route).

## 6. Confirmed findings (post-verification; refuted findings dropped)

**HIGH**
- ElevenLabs audio sub-processor undisclosed in all legal pages — `src/lib/audio.ts:84` (gap in privacy §4/§2A, terms §8). *[engineering, launch-gate]*

**MEDIUM**
- EU withdrawal-waiver never recorded server-side, contradicting present-tense Privacy §2 / Terms §3 — `src/components/InviteBlock.tsx:199`, `src/app/api/collection/checkout/route.ts`.
- Shared post-create UI hardcodes "tribute" / "play at the service" for all occasions while emails say toast/send-off — `ResultFlow.tsx:623` (+:589,:598,:824), `ManageDashboard.tsx:627`.
- Pay-in-advance checkbox says "start delivery immediately" but generation is deferred — `InviteBlock.tsx:277`.
- Stale manual E2E plan (memorial-only, calls wedding/retirement "stubs", describes removed webhook fallback) — `docs/MANUAL_E2E_TEST_PLAN.md`.
- No automated cross-product-isolation coverage (a reintroduced fallback would pass the suite) — `test/integration/webhook.test.ts`.
- 3 migrated occasions have no end-to-end automated coverage — `e2e/collection-happy-path.spec.ts`.
- New audio feature has zero automated tests — `src/app/api/collection/audio/route.ts:32`.
- All OG images + favicon 404 (no `public/` dir) → empty social cards on every shared link — `src/products/_landing/*` (ogImageUrl), `src/app/layout.tsx:19`.
- Most-shared funnel URLs (`/c/[shareToken]`, `/[occasion]/start`) lack metadata; share page lacks `robots:noindex` for token hygiene.
- Homepage hero omits 2 of 3 package pillars (no PDF / audio mention) — `src/app/page.tsx`.

**LOW** (selected — full list in the panel transcript)
- `resolveConfigByTxn` memorial-fallback + stale "single live occasion" comment — `src/lib/resolver.ts:80` (recoverable, narrow).
- registry guard checks non-empty but not **uniqueness** of paddleProductId across live occasions — add a startup uniqueness assertion — `src/lib/registry.ts:71`.
- No per-IP throttle on public contribute/audio (bounded by caps).
- Invite-email HTML not entity-escaped (self-XSS only) — `src/app/api/collection/invite/route.ts:37`.
- `getIntake` memorial fallback for unknown slugs (grief-tone hazard for a future celebratory occasion).
- Result page drops the per-occasion accent the manage page applies.
- Audio re-view picks an arbitrary stored voice; audio download filename hardcodes "Tribute for …".
- Duplicate H1 on `/start`; OccasionPicker doc comment stale ("3-up" vs 4-up); ComingSoon stub hardcodes /memorial.

## 7. Founder-owned (not engineering defects — same posture as SES-045)

- **Production (live) Paddle PRICE ids** for retirement/wedding/anniversary (sandbox + product ids set; explicitly deferred). See `docs/PRODUCTION_ENV.md`. Consider a startup/CI guard asserting a non-empty live price for every live occasion in production.
- **MKT-002** — conversion analytics across the four-occasion picker, `?focus=` funnel, and free-create→finalize path.
- **LC-03** — real-attorney ratification of the AI-drafted legal pages (include the new ElevenLabs sub-processor + waiver edits in that review).

## 8. Path back to ≥8 / ≥9
The fastest lift to clear the mandatory minimum is **Prod-Readiness**: land the two compliance-text fixes (#1, #2) and the test-coverage rebuild (#5), which directly raise the Legal/QA cells. The founder-owned trio (prices, analytics, attorney) lifts the remaining sub-8 cells. A live preview run (still not performed) is the main lever toward 9+.
