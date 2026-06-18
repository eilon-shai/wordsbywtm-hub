# wordsbywtm.com — Collaborative Collection App: Architecture & Data Model

The unified collaborative-collection platform for Words That Matter LLC. One
organizer creates a collection for an occasion, invites contributors via a magic
link, each adds a memory, the organizer reviews and chooses what to include, then
pays once to synthesize everything into one tribute.

- **Framework:** Next.js 15 (App Router), Tailwind v4, TypeScript
- **Shared library:** `@eilon-shai/venture-core` (pinned exact — currently `1.21.0`)
- **Occasions (all live):** memorial, retirement, wedding, anniversary — one app, registry-driven
- **Payments:** Paddle (Merchant of Record), one-time, pay-at-finalize (per-occasion product/price)
- **Store:** Neon Postgres (collections + contributions + `collection_audio`) + Upstash Redis (locks, rate limits, txn→collection map, terms/waiver records)
- **AI:** Anthropic Claude (synthesis) · ElevenLabs (optional spoken-version TTS, stored in Postgres)
- **Analytics:** GA4 + Google Ads conversion + Microsoft Clarity (env-gated)
- **Identity:** none — capability tokens only (no login, no accounts)

Full UX/flow spec: `venture-ops/docs/COLLECTION_FLOW_DESIGN.md`.

---

## 1. Database structure (Neon Postgres)

Authoritative DDL lives in [`db/schema.sql`](../db/schema.sql) (idempotent — safe
to re-run). Apply with `npm run db:migrate` (needs `DATABASE_URL`) or paste into
the Neon SQL editor.

> **Scope note:** Postgres is a deliberate, scoped exception to the portfolio's
> otherwise stateless rule (DEC-P-009). It exists because a *collaborative*
> collection must persist submissions over days while contributors respond.

### Table: `collections`

One row per collection (one honoree / one occasion / one organizer).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | App-generated (`randomUUID`). |
| `product` | `text` | = `ProductConfig.brand.paddleProductId`. Cross-product guard so occasions never leak across each other in the shared DB. |
| `organizer_email` | `text` | Lower-cased at create. Where the admin magic-link + deliverable are emailed. |
| `honoree_name` | `text` | The person/occasion being honored. |
| `occasion` | `text` | Occasion slug (`memorial`/`retirement`/`wedding`/`anniversary` — all live). Drives config resolution on token-scoped routes. |
| `tier` | `text` | `basic` \| `full` (single anchored tier today). |
| `status` | `text` | `open` → `closed` → `generated`. Synthesis is one-shot; `generated` freezes the collection. |
| `share_token` | `text` UNIQUE | **Public** capability token in the contributor link `/c/{share_token}` (short, 6 bytes). |
| `admin_token` | `text` UNIQUE | **Private** capability token in the organizer link `/collect/manage?t={admin_token}` (long, 24 bytes). Treat as a secret. |
| `price_shown` | `numeric` | Price displayed at create (bait-and-switch guard — finalize can't exceed it). |
| `created_at` | `timestamptz` | default `now()`. |
| `deadline` | `timestamptz` null | Optional organizer-set collection deadline. |
| `purge_after` | `timestamptz` null | `created_at + collectionTtlDays` (30d). Abandoned/never-finalized collections are swept after this. |
| `synthesis_prefs` | `jsonb` null | **Added 1.7.0.** Organizer "full form" controls (see §1.3). |

Indexes: `share_token`, `admin_token`, and a partial index on `purge_after where status <> 'generated'` (the purge sweep target).

### Table: `contributions`

One row per submitted memory. **Contributor PII is encrypted at rest** — the row
stores only ciphertext, never plaintext name/relationship/memory.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | AAD for the row's encryption (binds ciphertext to this id). |
| `collection_id` | `uuid` FK | `references collections(id) ON DELETE CASCADE` — deleting a collection erases all its memories (GDPR delete-by-cascade). |
| `idempotency_key` | `text` | Client-generated at form mount. |
| `encrypted_payload` | `text` | AES-256-GCM of `{ contributorName, relationship, memory }`. See §1.2. |
| `status` | `text` | `pending` \| `approved` \| `removed`. Organizer moderation toggles `approved`↔`removed`; only non-`removed` feed synthesis. |
| `created_at` | `timestamptz` | default `now()`. |

Constraints/indexes: `UNIQUE (collection_id, idempotency_key)` makes double-submit
a no-op (retry hits the constraint, not a new row); index on `collection_id`.

### Table: `collection_audio`

One row per (collection, voice) for the optional spoken version. Created lazily
(`CREATE TABLE IF NOT EXISTS`) by `src/lib/audio.ts` — no manual migration needed.

| Column | Type | Notes |
|---|---|---|
| `collection_id` | `uuid` | `references collections(id) ON DELETE CASCADE` — audio purges with its collection. |
| `voice` | `text` | `female` (Sarah) \| `male` (George); part of the PK. |
| `mp3_base64` | `text` | ElevenLabs MP3, base64. Generated once per voice and cached. |
| `content_type` | `text` | `audio/mpeg`. |
| `created_at` | `timestamptz` | default `now()` (re-view picks the newest voice). |

PK `(collection_id, voice)`. Gated by `audioEnabled()` = `ELEVENLABS_API_KEY` set
AND `DISABLE_TRIBUTE_AUDIO !== 'true'`. Pay-before-generate still applies (audio
only generates for an already-generated, paid tribute).

### 1.2 Encryption of contributor PII

- Algorithm: **AES-256-GCM** with AAD binding (AAD = the contribution `id`), via
  venture-core `crypto/aes` (`encryptWithAad`/`decryptWithAad`).
- Key: `REDIS_FORM_ENCRYPTION_KEY` — a 64-char hex (32-byte) string. The **same**
  key must be used by anything that reads these rows. Rotation supported via
  `REDIS_FORM_ENCRYPTION_KEY_PREV` (tried on decrypt).
- In `ENABLE_MOCK_PAYMENT=true` mode the lib falls back to a fixed non-production
  test key, so local mock E2E needs no real key.
- Plaintext exists only in memory during request handling; it is never logged or
  persisted unencrypted.

### 1.3 `synthesis_prefs` (jsonb) — organizer "full form" controls

Set once by the organizer on the create form; stored verbatim; read at synthesis.
venture-core treats it as an **opaque, generic** flat string map — each occasion's
`buildSynthesisPrompt(meta, contributions)` decides how to interpret it. For
**memorial** the keys are:

| Key | Values / meaning |
|---|---|
| `tone` | `solemn` \| `balanced` \| `warm` → tone instruction in the prompt. |
| `length` | `short` (~3m / 400–550w) \| `medium` (~5m / 650–850w) \| `long` (~8m / 1000–1300w). |
| `thingsToAvoid` | Free text → "do not mention/allude to…" constraint. |
| `additionalContext` | Free text → background woven in sensitively. |

Sanitized server-side in `create-collection-handler`: object only, keys ≤40 chars,
string values trimmed and capped at 2000 chars. Example stored value:

```json
{ "tone": "warm", "length": "medium", "thingsToAvoid": "the divorce", "additionalContext": "devout Catholic" }
```

### 1.4 Migrations

`db/schema.sql` is idempotent. The 1.7.0 column is additive and ships with its own
guard so existing databases are upgraded by re-running the file:

```sql
alter table collections add column if not exists synthesis_prefs jsonb;
```

Run `npm run db:migrate` (with `DATABASE_URL` set) or paste the file/this line into
Neon's SQL editor. **One shared Neon DB serves all occasions** (isolated by the
`product` column); adding an occasion needs no DB change.

---

## 2. Application structure

```
src/
  app/
    page.tsx                         # S1 hub — occasion picker (custom)
    [occasion]/
      page.tsx                       # S2 per-occasion landing (venture-core LandingPage, formFirst)
      layout.tsx                     # per-occasion accent theming (--primary/--ring/--accent)
      start/page.tsx                 # S3+S4 create (full "tribute settings" form) → own-memory → invite
      result/page.tsx                # S8 result (venture-core ResultPage)
      [occasion]/opengraph-image.tsx # generated per-occasion OG card
    opengraph-image.tsx / icon.svg   # root OG card + favicon
    c/[shareToken]/page.tsx          # S5 contributor memory form (PUBLIC, no payment; noindex)
    collect/manage/page.tsx          # S6+S7 organizer review dashboard + finalize
    terms|privacy|refund/page.tsx    # S9 legal (interim LC-03; ElevenLabs sub-processor disclosed)
    support/page.tsx                 # internal console (Basic-Auth via middleware)
    api/
      [occasion]/collection/create/route.ts   # create (occasion in path; meta.live-gated)
      collection/contribute|route|moderate|checkout|generate/route.ts  # token/txn-scoped
      collection/invite/route.ts              # email invites (caps + HTML-escaped)
      collection/audio/route.ts               # ElevenLabs TTS (generate once / stream)
      webhook/route.ts                        # Paddle backstop (strict per-product routing)
      cron/*                                   # deadline sweep + purge (CRON_SECRET)
  middleware.ts                      # UNDER_CONSTRUCTION gate + /support Basic-Auth
  lib/
    registry.ts                      # CONFIGS + OCCASIONS (+ deliverableNoun/readAloudContext) + unique-product-id guard
    intake.ts                        # per-occasion create-form copy + relationship taxonomy
    resolver.ts                      # resolveConfigByToken / resolveConfigByTxn (no arbitrary fallback)
    audio.ts                         # ElevenLabs TTS + collection_audio storage
    analytics.ts                     # GA4 / Ads / Clarity helpers
  products/
    {memorial,retirement,wedding,anniversary}/config.ts  # ProductConfig + collectionConfig + buildSynthesisPrompt
    _landing/{memorial,retirement,wedding,anniversary}.ts # LandingPageConfig per occasion
  components/
    CreateForm.tsx                   # organizer full form (intake-driven; → synthesisPrefs)
    InviteScreen.tsx / InviteBlock.tsx       # share/admin links + email invites + advance-pay
    ContributorForm.tsx              # memory form (contributor + organizer variants), 3-layer guard
    ManageDashboard.tsx / MemoryCard.tsx     # review + include/exclude + finalize
    OccasionPicker.tsx / ComingSoon.tsx
    SiteAnalytics.tsx / PurchaseTracker.tsx  # GA4+Clarity scripts + purchase conversion
    forked/FormPrimitives.tsx        # word-counter/renderers forked from venture-core IntakeForm
    vc/ClientLandingPage.tsx, vc/ClientResultPage.tsx  # 'use client' wrappers (see §5)
```

### 2.1 Multi-occasion model

One app hosts all four occasions (mirrors VocalVow's multi-product pattern). An
occasion = one `ProductConfig` (`products/<occasion>/config.ts`) + `OccasionMeta`
(`lib/registry.ts`) + intake spec (`lib/intake.ts`) + landing (`_landing/<occasion>.ts`).
Each occasion has its **own** `paddleProductId`, `redisKeyPrefix`, and from-address;
`collections.product` isolates rows in the shared DB. The registry guards that every
live occasion's `paddleProductId` is non-empty **and unique** (cross-product
isolation invariant). The webhook routes strictly by `customData.product` (no
fallback). Adding an occasion = config + meta + intake + landing — no new app/DB/key.
`OccasionMeta.deliverableNoun`/`readAloudContext` keep shared UI copy occasion-correct
("tribute"/"toast"/"send-off"; "at the service"/"at the reception"/…).

### 2.2 Token → occasion resolution

Token-scoped routes (`contribute`, dashboard `get`, `moderate`, `checkout`) carry
only a capability token. `lib/resolver.ts` looks the collection up by token via
`@eilon-shai/venture-core/db` (`getCollectionByShareToken` / `getCollectionByAdminToken`,
passing a `SqlClient` from `getDbClient()`), reads `.occasion`, and returns the
matching config. `generate` resolves occasion via the Redis `txn→collectionId`
mapping. `create` carries the occasion in its path.

### 2.3 The 3-layer content guard (memory quality)

1. **Client** — live word-count band (red below the 20-word floor) + on-submit
   block via `validateMemoriesField` (`@eilon-shai/venture-core/validation`).
2. **Server** — `submit-contribution-handler` runs the same `validateMemoriesField`
   (≥20 words, ≥2 sentences, uniqueness) → 400 `INVALID_MEMORY` if it fails.
3. **AI** — synthesis system prompt fences every contribution in `<contribution>`
   tags as literal data (prompt-injection guard) and refuses to fabricate.

### 2.4 Forms → data mapping

- **Organizer create form** (`CreateForm`): honoree, email, deadline → collection
  columns; tone/length/thingsToAvoid/additionalContext → `synthesis_prefs`.
- **Organizer own memory** (`ContributorForm` organizer variant) and **contributor
  memory** (`ContributorForm`): name/relationship/memory → encrypted contribution.
  Optional fields (a word that captured them, a favorite moment, contributor-only
  "anything to leave out") are **composed into the memory text** before submit — no
  schema change.

---

## 3. Request flow (happy path)

```
/[occasion]            landing (CTA: Start a … Collection)
  → /[occasion]/start  CreateForm → POST /api/[occasion]/collection/create
                         (writes collections row incl. synthesis_prefs)
                       → own-memory step → POST /api/collection/contribute (share token)
                       → InviteScreen (share_token link + admin_token link; admin link also emailed)
  → /c/{share_token}   ContributorForm → POST /api/collection/contribute  (N contributors)
  → /collect/manage?t={admin_token}
                         GET /api/collection?t=…           (dashboard data; never returns synthesized content)
                         POST /api/collection/moderate      (include/exclude)
                         POST /api/collection/checkout       (Paddle; mock → redirect)
  → /[occasion]/result?txn=…
                         POST /api/collection/generate       (verify payment → synthesize → email)
```

Payment happens **once**, at finalize. `get-collection` is structurally
content-free, so output-before-pay is impossible.

---

## 4. Environment variables

| Var | Purpose | Sensitive |
|---|---|---|
| `DATABASE_URL` | Neon Postgres (pooled). | yes (runtime) |
| `REDIS_FORM_ENCRYPTION_KEY` | 64-hex AES key for contributor PII. Must match across apps sharing the DB. | yes |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Locks, rate limits, txn→collection map. | yes |
| `ANTHROPIC_API_KEY` | Synthesis. | yes |
| `NPM_TOKEN` | Install `@eilon-shai/*` from GitHub Packages (build only). | build, **non-sensitive** |
| `PADDLE_ENVIRONMENT` / `PADDLE_API_KEY_SANDBOX` / `PADDLE_PRODUCT_ID_MEMORIAL` | Paddle server. | mixed |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` / `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN_SANDBOX` / `NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_SANDBOX` | Paddle client. **Must be non-sensitive** or they bake empty into the bundle. | **non-sensitive** |
| `NEXT_PUBLIC_URL` | Absolute base for emailed links (prod). Preview/local derive from `VERCEL_BRANCH_URL`/localhost. | non-sensitive |
| `ENABLE_MOCK_PAYMENT` / `DISABLE_EMAIL` | Local/E2E bypasses. | — |

---

## 5. venture-core dependency notes

- Pinned **exact** (`1.21.0`). Version history relevant to this app:
  - **1.6.0** — collaborative-collection feature (db layer, 6 handlers, synthesis, COLLECTION_RUBRIC).
  - **1.6.1 / 1.7.0** — result `tier` shape; collection-level `synthesisPrefs` (`synthesis_prefs` jsonb).
  - **~1.13–1.15** — deadline auto-finalize/delete/extend; data-loss guards (purge guard, atomic contributor cap, webhook mark-paid backstop, fail-closed mock/crons, keyed-HMAC dedup).
  - **1.20.x** — collaborative-collection maturity (the line this app pins).
  - **1.21.0** — `collection-checkout-handler` records the EU/UK withdrawal-waiver via `checkAndMarkTerms` when `termsWaiver`+`termsVersion` are sent (SES-046 fix).
- **Audio** is app-side (`src/lib/audio.ts` + `collection_audio` table), not venture-core.
- **Known follow-up:** the published `@eilon-shai/venture-core/components` barrel lacks a `'use client'` directive, so RSC pages can't import `LandingPage`/`ResultPage` directly — we wrap them in `src/components/vc/Client*.tsx`. Remove the wrappers once venture-core ships the directive.

---

## 6. Operational checklist (preview/prod)

1. Neon + Upstash added to the Vercel project; `DATABASE_URL`, `UPSTASH_*`,
   `ANTHROPIC_API_KEY`, `REDIS_FORM_ENCRYPTION_KEY`, `NPM_TOKEN`, Paddle vars set.
2. **Run the migration** so `collections.synthesis_prefs` exists (§1.4).
3. `NEXT_PUBLIC_*` vars marked **non-sensitive**.
4. Legal: the contributor-data retention clause needs attorney ratification before
   paid public traffic (venture-ops `Q-P-011`).
