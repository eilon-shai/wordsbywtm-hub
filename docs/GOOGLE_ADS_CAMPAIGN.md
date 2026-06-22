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

Tone by occasion. Always lead with the **collaborative** differentiator (gather
many → one) and the **free-to-start, pay-once** model.

**Memorial (plain, respectful):**
- Headlines: "One eulogy, in everyone's voice" · "Gather memories from everyone who knew them" · "Woven into one tribute to read aloud" · "Free to start · Pay once" · "No account needed"
- Description: "Invite family and friends to each add a memory. We weave them into one heartfelt tribute — a page to keep and a spoken version. Free to gather; pay once when you're ready."

**Wedding (warm, celebratory):**
- Headlines: "One wedding toast, from both sides" · "Gather stories from everyone" · "No more blank-page panic" · "Free to start · Pay once"
- Description: "Collect stories from the wedding party, family and friends, and we weave them into one toast for the couple. Free to gather; pay once at the end."

**Retirement:**
- Headlines: "One send-off speech, from the whole team" · "Gather years of stories" · "Read aloud at the party" · "Free to start · Pay once"

**Anniversary:**
- Headlines: "A milestone tribute, from the whole family" · "Gather memories of the couple" · "For the big anniversary" · "Free to start · Pay once"

## 5. Budget & bidding

- Start **$10–20/day total** across the four ad groups (or concentrate on the 1–2
  occasions you most want to validate). Memorial + retirement convert most naturally.
- Bidding: start **Maximize Clicks** (or manual CPC) to gather data; switch to
  **Maximize Conversions / Target CPA** only after ~15–30 conversions.
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
