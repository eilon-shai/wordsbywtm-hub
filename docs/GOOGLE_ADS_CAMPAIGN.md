# Google Ads Campaign Guide — wordsbywtm.com

How to set up, launch, and measure Google Ads for the four-occasion hub. The app
is already built to support this: per-occasion **focus deep-links** (`?focus=`)
and a **purchase conversion** that fires on the post-payment return.

> Grief sensitivity: memorial keywords are bid on by funeral-adjacent advertisers
> and visited by people in distress. Keep memorial ad copy plain and respectful —
> no urgency, no hype, no "limited time". Different rules than wedding/retirement.

---

## 0. Prerequisites (one-time)

1. **Conversion tracking must be live before spend.** Set in Vercel (plain text, Prod):
   - `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (`G-XXXX`)
   - `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID` (`AW-XXXX`)
   - `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` (the **purchase** conversion's label)
   - (optional) `NEXT_PUBLIC_CLARITY_PROJECT_ID` for session replay
   Redeploy after setting. Verify with Google Tag Assistant that gtag loads and a
   test purchase fires `conversion`.
2. **Create the conversion action** in Google Ads → Goals → Conversions → "Purchase",
   category *Purchase*, value **49 USD**, count **One** (one-time product), then copy
   its **conversion label** into the env var above.
3. Link **Google Ads ↔ GA4** (import GA4 `purchase` as a backup conversion).
4. Add **Mercury** as the billing method.

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
- [ ] Budget + bidding set; Mercury billing attached.
- [ ] After 1 week: review search terms → add negatives, pause non-converters.
