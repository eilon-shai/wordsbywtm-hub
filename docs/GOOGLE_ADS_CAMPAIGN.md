# Google Ads Campaign Guide — wordsbywtm.com

How to set up, launch, and measure Google Ads for the four-occasion hub. The app
is already built to support this: per-occasion **focus deep-links** (`?focus=`)
and a **purchase conversion** that fires on the post-payment return.

> Grief sensitivity: memorial keywords are bid on by funeral-adjacent advertisers
> and visited by people in distress. Keep memorial ad copy plain and respectful —
> no urgency, no hype, no "limited time". Different rules than wedding/retirement.
>
> Copy rule (hard, all occasions): no demographic or identity-group language.
> Describe what it does (gathering memories, tone, polished result), never who it's for.

---

## ⭐ ACTION PLAN (SES-050, 2026-06-24) — change these NOW, step by step

A pricing + paid-search expert review found the campaign is **buying solo-"writer"
intent** ("eulogy writer", "wedding toast writer") for a **group-coordination
product** — which re-runs the pre-form drop-off that killed the single-user apps.
The fixes below realign the ads with the product. **This is not a rebuild** — the
geo/network/grief settings are correct. Do the 5 "NOW" steps, then the 3 "THIS
WEEK" steps. (Account: `hello@vocalvow.com`, Expert mode.)

> **Dependency:** hub PR #70 re-anchors the landing/paywall to the same message
> ("your keepsake from N people: tribute + printable PDF + spoken audio · free to
> gather, $49 once"). Merge + deploy PR #70 so the ad → landing → paywall promise
> matches; otherwise the new ad copy points at a page that still reads like a solo
> writer tool and the click is wasted.

### NOW

**Step 1 — Add group-intent keywords** (phrase + exact, into the matching ad group).
These are the people who already want what we do (coordinate many → one):

- **Memorial:** `collect memories for a funeral`, `memories from family and friends`, `memory book for funeral`, `collect stories about someone who died`, `group eulogy from family`, `share memories of loved one`
- **Wedding:** `messages from wedding guests`, `collect wedding wishes`, `group wedding toast`, `memories from friends for wedding` (keep existing `wedding speech from both families` — best-matched term you already have)
- **Retirement:** `collect messages for retirement`, `retirement memory book`, `messages from coworkers retirement`, `group retirement tribute`, `farewell messages from team`
- **Anniversary:** `collect messages for anniversary`, `anniversary messages from family`, `group anniversary tribute`, `memory book for anniversary`

**Step 2 — Downgrade the pure "writer" terms to EXACT match only** (don't pause them
yet — no data). These are solo-author intent; exact match stops the broad bleed
while you watch them: `eulogy writer`, `funeral speech writer`, `wedding toast writer`,
`maid of honor speech writer`, `best man speech help`, `retirement speech writer`,
`anniversary speech writer`. After a 7–10 day cohort, pause any with ~0 create rate.

**Step 3 — Replace the RSA copy** with the lines in **§4 (rewritten below)**. Every
line carries the three load-bearing moves: gather-many→one · keepsake PDF + **audio** ·
honest "free to gather · $49 once". Memorial stays plain (no urgency).

**Step 4 — Fix bidding** (you're optimizing toward a signal that lags days and has
fired ~zero times):
   1. In Google Ads → Goals → Conversions → **import the GA4 `collection_created`
      event** as a conversion action (Tools → Data manager / GA4 link). Set it
      **Primary**.
   2. Set the existing `purchase` (gtag) conversion to **Secondary** for now (still
      tracked, just not the bid target — it's too sparse/laggy on day-one).
   3. Switch the campaign from **Maximize Clicks → Maximize Conversions**.
   Why: `collection_created` fires same-session, so Smart Bidding gets signal
   immediately; `purchase` lags the multi-day async funnel and can't train bidding yet.

**Step 5 — Concentrate the budget.** $15/day across 4 ad groups ≈ $3.75 each → learns
nothing. Either: **(a, preferred)** pause the **Wedding** and **Anniversary** ad
groups, put the full $15/day on **Memorial + Retirement** (memorial = live pilot,
biggest price-vs-value gap; retirement = clean group intent, low grief-sensitivity);
**or (b)** raise total budget to **$30–40/day** so all four can learn. Don't leave it
thin-and-spread.

### THIS WEEK

**Step 6 — Add these negative keywords** (campaign-level):
- Solo-author leak: `write my own`, `how to write`, `speech writing service`, `hire a writer`, `ghostwriter`, `speechwriter`
- Wrong format: `card`, `greeting card`, `poem`, `poems`, `obituary` (obituary is huge volume, wrong job)
- DIY/free reinforcement (extends existing): `app free`, `online free`, `make my own`
- Retirement gift/job bleed (watch, optional): `retirement letter`, `resignation`, `retirement party games`, `retirement gift`

**Step 7 — Read the search-terms report every 2 days** (not weekly — phrase match
collects junk fast at this budget). Convert every good group-intent query into an
exact-match keyword; negate every solo/DIY/obituary query immediately.

**Step 8 — Judge on cost-per-CREATE, not cost-per-purchase**, until you have a full
7–10 day cohort. A click that doesn't become a `collection_created` never had a
chance to reach the $49 paywall, so create-rate is your real day-one health metric.
Do **not** touch the $49 price until you can show people are reaching the paywall and
bouncing there (see the pricing review — `project_collection_pricing_analysis`).

---

## Status (2026-06-22) — config done; build paused; waiting on Paddle

All tracking is configured and live in the app. What remains is the campaign
itself — which you can **build now in Paused state** and unpause once Paddle prod
is approved.

- ✅ Conversion tracking wired in-app: `AW-18110289262` / label `IJtPCKSm1cMcEO6q1LtD`
- ✅ GA4 `G-GWQSERHEVF`, Clarity `xb60yny103` (env vars set plain/prod; full list in docs/ENV.md)
- ✅ Billing on file (Amex …3569); account `hello@vocalvow.com` in Expert mode
- ✅ Conversion action "wordsbywtm – Collection purchase" created (Purchase · value USD · count One)
- ⏳ **Paddle production approval — pending** (blocks real sales)
- ⏳ **Pass C real $49 purchase** — needed to flip the conversion "unverified" → "recording"

**Build it paused now:** assemble the campaign + ad groups + keywords + RSAs + assets and
set status **Paused**. Ads are still reviewed while paused, so everything is pre-approved
and ready. **Do not unpause** until BOTH gates clear: Paddle approved AND the Pass C
purchase has recorded the conversion — otherwise Smart Bidding has no signal to bid on.

---

## 0. Prerequisites — status

1. **Conversion tracking** — ✅ DONE. Set in Vercel (plain text, Prod) + redeployed:
   - `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-GWQSERHEVF`
   - `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID=AW-18110289262`
   - `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=IJtPCKSm1cMcEO6q1LtD`
   - `NEXT_PUBLIC_CLARITY_PROJECT_ID=xb60yny103`
   Verify with Google Tag Assistant that gtag loads and a test purchase fires `conversion`.
2. **Conversion action** — ✅ DONE. "wordsbywtm – Collection purchase", category *Purchase*,
   value **49 USD**, count **One**. Stays "unverified" until the first real purchase (Pass C).
3. **Google Ads ↔ GA4 link** — optional. If you import the GA4 `purchase` event, mark it
   **Secondary** (observation-only) — NOT primary — so it does not double-count against the
   gtag `purchase` conversion the app already fires.
4. **Billing** — ✅ DONE (Amex …3569 on file).

---

## 1. Account structure

**One Search campaign, one ad group per occasion.** This keeps budgets/management
simple while message-matching each ad group to its occasion via the focus deep-link.

```
Campaign: WTM — Collections (Search)
├─ Ad group: Memorial      → final URL https://www.wordsbywtm.com/?focus=memorial
├─ Ad group: Wedding       → final URL https://www.wordsbywtm.com/?focus=wedding
├─ Ad group: Retirement    → final URL https://www.wordsbywtm.com/?focus=retirement
└─ Ad group: Anniversary   → final URL https://www.wordsbywtm.com/?focus=anniversary
```

- **Final URL:** use the `?focus=<occasion>` hub link (the homepage promotes that
  occasion + deep-links its CTA). Accepted alias values are in
  `src/components/OccasionPicker.tsx` (`FOCUS_ALIASES`): e.g. `memorial`, `eulogy`,
  `funeral`, `tribute` → memorial; `wedding`, `vows`, `toast` → wedding;
  `retirement`, `career`, `farewell` → retirement; `anniversary`, `milestone`.
  (Alternatively point straight at `/memorial`, `/wedding`, etc. — both work; the
  `?focus=` hub link keeps brand context and lets you A/B hub vs landing later.)
- **Split budgets later:** if one occasion needs its own budget/schedule, promote
  that ad group into its own campaign — structure is the same.

## 2. Keywords (start tight: phrase + exact, high intent only)

**Memorial** — `eulogy writer`, `help writing a eulogy`, `funeral speech writer`,
`memorial tribute speech`, `words for a memorial service`.
**Wedding** — `wedding toast writer`, `best man speech help`, `maid of honor speech writer`,
`wedding speech from both families`.
**Retirement** — `retirement speech writer`, `retirement send-off speech`,
`farewell speech for coworker`.
**Anniversary** — `anniversary speech writer`, `50th anniversary toast`,
`milestone anniversary tribute`.

Match types: start **phrase + exact**; avoid broad until you have conversion data.

## 3. Negative keywords (campaign-level)

`free`, `template`, `examples`, `pdf`, `generator free`, `chatgpt`, `ai free`,
`jobs`, `salary`, `quotes` (the "famous quotes" intent), plus cross-occasion
negatives so ad groups don't cannibalize (e.g. add `wedding`/`retirement` as
negatives in the Memorial ad group, etc.).

## 4. Ad copy (Responsive Search Ads — give 8–10 headlines, 3–4 descriptions)

**Rewritten SES-050.** Every line does three things: **gather-many→one** · name the
**keepsake PDF + spoken AUDIO** (the anchor-lifters no $5 card or $30 generator has) ·
set the price honestly (**free to gather · $49 once**). Memorial stays plain — no
urgency, no hype. Paste these in (headlines ≤30 chars, descriptions ≤90 chars — trim
to fit if Ads flags length).

**Memorial (plain, respectful):**
- Headlines: "Gather memories from everyone" · "One tribute, woven from many" · "A keepsake to read and to keep" · "Includes a spoken audio tribute" · "Printable keepsake PDF + audio" · "Free to gather · $49 once to keep" · "No account · pay once at the end"
- Descriptions: "Invite family and friends to share memories. We weave them into one tribute, with a printable keepsake and a spoken recording. Free to gather, $49 once to unlock." · "Everyone who knew them contributes a few words. You receive one polished tribute, a keepsake PDF, and an audio narration. Pay once when it's ready."

**Wedding (warm, celebratory):**
- Headlines: "One toast, from both sides" · "Collect wishes from all the guests" · "Keepsake PDF + spoken audio toast" · "Gather stories from everyone" · "Free to gather · $49 once"
- Descriptions: "Invite both families and the wedding party to add their words. We weave them into one toast, plus a keepsake PDF and audio. Free to start, pay once."

**Retirement:**
- Headlines: "One send-off, from the whole team" · "Collect messages from every coworker" · "Keepsake PDF + audio tribute" · "Read aloud at the party" · "Free to gather · $49 once"
- Descriptions: "Invite the team to share what they'll remember. We weave it into one send-off speech, a printable keepsake, and audio. Pay once at the end."

**Anniversary:**
- Headlines: "One tribute, from the whole family" · "Collect messages from everyone" · "Keepsake PDF + spoken audio" · "For the big anniversary" · "Free to gather · $49 once"
- Descriptions: "Invite family and friends to add a memory. We weave them into one tribute with a keepsake PDF and audio. Free to gather, pay once."

## 5. Budget & bidding

**Updated SES-050 — see the ACTION PLAN at the top (Steps 4–5) for the current call.**

- **Concentrate budget:** $15/day across 4 ad groups learns nothing (~$3.75 each).
  Put it on **Memorial + Retirement** (pause Wedding + Anniversary), or raise to
  **$30–40/day** total. Don't run thin-and-spread.
- **Bidding:** switch **Maximize Clicks → Maximize Conversions optimizing toward
  `collection_created`** (import the GA4 event as a Primary conversion; set `purchase`
  Secondary). `collection_created` fires same-session; `purchase` lags the multi-day
  async funnel and can't train bidding yet. Move bidding to the `purchase` target only
  after purchases accumulate (~15–30).
- Schedule: all-day is fine; memorial intent skews evenings/weekends.

## 6. Measurement (what "working" looks like)

- **Primary conversion:** `purchase` (fires on the result page after Paddle, value $49).
- Watch in GA4: `/` and `/<occasion>` landing → `/<occasion>/start` → finalize.
  The free-create → paid-finalize step is the key drop-off to optimize.
- Use **Clarity** session replay on `/<occasion>` and `/<occasion>/start` to see
  where organizers hesitate.
- Target CPA sanity: at $49 one-time, keep CPA well under that; early on, judge by
  cost-per-create (free) and create→pay rate, not just cost-per-purchase.

## 7. Launch checklist
- [ ] Conversion action created; env ids set; redeployed; test purchase fires `conversion` (Tag Assistant).
- [ ] Campaign + 4 ad groups, each with its `?focus=` final URL.
- [ ] Keywords (phrase+exact) + negatives loaded; cross-occasion negatives in place.
- [ ] 1 RSA per ad group, occasion-appropriate tone (memorial = plain/respectful).
- [ ] Budget + bidding set; billing on file (Amex …3569) ✅.
- [ ] Campaign left **Paused**; unpause only after Paddle approved + Pass C conversion records.
- [ ] After 1 week: review search terms → add negatives, pause non-converters.
