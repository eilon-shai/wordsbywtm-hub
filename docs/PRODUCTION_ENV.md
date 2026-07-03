# Production Environment Variables

Every env var the app + `@eilon-shai/venture-core` actually read, classified for a
**production** deployment with live payments. The hub now hosts **four live
occasions** (memorial, retirement, wedding, anniversary), each with its own Paddle
product/price + from-address, all on shared infrastructure (one DB / Redis / Paddle
account / webhook).

Set these in **Vercel → Project → Settings → Environment Variables**, then redeploy
(env changes only take effect on a new deployment).

**Legend:** ✅ set on Production · 🟡 set on Preview only · ❌ missing everywhere
(status as audited 2026-06-18 via `vercel env ls`; values not shown. Live-payment
vars + the per-occasion live price/product ids are **founder-confirmed set on
Production 2026-07-03** — reported by the founder, **not** re-audited via a fresh
`vercel env ls`).

---

## ✅ Live Paddle payment path — CONFIGURED (founder-confirmed 2026-07-03)

The founder confirmed on **2026-07-03** that the full live Paddle payment path is
now set on Production. All the vars below are marked ✅ Prod on that basis. Note
this is **founder-confirmed, not re-audited** via `vercel env ls` — if you need
certainty before the first real charge, run `vercel env ls production` and the
"live overlay" smoke at the bottom of this file to verify directly.

| Var | Purpose | Prod status |
|---|---|---|
| `PADDLE_ENVIRONMENT` = `production` | selects the live Paddle path server-side | ✅ Prod (founder-confirmed 2026-07-03) |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` = `production` | client picks live; also selects live vs `_SANDBOX` price id | ✅ Prod — value must be `production`, not `sandbox` |
| `PADDLE_API_KEY` | verify + create live transactions | ✅ Prod (founder-confirmed 2026-07-03) |
| `PADDLE_WEBHOOK_SECRET` | live webhook signature verification | ✅ Prod (founder-confirmed 2026-07-03) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle.js checkout overlay (live) | ✅ Prod (founder-confirmed 2026-07-03) |

---

## Per-occasion Paddle + email matrix

Each occasion needs a Paddle **product** id, a **live price** id, a **sandbox price**
id (for preview), and (optional) a from-address. The basic + full tiers share one
price per occasion, so **one live price per occasion** is enough. Code defaults the
product id + sandbox price to hardcoded sandbox ids (so the registry guard/tests
pass), but **production must override the live price** via the `NEXT_PUBLIC_..._<OCC>`
var — it defaults to `''`, which breaks live checkout.

Status below reflects the founder's 2026-07-03 confirmation that live payment is set
on Production for all four occasions (not re-audited via CLI).

| Occasion | `PADDLE_PRODUCT_ID_<OCC>` | `NEXT_PUBLIC_PADDLE_PRICE_ID_<OCC>` (live) | `..._<OCC>_SANDBOX` | `RESEND_FROM_EMAIL_<OCC>` |
|---|---|---|---|---|
| **MEMORIAL** | ✅ Prod | ✅ Prod (founder-confirmed 2026-07-03) | ✅ Prod | (uses `RESEND_FROM_EMAIL`) |
| **RETIREMENT** | ✅ Prod (founder-confirmed 2026-07-03) | ✅ Prod (founder-confirmed 2026-07-03) | 🟡 Preview | ✅ Prod |
| **WEDDING** | ✅ Prod | ✅ Prod (founder-confirmed 2026-07-03) | 🟡 Preview | ✅ Prod |
| **ANNIVERSARY** | ✅ Prod | ✅ Prod (founder-confirmed 2026-07-03) | 🟡 Preview | ✅ Prod |

All four occasions are live-payment ready per the founder's 2026-07-03 confirmation.
To re-verify independently: `vercel env ls production` + confirm a live overlay opens
(smoke below).

---

## ✅ Required for production (shared infra — occasion-agnostic)

| Var | Why | Notes |
|---|---|---|
| `DATABASE_URL` | Neon Postgres | no DB → 503 on every collection route |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | locks, rate-limits, `txn→collection` map, dedup |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | pairs with the URL |
| `REDIS_FORM_ENCRYPTION_KEY` | AES-256-GCM key for contribution payloads | 64 hex chars; **fail-closed in prod**. **One shared key** — all occasions share the DB, so the same key must encrypt/decrypt every occasion's rows |
| `CONTRIBUTION_HASH_SECRET` | keyed hash for one-memory-per-email dedup | falls back to `REDIS_FORM_ENCRYPTION_KEY`; **`hashEmail` throws in prod if neither is set** |
| `ANTHROPIC_API_KEY` | synthesis (all occasions) | |
| `RESEND_API_KEY` | all transactional email | admin link, deliverable, owner sale alert, new-memory notice |
| `CRON_SECRET` | deadline + purge cron auth | **fail-closed: crons 503 in prod if unset.** One cron sweeps all live occasions |
| `SUPPORT_PASSWORD` | `/support` console Basic-Auth | **fail-closed: `/support` + `/api/support/*` 503 in prod if unset.** Console covers all live occasions |

Plus the shared **live Paddle** vars in the ✅ live Paddle section above.

## 🟡 Recommended

| Var | Why |
|---|---|
| `NEXT_PUBLIC_URL` | canonical base URL for share/manage/tribute links — set to `https://www.wordsbywtm.com` |
| `RESEND_FROM_EMAIL` | default/fallback from-address (memorial uses it; defaults to `Words That Matter <memorial@wordsbywtm.com>`). Per-occasion `RESEND_FROM_EMAIL_<OCC>` override the default. The sending **domain must be verified in Resend** (any `@wordsbywtm.com` works) |

## 🔴 Must be OFF / unset in production

| Var | Risk if set |
|---|---|
| `ENABLE_MOCK_PAYMENT` | `true` bypasses Paddle → free generations |
| `DISABLE_EMAIL` | `true` silences all email |
| `DISABLE_TRIBUTE_AUDIO` | `true` forces audio OFF (fine on Preview to save TTS spend; leave **unset** in prod to keep audio on) |
| `UNDER_CONSTRUCTION` | `true` gates the **public** site behind a "coming soon" 503 (middleware). APIs/webhooks/cron + static assets stay live. Use it to run prod E2E before launch; **unset it to go live**. Bypass to browse normally while gated: `…/?preview=<token>` (sets a 24h cookie). The token is `CONSTRUCTION_BYPASS_TOKEN` if set, else `SUPPORT_PASSWORD`. |
| `CONSTRUCTION_BYPASS_TOKEN` *(optional)* | URL-safe bypass token for the construction gate — **recommended** over relying on `SUPPORT_PASSWORD`, which may contain `+ & # %` etc. that get mangled in a query string. Set a clean value (e.g. a hex string). |
| `RESEND_CAPTURE_MODE` | `true` diverts email to capture (test mode) |
| `NEXT_PUBLIC_ENABLE_MOCK_TESTIMONIALS` | `true` renders fake testimonials |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK` | keep **unset** — the Edit/Refine pack is a paid no-op until regen ships (SES-044 cap) |

## 🟢 Optional — analytics (MKT-002, founder-owned)

| Var | Why |
|---|---|
| `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID` | Google Ads tag — conversion tracking |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | conversion label for the purchase event |

Not needed to run; needed for ad attribution on the money path.

## 🤝 Optional — partner referral courtesy discount — ✅ set on Production

The 10% partner-referral courtesy ($49 → $44). venture-core's collection checkout
applies the discount via the hub's `resolvePartnerDiscount` (`src/lib/partners.ts`),
but **only** for referral tokens present in the `PARTNERS` allowlist. Off unless the
env var is set.

| Var | Why | Prod status |
|---|---|---|
| `PARTNER_DISCOUNT_ID` | the Paddle discount id (`dsc_...`) for the 10% courtesy | ✅ Prod (founder created the Paddle discount + set it, 2026-07-03) |

- **Server-side only** — do **NOT** prefix with `NEXT_PUBLIC_` (it must never reach the client bundle).
- **Optional / safe-off:** when **unset**, `resolvePartnerDiscount` returns `undefined` → no discount → the Paddle transaction is byte-identical (same price id, no `discountId`). Production is correct with or without it, so this was always safe to ship ahead of the Paddle discount existing.
- **Two prerequisites for a discount to actually apply:** (1) this env set (**done**), **and** (2) the partner's opaque token added to the `PARTNERS` map in `src/lib/partners.ts`. With `PARTNER_DISCOUNT_ID` set but no partner tokens onboarded yet, nothing is discounted — exactly the current state.
- Paddle discount config: percentage 10%, `restrict_to` the finalize price ids, plus `usage_limit` + `expires_at` for leak control (see `docs/PARTNER_PROGRAM_GUIDE.md` §6).

## 🔊 Optional — audio narration (ElevenLabs) — ✅ key set on Production

The tribute is read aloud (TTS) on the result page, stored in Postgres
(`collection_audio`, auto-purged with the collection). Off unless a key is set.

| Var | Why |
|---|---|
| `ELEVENLABS_API_KEY` | enables the feature (generate + serve audio) — ✅ set Prod + Preview |
| `DISABLE_TRIBUTE_AUDIO` | `true` to force OFF even with a key (use on **Preview** to avoid TTS spend) |
| `ELEVENLABS_VOICE_ID_FEMALE` | optional — female voice (default: Sarah, a warm premade voice) |
| `ELEVENLABS_VOICE_ID_MALE` | optional — male voice (default: George, a warm premade voice) |
| `ELEVENLABS_VOICE_ID` | optional — legacy fallback for the female voice |
| `ELEVENLABS_MODEL_ID` | optional — default `eleven_multilingual_v2` |
| `ELEVENLABS_OUTPUT_FORMAT` | optional — default `mp3_44100_96` |

> ⚠️ **Plan:** library voices return `402 paid_plan_required` on a free ElevenLabs
> account, and the free tier is non-commercial + ~10k credits/mo (~2 tributes). The
> defaults are **premade** voices (free-tier API usable), but a **paid plan**
> (Creator) is required for commercial use + volume before real launch.

## Sandbox / Preview only

For Preview deployments testing against Paddle sandbox (status: ✅ all present on Preview):

`PADDLE_ENVIRONMENT=sandbox`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox`,
`PADDLE_API_KEY_SANDBOX`, `PADDLE_WEBHOOK_SECRET_SANDBOX`,
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN_SANDBOX`, and per-occasion
`NEXT_PUBLIC_PADDLE_PRICE_ID_<OCC>_SANDBOX` — plus `SUPPORT_PASSWORD` on Preview if
you use `/support` there.

> The Paddle vars auto-select: when `PADDLE_ENVIRONMENT` is not `production`, the
> handlers use the `*_SANDBOX` variants (falling back to the non-suffixed ones), and
> the client uses the `_SANDBOX` price when `NEXT_PUBLIC_PADDLE_ENVIRONMENT` ≠ `production`.

## Auto-provided by Vercel (no action)

`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `NODE_ENV`, `CI`.

---

## Webhook setup (Paddle)

- Destination URL: `https://www.wordsbywtm.com/api/webhook` (POST), subscribed to **`transaction.completed`**.
- Each Paddle environment (sandbox vs live) is a separate account with its own
  destination + signing secret → use that destination's secret for the matching
  `PADDLE_WEBHOOK_SECRET[_SANDBOX]`.
- **One destination serves all four occasions** — the route routes strictly by
  `customData.product` to the matching occasion config (unmatched product → 200
  no-op; never cross-routes), and the chosen handler re-verifies signature + product.

## Quick smoke after deploy

- `curl -I https://www.wordsbywtm.com/support` → `401` (password set) or `503` (unset).
- `curl -H "Authorization: Bearer $CRON_SECRET" https://www.wordsbywtm.com/api/cron/purge` → `{ ok: true, purged: n }`.
- Create a collection on each occasion → the manage-link email arrives from that
  occasion's from-address (confirms Resend + DB + per-occasion config).
- Confirm a real checkout opens the **live** Paddle overlay (not sandbox) — proves
  the live-payment vars are correctly set.

---

## Go-live checklist (per occasion)

For each of memorial / retirement / wedding / anniversary:
1. Live Paddle **product** exists and `PADDLE_PRODUCT_ID_<OCC>` is on **Production**.
2. Live Paddle **price** exists and `NEXT_PUBLIC_PADDLE_PRICE_ID_<OCC>` is on **Production**.
3. Shared live Paddle vars set (✅ live Paddle section): `PADDLE_ENVIRONMENT=production`,
   `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
   `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production`.
4. `RESEND_FROM_EMAIL_<OCC>` set (optional; defaults to `<occasion>@wordsbywtm.com`).
5. Occasion is `live: true` in `src/lib/registry.ts` (all four already are).
