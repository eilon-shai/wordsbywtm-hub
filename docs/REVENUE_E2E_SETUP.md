# Revenue-journey CI gate — setup

The `.github/workflows/revenue-e2e.yml` workflow runs the full mutating happy-path
(create → invite → contribute → moderate → pay via mock → **real Claude synthesis**
→ finalized tribute) against a **disposable Neon test branch**, nightly + on demand.
It's the gate the in-process Vitest suite can't be: it catches venture-core contract
drift (a changed column/handler) on a version bump, before any ad spend.

**It stays skipped until you complete the steps below** (gated on `RUN_REVENUE_E2E`),
so it never red-X's for missing setup.

## One-time setup

1. **Neon test branch.** Neon console → your project → Branches → **New branch**
   (e.g. `e2e-ci`). Copy its **pooled** connection string. ⚠️ It must NOT be the
   production branch — this workflow writes/deletes rows.

2. **Redis.** Either create a throwaway Upstash Redis DB for tests (cleaner), or
   reuse the prod one (tolerable — keys are occasion-prefixed and the spec's
   global-setup clears its txn keys). Grab the REST URL + token.

3. **GitHub → Settings → Secrets and variables → Actions → Secrets** — add:
   | Secret | Value |
   |---|---|
   | `E2E_DATABASE_URL` | the Neon **test-branch** connection string |
   | `E2E_UPSTASH_REDIS_REST_URL` | test (or prod) Upstash REST URL |
   | `E2E_UPSTASH_REDIS_REST_TOKEN` | test (or prod) Upstash REST token |
   | `E2E_ANTHROPIC_API_KEY` | an Anthropic API key (synthesis is real; the workflow forces the cheap Haiku model) |

   `NPM_TOKEN` already exists (for `@eilon-shai/*` installs).

4. **GitHub → … → Variables** — add:
   | Variable | Value |
   |---|---|
   | `RUN_REVENUE_E2E` | `true` ← flips the gate ON |
   | `PROD_DB_HOST` *(optional, recommended)* | your prod Neon host, e.g. `ep-xxxx.us-east-1.aws.neon.tech` — the workflow aborts if the test URL points at it |

5. Trigger a first run: **Actions → Revenue journey (Tier B e2e) → Run workflow**.

6. **(MF-6) Make it a required check on dependency bumps.** The workflow also runs
   automatically on any PR that changes `package.json` / `package-lock.json` (i.e. a
   venture-core repin — exactly when contract drift lands). To block merging a bump
   that breaks the revenue path: **Settings → Branches → branch protection for `main`
   → Require status checks to pass → add `Revenue journey (Tier B)`**. (Until
   `RUN_REVENUE_E2E=true` the job no-ops, so it won't block on un-provisioned forks.)

## What the run does
- Applies `db/schema.sql` to the test branch (idempotent), so the branch is always current.
- Boots `next dev` with `ENABLE_MOCK_PAYMENT=true DISABLE_EMAIL=true` and the test DB/Redis/Anthropic env.
- Runs `e2e/collection-happy-path.spec.ts` (gated by `E2E_ALLOW_DB_WRITES=1`), which tags its data and self-cleans (`afterEach` → `/api/collection/delete`).
- Uploads the Playwright report on failure.

## Cost / cadence
- Synthesis runs for real but on `claude-haiku-4-5` (≈ pennies). Nightly + manual.
- Run it manually right after any venture-core bump to catch drift before merging the repin.

## If a run fails on a missing Paddle price id
Mock payment shouldn't need real price ids, but if it does, add repo variables
`NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL` (+ `_SANDBOX`) and reference them in the
workflow `env:` — ping me and I'll wire them.
