# Expert Panel Review — SES-048

| | |
|---|---|
| **Date** | 2026-06-21 |
| **Subject** | wordsbywtm-hub — stateless Next.js 15 / React 19 collaborative-collection app (4 live occasions: memorial, retirement, wedding, anniversary) |
| **Reviewed state** | `main` after PRs #42–#49 + venture-core **1.24.2** (pinned, exact) |
| **Method** | Re-review after SES-047 remediation. Each of 8 lenses opened the cited files on `main`, verified whether each SES-047 fix actually landed AND is correct (present-but-wrong counts as not-fixed), then hunted for new/regression issues. Every CRITICAL/HIGH was put through an independent adversarial verification pass; only findings with `isReal=true` survive. Chair independently re-verified the schema reconciliation, the `isOrganizer` admin-token gate, the consent/`ad_personalization` path, the registry uniqueness guards, and the memorial-only e2e coverage against `main`. |
| **Focus mandates** | (1) End-to-end FLOWS across all four occasions; (2) ABUSE / double-usage; (3) DATA / PAYMENT LOSS; (4) CAMPAIGN / LAUNCH READINESS |

---

## 0. Executive Summary

This is a materially stronger build than SES-047. The single biggest drag on the prior review — a stale `db/schema.sql` that did not match the venture-core runtime (a fresh/DR/preview deploy would have shipped a broken schema) — is **genuinely resolved and now CI-gated**: `db/schema.sql` carries every runtime column as idempotent `add column if not exists`, both partial unique abuse-backstop indexes (`contributions_email_uniq`, `contributions_organizer_uniq`), and the deadline sweep index, and a nightly + on-demand `revenue-e2e` workflow applies that exact file to a disposable Neon branch and runs the full mutating happy-path with real Haiku synthesis. The other dominant SES-047 risks — client-trusted `isOrganizer` (free-generation / organizer-slot squatting / cap bypass), missing consent gate, missing pay-in-advance conversion firing — all landed and verified correct.

**Overall moves from 8.08 → 8.47.** Every dimension average clears the 8.0 mandatory minimum: Confidence 8.61, Quality 8.49, Prod-Readiness 8.31.

The product is **safe to launch for organic/production traffic Monday**. Paid ad spend is **conditional on one code-level fix**: memorial routes still grant Google `ad_personalization` globally once a visitor accepts the consent banner, which auto-enrolls grief-page visitors into remarketing/personalization audiences — a Google sensitive-category exposure that no manual ad-ops policy can fully prevent. This is small and fast to fix and must land before memorial ad spend; the other three occasions can spend immediately.

The residual themes are **test-coverage depth** (the entire React component layer and the whole conversion/analytics layer have zero unit/render tests; idempotency is asserted against hand-written fakes rather than the real venture-core handlers; automated browser coverage is memorial-only across all four live occasions) and **maintainability/blast-radius** items (no `redisKeyPrefix` uniqueness guard; venture-core source/dist divergence). None of these is a live-path defect.

---

## 1. Scorecard

| Lens | Confidence | Quality | Prod-Readiness |
|------|-----------:|--------:|---------------:|
| Frontend Engineer | 8.7 | 8.5 | 8.5 |
| Backend Engineer | 8.7 | 8.7 | 8.6 |
| Software Architect | 8.7 | 8.7 | 8.5 |
| Security Engineer | 8.8 | 8.7 | 8.5 |
| Legal / Compliance | 8.6 | 8.4 | 8.4 |
| UX Designer | 8.6 | 8.4 | 8.4 |
| Marketing / Growth | 8.6 | 8.4 | 8.0 |
| QA / Test Engineer | 8.2 | 8.1 | 8.0 |
| **Average** | **8.61** | **8.49** | **8.31** |

**Overall = mean of the three dimension-averages = (8.61 + 8.49 + 8.31) / 3 = 8.47**

---

## 2. Delta vs SES-047

| Dimension | SES-047 | SES-048 | Δ |
|-----------|--------:|--------:|---:|
| Confidence | 8.31 | 8.61 | +0.30 |
| Quality | 8.33 | 8.49 | +0.16 |
| Prod-Readiness | 7.60 | 8.31 | +0.71 |
| **Overall** | **8.08** | **8.47** | **+0.39** |

**Why it moved.** The largest lift is Prod-Readiness (+0.71), driven almost entirely by retiring the SES-047 schema CRITICAL that had pinned the Backend (6.8) and Architect (7.7) prod-readiness cells. The schema is now reconciled, idempotent, and — critically — exercised by a real-DB CI gate, so schema-vs-runtime drift can no longer ship silently. Confidence rose (+0.30) because reviewers traced real code paths and found the campaign-critical work (purchase-conversion firing with a shared dedup key, Consent Mode v2 default-denied gate) genuinely wired, not cosmetic, and the money/abuse architecture (idempotent `markCollectionPaid` coalesce, conditional+atomic `setCollectionGenerated`, admin-token-gated `isOrganizer`, partial-unique abuse backstops) verified correct against the pinned dist. Quality moved least (+0.16): craft is high and well-commented, but the test pyramid did not deepen proportionally — the React layer and conversion layer remain untested, idempotency is asserted against fakes, and automated browser coverage stayed memorial-only — so reviewers correctly declined to inflate Quality past the high-8s. One genuine new HIGH (memorial `ad_personalization`) and a UX tone regression introduced by the SES-047 icon fix kept Prod-Readiness from rising further.

---

## 3. Mandatory-Minimum Status

**PASS.** Every dimension average is ≥ 8.0 (Confidence 8.61, Quality 8.49, Prod-Readiness 8.31). The weakest individual cells are Marketing and QA Prod-Readiness, both at exactly 8.0, held there deliberately by the memorial-remarketing HIGH and the conversion-layer/occasion-coverage test gaps respectively.

---

## 4. Go / No-Go

### (a) Production / Organic — **GO**

No confirmed CRITICAL or HIGH defect blocks organic traffic. Pay-before-generate is re-verified server-side, idempotency is correct on the real handlers, per-occasion isolation is enforced and tested, abuse backstops are in the canonical schema and DB-enforced, and the consent gate is correctly ordered. Ship it.

### (b) Paid Ad Campaign — **CONDITIONAL-GO**

**Blocking condition (memorial only):** Fix **MF-1** — suppress `ad_personalization` / `ad_user_data` on memorial routes even after consent — before turning on memorial ad spend. Wedding, retirement, and anniversary may begin paid spend immediately.

**Strongly recommended before/at spend (not hard blockers):**
- Set `ADS_CONVERSION_LABEL` whenever `ADS_TAG_ID` is set (MF-5) — otherwise Smart Bidding silently receives no purchase signal.
- Confirm the `revenue-e2e` gate (`vars.RUN_REVENUE_E2E=true`) has actually run green against the Neon branch at least once on this `main`, and make it required on venture-core bump PRs (MF-6).

---

## 5. Focus-Mandate Verdicts

| Mandate | Verdict | Reason |
|---------|---------|--------|
| **(1) FLOWS — all four occasions** | **CONDITIONAL** | The shared `src/app/[occasion]` route and reconciled per-occasion configs make all four functionally live, and config-level tests cover all four. But **automated browser/render/synthesis coverage is memorial-only** (verified: `e2e/smoke.spec.ts` and `e2e/collection-happy-path.spec.ts` only ever load `/memorial`). Wedding/retirement/anniversary each ship ~250-line configs with render-affecting divergence (e.g. wedding's relationship Select) that no e2e or render test touches. Manual E2E plan must be run across all four before spend; add per-occasion render smoke. |
| **(2) ABUSE / double-usage** | **PASS** | `isOrganizer` is admin-token-gated (constant-time, degrade-not-reject), verified by `test/integration/contribute-guards.test.ts` (proven honored; no-token degraded; wrong-token degraded AND capped). Contributor cap is atomic inside the INSERT; email/organizer dedup is backstopped by status-agnostic partial unique indexes in canonical schema with 23505 mapping. Audio POST rate-limited; create rate-limited. The only residual is a narrow Redis-outage synthesis-cost window (LOW; no double-charge, no duplicate persisted content). |
| **(3) DATA / PAYMENT LOSS** | **PASS** | `markCollectionPaid` is coalesce-idempotent (replay-safe); `setCollectionGenerated` is conditional+atomic (`where status<>'generated' returning id`); txn→collection binding is server-set from the admin-authenticated checkout (no pay-for-A-mark-B); webhook verifies signature + product + price-id; `purgeExpired` never deletes paid-ungenerated. Schema is reconciled and DR-rebuildable at the file level and CI-gated. Caveat (QA): real-handler idempotency is proven only by the single-pass e2e gate — no replay/double-finalize step exists in any automated test reachable from this repo. |
| **(4) CAMPAIGN / LAUNCH READINESS** | **CONDITIONAL** | Conversion tracking is correct and complete (purchase fires on both pay paths with a shared dedup key; mid-funnel `collection_created`/`begin_checkout` wired; price config-driven). Consent Mode v2 default-denied + banner is correct. sitemap/robots/canonicals/metadataBase all correct and non-www. **Blocked on MF-1** (memorial remarketing). Plus: zero automated coverage of the conversion layer, no social proof / explicit guarantee near CTA on $49 cold traffic, and a silent no-op risk if `ADS_CONVERSION_LABEL` is unset. |

---

## 6. Must-Fix List (confirmed only)

| ID | Sev | Owner | Item | Location |
|----|-----|-------|------|----------|
| **MF-1** | HIGH | Eng (pre-memorial-spend) | Memorial visitors enter Google remarketing/personalization audiences once consent is granted — `ad_personalization`/`ad_user_data` granted globally with no per-route suppression. Add a memorial-route `gtag('consent','update',{ad_personalization:'denied',ad_user_data:'denied'})` (or `allow_ad_personalization_signals:false`) even after consent. | `src/components/ConsentBanner.tsx:32-39`; `src/components/SiteAnalytics.tsx:22` |
| **MF-2** | MEDIUM | Eng | Add `redisKeyPrefix` uniqueness startup guard — it is an isolation boundary equal to `paddleProductId` (a dup collides the txn→collection mapping and could resolve a payment to the wrong occasion's config). Mirror the existing `paddleProductId` uniqueness loop. | `src/lib/registry.ts:99-110` |
| **MF-3** | MEDIUM | Eng | Prefs/pay screen tone-fields still memorial-flavored on celebratory occasions: `TONE_FIELD` defaults to "Solemn & reverent" and `CONTEXT_FIELD` placeholder is grief-flavored, rendered verbatim on wedding/retirement/anniversary — on the screen right before payment. `AVOID_FIELD` was made occasion-aware in the same pass; do the same for context/tone. | `src/app/[occasion]/result/ResultFlow.tsx:89,108,634,638` |
| **MF-4** | MEDIUM | Eng/QA | Add automated coverage where it is currently zero and money/flow-critical: (a) per-occasion render smoke for all four occasions; (b) conversion-layer unit tests (purchase fires once per txn, deduped across both pay paths via the shared `wtm:purchase-tracked:${txn}` key, consent default-denied→granted, `trackPurchase` no-op without gtag); (c) a replay + double-finalize step in the Tier-B revenue gate (it already has a real DB + real handlers) so real-handler idempotency is actually exercised. | `e2e/`, `test/`, `.github/workflows/revenue-e2e.yml` |
| **MF-5** | LOW | Eng/Founder | Ads conversion silently no-ops if `ADS_CONVERSION_LABEL` is unset while `ADS_TAG_ID` is set — Smart Bidding gets no purchase signal with no error. Add a dev/startup warning and put both in the pre-spend env checklist. | `src/lib/analytics.ts:33-40` |
| **MF-6** | LOW | Founder/Eng | Surface that `revenue-e2e` has actually run green on this `main` (it is opt-in via `vars.RUN_REVENUE_E2E`, invisible from the repo), and make it a required check on venture-core bump PRs — bumps are exactly when contract drift lands. | `.github/workflows/revenue-e2e.yml:44` |

---

## 7. All Confirmed Findings by Severity

### HIGH (1)
- **Memorial remarketing / `ad_personalization` global grant** (MF-1) — *adversarially confirmed isReal=true, severity HIGH.* Independently re-verified by the Chair: the only `ad_personalization` references in `src/` and the 1.24.2 dist are the global denied-default and the global granted-update; no per-route override. Held at HIGH (not CRITICAL): requires the visitor to accept first, and the harm is Google policy/compliance exposure, not data/payment loss.

### MEDIUM (6)
- No `redisKeyPrefix` uniqueness startup guard (MF-2).
- Prefs/pay tone-fields memorial-flavored on celebratory occasions (MF-3).
- venture-core source/dist divergence — deployed 1.24.2 not rebuildable from the monorepo working tree (continuity/audit/DR liability; not a hub-only fix).
- No render/component tests for the entire React frontend layer (subsumed by MF-4).
- Double-usage idempotency asserted only against hand-written fakes, never the real venture-core handlers; the real-DB gate runs a single linear pass with no replay/double-finalize (subsumed by MF-4).
- Automated browser/e2e coverage is memorial-only — 3 of 4 live occasions have no flow/render/synthesis test (*adversarially confirmed isReal=true, severity HIGH per QA; Chair re-verified the memorial-only claim and treats the coverage gap as the MEDIUM-class engineering action in MF-4 while acknowledging the QA lens scored its launch impact HIGH*).
- Zero automated coverage of the conversion/analytics layer (subsumed by MF-4).
- No social proof / no explicit guarantee headline near CTA on $49 cold paid traffic (founder-rationalized; recommend one trust line + plainly-surfaced refund statement).

### LOW (selected, confirmed)
- Finalize under a Redis outage can waste one Claude synthesis call (cost only; data integrity intact) — `chunk-3MPBPHL2.mjs:1449-1474`.
- `collection_audio` table created lazily by `ensureAudioTable`, absent from canonical `db/schema.sql` (DR/audit completeness) — `src/lib/audio.ts:35-48`.
- Webhook has no event_id replay dedup before email side effect (safe today; gate any future non-idempotent side effect behind Redis SET NX) — dist `:619-720`.
- Invite tokens deterministic, non-expiring, not collection-bound (leaked invite URL is a permanent non-revocable credential; deferred by design — track v2 token) — dist `:192-211`.
- Edge middleware `safeEqual` leaks secret length (acceptable for high-entropy secrets) — `src/middleware.ts:18-24`.
- Contribution encryption still keyed on `REDIS_FORM_ENCRYPTION_KEY`; no dedicated `CONTRIBUTION_ENCRYPTION_KEY` (naming/blast-radius smell; supports rotation) — dist `:83-104`.
- Celebratory `successIcon` over-applied to negative terminal screens (🎉/🥂 above "This collection has closed" on non-memorial occasions) — *regression introduced by the SES-047 icon fix* — `c/[shareToken]/page.tsx:75`; `result/page.tsx:93`; `ContributorForm.tsx:401,416`.
- GDPR Art. 9 special-category basis absent despite memorial flow soliciting grief/health/faith data (deferred to LC-03, ~Dec-2026) — `privacy/page.tsx:227-235`.
- AI-content marking (EU AI Act Art. 50) absent on deliverable (deferred to LC-03, ~Dec-2026) — `ResultFlow.tsx:66-79`.
- Stale `InviteBlock` comment claims advance-path waiver isn't persisted (it now is, via vc 1.24.2) — `InviteBlock.tsx:224-227`.
- Vercel Web Analytics loads un-gated and is undisclosed as an analytics sub-processor (cookieless, acceptable; add one-line disclosure) — `layout.tsx:40`.
- `result/page.tsx` omits explicit `force-dynamic` while sibling token routes declare it (safe today via awaited searchParams; parity/intent footgun) — `[occasion]/result/page.tsx:36-38`.
- Per-occasion `ogImageUrl` undefined; OG cards rely on file-convention fallback — `[occasion]/page.tsx:47`.
- Home hero hotlinks an external Unsplash CDN for the decorative background (self-host under `/public`) — `src/app/page.tsx:76-83`.
- Env-signal inconsistency (`VERCEL_ENV` vs `VERCEL_ENV||NODE_ENV` vs `PADDLE_ENVIRONMENT||NODE_ENV`); all fail-closed today; no deploy-time auto-migration hook (mitigated by reconciled idempotent schema) — `purge/route.ts:19`; `middleware.ts:88`; dist `:1857`.
- Minor a11y nits: edit-memory dialog uses `aria-label` not `aria-labelledby`; field help-text not linked via `aria-describedby` — `ManageDashboard.tsx:442,448`; `FormPrimitives.tsx:224,356`.

---

## 8. Founder-Owned Items

- **MF-1 deploy** (memorial remarketing suppression) is an engineering fix, but enabling memorial ad spend is the founder's gate — do not turn on memorial ads until MF-1 ships.
- **Env / ad-ops checklist before spend:** `ADS_TAG_ID` + `ADS_CONVERSION_LABEL` both set (MF-5); GA4/Clarity ids set; confirm `CONTRIBUTION_HASH_SECRET` remains a distinct secret in prod (the keyed-hash erasure promise and invite-token integrity depend on it).
- **`vars.RUN_REVENUE_E2E=true`** and confirm a green run on current `main` (MF-6).
- **LC-03 attorney pass** (Art. 9 special-category basis, AI Act Art. 50 marking) — ~Dec-2026 horizon, budget-gated; not a Monday blocker. Legal copy is attorney-owned; flag, do not rewrite.
- **Social proof / guarantee** decision on cold $49 traffic — founder rationale (await first cohort) is reasonable; a single trust line + surfaced refund statement near CTA is recommended.
- **venture-core source/dist reconciliation** — portfolio/monorepo hygiene, not a hub fix; track as continuity liability.
- **Clean up demo "Eleanor" collection** in prod DB (carried portfolio note).

---

## 9. Path to ≥ 9.0

The build is at 8.47. To reach ≥ 9.0 across all three dimensions:

1. **Ship MF-1** — removes the only HIGH and unblocks unconditional paid spend. (Prod-Readiness +)
2. **Close the test pyramid (MF-4)** — this is the single biggest lever on Quality and Confidence: (a) per-occasion render smoke for all four occasions (closes the FLOWS-coverage gap that holds mandate #1 at CONDITIONAL); (b) conversion-layer unit tests including the cross-path dedup-key invariant; (c) a real-handler replay + double-finalize step in the Tier-B gate (turns DATA/PAYMENT idempotency from "verified by reading" into a standing regression net); (d) at least one render assertion that the occasion `deliverableNoun` reaches a screen and an email.
3. **MF-2** (`redisKeyPrefix` guard) and **MF-3** (occasion-aware tone/context fields) — close the two remaining MEDIUMs that are pure code and fast.
4. **Reconcile `collection_audio` into `db/schema.sql`** and add a deploy-time migration hook — makes the schema a complete store-of-record and removes the manual-migration footgun.
5. **Address the source/dist divergence** so the deployed shared-infra artifact is rebuildable/auditable — the one portfolio-level continuity item.

Items 1–2 alone would credibly move Prod-Readiness and Quality into the high-8s/low-9s.

---

## 10. Regression Summary — SES-047 Fixes Re-Verified

### Verified actually-landed-and-correct (not cosmetic)
- **Schema reconciliation (was CRITICAL)** — `db/schema.sql` now carries all runtime columns as idempotent add-column, both partial unique abuse indexes (`contributions_email_uniq`, `contributions_organizer_uniq`), and `collections_deadline_idx`; predicates match prod. *Chair re-verified the file directly.* Now CI-gated by `revenue-e2e.yml` applying this exact file to a Neon branch.
- **`isOrganizer` admin-token gate (was HIGH)** — constant-time match, degrade-not-reject; *Chair re-read `contribute/route.ts:108-163` and the `contribute-guards.test.ts` cases.* Correct.
- **Consent Mode v2 default-denied + banner (was HIGH, multiple lenses)** — default-denied set before any `gtag('config')`; Clarity loads only on Accept. *Chair re-read both components.* Correct ordering.
- **Pay-in-advance purchase conversion + shared dedup key (was HIGH)** — both pay paths fire `trackPurchase` deduped on the identical `wtm:purchase-tracked:${txn}` sessionStorage key; mutually exclusive per collection. Correct.
- **Privacy sub-processor disclosure + cookie section (was HIGH)** — Google LLC + Microsoft Corporation listed; §4A added. Correct.
- **Contributor-email-hash erasure column (was HIGH)** — in canonical schema; `hashEmail` used in `appendContribution`. Correct.
- **Contributor consent stored with timestamp + version (was MEDIUM)** — `{at, consentVersion}` persisted encrypted; all four configs set `contributorConsentVersion`. Correct.
- **`setCollectionGenerated` conditional+atomic write (was LOW, vc 1.24.1)** — `where status<>'generated' returning id`. Correct; DB-level double-finalize no longer Redis-only.
- **sitemap/robots/metadataBase/Twitter card/canonicals (SEO, was HIGH/MEDIUM/LOW)** — present, non-www, live-filtered, private routes disallowed. Correct.
- **Hardcoded `$49` → config `displayPrice` (was MEDIUM)** — threaded through every conversion surface with safe fallbacks. Correct.
- **Success icon registry-threaded per occasion (was MEDIUM)** — with 🤍 fallback and a registry test. Correct (but see negative-screen over-application LOW).
- **Create-form friction fix (was MEDIUM)** — "write later" promoted to full-width button AND actually strips organizer-memory required fields. Correct (genuinely lower-friction).
- **Mid-funnel analytics events (was HIGH)**, **aria-required across all renderers (was MEDIUM)**, **edit-memory modal inert + scroll-lock + focus trap (was MEDIUM)**, **deadline hydration fix (was MEDIUM)**, **mobile share-link wrap (was LOW)**, **canonical withdrawal-waiver sentence (was LOW)**, **audio POST rate-limit / resend-link hashing / check-existing oracle bounded / purge isProd→VERCEL_ENV (LOW backstops)**, **prod-vs-sandbox checkout startup guard (was MEDIUM)**, **revenue-journey CI gate (was HIGH/QA)** — all verified landed and correct.

### Cosmetic / incomplete / not-landed (be skeptical)
- **Double-usage idempotency tests (claimed MEDIUM done)** — *INCOMPLETE.* The unit tests assert hand-written fakes that re-implement the idempotency themselves, not the real venture-core `markCollectionPaid`/`createWebhookHandler`/finalize. The real handlers are correct (verified by reading dist) and the e2e gate exercises them once linearly, but there is no real-handler replay/double-finalize test anywhere reachable. (MF-4c)
- **HMAC invite sign/verify tamper coverage (claimed MEDIUM done)** — *UNVERIFIABLE from this machine.* The hub mocks it trivially; the real tamper tests are claimed to live in venture-monorepo source which is not present, and the dist carries no test files. A consequence of the source/dist divergence.
- **`deliverableNoun` per-occasion assertion (claimed LOW done)** — *HALF-CLOSED.* Asserted at config granularity only; no render/DOM assertion that the noun reaches a screen or email.
- **AI-content label (Art. 50) and GDPR Art. 9 basis (MEDIUM)** — *not landed,* correctly deferred to LC-03 / ~Dec-2026. Track-only, not Monday blockers.
- **$49 social proof / guarantee, per-occasion OG images, remarketing ad-ops guardrail as code (MEDIUM/LOW)** — *not landed.* The ad-ops "policy" mitigation is in fact insufficient at the code level — see MF-1.
- **venture-core source/dist divergence (MEDIUM)** — *not landed,* remains the one explicitly-open Architect §10 item.

---

## 11. Refuted / Downgraded

- **No lens-level CRITICAL or HIGH finding was refuted in adversarial verification.** Both findings escalated to adversarial review (Marketing's memorial-remarketing HIGH and QA's memorial-only-coverage HIGH) were independently confirmed `isReal=true`, and the Chair re-verified both against `main`.
- **Marketing's "ad-policy guardrail not documented" SES-047 item was *upgraded*, not refuted:** SES-047 classified memorial remarketing as a founder-owned policy item; SES-048 correctly establishes it is a code-level gap (global `ad_personalization` grant) that a manual policy cannot close — now MF-1 (HIGH).
- **No finding was downgraded below its claimed severity on refutation grounds.** The QA memorial-only-coverage item, scored HIGH for launch impact by the QA lens, is actioned in MF-4 alongside the other test-depth items; the Chair notes the shared `[occasion]` route gives partial structural coverage (a total render collapse would be caught by the memorial smoke), which is why it is not CRITICAL.

---

## 12. Issue Tracker (progress)

Status legend: ✅ done · ⬜ open (engineering) · 👤 founder-owned · ⏳ deferred / track-only.
Updated 2026-06-21.

**Snapshot (all merged to `main` 2026-06-21):** EVERY SES-048 must-fix + quick LOW is shipped and merged — MF-1/2/3 (the HIGH + both pure-code MEDIUMs) in **PR #51 (merged)**; MF-4/5/6 + the icon-regression LOW + the quick hub LOWs (`collection_audio` in `db/schema.sql`, `result/page` force-dynamic, dialog `aria-labelledby`) in **PR #53 (merged)**. Paid ads are **unconditionally GO across all four occasions** (MF-1 merged). Test count 121 → **133**; per-occasion browser smoke + conversion-layer unit tests + a real-handler idempotency step in the Tier-B gate now exist. Remaining items are all deferred-by-nature: the venture-core **source/dist divergence** (monorepo hygiene, not a hub fix), three LOWs needing assets/legal (per-occasion OG images, self-hosting the hero image, a Vercel-Analytics privacy line — attorney-owned), two cosmetic/marginal LOWs (env-signal naming; Redis-outage synthesis cost — venture-core dist), plus founder-owned launch work + Dec-2026 legal (LC-03).

### Must-fix
- [x] ✅ **MF-1 [HIGH] — memorial `ad_personalization` suppression** (the only HIGH; gated memorial paid ads). `/memorial` routes now keep `ad_personalization`/`ad_user_data` denied even after consent (conversions still fire via `ad_storage`+`analytics_storage`); path-aware re-eval on route change via `usePathname`. Rule extracted to the unit-tested `lib/consent.ts`. `ConsentBanner.tsx`, `SiteAnalytics.tsx` — **PR #51 (merged)**
- [x] ✅ **MF-2 [MEDIUM] — `redisKeyPrefix` uniqueness startup guard.** Fail-closed at boot if two live occasions share a prefix (or one is empty); mirrors the `paddleProductId` guard. `registry.ts` — **PR #51 (merged)**
- [x] ✅ **MF-3 [MEDIUM] — occasion-aware tone/context on the prefs/pay screen.** Memorial keeps solemn-first + grief-sensitive prompt; wedding/retirement/anniversary lead "Warm & celebratory" + neutral prompt. Stored values (`solemn|balanced|warm`) unchanged → synthesis unaffected. `ResultFlow.tsx` — **PR #51 (merged)**
- [x] ✅ **MF-4 [MEDIUM, eng/QA] — closed the test pyramid.** (a) per-occasion render smoke now loads ALL four occasions (9/9 Tier-A pass) — `e2e/smoke.spec.ts`; (b) conversion-layer unit tests — `consent.test.ts` (MF-1 regression: `ad_personalization` denied on `/memorial` after consent, granted elsewhere) + `analytics.test.ts` (purchase fires once per txn, deduped across both pay paths via the shared key, no-op without gtag, never-drop-a-sale without sessionStorage); seams `lib/consent.ts` + `analytics.trackPurchaseOnce`; (c) replay + double-finalize step in the Tier-B gate proving real-handler idempotency. — **PR #53 (merged)**
- [x] ✅ **MF-5 [LOW] — Ads-misconfig warning.** `analytics.adsMisconfigured()` + a dev/preview `console.warn` when `ADS_TAG_ID` is set without `ADS_CONVERSION_LABEL` (the conversion silently no-ops otherwise). Unit-tested. `analytics.ts` — **PR #53 (merged)**
- [x] ✅ **MF-6 [LOW] — `revenue-e2e` on bump PRs + required-check doc.** Workflow now also runs on PRs touching `package.json`/`package-lock.json` (a venture-core bump is when drift lands); `docs/REVENUE_E2E_SETUP.md` documents marking it a required status check. `.github/workflows/revenue-e2e.yml` — **PR #53 (merged)**

### Other confirmed findings (MEDIUM/LOW)
- [ ] ⬜ **[MEDIUM][Architect] venture-core source/dist divergence** — deployed 1.24.2 not rebuildable from the monorepo working tree (portfolio continuity/audit/DR; not a hub-only fix).
- [ ] ⬜ **[MEDIUM][Marketing] no social proof / explicit guarantee near CTA** on $49 cold paid traffic (founder-rationalized — recommend one trust line + surfaced refund statement; see Founder-owned).
- [x] ✅ **[LOW] celebratory `successIcon` over-applied on negative terminal screens** (🎉/🥂 above "This collection has closed"/"is full") — *regression from the SES-047 icon fix* — fixed: negative terminal screens use a calm glyph; success/done screens keep their per-occasion icon. `c/[shareToken]/page.tsx` — **PR #53 (merged)**
- [ ] ⏳ **[LOW] finalize under a Redis outage can waste one Claude synthesis call** (cost only; data integrity intact). venture-core dist
- [x] ✅ **[LOW] `collection_audio` table added to canonical `db/schema.sql`** (mirrors `ensureAudioTable` exactly) so a fresh/DR/preview DB — and the revenue-e2e gate — is a complete store-of-record. `db/schema.sql` — **PR #53 (merged)**
- [x] ✅ **[LOW] `force-dynamic` on `result/page.tsx`** — parity with the sibling token routes (`collect/manage`, `c/[shareToken]`); removes the intent footgun. `[occasion]/result/page.tsx` — **PR #53 (merged)**
- [ ] ⏳ **[LOW] per-occasion `ogImageUrl` undefined** (OG cards rely on file-convention fallback). `[occasion]/page.tsx`
- [ ] ⏳ **[LOW] home hero hotlinks an external Unsplash CDN** for the decorative background (self-host under `/public`). `src/app/page.tsx`
- [ ] ⏳ **[LOW] Vercel Web Analytics loads un-gated + undisclosed as a sub-processor** (cookieless, acceptable; add one-line disclosure). `layout.tsx`
- [ ] ⏳ **[LOW] env-signal inconsistency** (`VERCEL_ENV` vs `VERCEL_ENV||NODE_ENV` vs `PADDLE_ENVIRONMENT||NODE_ENV`); all fail-closed today; no deploy-time auto-migration hook. `purge/route.ts`, `middleware.ts`
- [x] ✅ **[LOW] a11y: edit-memory dialog now uses `aria-labelledby`** pointing at its visible heading (was `aria-label`). `ManageDashboard.tsx` — **PR #53 (merged)**. *(Field-control `aria-describedby` for help text is placeholder-based here, not a separate element — left as-is to avoid CreateForm-wide churn.)*
- [ ] ⏳ **[LOW, deferred-by-design] invite tokens deterministic/non-expiring/not collection-bound** (a leaked invite URL is a permanent non-revocable credential) — track v2 token format. venture-core dist
- [ ] ⏳ **[LOW] no dedicated `CONTRIBUTION_ENCRYPTION_KEY`** (contributions still keyed on `REDIS_FORM_ENCRYPTION_KEY`; naming/blast-radius smell; supports rotation). venture-core dist
- [ ] ⏳ **[LOW] webhook has no event_id replay dedup before the email side effect** (safe today — all money/data effects idempotent; gate any future non-idempotent side effect behind Redis `SET NX`). venture-core dist

### Founder-owned (not engineering defects)
- [x] 👤 ✅ **MF-1 is merged (PR #51) — memorial ad spend is now code-ready.** The personalization suppression is live; enabling memorial ad spend is the founder's toggle. Wedding/retirement/anniversary were already clear.
- [ ] 👤 **Pre-spend env/ad-ops checklist:** `ADS_TAG_ID` + `ADS_CONVERSION_LABEL` both set (MF-5); GA4/Clarity ids set; `CONTRIBUTION_HASH_SECRET` remains a distinct prod secret.
- [ ] 👤 **`vars.RUN_REVENUE_E2E=true`** and confirm a green run on current `main` (MF-6).
- [ ] 👤 **LC-03 attorney pass** (GDPR Art. 9 special-category basis, EU AI Act Art. 50 marking) — ~Dec-2026 horizon, budget-gated; not a launch blocker. Legal copy attorney-owned.
- [ ] 👤 **Real-money smoke on BOTH pay paths** after analytics are confirmed (GA4 DebugView + Ads tag assistant).
- [ ] 👤 **Social proof / guarantee** decision on cold $49 traffic (founder rationale: await first cohort).
- [ ] 👤 **ElevenLabs paid plan** for audio (free tier blocks commercial use + caps credits).
- [ ] 👤 **Clean up the demo "Eleanor" collection** in prod DB.

### Deferred / track-only (Dec-2026 horizon)
- [ ] ⏳ **[MEDIUM][Legal] GDPR Art. 9 special-category basis** for grief/health/faith memories — fold into LC-03. `privacy/page.tsx`
- [ ] ⏳ **[MEDIUM][Legal] EU AI Act Art. 50 AI-content marking** on the deliverable — fold into LC-03. `ResultFlow.tsx`
