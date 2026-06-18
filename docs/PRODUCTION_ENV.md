# Production Environment Variables

Every env var the app + `@eilon-shai/venture-core` actually read, classified for a
**production** memorial deployment with live payments. Generated from a code audit
(`grep process.env.*` across `src/` and the pinned venture-core build).

Set these in **Vercel → Project → Settings → Environment Variables**, then redeploy
(env changes only take effect on a new deployment).

---

## ✅ Required for production

| Var | Why | Notes |
|---|---|---|
| `DATABASE_URL` | Neon Postgres | no DB → 503 on every collection route |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | locks, rate-limits, `txn→collection` map, dedup |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | pairs with the URL |
| `REDIS_FORM_ENCRYPTION_KEY` | AES-256-GCM key for contribution payloads | 64 hex chars; **fail-closed in prod** (encryption refuses to run if unset) |
| `CONTRIBUTION_HASH_SECRET` | keyed hash for one-memory-per-email dedup | falls back to `REDIS_FORM_ENCRYPTION_KEY`; **`hashEmail` throws in prod if neither is set** |
| `ANTHROPIC_API_KEY` | tribute synthesis | |
| `PADDLE_ENVIRONMENT` | `production` | selects the live Paddle path everywhere |
| `PADDLE_API_KEY` | verify + create transactions server-side | live key |
| `PADDLE_WEBHOOK_SECRET` | webhook signature verification | from the live notification destination |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle.js checkout overlay | client-side, live token |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | `production` | client picks the live environment |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL` | the $49 memorial price id | defaults to `''` → checkout breaks if unset |
| `RESEND_API_KEY` | all transactional email | admin link, deliverable, owner sale alert, new-memory notice |
| `CRON_SECRET` | deadline + purge cron auth | **fail-closed: crons return 503 in prod if unset** |
| `SUPPORT_PASSWORD` | `/support` console Basic-Auth | **fail-closed: `/support` + `/api/support/*` return 503 in prod if unset** |

## 🟡 Recommended

| Var | Why |
|---|---|
| `NEXT_PUBLIC_URL` | canonical base URL for building share/manage/tribute links — set to `https://www.wordsbywtm.com` (otherwise falls back to the prod domain / Vercel host) |
| `RESEND_FROM_EMAIL` | from address (defaults to `Words That Matter <memorial@wordsbywtm.com>`); the sending **domain must be verified in Resend** |
| `PADDLE_PRODUCT_ID_MEMORIAL` | the memorial Paddle product id (has a hardcoded default; set it explicitly to the real product) |

## 🔴 Must be OFF / unset in production

| Var | Risk if set |
|---|---|
| `ENABLE_MOCK_PAYMENT` | `true` bypasses Paddle → free generations |
| `DISABLE_EMAIL` | `true` silences all email |
| `UNDER_CONSTRUCTION` | `true` shows a construction screen |
| `RESEND_CAPTURE_MODE` | `true` diverts email to capture (test mode) |
| `NEXT_PUBLIC_ENABLE_MOCK_TESTIMONIALS` | `true` renders fake testimonials |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK` | keep **unset** — the Edit/Refine pack is a paid no-op until regen ships (SES-044 cap) |

## 🟢 Optional — analytics (MKT-002, founder-owned)

| Var | Why |
|---|---|
| `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID` | Google Ads tag — conversion tracking |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | conversion label for the purchase event |

Not needed to run; needed for ad attribution on the money path.

## 🔊 Optional — audio narration (ElevenLabs)

The tribute can be read aloud (TTS) on the result page, stored in Postgres
(`collection_audio`, auto-purged with the collection). Off unless a key is set.

| Var | Why |
|---|---|
| `ELEVENLABS_API_KEY` | enables the feature (generate + serve audio) |
| `DISABLE_TRIBUTE_AUDIO` | set `true` to force it OFF even with a key (e.g. on **Preview**, to avoid TTS spend) |
| `ELEVENLABS_VOICE_ID` | optional — voice (default: a warm preset) |
| `ELEVENLABS_MODEL_ID` | optional — default `eleven_multilingual_v2` |
| `ELEVENLABS_OUTPUT_FORMAT` | optional — default `mp3_44100_96` (good for spoken word, small) |

## Sandbox / Preview only

For Preview deployments testing against Paddle sandbox:

`PADDLE_API_KEY_SANDBOX`, `PADDLE_WEBHOOK_SECRET_SANDBOX`,
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN_SANDBOX`, `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_SANDBOX`,
`NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox` — plus `SUPPORT_PASSWORD` on Preview if you use `/support` there.

> The Paddle vars auto-select: when `PADDLE_ENVIRONMENT` is not `production`, the
> handlers use the `*_SANDBOX` variants (falling back to the non-suffixed ones).

## Auto-provided by Vercel (no action)

`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `NODE_ENV`, `CI`.

---

## Webhook setup (Paddle)

- Destination URL: `https://www.wordsbywtm.com/api/webhook` (POST), subscribed to **`transaction.completed`**.
- Each Paddle environment (sandbox vs live) is a separate account with its own
  destination + signing secret → use that destination's secret for the matching
  `PADDLE_WEBHOOK_SECRET[_SANDBOX]`.
- The route is multi-occasion: one destination serves all live occasions (it routes
  by `customData.product`).

## Quick smoke after deploy

- `curl -I https://www.wordsbywtm.com/support` → `401` (password set) or `503` (unset).
- `curl -H "Authorization: Bearer $CRON_SECRET" https://www.wordsbywtm.com/api/cron/purge` → `{ ok: true, purged: n }`.
- Create a collection → the manage-link email arrives (confirms Resend + DB).
