# E2E Issues To Fix — from the B-preview run (SES-049, 2026-06-21/22)

Source: [MANUAL_E2E_TEST_PLAN.md](./MANUAL_E2E_TEST_PLAN.md) FINDINGS LOG. Only the **actionable** findings are listed (F-4 retracted; F-5/F-7 were sandbox-only non-issues).

| # | Sev | Status | Area | Issue | Fix |
|---|-----|--------|------|-------|-----|
| F-1 | **MED** | ✅ FIXED (code) | OG images | `/<occ>/opengraph-image` returned 500 — Satori: "Expected `<div>` to have explicit display:flex … if it has more than one child node". The line `Words That Matter · {title}` is **two JSX child nodes** (static text + `{title}`) on a non-flex div. | `src/app/[occasion]/opengraph-image.tsx`: collapsed to one node `` {`Words That Matter · ${title}`} ``. Verified locally: all 4 occasions → 200 image/png 1200×630. |
| F-3 | **MED** | ✅ FIXED (code) | Create/contribute form + dashboard | Relationship trigger + memory card showed the raw **value** ("child") not the **label** ("Son or Daughter") — Base UI `Select.Value` renders the value unless given an `items` map. | (1) `src/components/forked/FormPrimitives.tsx`: pass `items={value→label}` to `<Select>`. (2) `MemoryCard.tsx` + `ManageDashboard.tsx`: display-only `relationshipLabel` mapped via `getIntake(occasion)` (raw value kept for the edit form). |
| F-2 | LOW | ✅ FIXED (code) | Copy | Anniversary consent checkbox said "woven into the **tribute**" — should be "toast". | `src/lib/intake.ts`: anniversary `consentLabel` "tribute" → "toast". |
| F-6 | decision | ✖ SKIPPED (founder) | Result page | No "Delete this collection" on the post-payment result view. | **Won't fix** — delete-paid is 409-blocked, so a delete control there would be misleading; plan expectation dropped. |

**Verification:** `tsc --noEmit` clean; `vitest run` → **133/133 pass**; OG cards verified locally (200 PNG). Fixes are in the working tree on `fix/memorial-icon-candle` — **redeploy the preview to re-verify F-1/F-2/F-3 there** (the live preview still shows the old behavior until then).

Notes:
- F-4 (emailed manage link "broken") — **retracted**; the Gmail readback tool dropped the `=`, the real link works.
- F-5 (Paddle footer "vocalvow") / F-7 (sandbox product names "VocalVow Vow Writer" / "MilestoneScribe Retirement Speech") — **sandbox-only, prod correct**; no action.
