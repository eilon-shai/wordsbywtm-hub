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

## 1A. Per-occasion smoke matrix (run for EACH occasion)

For each occasion, swap `<occ>` (memorial / retirement / wedding / anniversary):

| Check | memorial | retirement | wedding | anniversary |
|---|---|---|---|---|
| `/<occ>` landing renders, occasion-correct copy (no "tribute/service" on toast/send-off) | ☐ | ☐ | ☐ | ☐ |
| Card on `/` (and `/?focus=<occ>` featured) routes to `/<occ>` | ☐ | ☐ | ☐ | ☐ |
| `/<occ>/start` create form uses the right relationship taxonomy + labels | ☐ | ☐ | ☐ | ☐ |
| Contributor add → organizer review → finalize → generate | ☐ | ☐ | ☐ | ☐ |
| Result + email use the right deliverable noun (tribute/send-off/toast) + read-aloud context | ☐ | ☐ | ☐ | ☐ |
| Checkout opens the **live** Paddle product for THIS occasion (right price) | ☐ | ☐ | ☐ | ☐ |
| Deliverable/admin emails come from `<occ>@wordsbywtm.com` | ☐ | ☐ | ☐ | ☐ |
| OG card (`/<occ>/opengraph-image`) + favicon render (not 404) | ☐ | ☐ | ☐ | ☐ |

## 1B. Cross-product isolation (shared DB / Redis / Paddle / webhook)

- [ ] A payment/webhook for occasion A **never** marks an occasion-B collection paid (`customData.product` routes strictly; unmatched → 200 no-op).
- [ ] A support-console lookup for occasion A returns **only** A's collections.
- [ ] The deadline-sweep cron runs once per live occasion (4 sweeps), each scoped to its own product.
- [ ] Org dedup ("one open collection per email") is **per occasion** — the same email can hold one memorial AND one wedding collection.
- [ ] Generating occasion A's tribute never resolves to occasion B (an unmapped txn 404s, not a wrong-product generation).

---

## 0. Environments & where to run each pass

| Pass | Where | Payments | AI / Audio | Purpose |
|------|-------|----------|-----------|---------|
| **A — Local mock** | `npm run dev` (Node 20) | Mock (`ENABLE_MOCK_PAYMENT`) | Real or mocked | Fast functional sweep |
| **B — Preview (sandbox)** | Vercel preview deploy | Paddle **sandbox** | Real Anthropic + ElevenLabs | Realistic dry run incl. webhook |
| **C — Production smoke** | prod domain, **one real $49 purchase** | Paddle **live** | Real | Final go/no-go; refund the test txn after |

> Reminder: `next start` forces `NODE_ENV=production` and disables the mock gate — for the
> local mock pass use `npm run dev`. (See memory: E2E mock payment uses `npm run dev`.)

### Pre-flight env audit (do once per environment before testing)
- [ ] All vars in `docs/PRODUCTION_ENV.md` are present for the target environment.
- [ ] `ELEVENLABS_API_KEY` set (Sensitive); `DISABLE_TRIBUTE_AUDIO` **unset** (or `false`) where audio should be on.
- [ ] ElevenLabs account is on a **paid plan** (commercial license + quota) before prod. Free tier = 402 on library voices and ~10k credit cap.
- [ ] Paddle `PADDLE_ENVIRONMENT` matches the target (sandbox vs production); webhook secret set.
- [ ] `NEXT_PUBLIC_*` vars are **plain text, not Sensitive** (Sensitive bakes empty into the client bundle).
- [ ] DB (Neon), Redis (Upstash), Resend keys valid; `SUPPORT_PASSWORD` set.

---

## 1. Smoke (do first — if any fail, stop)
- [ ] Landing `/memorial` renders; no console errors.
- [ ] Site header + home link present on all pages.
- [ ] Memorial nav does **not** show Wedding/Retirement cross-links.
- [ ] An unknown occasion (e.g. `/foobar`) → 404.
- [ ] Result page for a bad token → graceful (no crash / no stack trace).

---

## 2. Create a collection (organizer)
- [ ] `/memorial` → start a collection.
- [ ] Honoree name + organizer email required; validation on empty/invalid email.
- [ ] **Deadline defaults to 1 month** and 1 month is the **maximum** (can't pick further out).
- [ ] On create: organizer lands on the dashboard with a share link + admin link.
- [ ] Deadline callout shows on the dashboard; the `ⓘ` tooltip **appears on hover** (portal — not clipped by the card) explaining auto-finalize (paid) / delete (unpaid).
- [ ] Re-opening the admin link (new tab / after refresh) restores the dashboard (durable admin token via session + localStorage).

---

## 3. Invite contributors
- [ ] Invite block shows a **single send row** (name + email + Send email / WhatsApp) — not 3 repeated rows.
- [ ] "Preview the email" reveals an accurate preview of what the contributor receives.
- [ ] Sending an email invite delivers a real email with a working contribute link.
- [ ] WhatsApp option opens a prefilled message with the link.
- [ ] **Rate limits:**
  - [ ] Same recipient address twice in a day → 2nd blocked (1/day per email).
  - [ ] 13th invite in a day from one organizer → blocked (12/day per customer).
- [ ] Honoree name appears correctly in the invite copy.

---

## 4. Contribute (each contributor)
- [ ] Contribute link opens the contribution form (TributeWords-style, with the 3-layer content guard).
- [ ] Submit a memory → confirmation; organizer gets an internal "new memory" email.
- [ ] **Dedup:** same email submits twice → handled per policy (no duplicate row; keyed email-hash uniqueness holds).
- [ ] **Contributor cap:** add contributors up to the cap; the cap+1 attempt is rejected cleanly (atomic — no over-cap race).
- [ ] HTML / prompt-injection in name & memory (`<script>`, `</contribution>`, `{{}}`) is neutralized — not rendered, not breaking synthesis.
- [ ] Works at **N=1** (a single contributor must still be able to finalize — never refuse a small family at the paywall).

---

## 5. Dashboard (organizer, pre-payment)
- [ ] Contributions appear as they arrive.
- [ ] Organizer can review and select which memories to include.
- [ ] "Delete this collection" is visible and works (unpaid/open) — see §9 for paid/generated behavior.
- [ ] Finalize card explains what they'll receive (woven tribute + keepsake PDF + spoken version) and the one-time $49.
- [ ] Modal focus-trap works (Tab cycles within dialog, Esc/close restores focus).

---

## 6. Payment — checkout-at-create (default path)
> The charge happens at the **final "Create my tribute"** step (NOT on the dashboard) — this is the double-pay fix.
- [ ] Click "Create my tribute" → Paddle opens.
- [ ] Paddle email field is **prefilled and read-only** with the organizer email.
- [ ] Terms checkbox required at the payment moment.
- [ ] Complete payment (sandbox card / mock) → tribute generates.
- [ ] **Double-pay guard:** after paying, return via the link and try again → Paddle does **not** re-open / you are **not** charged twice. Collection shows as generated/closed.
- [ ] Refresh mid-checkout, hard-reload, back button → no duplicate charge, no stuck state.

## 6b. Payment — pay-in-advance path
- [ ] Choose pay-in-advance from the invite/dashboard flow → terms checkbox required.
- [ ] After advance payment, organizer can proceed to "Create my tribute" **freely** with **no second Paddle prompt**.
- [ ] A clear one-way "Are you sure? this finalizes" warning is shown before generating.
- [ ] `paid_at` is set (collection labeled **paid**, not "generated · unpaid").

---

## 7. Generation & result page
- [ ] Prefs step (tone / length / avoid / context) is honored in the output.
- [ ] Synthesis reads as one coherent tribute woven from multiple memories; honoree named throughout; no invented facts.
- [ ] No headers / bullets / stage directions in the prose.
- [ ] Result page: site header, home link present; **no Edit button** on the generated tribute (not even disabled).
- [ ] "Delete this collection" prominent on the result page too.
- [ ] **Download keepsake PDF** works → Times serif, readable, with "Generated by Words That Matter · wordsbywtm.com" attribution footer that is a working link.

### 7b. Audio narration
- [ ] Voice choice appears on the **prefs screen** ("A spoken version, included"): softer (Sarah) / deeper (George) / text-only.
- [ ] Audio is generated **once** with the tribute (not re-billed on re-view).
- [ ] Done view shows a player + MP3 download; audio sounds **warm/human**, not robotic.
- [ ] Re-opening the result later reuses stored audio (GET `?info=1` → player shows without regenerating).
- [ ] Switching the selected voice produces the other voice once and caches it (no repeated billing for the same voice).
- [ ] With `DISABLE_TRIBUTE_AUDIO=true` (or no key): audio UI hidden / POST returns 404 gracefully — rest of flow unaffected.

### 7c. Feedback widget
- [ ] Feedback widget appears on the done view.
- [ ] Submitting feedback works and shows a thank-you immediately.
- [ ] **Once only:** after submitting (or returning later), feedback shows as already given — cannot submit twice.

---

## 8. Emails (customer + internal owner)
- [ ] **Customer deliverable email** arrives after generation, with a working **"View your tribute"** button/link.
- [ ] **Owner internal email — new purchase** arrives at the ops inbox.
- [ ] **Owner internal email — new feedback** arrives.
- [ ] **Owner internal email — new memory/contribution** arrives.
- [ ] All emails: correct honoree name, no broken HTML, no leaked tokens, links use the right domain.

---

## 9. Lifecycle: delete, deadline, purge
- [ ] **Delete unpaid/open** collection → removed; links 404 afterward.
- [ ] **Delete paid/generated** → guarded: requires explicit confirmation (409 unless confirm flag); paid work isn't lost by accident.
- [ ] "What happens if I don't delete?" matches reality: explain + verify against the sweep below.
- [ ] **Deadline sweep cron** (validate in preview):
  - [ ] ~3 days before deadline, unpaid collection gets a reminder (sent once).
  - [ ] At deadline, **unpaid/open** collection is deleted after the grace window (`DELETE_GRACE_MS`, ~6h).
  - [ ] **Paid** collection is NOT deleted at deadline (auto-finalize / preserved).
  - [ ] **Paid-but-empty** gets the once-only nudge, not deletion.
  - [ ] Generated content is purged on the `purge_after` schedule (post-generation retention), not left forever.

---

## 10. Webhook (Paddle backstop)
- [ ] `transaction.completed` webhook marks the collection paid via `customData.collectionId` even if the browser closed before redirect.
- [ ] Webhook path in Paddle dashboard matches the deployed route; signature verified.
- [ ] **Multi-occasion safe:** webhook dispatches **strictly** by `customData.product` to the matching live config; an unmatched/missing product returns a 200 no-op (NO fallback to a first/arbitrary config — verified it can't cross-route).
- [ ] Customer email is redacted in webhook logs.

---

## 11. Abuse / double-usage (must be ❌-free to launch)
- [ ] Cannot generate without a confirmed payment (server-side gate; client tampering fails).
- [ ] Cannot generate a second time / reuse a token to re-generate (one-time use enforced).
- [ ] ALREADY_USED recovery path returns the existing tribute, not an error/charge.
- [ ] Invite rate limits (per-email 1/day, per-customer 12/day) hold under rapid repeat attempts.
- [ ] Contributor cap can't be exceeded via concurrent submits (atomic INSERT…SELECT).
- [ ] Support console (`/support`) requires Basic-Auth (`SUPPORT_PASSWORD`); wrong/no creds rejected; constant-time compare.
- [ ] No admin/share token leaks in URLs shared in emails beyond what's intended; tokens are unguessable.

---

## 12. Data-loss / "lost my result after paying" (must be ❌-free to launch)
- [ ] Pay → close tab immediately → reopen admin link → tribute is there (webhook backstop + durable token).
- [ ] Pay → generation transient error → retry recovers without a second charge.
- [ ] Paid collection survives the deadline sweep (not purged early).
- [ ] Audio stored in Postgres survives reload and is downloadable; it cascades-deletes only when the collection is deleted.
- [ ] Purge timing leaves the customer a reasonable window to download PDF + audio after generation.

---

## 13. Cross-cutting checks
- [ ] Mobile layout: create, invite, contribute, pay, result, PDF/audio download all usable on a phone.
- [ ] Accessibility: keyboard-only can complete the core flow; focus management on modals/done-heading.
- [ ] No secrets in client bundle / network responses (check DevTools).
- [ ] Legal pages reachable; correct domain (content is attorney/LC-03 interim — do not edit).

---

## 14. Production go/no-go (Pass C)
- [ ] One **real** $49 purchase on the live domain completes end to end (pay → generate → PDF → audio → emails).
- [ ] Owner internal purchase email received for the real txn.
- [ ] **Refund** the test transaction in Paddle after confirming.
- [ ] Analytics fire (GA4 / Ads conversion) — or note MKT-002 still open.
- [ ] Rollback plan known (revert deploy in Vercel) if a P0 surfaces post-launch.

---

### Sign-off
| Pass | Date | By | Result | Notes |
|------|------|----|--------|-------|
| A — Local mock | | | | |
| B — Preview sandbox | | | | |
| C — Prod smoke | | | | |

