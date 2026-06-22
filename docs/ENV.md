# Environment Variables — wordsbywtm-hub

Inventory of every env var configured in **Vercel** for this project, as of **2026-06-22**.

- **Source of truth is Vercel** (Project → Settings → Environment Variables). This file is documentation, not a loader — local dev uses `.env.development.local` (see `.env.example`).
- **Public values are shown** — `NEXT_PUBLIC_*` vars ship inside the browser bundle, so they are not secret. Non-secret config literals (from-addresses, environment flags) are shown too.
- **Secrets show the key only** (marked 🔒). Their values live in Vercel and must never be committed.
- **Scope** = which Vercel environments the var is set in. Several vars exist in both Preview and Production with **different values** (e.g. sandbox vs live).

> ⚠️ `NEXT_PUBLIC_*` vars must be set as **plain, not "Sensitive"** in Vercel, or the build bakes them in empty. Env changes require a **redeploy** to take effect.

---

## App

| Key | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_URL` | Prod / Preview | Prod: `https://www.wordsbywtm.com` · Preview: per-deploy URL |
| `UNDER_CONSTRUCTION` | Prod | `false` |
| `CONSTRUCTION_BYPASS_TOKEN` | Prod / Preview | 🔒 token to bypass the under-construction gate |

## Analytics (all public, Production)

| Key | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Prod | `G-GWQSERHEVF` |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Prod | `xb60yny103` |
| `NEXT_PUBLIC_GOOGLE_ADS_TAG_ID` | Prod | `AW-18110289262` |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Prod | `IJtPCKSm1cMcEO6q1LtD` (label for the "wordsbywtm – Collection purchase" action) |
| `NEXT_PUBLIC_DISABLE_ANALYTICS` | Preview | flag — turns analytics off on previews |

Ads account: `hello@vocalvow.com`. GA4 property `wordsbywtm` (542738940). See `venture-ops` memory `reference_wordsbywtm_analytics_ids`.

## Paddle — Production (live)

| Key | Scope | Value |
|---|---|---|
| `PADDLE_ENVIRONMENT` | Prod | `production` |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Prod | `production` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Prod | `live_f7fd6994bd106d4b262ac18eaec` (public client token) |
| `PADDLE_API_KEY` | Prod | 🔒 |
| `PADDLE_WEBHOOK_SECRET` | Prod | 🔒 |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL` | Prod | `pri_01kvdp3hb77q9wa7e2czasc0ds` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_WEDDING` | Prod | `pri_01kvdp96mt49gtpcpxkmgxczzb` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_RETIREMENT` | Prod | `pri_01kvdpbfmf613w64nc0bwn9rxw` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_ANNIVERSARY` | Prod | `pri_01kvdp6hdr6vd71wyxp1858cdg` |
| `PADDLE_PRODUCT_ID_MEMORIAL` | Prod / Preview | Paddle product id (in Vercel) |
| `PADDLE_PRODUCT_ID_WEDDING` | Prod / Preview | Paddle product id (in Vercel) |
| `PADDLE_PRODUCT_ID_RETIREMENT` | Prod / Preview | Paddle product id (in Vercel) |
| `PADDLE_PRODUCT_ID_ANNIVERSARY` | Prod / Preview | Paddle product id (in Vercel) |

Note: the live Paddle products reuse legacy names per occasion (wedding = "VocalVow Vow Writer", retirement = "MilestoneScribe Retirement Speech") — expected.

## Paddle — Sandbox (Preview only)

| Key | Scope | Value |
|---|---|---|
| `PADDLE_API_KEY_SANDBOX` | Preview | 🔒 |
| `PADDLE_WEBHOOK_SECRET_SANDBOX` | Preview | 🔒 |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN_SANDBOX` | Preview | sandbox client token (in Vercel) |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_SANDBOX` | Preview | `pri_01kv1g6pw7wje6q9f2g3wzx9zr` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_WEDDING_SANDBOX` | Preview | sandbox price id (in Vercel) |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_RETIREMENT_SANDBOX` | Preview | sandbox price id (in Vercel) |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_ANNIVERSARY_SANDBOX` | Preview | sandbox price id (in Vercel) |

## Database — Neon Postgres (all 🔒, Preview + Production; Neon-managed set)

`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `NEON_PROJECT_ID`, `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`

> Preview and Production currently point at the **same Neon DB** (shared). Isolate before scaling.

## Redis — Upstash (🔒, Preview + Production)

| Key | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | 🔒 |
| `UPSTASH_REDIS_REST_TOKEN` | 🔒 |

> Preview and Production share the **same Upstash instance** — test traffic consumes prod rate-limit quotas. Isolate before launch.

## Email — Resend

| Key | Scope | Value |
|---|---|---|
| `RESEND_API_KEY` | Prod / Preview | 🔒 |
| `RESEND_FROM_EMAIL_MEMORIAL` | Prod / Preview | `memorial@wordsbywtm.com` |
| `RESEND_FROM_EMAIL_WEDDING` | Prod / Preview | `wedding@wordsbywtm.com` |
| `RESEND_FROM_EMAIL_RETIREMENT` | Prod / Preview | `retirement@wordsbywtm.com` |
| `RESEND_FROM_EMAIL_ANNIVERSARY` | Prod / Preview | `anniversary@wordsbywtm.com` |
| `DISABLE_EMAIL` | Preview | flag — skip sending real email |

## AI

| Key | Scope | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | Prod / Preview | 🔒 |
| `SYNTHESIS_MODEL` | Preview | model override (prod defaults to `claude-opus-4-8`; preview uses a cheaper model) |
| `ELEVENLABS_API_KEY` | Prod / Preview | 🔒 audio narration |
| `DISABLE_TRIBUTE_AUDIO` | Preview | flag — disable audio generation |

## Auth / security secrets

| Key | Scope | Value |
|---|---|---|
| `SUPPORT_PASSWORD` | Prod / Preview | 🔒 Basic-Auth for `/support` + `/api/support/*` |
| `CRON_SECRET` | Prod / Preview | 🔒 bearer for deadline/purge cron + test-crons.sh |
| `CONTRIBUTION_HASH_SECRET` | Prod | 🔒 hashing salt for contributor identity |
| `REDIS_FORM_ENCRYPTION_KEY` | Prod / Preview | 🔒 encrypts contributor PII at rest (must match any DB-sharing app) |
| `NPM_TOKEN` | Prod / Preview | 🔒 GitHub Packages auth for `@eilon-shai/venture-core` (build) |

## Preview / test-only flags

| Key | Scope | Purpose |
|---|---|---|
| `ENABLE_MOCK_PAYMENT` | Preview | bypass real Paddle for E2E (never set in Production) |
| `NEXT_PUBLIC_ENABLE_MOCK_TESTIMONIALS` | Preview | show mock testimonials |

---

### How to regenerate this inventory
```sh
nvm use 20
npx vercel env ls                                  # full key list + scopes
npx vercel env pull /tmp/venv --environment=production --yes
grep -E '^NEXT_PUBLIC_' /tmp/venv                  # public values safe to document
rm -f /tmp/venv                                     # shred — it also contains secrets
```
