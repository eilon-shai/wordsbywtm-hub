# Expert Panel Review — SES-047

**Date:** 2026-06-21
**Subject:** Collaborative-Collection hub (wordsbywtm-hub) — **four live occasions** (memorial, retirement, wedding, anniversary), one app, per-occasion isolation (Paddle product id + `redisKeyPrefix` + from-address). Stateless; identity via capability tokens (public `shareToken`, private `adminToken`) + signed HMAC invite tokens.
**Reviewed state:** `main` after PRs **#35–#41** + **venture-core 1.24.0** (hub pins 1.24.0 exactly). New since SES-046: organizer name persisted + tamper-proof signed invite email (1.23.0); create-collection rate limiting per-email + per-IP (`src/lib/rate-limit.ts`); organizer can't invite/contribute as themselves; deleted-collection shows calm not-found; occasion-aware deliverable noun across all rendered screens + hub emails + venture-core deadline-sweep fallback emails (`deliverableNoun`, 1.24.0). 100 vitest + Playwright smoke.
**Method:** 8-lens panel (deep external research per lens — 2026 best practices / regulations / threat patterns / ad-policy / testing standards) → adversarial verification of every CRITICAL/HIGH finding against real code → chair synthesis. Every finding traced to `file:line`.
**Focus mandates (per founder):** (1) end-to-end **flows**, (2) **abuse / double-usage**, (3) **data / payment loss** — and now **(4) campaign / launch readiness**, as the founder moves into a paid ad campaign.

---

## 0. Post-review verification (2026-06-21) — the CRITICAL does NOT affect prod

The CRITICAL (§7) was conditional on "if prod was migrated from the stale `db/schema.sql`." **Verified against prod Neon directly** (`information_schema.columns` + `pg_indexes`): **prod is COMPLETE.** `collections` has all 21 columns incl. `paid_at, paid_txn_id, generated_content, generated_at, reminder_sent_at, deadline_extended_count, organizer_name`; `contributions` has `contributor_email_hash` + `is_organizer`; and indexes `contributions_email_uniq`, `contributions_organizer_uniq`, `collections_deadline_idx` all exist. So payments record, synthesis saves, and the one-per-email / one-organizer DB backstops are live in prod.

**Impact downgrade:** the schema issue is **NOT a prod data/payment-loss blocker**. It is now a **HIGH maintainability/DR risk only** — the committed `db/schema.sql` is stale, so a *fresh* deploy / preview-branch DB / disaster-recovery rebuild would be broken. Fix = reconcile `db/schema.sql` to match prod (idempotent `add column if not exists` + the two unique indexes). The MEDIUM "TOCTOU dedup lost" item is also moot in prod (the unique indexes are present).

**Revised production gate:** the data/payment-loss condition is **CLEARED**. Production is **GO** on that axis. The remaining launch work is the campaign-readiness cluster (§6.2–6.6) before paid ad spend. Net: with the schema CRITICAL reduced to a non-prod-blocking artifact fix, Prod-Readiness in practice sits higher than the 7.60 the as-reviewed scorecard shows.

---

## 1. Scorecard

| Expert | Confidence | Quality | Prod-Readiness |
|---|---|---|---|
| Frontend Engineer | 8.3 | 8.4 | 8.1 |
| Backend Engineer | 8.2 | 8.6 | 6.8 ⚠ |
| Software Architect | 8.4 | 8.5 | 7.7 ⚠ |
| Security Engineer | 8.4 | 8.3 | 7.7 ⚠ |
| Legal / Compliance | 8.4 | 7.9 | 7.3 ⚠ |
| UX Designer | 8.3 | 8.2 | 7.9 ⚠ |
| Marketing / Growth | 8.1 | 8.4 | 7.4 ⚠ |
| QA / Test Engineer | 8.4 | 8.3 | 7.9 ⚠ |
| **AVERAGE** | **8.31** | **8.33** | **7.60** |

**Overall (mean of the three dimension-averages): 8.08**

---

## 2. Delta vs SES-046

| Dimension | SES-046 | SES-047 | Δ |
|---|---|---|---|
| Confidence | 8.19 | 8.31 | **+0.12** |
| Quality | 8.31 | 8.33 | **+0.02** |
| Prod-Readiness | 7.96 | 7.60 | **−0.36** |
| **Overall** | **8.15** | **8.08** | **−0.07** |

**Narrative.** Confidence and Quality both rose modestly: the SES-046 migration residue was genuinely cleaned up. The occasion-aware `deliverableNoun` is now threaded end-to-end (registry → every screen → hub emails → deadline-sweep fallback emails), the signed-invite email is tamper-proof, create-collection has real per-email + per-IP rate limiting, and the organizer-can't-invite/contribute-as-self abuse vector closed. The panel now trusts the engineering more (Confidence +0.12) and rates the craft slightly higher (Quality +0.02).

Prod-Readiness *dropped* (−0.36) for one dominant, newly-surfaced reason: deeper inspection of the **committed `db/schema.sql`** revealed it is materially stale versus what venture-core 1.24.0 actually reads/writes — missing ~10 columns and the two abuse-control unique indexes — while the hub has **no auto-migration on deploy**. The `db:migrate` script applies that incomplete file verbatim. This single root cause was independently flagged by the Backend, Architect, and Legal lenses (it gates payment recording, synthesis storage, contributions, the email/organizer dedup backstop, AND the policy's erasure promise), which is why the Backend Prod-Readiness cell fell to 6.8. Layered on top: a newly-traced **client-trusted `isOrganizer` privilege gap** (Security), the **pay-in-advance purchase event never firing** to GA4/Ads (Marketing) right as paid spend begins, and **no consent banner / Consent Mode v2** before EU-targeted ads (Legal). These are campaign-relevant defects the prior review's narrower scope did not weigh.

In short: the product got *better*, but raising the lens to "paid strangers arriving Monday" exposed launch-readiness debt that was always latent. The fixes are concentrated and mostly small.

---

## 3. Mandatory-Minimum Status

**NOT MET.** The bar is every dimension average ≥ 8.0.

- Confidence **8.31** ✅
- Quality **8.33** ✅
- Prod-Readiness **7.60** ❌

Prod-Readiness misses by 0.40, dragged down primarily by the **CRITICAL schema-drift** issue (Backend 6.8) and a cluster of 7.3–7.9 cells (Legal, Marketing, Security, Architect, UX, QA). Confidence and Quality clear the bar comfortably.

---

## 4. Go / No-Go — Production + Ad Campaign

**Production (organic / existing traffic): CONDITIONAL GO.** The core money/abuse architecture is sound and improved — pay-before-generate is enforced in one place, double-generation is guarded by Redis lock + durable DB status check + product-mismatch check, contributor caps are race-safe in the INSERT, the webhook verifies signature + product + price via the official SDK, and purge never deletes paid-but-ungenerated work. **But the schema-drift CRITICAL is a hard blocker until verified resolved against prod Neon** — if prod was migrated from the committed `db/schema.sql`, the paid path and dedup backstop are already broken. Confirm the live schema before declaring GO.

**Ad campaign: NO-GO until the campaign-readiness items land.** Spending money to drive strangers into the funnel while (a) the pay-in-advance purchase conversion is invisible to Smart Bidding, (b) the `isOrganizer` slot is squattable by any visitor, and (c) EEA/UK trackers fire with no consent gate, would burn budget and create regulatory exposure. These are small, well-scoped fixes — close them and the campaign is good to go.

---

## 5. Focus-Mandate Verdicts

- **FLOWS — PASS.** All four occasions trace cleanly end-to-end (focus-aware landing → create → invite/share → contribute → review/curate → pay-at-finalize OR pay-in-advance → Claude synthesis → PDF + optional audio + email → token re-view → deadline sweep). The occasion-aware noun now reaches every screen and email; terminal/error/empty states are warm and specific. Server/client boundary is correct (force-dynamic + awaited params on token routes; payment/synthesis content never crosses a static boundary). Residual flow nits: a create-form date hydration-mismatch risk (`src/components/CreateForm.tsx:190-192,750-763`) and the success-icon register mismatch — neither breaks the flow.

- **ABUSE / DOUBLE-USAGE — CONDITIONAL PASS (one HIGH open).** Strong: cross-occasion isolation enforced by startup guards + unit tests + strict exact-match webhook/resolver routing (no arbitrary fallback); create rate-limit per-email + per-IP (`src/lib/rate-limit.ts`); organizer-can't-invite/contribute-as-self; double-generation guarded; contributor cap atomic in the INSERT (`collections.ts:309-318`). **BUT** the public `/contribute` endpoint trusts client-supplied `isOrganizer:true` with no admin-token proof (`api/collection/contribute/route.ts:91`; core `chunk-ZY7LVILY.mjs:1104,1129,1167`) — any visitor can bypass the cap + email/dedup and squat the pinned organizer slot. AND if the stale schema is in prod, the one-per-email / one-organizer **unique-index backstops are absent** (TOCTOU-exploitable). Both must close before paid traffic.

- **DATA / PAYMENT LOSS — CONDITIONAL PASS (CRITICAL open).** The design is right: `markCollectionPaid` is idempotent (coalesce), generate guards on durable `status='generated'`, purge has an explicit "never delete paid-but-ungenerated" guard, content is durable in Postgres. **BUT** the committed `db/schema.sql` that `db:migrate` applies is missing the very columns the paid/synthesis/contribution paths write (`paid_at`, `paid_txn_id`, `generated_content`, `generated_at`, `contributor_email_hash`, `is_organizer`, …). If prod was provisioned from it, payment cannot be recorded and synthesis cannot be saved — total data/payment loss. Tests do not catch this (the DB is mocked). **FAIL risk until the live schema is verified.**

---

## 6. Must-Fix Before Launch (engineering — confirmed only)

1. **[CRITICAL] Reconcile `db/schema.sql` with venture-core 1.24.0 and verify against prod Neon.** Replace/extend the committed DDL with all runtime columns (`collections.paid_at, paid_txn_id, reminder_sent_at, deadline_extended_count, generated_at, generated_content`; `contributions.contributor_email_hash, is_organizer`) as idempotent `add column if not exists`, plus partial unique indexes `contributions_email_uniq` and `contributions_organizer_uniq` and `collections_deadline_idx`. Apply against prod Neon and confirm via `\d collections` / `\d contributions` that all columns AND both unique indexes exist. (`/Users/eilon.shai/projects/wordsbywtm-hub/db/schema.sql:1-60`)

2. **[HIGH] Gate `isOrganizer` on admin-token proof.** In the contribute route (or core handler) accept `isOrganizer=true` only when the provided `adminToken` matches `getCollectionByShareToken(...).adminToken` (constant-time); otherwise force `false`. Add a regression test: `isOrganizer:true` with no/wrong adminToken is treated as a normal capped, email-required contribution. (`src/app/api/collection/contribute/route.ts:91`; core `chunk-ZY7LVILY.mjs:1104,1129,1167`)

3. **[HIGH] Fire `trackPurchase` on the pay-in-advance return.** In `/collect/paid`, after mark-paid succeeds, call `trackPurchase({ value, occasion, transactionId: txnId })` with sessionStorage dedup keyed on `txnId`. Verify both payment paths in GA4 DebugView + Ads tag assistant before turning on Smart Bidding. (`src/app/collect/paid/page.tsx:13`; `src/components/PurchaseTracker.tsx:13-24`; `src/components/ManageDashboard.tsx:338`)

4. **[HIGH] Add a consent banner + Google Consent Mode v2 (or geo-gate EEA/UK trackers).** Default all-denied for EEA/UK; do not fire gtag/Clarity until consent. Mandatory pre-condition for any EU-targeted ad spend. (`src/components/SiteAnalytics.tsx:8-37`)

5. **[HIGH] Disclose Google + Microsoft as sub-processors and add a Cookies & Analytics section** to the privacy policy. (`src/app/privacy/page.tsx:112-132`)

6. **[HIGH] Add mid-funnel + sitemap/robots signals for the campaign.** Emit `collection_created` (lead) on CreateForm success and `begin_checkout` on Paddle open (both paths); add `app/sitemap.ts` + `app/robots.ts`. (`src/lib/analytics.ts:27-39`; `src/components/CreateForm.tsx:534`; `src/app/[occasion]/result/ResultFlow.tsx:485`; `src/app/` — no sitemap/robots present)

7. **[HIGH] Put the revenue journey behind an automated gate.** Stand up a disposable Neon test branch + a scheduled (nightly/weekly pre-spend) job running the happy-path with `E2E_ALLOW_DB_WRITES=1` against a non-prod DB. This catches venture-core contract drift the mocked suite cannot. (`e2e/collection-happy-path.spec.ts:33`)

Smaller-but-launch-relevant (do alongside): occasion-aware success icon (UX), and the double-usage idempotency integration tests (QA, MEDIUM) — see §7.

---

## 7. Confirmed Findings by Severity (post-verification)

### CRITICAL
- **Stale `db/schema.sql` — missing ~10 columns + 2 unique indexes the running code requires; `db:migrate` applies the incomplete file.** venture-core 1.24.0's canonical schema adds `paid_at, paid_txn_id, reminder_sent_at, deadline_extended_count, generated_at, generated_content` (collections) and `contributor_email_hash, is_organizer` (contributions) plus `contributions_email_uniq`, `contributions_organizer_uniq`, deadline idx. The hub vendored an old copy with none of these (grep returns 0 for all 8 columns). `db:migrate` is literally `psql "$DATABASE_URL" -f db/schema.sql`. If prod was migrated from it: `markCollectionPaid` (`collections.ts:546-560`), `setCollectionGenerated` (`:478-485`), `purgeExpired` (`:511-519`), the deadline sweep, support/lookup (`route.ts:67-68`), and `appendContribution` (`:311-324`) all throw "column does not exist" → payment cannot be recorded, synthesis cannot be saved, contributions fail. Tests mock the DB (`test/helpers/mocks.ts`) so the suite never executes real DDL. — `db/schema.sql:1-60` *[Backend]*

### HIGH
- **Schema drift + no auto-migration = broken fresh/DR/preview DB.** Same root cause from the architecture lens: the canonical DDL no longer reproduces production; any new env/preview-branch/disaster-recovery built from `schema.sql` yields an app that throws on the paid path and silently skips email-dedup. — `db/schema.sql:5-60` *[Architect]*
- **Authoritative `db/schema.sql` missing `contributor_email_hash` breaks the policy's erasure promise.** Without that column the privacy policy's promise to "locate your submission using the keyed hash of your email" (Privacy §5/§7/§8) cannot be honored — functionality + legal commitment both gated. — `db/schema.sql:34-45` *[Legal]*
- **Client-asserted `isOrganizer:true` trusted server-side without admin-token proof (BOLA / privilege escalation).** Bypasses the email requirement (core `:1129`), the app-layer cap (`:1167`) AND the DB-layer cap (`enforceCap = ... && !input.isOrganizer`), and lets any share-link visitor squat the pinned organizer slot via `hasOrganizerContribution` — blocking the real organizer and injecting attacker text as the privileged voice. Frontend derives `isOrganizer` correctly from `sp.t === collection.adminToken` (`app/c/[shareToken]/page.tsx:89`) but the API never re-checks it. — `api/collection/contribute/route.ts:91`; core `chunk-ZY7LVILY.mjs:1104,1129,1167` *[Security]*
- **Trackers (GA4 + Ads + Clarity) load with no consent banner or Consent Mode v2.** Gated only on env ids; no default-denied state. Breaches ePrivacy for EEA/UK and Google's mandatory Consent Mode v2 (required since Mar-2024, full 2026 enforcement w/ serving restrictions). Clarity records sessions — especially sensitive. — `src/components/SiteAnalytics.tsx:8-37` *[Legal]*
- **Privacy policy omits Google (Analytics + Ads) and Microsoft (Clarity) from the sub-processor list; no cookie section at all.** §4 lists only Paddle, Anthropic, ElevenLabs, Neon, Upstash, Resend, Vercel. — `src/app/privacy/page.tsx:112-132` *[Legal]*
- **Pay-in-advance purchases never fire the GA4/Ads conversion.** `PurchaseTracker` is a no-op unless the URL carries `?txn=` (`:13-15,24`); the pay-in-advance path returns to `/collect/paid?txnId=…`, records server-side, and bounces to the dashboard without calling `trackPurchase`; finalize then navigates with `?t={adminToken}` and no `txn`. Every advance sale is invisible to Smart Bidding → biased optimization. — `src/app/collect/paid/page.tsx:13`; `src/components/PurchaseTracker.tsx:13-24`; `src/components/ManageDashboard.tsx:338` *[Marketing]*
- **No mid-funnel analytics events** — only `purchase` is tracked; `collection_created` and `begin_checkout` are never emitted, so the free→paid drop-off is undiagnosable and there's no micro-conversion to feed bidding during cold-start. — `src/lib/analytics.ts:27-39`; `CreateForm.tsx:534`; `ResultFlow.tsx:485` *[Marketing]*
- **Revenue journey (create→pay→synthesize) has no automated CI gate.** Only `e2e/collection-happy-path.spec.ts` covers it and it's `test.skip` unless `E2E_ALLOW_DB_WRITES=1`, pointed at prod Neon — never run in CI. The mocked vitest happy-path can't catch venture-core contract drift on a bump. — `e2e/collection-happy-path.spec.ts:33` *[QA]*

### MEDIUM
- **One-memory-per-email / one-organizer DB backstop lost if stale schema is in prod (TOCTOU).** The unique indexes are the documented "race-safe backstop" (submit-contribution-handler `:167-168,180,214-216`); absent them, two concurrent same-email (or organizer-flagged) submits can both insert. (Contributor cap itself remains race-safe via the atomic WHERE-count insert.) — `db/schema.sql:38-49` *[Backend]*
- **Source/dist divergence:** venture-monorepo working tree is at 1.5.0; the deployed artifact is 1.24.0 — the source cannot rebuild what runs. Continuity/audit liability for the layer the whole portfolio depends on (not a launch blocker). — `package.json` dep `@eilon-shai/venture-core 1.24.0` *[Architect]*
- **Live-occasion startup guard checks uniqueness/non-emptiness but not prod-vs-sandbox** — a one-variable misconfig could silently route real ad traffic to a sandbox/broken checkout. Add a prod-only guard asserting `paddleProductId` ∉ known sandbox defaults and `tiers.*.priceId` non-empty. — `src/lib/registry.ts:83-104` *[Architect]*
- **Contributor consent stored as a bare boolean** — policy claims timestamp + consent-text version are recorded. Store a consent timestamp + versioned consent-text id, or soften the policy. — `src/components/ContributorForm.tsx:278` *[Legal]*
- **No GDPR Art. 9 (special-category) basis** for grief/health/religious memories central to the memorial occasion. Add an explicit-consent basis + notice; flag for the LC-03 attorney pass. — `src/app/privacy/page.tsx:199-213` *[Legal]*
- **AI-generated deliverable carries no AI-content label/watermark** (EU AI Act Art. 50 marking, machine-readable, ~Dec-2026). Plan an unobtrusive "AI-assisted draft" label + marker; track, not a launch blocker today. — `ResultFlow.tsx:66-74` *[Legal]*
- **Success/terminal icon is a hardcoded white heart across all occasions** — 🤍 reads as mourning/condolence (and is the primary East-Asian mourning color), tonally wrong on retirement/anniversary. Add an occasion-aware `successIcon` to OccasionMeta and thread it the same way the noun already flows; keep memorial's heart. — `ContributorForm.tsx:382,397,429,453`; `ManageDashboard.tsx:455`; `result/page.tsx:92`; `c/[shareToken]/page.tsx:26,125` *[UX]*
- **Create form front-loads 8 required fields** at the most expensive point of an ad funnel. Make the "write my memory later" path prominent; consider deferring `relationshipDescription`. — `src/components/CreateForm.tsx:260` *[UX]*
- **Hardcoded "$49" strings on the prefs/pay screen + invite upsell** — no price prop reaches the conversion screen (latent cross-occasion pricing-mismatch). Pass `config.tiers.full.displayPrice` into ResultFlow/InviteBlock. — `ResultFlow.tsx:725` *[UX]*
- **Required fields conveyed only by a visual-only asterisk** (aria-hidden) — invisible to screen readers. Set `aria-required` on the field renderers; add an sr-only "(required)". — `src/components/forked/FormPrimitives.tsx:317` *[UX, also Frontend]*
- **`metadataBase` (www) contradicts every canonical (non-www)** — split OG/SEO host signal. Align `metadataBase` to the canonical host + configure the 301. — `src/app/layout.tsx:16 vs :20` *[Marketing]*
- **$49 (top of market) with no guarantee surfaced and no social proof** — conversion drag on cold paid traffic. Surface a plain guarantee near the CTA + a single trust line now; swap real testimonials in after the first cohort. — `src/products/_landing/memorial.ts:146-177,220`; `src/app/page.tsx` *[Marketing]*
- **Ad-policy guardrail not documented:** memorial visitors must never enter remarketing/Customer Match (Google sensitive-category rule). Keyword search is compliant; add an AD_OPS note. — `src/components/SiteAnalytics.tsx:11-28` (docs/ops gap) *[Marketing]*
- **No test for payment/generation double-usage idempotency** (webhook replay, double mark-paid, double finalize/generate) despite the founder's explicit focus. Add integration tests: same `transactionId` to mark-paid twice → `paid_at` set once; same `transaction.completed` twice → one paid flip; second generate after `generated` → returns existing result, no fresh Claude call. — `test/integration/webhook.test.ts:1` *[QA]*
- **Signed-invite HMAC token has no round-trip / tamper test anywhere** (mocked in the hub). Add venture-core unit tests for `signInviteEmail`/`verifyInviteEmail` (valid / tampered sig / tampered payload / wrong version / malformed). — `test/helpers/mock-db.ts:44` *[QA]*
- **Three new abuse guards missing from the manual E2E checklist** the founder runs before a real-money smoke (create rate-limit 429, organizer-own-address rejection, calm not-found on deleted/bogus token; verify rate-limit bypassed under ENABLE_MOCK_PAYMENT). — `docs/MANUAL_E2E_TEST_PLAN.md:187` *[QA]*
- **Create-form deadline date is a server/client hydration-mismatch risk** (server UTC vs client local). Compute default/min/max in `useEffect` or use local-day getters instead of `toISOString`. — `src/components/CreateForm.tsx:190-192,750-763` *[Frontend]*
- **Edit-memory modal does not inert/hide or scroll-lock the background** (traps Tab but leaves background reachable by AT and scrollable). Apply `inert`/aria-hidden + body scroll-lock, or migrate to native `<dialog>` + `showModal()`. — `src/components/ManageDashboard.tsx:412-449` *[Frontend]*

### LOW
- `PurchaseTracker` `useSearchParams` unwrapped — protected only incidentally by the dynamic route; wrap in its own `<Suspense>`. — `result/page.tsx:119` *[Frontend]*
- Audio player has no accessible name / transcript relationship — add `aria-label` + describedby to the tribute article. — `ResultFlow.tsx:852-853` *[Frontend]*
- Confirm-email field uses `autoComplete='new-password'` on a text input — fragile; use `type=email` + `autoComplete='off'`. — `CreateForm.tsx:631-645` *[Frontend]*
- Optimistic moderate-toggle save errors are invisible to the finalize decision — surface a page-level notice or disable finalize while a toggle error exists. — `ManageDashboard.tsx:262-320` *[Frontend]*
- `isProd` signal inconsistent across crons and keys off `NODE_ENV` (always 'production' on Vercel); standardize on `VERCEL_ENV==='production'`. — deadline-sweep handler `:72`; hub cron `:15-27` *[Backend/Architect]*
- Audio generation POST has no rate limit — a leaked admin token can drive repeated ElevenLabs spend; add a small fixed-window limit + per-collection voice cap. — `api/collection/audio/route.ts:16-52` *[Backend]*
- Webhook has no `event_id` dedup — acceptable today (only duplicated effect is email; money/data effects are idempotent); add a `SET NX EX` dedup before any future non-idempotent side effect. — webhook-handler `:99-135` / `:33-105` *[Backend/Security]*
- `setCollectionGenerated` is unconditional on status — DB-level double-finalize protection depends on Redis; make the write conditional+atomic (`where status <> 'generated' returning id`). — core `chunk-LOXJ7V6P.mjs:405-414` *[Architect]*
- `resend-link` rate-limit key stores raw organizer email in Redis — hash it (reuse `hashForKey`). — `api/collection/resend-link/route.ts:42` *[Security]*
- `check-existing` is an email-membership oracle that fails open under Redis outage — document in threat model; optional uniform-delay/per-email dimension. — `api/collection/check-existing/route.ts:21-41` *[Security]*
- Edge-runtime `safeEqual` / Basic-Auth compare leaks length — acceptable for high-entropy secrets; hash both sides if hardening. — `src/middleware.ts:18-25,103` *[Security]*
- `hashEmail`/invite signing reuse `REDIS_FORM_ENCRYPTION_KEY` when `CONTRIBUTION_HASH_SECRET` unset (key reuse across primitives) — set a dedicated `CONTRIBUTION_HASH_SECRET` in prod; confirm in PRODUCTION_ENV.md. — core `chunk-LOXJ7V6P.mjs:173,182`; `dist/db/index.js:245-252` *[Security/Legal]*
- Invite tokens are non-expiring/reusable (no nonce/TTL/collection binding) — optional issued-at + TTL + collection-id binding. — core `chunk-LOXJ7V6P.mjs:192-211` *[Security]*
- Encryption key `REDIS_FORM_ENCRYPTION_KEY` now also encrypts Postgres contributions — naming/coupling smell; add `CONTRIBUTION_ENCRYPTION_KEY` in a future minor + document dual-store blast radius. — core `chunk-LOXJ7V6P.mjs:83` *[Architect]*
- Organizer email plaintext in Postgres while contributor email is encrypted — asymmetry not reflected in policy; encrypt for parity (needs HMAC lookup column) or document. — `db/schema.sql:8` *[Legal]*
- `deliverableNoun` asserted present in config but never asserted to reach a rendered screen/email — add a render test for a wedding ("toast") + retirement ("send-off") surface. — `ResultFlow.tsx:135` *[QA]*
- `rate-limit.ts` self-heal / fail-open paths have no direct unit test — add `src/lib/rate-limit.test.ts` (hashForKey stable/lowercased/≠ raw email; clientIp precedence; fail-open when redis is null). — `src/lib/rate-limit.ts:25` *[QA]*
- Mobile invite share-link renders in a truncated non-wrapping mono box (visually unverifiable) — allow wrap / friendly chip. — `InviteBlock.tsx:126` *[UX]*
- Two different EU/UK withdrawal-waiver wordings across the two pay surfaces — extract one canonical string. — `InviteBlock.tsx:335` *[UX]*
- "Done" screen reuses memorial-flavored "speech-text" label + generic eyebrow; consider occasion-aware tone labels. — `ResultFlow.tsx:86` *[UX]*
- No explicit Twitter/X card metadata; per-occasion `openGraph.images` points at undefined `ogImageUrl` (relies on file-convention fallback). — `layout.tsx:18-26`; `[occasion]/page.tsx:47` *[Marketing]*

### Refuted / downgraded (checked and dropped)
The adversarial pass found **no HIGH/CRITICAL finding to refute** — every HIGH/CRITICAL above survived verification against the code. Worth noting what was actively checked and *cleared*:
- **Webhook `event_id` dedup "missing → double-charge."** Refuted as a money/data risk: the only collection mutation (`markCollectionPaid`) is idempotent via coalesce and generate guards on durable `status='generated'`, so a replayed `transaction.completed` is a harmless no-op. Retained only as a LOW hygiene item.
- **Deadline-sweep `isProd` "could run in the wrong env."** Refuted: `NODE_ENV` is always 'production' on Vercel, so the check is effectively always-true → **fail-closed**. Downgraded to a LOW consistency nit (diverges from the purge cron's `VERCEL_ENV` check).
- **Contributor-cap "bypassable by race."** Refuted for the normal path: the cap is enforced atomically inside the INSERT (`collections.ts:309-318`), race-safe. The only cap bypass is via the `isOrganizer` trust gap (HIGH above), not a race.
- **venture-core version pinning.** Cleared: the hub correctly pins `@eilon-shai/venture-core` to exact `1.24.0` (no `^`/`~`), matching 2026 supply-chain best practice. (The source/dist *divergence* is a separate MEDIUM continuity item, not a pinning defect.)

---

## 8. Founder-Owned Items (not engineering defects)

- **LC-03** — real-attorney ratification of the AI-drafted legal pages (privacy/terms/refund). The attorney pass should explicitly cover: the Google/Microsoft sub-processor additions, the consent-version + Art. 9 special-category items, and the AI Act Art. 50 marking plan.
- **Production (live) Paddle PRICE ids** for every live occasion (verify non-sandbox in prod — see the proposed registry guard, §7 MEDIUM).
- **Set `CONTRIBUTION_HASH_SECRET` (and ideally a dedicated encryption key)** in Vercel prod so the "keyed hash" / erasure claims are unconditionally accurate.
- **Run the manual real-money smoke** on both payment paths (pay-at-finalize + pay-in-advance) with GA4 DebugView + Ads tag assistant after the analytics fixes land.
- **Ad-ops guardrail (policy, not code):** memorial = keyword search only; no remarketing / Customer Match off memorial traffic.

---

## 9. Path to ≥8 / ≥9

**To clear the mandatory minimum (Prod-Readiness 7.60 → ≥8.0):** the single highest-leverage move is **fixing + verifying the schema** (§6.1) — it alone lifts the Backend cell off 6.8 and removes the Legal erasure-promise gap, which moves two of the lowest cells materially. Then land the four campaign-readiness HIGHs: `isOrganizer` gate (§6.2), pay-in-advance conversion (§6.3), consent banner + Consent Mode v2 (§6.4), and sub-processor disclosure (§6.5). Those five fixes are concentrated and small, and they directly raise the Backend, Security, Marketing, and Legal Prod-Readiness cells above 8.

**To reach ≥9 (the lever, still not pulled):** add mid-funnel events + sitemap/robots (§6.6), put the revenue journey behind a scheduled real-DB CI gate + the double-usage idempotency tests (§6.7, §7), reconcile the venture-core source/dist divergence so the deployed artifact is auditable, ship the occasion-aware success icon, and complete a live preview run across all four occasions on both payment paths. With the schema CRITICAL closed and the campaign-readiness cluster landed, the codebase is comfortably ≥8 across the board; the 9+ tier is gated on automated revenue-path coverage + the live run, not on new correctness work.
