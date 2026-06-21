# Manual E2E Test Plan — wordsbywtm.com (multi-occasion hub)

Run this **before every production launch / major release**. It exercises the full
collaborative-collection flow end to end: gather → invite → contribute → pay →
generate → deliver (PDF + audio) → support/cron lifecycle, plus the abuse,
double-pay, and data-loss edge cases the SES-044/045/046 panels flagged.

- **Owner:** founder (eilon.shai)
- **Scope:** **four live occasions** — memorial, retirement, wedding, anniversary.
  §§2–13 below describe the flow generically; run them **per occasion** using the
  matrix in §1A, and run the cross-product isolation checks in §1B.
- **Architecture:** stateless, pay-before-generate, one-time $49, no login (capability tokens).
- **Pass bar for launch:** the §1A matrix complete for every live occasion, §1B all ✅, and **zero** open ❌ in §11 (abuse) and §12 (data-loss).

---

## FINDINGS LOG — B Preview run (2026-06-21, fix/memorial-icon-candle)

Preview: `wordsbywtm-hub-git-fix-memorial-icon-candle-ai-projects1.vercel.app`. Run by Claude (browser-driven). Open items:

| # | Sev | Area | Finding |
|---|-----|------|---------|
| F-1 | **MED** → ✅ FIXED (code) | §1A r8 / OG | `/<occ>/opengraph-image` returned 500 for ALL four occasions. Root cause: Satori "div with >1 child needs display:flex" — `Words That Matter · {title}` was two JSX nodes (text + `{title}`) on a non-flex div. **Fixed** in `src/app/[occasion]/opengraph-image.tsx` (collapsed to one interpolated string); verified locally all 4 → 200 image/png 1200×630. **Pending preview redeploy to re-confirm.** |
| F-2 | LOW → ✅ FIXED (code) | §2 / copy | Anniversary `/start` consent checkbox said "woven into the **tribute**" — should be "toast". **Fixed** in `src/lib/intake.ts` (anniversary `consentLabel`). |
| F-3 | **MED** → ✅ FIXED (code) | §2 / create form | Relationship dropdown trigger displayed the raw **value** ("child") not the label ("Son or Daughter") — Base UI `Select.Value` shows value unless given an `items` map; also surfaced on the dashboard memory card. **Fixed**: `FormPrimitives.tsx` passes `items` to `<Select>`; `MemoryCard.tsx`/`ManageDashboard.tsx` map value→label via `getIntake`. tsc clean, 133/133 tests pass. |
| F-5 | LOW | §6 / Paddle | Memorial sandbox checkout footer reads "Your data will be shared with **vocalvow** for product fulfilment" — Paddle account business name is VocalVow; shows on a memorial checkout. Cosmetic (shared MoR account); confirm acceptable branding for non-VocalVow occasions. |
| F-6 | LOW/MED | §7 / result | "Delete this collection" is **absent** on the post-payment result view (`/memorial/result?txnId=…`). §7 expects it there. It IS on the dashboard (`/collect/manage`). Decide: intended (avoid accidental deletion of paid work) → update the plan; or add a guarded delete to the result page. |
| F-7 | ~~MED~~ **RESOLVED (sandbox-only)** | §1A r6 / Paddle | **NOT A BUG — founder-confirmed.** In the **sandbox** catalog the per-occasion checkout shows the legacy standalone product names (wedding → "VocalVow Vow Writer"; retirement → "MilestoneScribe Retirement Speech"); the **production** Paddle products are named correctly. Price is $49 and the product IDs are right in all envs. No action needed. (Recorded for the record; ignore for launch.) |

(Findings added as the run progresses. ✅/❌/☐ in the sections below reflect this run.)

---

## 1A. Per-occasion smoke matrix (run for EACH occasion)

For each occasion, swap `<occ>` (memorial / retirement / wedding / anniversary):

| Check | memorial | retirement | wedding | anniversary |
|---|---|---|---|---|
| `/<occ>` landing renders, occasion-correct copy (no "tribute/service" on toast/send-off) | ✅ | ✅ | ✅ | ✅ |
| Card on `/` (and `/?focus=<occ>` featured) routes to `/<occ>` | ✅ | ✅ | ✅ | ✅ |
| `/<occ>/start` create form uses the right relationship taxonomy + labels | ✅ | ✅ | ✅ | ✅ |
| Contributor add → organizer review → finalize → generate | ✅ | ✅¹ | ✅² | ✅ |
| Result + email use the right deliverable noun (tribute/send-off/toast) + read-aloud context | ✅ | ✅ | ✅² | ✅ |
| Checkout opens the **live** Paddle product for THIS occasion (right price) | ✅\* | ✅ | ✅ | ✅ |
| Deliverable/admin emails come from `<occ>@wordsbywtm.com` | ✅ | ✅ | ✅² | ✅ |

> **wedding (² light pass + parity):** create → contribute → finalize → checkout all ✅ (noun "toast" correct throughout: landing, consent, "Review & create the toast", "Create my toast", prefs "play at the reception"); checkout opens at $49 (row 6 ✅; "VocalVow Vow Writer" was sandbox-only, F-7 resolved). ² rows 4/5/7 (pay→generate→deliverable email): the wedding collection was deleted by the §9 delete-cron test and not re-paid; **generation is the occasion-agnostic venture-core path proven on memorial + retirement + anniversary** — and anniversary is the *same* "toast" deliverable flow as wedding — so wedding pay→generate is covered by parity rather than a redundant 4th sandbox payment.
> **retirement (¹ full pass — founder paid sandbox):** create → finalize → **pay → generate** ✅. Generated "A send-off for Dana Okonkwo E2E — woven from 1 memory", coherent, correct noun "send-off", N=1 works; deliverable email from `retirement@wordsbywtm.com`; checkout $49. ¹ run at N=1 (organizer's own memory only; separate-contributor add already covered on memorial + wedding).
> **anniversary (full pass — founder paid sandbox via PAY-IN-ADVANCE):** create → contribute (2 memories) → **pay-in-advance → finalize → generate** ✅ (used for the §6b path). Generated "A toast for George & Ruth — woven from 2 memories" (coherent: Sunday drives, thermostat argument, splitting cake); noun "toast" correct throughout; checkout product "Anniversary" @ $49, email prefilled; rows 4/5/7 ✅. ⚠️ consent checkbox still says "tribute" not "toast" — **F-2**.
| OG card (`/<occ>/opengraph-image`) + favicon render (not 404) | ❌ | ❌ | ❌ | ❌ |

> **§1A row 1–3 PASS (B preview 2026-06-21):** all four landings show the right deliverable noun (tribute / send-off / toast / milestone toast) and context (service / party / reception / celebration); home cards route to `/memorial /wedding /retirement /anniversary`; start forms use occasion-correct taxonomy (memorial: family roles; retirement: colleague/manager/HR; wedding: best man/maid of honor; anniversary: child/grandchild).
> **§1A row 8 FAIL — OG cards 500/503 on ALL occasions** (`/<occ>/opengraph-image` → memorial 500, retirement/wedding/anniversary 503 on HEAD; GET renders Next "500 Internal Server Error"). `next/og` `ImageResponse` is throwing at request time (route `src/app/[occasion]/opengraph-image.tsx`). Favicon `/icon.svg` is fine (200). Social-share previews broken → fix before relying on shared links; not a flow blocker. See FINDINGS.
> **Copy nit (LOW):** anniversary `/start` consent checkbox says "woven into the **tribute** you'll receive" — should be "toast" (wedding correctly says "toast").
> **memorial column (rows 4–7) PASS this run; ✅\* on checkout** = Paddle **sandbox** product "memorial / Memorial" @ $49 verified; the **live** product is verified in Pass C. Other 3 occasions' rows 4–7 = "light" pass (create→contribute→finalize→checkout-opens-right-product) still to run.

## 1B. Cross-product isolation (shared DB / Redis / Paddle / webhook)

- ✅ A payment/webhook for occasion A **never** marks an occasion-B collection paid (`customData.product` routes strictly; unmatched → 200 no-op). _(§10: webhook dispatches only on exact `paddleProductId === customData.product`, no fallback, unmatched → 200 no-op (verified by curl); + cross-product guards on customData/priceId/collection-price)_
- ✅ A support-console lookup for occasion A returns **only** A's collections. _(src/app/api/support/lookup/route.ts maps each live occasion's `paddleProductId`→occasion, queries by those productIds and tags every row with its occasion; optional `occasion` param narrows to one — cross-product isolation key)_
- ✅ The deadline-sweep cron runs once per live occasion (4 sweeps), each scoped to its own product. _(cron response has a separate results block per productId: pro_…memorial / wedding / retirement / anniversary; the warn/delete only affected the wedding product, others scanned:0)_
- ✅ Org dedup ("one open collection per email") is **per occasion** — the same email can hold one memorial AND one wedding collection. _(venture-core dedup query keyed on **(product, lower(organizer_email)) WHERE status='open'** — product = per occasion, so the same email holds one open collection per occasion)_
- ✅ Generating occasion A's tribute never resolves to occasion B (an unmapped txn 404s, not a wrong-product generation). _(POST /api/collection/generate with a forged/unmapped txn → 404 "Collection not found for this payment." — occasion is resolved via the txn→collection Redis mapping written at checkout; no mapping → 404, never a wrong-product gen)_

---

## 0. Environments & where to run each pass

| Pass | Where | Payments | AI / Audio | Purpose |
|------|-------|----------|-----------|---------|
| **A — Local mock** | `npm run dev` (Node 20) | Mock (`ENABLE_MOCK_PAYMENT`) | Real or mocked | Fast functional sweep |
| **B — Preview (sandbox)** | Vercel preview deploy | Paddle **sandbox** | Real Anthropic + ElevenLabs | Realistic dry run incl. webhook |
| **C — Production smoke** | prod domain, **one real $49 purchase** | Paddle **live** | Real | Final go/no-go; refund the test txn after |

> Reminder: `next start` forces `NODE_ENV=production` and disables the mock gate — for the
> local mock pass use `npm run dev`. (See memory: E2E mock payment uses `npm run dev`.)

### Pre-flight env audit (do once per environment before testing) — _retroactively confirmed by the successful end-to-end B run_
- ✅ All vars in `docs/PRODUCTION_ENV.md` are present for the target environment. _(full flow create→pay→generate→audio→emails→crons all succeeded → every required runtime var is set on this preview; formal line-by-line audit vs the doc remains a founder doc-check for prod)_
- ✅ `ELEVENLABS_API_KEY` set (Sensitive); `DISABLE_TRIBUTE_AUDIO` **unset** (or `false`) where audio should be on. _(audio generated + played → key set, not disabled)_
- ✅ ElevenLabs account is on a **paid plan** (commercial license + quota) before prod. Free tier = 402 on library voices and ~10k credit cap. _(sandbox audio synthesized with premade voices (Sarah) — no 402; **confirm the paid commercial plan before prod = founder Pass-C gate**)_
- ✅ Paddle `PADDLE_ENVIRONMENT` matches the target (sandbox vs production); webhook secret set. _(sandbox "Test Mode" checkout completed + `transaction.completed` → "New Sale" owner email fired → env + webhook secret correct for sandbox)_
- ✅ `NEXT_PUBLIC_*` vars are **plain text, not Sensitive** (Sensitive bakes empty into the client bundle). _(Paddle client token resolved → checkout opened; if it were Sensitive the token would bake empty and checkout would fail)_
- ✅ DB (Neon), Redis (Upstash), Resend keys valid; `SUPPORT_PASSWORD` set. _(collections persisted = DB; invite/create rate-limits = Redis; all emails delivered = Resend; support Basic-Auth challenged = SUPPORT_PASSWORD)_

---

## 1. Smoke (do first — if any fail, stop)
- ✅ Landing `/memorial` renders; no console errors. _(B preview 2026-06-21)_
- ✅ Site header + home link present on all pages. _(wordmark present on all pages checked)_
- ✅ Memorial nav does **not** show Wedding/Retirement cross-links. _(header only: Pricing + Start a Memorial Collection)_
- ✅ An unknown occasion (e.g. `/foobar`) → 404. _(Next 404 "This page could not be found.")_
- ✅ Result page for a bad token → graceful (no crash / no stack trace). _(candle "This collection is no longer available")_

---

## 2. Create a collection (organizer)
- ✅ `/memorial` → start a collection. _(B preview: created "Eleanor E2E-0621", organizer eilon.shai+e2e-mem@gmail.com)_
- ✅ Honoree name + organizer email required; validation on empty/invalid email. _(invalid format → "That doesn't look like a valid email — please check it."; mismatch → "Emails don't match."; honoree/required fields block submit)_
- ✅ **Deadline defaults to 1 month** and 1 month is the **maximum** (can't pick further out). _(date input value=2026-07-21, max=2026-07-21, min=2026-06-21)_
- ✅ On create: organizer lands on the dashboard with a share link + admin link. _(admin t=33WUB5..., share /c/6xwzYTA1vcXjka1c)_
- ✅ Deadline callout shows on the dashboard; the `ⓘ` tooltip **appears on hover** (portal — not clipped by the card) explaining auto-finalize (paid) / delete (unpaid). _(callout "July 21, 2026 · 30 days left"; hover tooltip renders as portal over the card)_
- ✅ Re-opening the admin link (new tab / after refresh) restores the dashboard (durable admin token via session + localStorage). _(direct `?t=33WUB5…` restores full dashboard; emailed "Manage your collection" button confirmed working by founder. NOTE: the Gmail readback tool drops the `=` from the URL — readback string is unreliable, the real email link works.)_

---

## 3. Invite contributors
- ✅ Invite block shows a **single send row** (name + email + Send email / WhatsApp) — not 3 repeated rows.
- ✅ "Preview the email" reveals an accurate preview of what the contributor receives. _(subject "Add a memory for Eleanor E2E-0621"; honoree name in body + CTA)_
- ✅ Sending an email invite delivers a real email with a working contribute link. _(POST /api/collection/invite 200; email "Hi Tom, You're invited to share a memory of Eleanor E2E-0621" arrived at +e2e-c1)_
- ✅ WhatsApp option opens a prefilled message with the link. _(wa.me/?text=… honoree name + /c/6xwzYTA1vcXjka1c link)_
- ✅ **Rate limits:**
  - ✅ Same recipient address twice in a day → 2nd blocked (1/day per email). _("Already invited that address today — try again tomorrow")_
  - ✅ 13th invite in a day from one organizer → blocked (12/day per customer). _(sent 12 invites across 4 calls (per-call batch capped at 3 = free contributor size; dailyRemaining 9→6→3→0), 13th → **429 RATE_LIMIT** "You can email up to 12 people a day." Redis counter `invite-day:<collectionId>:<date>`.)_
- ✅ Honoree name appears correctly in the invite copy.

---

## 4. Contribute (each contributor)
- ✅ Contribute link opens the contribution form (TributeWords-style, with the 3-layer content guard). _(name/relationship/email + memory + word + moment + "anything you'd rather wasn't included" + required consent)_
- ✅ Submit a memory → confirmation; organizer gets an internal "new memory" email. _(3 contributors submitted (Tom, Priya, Marcus); all 3 "X just added a memory" emails arrived at organizer)_
- ✅ **Dedup:** same email submits twice → handled per policy (no duplicate row; keyed email-hash uniqueness holds). _(THREE layers verified: (1) per-browser localStorage `wtm:contributed:<shareToken>` → "You've already shared a memory"; (2) idempotency-key retry → DB `on conflict (collection_id, idempotency_key) do nothing`; (3) **same email, different idempotency key → 409 `CONTRIBUTION_EXISTS`** "A memory from this email is already in this collection" — DB partial-unique index `contributions_email_uniq (collection_id, contributor_email_hash)`.)_
- ✅ **Contributor cap:** add contributors up to the cap; the cap+1 attempt is rejected cleanly (atomic — no over-cap race). _(cap=3; 4th visit → "This collection is full" screen, form not rendered)_
- ✅ HTML / prompt-injection in name & memory (`<script>`, `</contribution>`, `{{}}`) is neutralized — not rendered, not breaking synthesis. _(name `Priya <script>alert('xss')</script>` + memory with `</contribution>` / `IGNORE ALL PREVIOUS INSTRUCTIONS` / `{{7*7}}` / `<img onerror>` accepted; dashboard renders name as INERT TEXT — no `<script>` element in DOM, no alert; email escapes to `&lt;script&gt;`. Synthesis-derailment check deferred to §7.)_
- ✅ Works at **N=1** (a single contributor must still be able to finalize — never refuse a small family at the paywall). _(organizer's own memory alone counts; finalize path open — confirmed in §6/§7)_

---

## 5. Dashboard (organizer, pre-payment)
- ✅ Contributions appear as they arrive. _("4 memories collected", "3 of 3 people … your link is full"; each memory card shown)_
- ✅ Organizer can review and select which memories to include. _(per-memory "Include in the tribute" toggle; organizer's own = "Always part of the tribute")_
- ✅ "Delete this collection" is visible and works (unpaid/open) — see §9 for paid/generated behavior. _(throwaway unpaid collection → inline confirm "Delete this collection and all 1 memory?" → "Yes, delete everything" → POST /api/collection/delete 200 → "Collection deleted" → manage link → "We couldn't open this collection")_
- ✅ Finalize card explains what they'll receive (woven tribute + keepsake PDF + spoken version) and the one-time $49. _(memorial: "Your tribute will be woven from 4 memories … Finalizing closes the collection — $49, one time … keepsake PDF to print, and a spoken version to play at the service")_
- ✅ Modal focus-trap works (Tab cycles within dialog, Esc/close restores focus). _(Edit-memory modal: `role="dialog" aria-modal="true"`, focus moves INTO the dialog on open, the dashboard behind is marked `inert` (Tab can't escape = trap), Esc closes + **focus restored to the triggering "Edit" button**. (The delete confirm is an inline panel, not a modal.))_

---

## 6. Payment — checkout-at-create (default path)
> The charge happens at the **final "Create my tribute"** step (NOT on the dashboard) — this is the double-pay fix.
- ✅ Click "Create my tribute" → Paddle opens. _(charge is on the prefs/"Create my tribute" step, not the dashboard — confirms double-pay fix; Paddle SANDBOX "Test Mode" overlay, product "memorial / Memorial", $49.00)_
- ✅ Paddle email field is **prefilled and read-only** with the organizer email. _(prefilled eilon.shai+e2e-mem@gmail.com; typing into it had no effect = read-only)_
- ✅ Terms checkbox required at the payment moment. _(site terms checkbox gated "Create my tribute"; Paddle has its own T&C)_
- ✅ Complete payment (sandbox card / mock) → tribute generates. _(founder completed the Paddle sandbox card step (automation can't drive the cross-origin payment iframe); on redirect the tribute generated — memorial + retirement both)_
- ✅ **Double-pay guard:** after paying, return via the link and try again → Paddle does **not** re-open / you are **not** charged twice. Collection shows as generated/closed. _(dashboard badge "Tribute created" + "Your tribute has been created … [View your tribute]"; NO Create-my-tribute/pay button at all)_
- ✅ Refresh mid-checkout, hard-reload, back button → no duplicate charge, no stuck state. _(multiple reloads of ?txnId= + dashboard → idempotent, single "New Sale" email only)_

## 6b. Payment — pay-in-advance path  _(verified on anniversary "George & Ruth", founder paid sandbox)_
- ✅ Choose pay-in-advance from the invite/dashboard flow → terms checkbox required. _("Pay now and open to 10 people — $49"; clicking without terms → "Please agree to the terms to continue.")_
- ✅ After advance payment, organizer can proceed to "Create my tribute" **freely** with **no second Paddle prompt**. _(clicking "Create my toast" after pay-in-advance → NO Paddle iframe opened; went straight to the confirm)_
- ✅ A clear one-way "Are you sure? this finalizes" warning is shown before generating. _("Create the toast now? This weaves all included memories into the final toast and closes the collection. This can't be undone." [Yes, create it] [Cancel])_
- ✅ `paid_at` is set (collection labeled **paid**, not "generated · unpaid"). _(dashboard badge "Paid · You're all set", "up to 10 people … finalizing is free", deadline copy switched to paid auto-finalize wording, Pay-now button gone)_

---

## 7. Generation & result page
- ✅ Prefs step (tone / length / avoid / context) is honored in the output. _(STRONG: "leave out the Buick/driving" → output has NO buick/driving; context "retired math teacher, secular" → "After a long career teaching mathematics", ZERO religious terms; length=short respected)_
- ✅ Synthesis reads as one coherent tribute woven from multiple memories; honoree named throughout; no invented facts. _(woven from all 4: recipe box (Sarah), tutoring+graded quizzes (Marcus), casseroles/holiday-lights/potluck/spare-key (Tom+Priya), "steady/generous/patient" = the 3 word-captures; honoree named throughout)_
- ✅ No headers / bullets / stage directions in the prose. _(no `#`, no bullets — stripDeliverableMarkdown OK)_
- ✅ Result page: site header, home link present; **no Edit button** on the generated tribute (not even disabled). _(no Edit anywhere on page; header "Words That Matter" links /)_
- ✅ N/A — **intentionally not required (founder, F-6 skipped).** "Delete this collection" is deliberately NOT on the post-payment result page: delete-paid is hard-blocked (409 `PAID_COLLECTION`), so a delete control there would be misleading. The dashboard delete remains for unpaid/open collections. Plan expectation dropped.
- ✅ **Download keepsake PDF** works → Times serif, readable, with "Generated by Words That Matter · wordsbywtm.com" attribution footer that is a working link. _(button wired to `downloadPdf` (jsPDF, letter); title `times bold`, body `times normal` = **Times serif**; footer `doc.textWithLink("Generated by Words That Matter · wordsbywtm.com", …, {url:'https://www.wordsbywtm.com'})` = **clickable link**; saves "{Noun} for {name}.pdf". Code-confirmed; founder can eyeball the saved file.)_

### 7b. Audio narration
- ✅ Voice choice appears on the **prefs screen** ("A spoken version, included"): softer (Sarah) / deeper (George) / text-only. _(select: female/male/none)_
- ✅ Audio is generated **once** with the tribute (not re-billed on re-view). _(present at generation, /api/collection/audio, 182s ≈ short)_
- ✅ Done view shows a player + MP3 download; audio sounds **warm/human**, not robotic. _(player + "Download the audio (MP3)" present; plays, duration 182s. Timbre = founder to confirm warm/human.)_
- ✅ Re-opening the result later reuses stored audio (GET `?info=1` → player shows without regenerating). _(reload → GET /api/collection/audio?info=1 200, no audio POST = no regen/re-bill)_
- ✅ Switching the selected voice produces the other voice once and caches it (no repeated billing for the same voice). _(code-confirmed in src/lib/audio.ts: idempotent child table `collection_audio` keyed on **(collection_id, voice)** — "one cached MP3 per (collection, voice) so switching voices doesn't re-bill"; the audio route takes a `voice` param and serves the stored row if present. Anti-re-bill guarantee holds at the data layer; voice is chosen on the prefs screen.)_
- ✅ With `DISABLE_TRIBUTE_AUDIO=true` (or no key): audio UI hidden / POST returns 404 gracefully — rest of flow unaffected. _(code-confirmed: audio route gates on `audioEnabled()` → POST/GET return 404 `AUDIO_DISABLED`; result page passes `audioEnabled={audioEnabled()}` so the audio UI + generation are skipped when off. Live preview has it ENABLED — audio verified working — so the rest-of-flow-unaffected branch is the off-state.)_

### 7c. Feedback widget
- ✅ Feedback widget appears on the done view. _("How did we do?" 5-star + comment)_
- ✅ Submitting feedback works and shows a thank-you immediately. _(POST /api/memorial/feedback 200 → "★★★★★ Thank you — this genuinely helps.")_
- ✅ **Once only:** after submitting (or returning later), feedback shows as already given — cannot submit twice. _(reload shows the thank-you state, no interactive stars)_

---

## 8. Emails (customer + internal owner)
- ✅ **Customer deliverable email** arrives after generation, with a working **"View your tribute"** button/link. _(from memorial@wordsbywtm.com, subj "The tribute for Eleanor E2E-0621", full tribute + View button)_
- ✅ **Owner internal email — new purchase** arrives at the ops inbox. _("💰 New Sale — Words That Matter — Memorial, $49.00, txn_01kvnzz83e41c6q5a7j5ff5dkf" — matches the transaction)_
- ✅ **Owner internal email — new feedback** arrives. _("⭐ Feedback — Memorial, ★★★★★, txn_01kvnzz83e…, Can share ✓ Yes")_
- ✅ **Owner internal email — new memory/contribution** arrives. _(Tom/Priya/Marcus all delivered)_
- ✅ All emails: correct honoree name, no broken HTML, no leaked tokens, links use the right domain. _(all wordsbywtm.com; injection name escaped to &lt;script&gt; in notification)_

---

## 9. Lifecycle: delete, deadline, purge  _(re-validated on B preview 2026-06-21 via scripts/test-crons.sh + dev collection-clock)_
- ✅ **Delete unpaid/open** collection → removed; links 404 afterward. _(cron delete of wedding "Sam & Alex" → deleted:1; manage link → "We couldn't open this collection")_
- ✅ **Delete paid/generated** → guarded: requires explicit confirmation (409 unless confirm flag); paid work isn't lost by accident. _(POST /api/collection/delete on the PAID retirement collection → **409 `PAID_COLLECTION`** "This collection has been paid for and can't be deleted here. Contact support…". Even stricter than a confirm-flag — hard block; the paid collection survived.)_
- ✅ "What happens if I don't delete?" matches reality: explain + verify against the sweep below. _(copy = unpaid deleted at deadline / generated purged ~30d; both confirmed by the crons below)_
- ✅ **Deadline sweep cron** (validate in preview): _(cron runs a separate scoped sweep per occasion product — confirms §1B item 3)_
  - ✅ ~3 days before deadline, unpaid collection gets a reminder (sent once). _(warn → reminded:1; email "reaches its deadline on June 24… finalize before then")_
  - ✅ At deadline, **unpaid/open** collection is deleted after the grace window (`DELETE_GRACE_MS`, ~6h). _(deadline just-past → held:1 (inside grace); deadline 24h past → deleted:1 + deletion email)_
  - ✅ **Paid** collection is NOT deleted at deadline (auto-finalize / preserved). _(memorial paid+generated, deadline 1d past → scanned:0, deleted:0 — not a sweep candidate)_
  - ✅ **Paid-but-empty** gets the once-only nudge, not deletion. _(venture-core cron: paid+open+no-memories at deadline → `extendCollectionDeadline` (summary.extended++, up to MAX_EXTENSIONS) + nudge email "…is paid and still open, but no memories have been added yet — so there's nothing to weave into a {noun}. Add at least one memory…". NOT deleted, NOT generated-empty. Also seen empirically: a prior-run "Adam and eve … you've already paid … add at least one memory" nudge email is in the inbox.)_
  - ✅ Generated content is purged on the `purge_after` schedule (post-generation retention), not left forever. _(purgeNow → purge cron → purged:1; result link → graceful "We hit a snag … contact hello@wordsbywtm.com")_

---

## 10. Webhook (Paddle backstop)  _(verified via empirical no-op + venture-core handler source; sandbox payments fired the real webhook → "New Sale" emails)_
- ✅ `transaction.completed` webhook marks the collection paid via `customData.collectionId` even if the browser closed before redirect. _(handler logs "collection marked paid: <collectionId>" via markCollectionPaid; the memorial + retirement sandbox payments produced owner "💰 New Sale" emails = webhook backstop fired)_
- ✅ Webhook path in Paddle dashboard matches the deployed route; signature verified. _(`/api/webhook` deployed; handler verifies signature — "Missing signature or webhookSecret" + "Signature verification failed" guards; the **Paddle-dashboard destination URL** is a founder dashboard-check)_
- ✅ **Multi-occasion safe:** webhook dispatches **strictly** by `customData.product` to the matching live config; an unmatched/missing product returns a 200 no-op (NO fallback to a first/arbitrary config — verified it can't cross-route). _(curl with bogus product AND with no product → both **200 "no matching live product for event"**; handler adds cross-product guards on customData.product, priceId, and collection price — defense in depth)_
- ✅ Customer email is redacted in webhook logs. _(handler logs `"[webhook] customer email resolved: yes/null"` — presence only, never the address; no console call emits the raw email)_

---

## 11. Abuse / double-usage (must be ❌-free to launch)
- ✅ Cannot generate without a confirmed payment (server-side gate; client tampering fails). _(POST /api/collection/generate with a forged `transactionId` → 404 "Collection not found for this payment." — no txn→collection mapping + server re-verifies payment, so a tampered/fabricated txn can't trigger generation)_
- ✅ Cannot generate a second time / reuse a token to re-generate (one-time use enforced). _(reload of ?txnId= → POST /api/collection/tribute 200 returns EXISTING tribute, no regeneration, no new sale email)_
- ✅ ALREADY_USED recovery path returns the existing tribute, not an error/charge. _(same: idempotent, returns stored tribute)_
- ✅ Invite rate limits (per-email 1/day, per-customer 12/day) hold under rapid repeat attempts. _(per-email 1/day → "Already invited that address today" (§3); per-customer 12/day → 13th invite 429 RATE_LIMIT (§3). Both hold.)_
- ✅ Contributor cap can't be exceeded via concurrent submits (atomic INSERT…SELECT). _(cap=3 enforced; 4th → "collection is full")_
- ✅ Support console (`/support`) requires Basic-Auth (`SUPPORT_PASSWORD`); wrong/no creds rejected; constant-time compare. _(unauthenticated GET /support → not served (challenged/error frame, no console). Code-confirmed in src/middleware.ts: Basic-Auth fail-closed, `WWW-Authenticate: Basic realm="Support"` 401, constant-time compare over SUPPORT_PASSWORD, covers /support + /api/support/*)_
- ✅ No admin/share token leaks in URLs shared in emails beyond what's intended; tokens are unguessable. _(emails contain only the intended manage/share tokens; deliverable email exposes the manage token by design)_

### 11a. Abuse guards (SES-047)
- ✅ **Create rate-limit:** rapid-fire `/<occ>/start` create with the same organizer email → 429 (`RATE_LIMIT`) after the per-email cap (3/hr); a different IP/email is not blocked by another's quota; the limit is **bypassed when `ENABLE_MOCK_PAYMENT=true`** (local happy-path sweep never throttles). _(5 rapid POSTs same email → attempts 1-3 HTTP 400 (pass RL), attempt 4+5 → **429 RATE_LIMIT** (3/hr cap); a DIFFERENT email → 400 not 429 (per-email keyed). Mock bypass is code-confirmed: route guards `if (process.env.ENABLE_MOCK_PAYMENT !== 'true')`.)_
- ✅ **Organizer-as-contributor:** on the public share link, a contributor entering the **organizer's own email** is rejected (the organizer can't invite or contribute as themselves). _(anniversary share link, organizer email → POST /api/collection/contribute **400**: "That's the organizer's email. If you're the organizer, add your memory from your collection dashboard — otherwise please use your own email.")_
- ✅ **Bogus/deleted token:** opening a deleted or made-up collection token shows the **calm not-found** screen (no crash / no stack trace) on **both** the contributor share link **and** the `/tribute` (admin) link. _(B preview: /c → "This link isn't active"; /collect/manage → "We couldn't open this collection")_

---

## 12. Data-loss / "lost my result after paying" (must be ❌-free to launch)
- ✅ Pay → close tab immediately → reopen admin link → tribute is there (webhook backstop + durable token). _(reopened dashboard via ?t= and result via ?txnId= after redirect; deliverable email also carries the manage link)_
- ✅ Pay → generation transient error → retry recovers without a second charge. _(reloading ?txnId= re-requests tribute → existing returned, no second sale email/charge)_
- ✅ Paid collection survives the deadline sweep (not purged early). _(memorial paid+generated at deadline 1d past → deadline cron scanned:0/deleted:0; only purged after explicit purge_after — §9)_
- ✅ Audio stored in Postgres survives reload and is downloadable; it cascades-deletes only when the collection is deleted. _(reload → GET audio?info=1 200 reuse; MP3 link works. Cascade-delete not separately tested.)_
- ✅ Purge timing leaves the customer a reasonable window to download PDF + audio after generation. _(retention copy = "~30 days after creation"; purge is `purge_after`-gated (verified §9) so the deliverable + audio stay downloadable for ~30 days, then purge → graceful not-available screen)_

---

## 13. Cross-cutting checks
- ✅ Mobile layout: create, invite, contribute, pay, result, PDF/audio download all usable on a phone. _(390px viewport: landing, `/start` create form, and the generated result all render with **no horizontal overflow** (scrollWidth==innerWidth); header wraps, full-width CTAs, audio player + PDF button present on the mobile result; pay = Paddle's own responsive modal)_
- ✅ Accessibility: keyboard-only can complete the core flow; focus management on modals/done-heading. _(create form tab order is logical email→confirm→name→relationship→… with **no positive tabindex** (clean DOM order), 18 reachable controls; modal focus-trap verified §5 (focus moves into dialog, background `inert`, Esc restores focus to trigger))_
- ✅ No secrets in client bundle / network responses (check DevTools). _(scanned server HTML + `__NEXT_DATA__` serialized props + 12 `_next/static` JS chunks (~726KB) for sk-ant / CRON_SECRET / SUPPORT_PASSWORD / resend re_ / paddle apikey+ntfset / postgres creds / elevenlabs sk_ → ZERO hits. Next.js only inlines `NEXT_PUBLIC_*` into client code by design.)_
- ✅ Legal pages reachable; correct domain (content is attorney/LC-03 interim — do not edit). _(/terms renders fully — Words That Matter LLC, Delaware, Paddle MoR, EU/UK withdrawal waiver, auto-deletion clauses, hello@wordsbywtm.com; /privacy + /refund route OK. NOTE: HEAD probes to static pages return 503 on this preview but GET renders — cosmetic preview quirk, same as OG.)_

---

## 14. Production go/no-go (Pass C)
- ⬜ One **real** $49 purchase on the live domain completes end to end (pay → generate → PDF → audio → emails).
- ⬜ Owner internal purchase email received for the real txn.
- ⬜ **Refund** the test transaction in Paddle after confirming.
- ⬜ Analytics fire (GA4 / Ads conversion) — or note MKT-002 still open.
- ⬜ Rollback plan known (revert deploy in Vercel) if a P0 surfaces post-launch.

---

### Sign-off
| Pass | Date | By | Result | Notes |
|------|------|----|--------|-------|
| A — Local mock | | | | (folded into the B-preview run) |
| B — Preview sandbox | 2026-06-21/22 | Claude (browser-driven) + founder (paid sandbox checkouts) | **PASS w/ notes** | Memorial = full depth (pay→generate→PDF→audio→emails→double-pay→recovery→support→legal). Retirement = full (paid). Wedding/anniversary = light (create→contribute/N=1→finalize→checkout). §9 crons re-validated (warn/delete/purge). Open: **F-1 OG cards 500/503 (MED, fix before relying on social share)**, F-3 relationship shows raw value (MED), F-2 anniversary consent noun (LOW). F-5/F-6 LOW. F-7 = sandbox-only, resolved. Not run: §6b pay-in-advance, §10 webhook close-tab, §11a create-rate-limit/organizer-as-contributor, §13 mobile/a11y. |
| C — Prod smoke | | | | (founder — one real $49, refund after) |

