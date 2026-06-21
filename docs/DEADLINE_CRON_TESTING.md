# Demonstrating the deadline / retention behaviour

How to show (or validate) the three time-based behaviours — the **3-day warning email**,
the **deadline action** (delete unpaid / auto-generate paid), and the **~30-day purge** —
without waiting for real time to pass.

> The helper only moves a collection's clock; the actual emails, deletion, generation,
> and purge are done by the **real production cron handlers**, so you test the real code
> path, not a mock. It is **hard-disabled in production** (`/api/dev/collection-clock`
> 404s when `VERCEL_ENV=production`) and gated by `CRON_SECRET` on previews.

## Prerequisites
- **Preview URL** — from the Vercel deployment of a branch that includes the dev helper
  (e.g. `https://wordsbywtm-hub-git-<branch>-ai-projects1.vercel.app`).
  > ⚠️ The helper must key its prod-guard off `VERCEL_ENV` only. If a preview returns
  > `{"error":"Not found"}`, the deploy predates that fix (PR #58) — use a newer preview.
- **CRON_SECRET** — the value set in that project's Vercel env (Settings → Environment
  Variables). Required as `Authorization: Bearer <secret>` on both the helper and the crons.
- **DISABLE_EMAIL** must **not** be `'true'` in that env, or no emails send.
- **An admin token** — create a test collection on the preview; its manage URL is
  `/collect/manage?t=<adminToken>`. That `t=` value is the token.
- Use a **throwaway test collection** — delete/purge are irreversible. If the preview
  shares the production DB, only touch collections you created for testing.

Set them once:
```bash
export BASE="https://wordsbywtm-hub-git-<branch>-ai-projects1.vercel.app"
export SECRET="<CRON_SECRET>"
export TOKEN="<adminToken from the manage URL>"
```

---

## The easy way — `scripts/test-crons.sh`
```bash
# 3-day warning email
./scripts/test-crons.sh warn   "$TOKEN"

# deadline action (unpaid → delete; paid → auto-generate)
./scripts/test-crons.sh delete "$TOKEN"

# ~30-day purge of a finalized/generated collection
./scripts/test-crons.sh purge  "$TOKEN"
```
`BASE` and `SECRET` are read from the environment (or pass `TOKEN` as the 2nd arg / env).
The script fast-forwards the clock, triggers the matching cron, pretty-prints both
responses (uses `jq` if installed), and gives a 3-second abort window before the
irreversible `delete`/`purge` actions.

---

## The manual way (curl)

### 1. The 3-days-before warning email
```bash
# fast-forward the deadline to 3 days out + clear any prior reminder
curl -X POST "$BASE/api/dev/collection-clock" \
  -H "Authorization: Bearer $SECRET" -H "content-type: application/json" \
  -d '{"adminToken":"'"$TOKEN"'","deadlineInDays":3,"clearReminder":true}'

# run the deadline sweep
curl -H "Authorization: Bearer $SECRET" "$BASE/api/cron/collection-deadlines"
```
→ sweep responds `{… "reminded":1 …}` and the organizer gets the "closes in 3 days"
email (paid vs unpaid wording). Fires once (a `reminder_sent_at` flag); re-run the
first call with `clearReminder:true` to test again.

### 2. The deadline action (unpaid → delete)
```bash
curl -X POST "$BASE/api/dev/collection-clock" \
  -H "Authorization: Bearer $SECRET" -H "content-type: application/json" \
  -d '{"adminToken":"'"$TOKEN"'","deadlineInPast":true}'

curl -H "Authorization: Bearer $SECRET" "$BASE/api/cron/collection-deadlines"
```
→ `{… "deleted":1 …}`, the "your collection was deleted" email sends, and reopening
`/collect/manage?t=$TOKEN` shows "this link isn't active" (row gone).
**If the collection is paid**, the same step instead **auto-generates** the deliverable
(`{"generated":1}`) and emails it; a paid-but-empty collection extends 7 days, max 2×.

### 3. The generated-deliverable purge (~30-day retention)
```bash
# collection must already be finalized/generated
curl -X POST "$BASE/api/dev/collection-clock" \
  -H "Authorization: Bearer $SECRET" -H "content-type: application/json" \
  -d '{"adminToken":"'"$TOKEN"'","purgeNow":true}'

curl -H "Authorization: Bearer $SECRET" "$BASE/api/cron/purge"
```
→ `{"ok":true,"purged":1}` and the deliverable + all data are deleted (the "View your
…" link stops working).

---

## What the helper accepts
`POST /api/dev/collection-clock` body fields (any combination):

| Field | Type | Effect |
|---|---|---|
| `adminToken` | string | which collection (required) |
| `deadlineInDays` | number | set deadline N days from now |
| `deadlineInPast` | bool | set deadline 1 minute ago |
| `purgeNow` | bool | set `purge_after` to now |
| `clearReminder` | bool | clear `reminder_sent_at` so the warning can re-fire |

It returns the collection's `id` / `status` / `paid` flag and what it set, so you can
confirm before triggering the cron.
