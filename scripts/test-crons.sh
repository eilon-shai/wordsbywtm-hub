#!/usr/bin/env bash
#
# test-crons.sh — exercise the deadline-sweep + purge crons on a PREVIEW deploy
# without waiting for real time to pass. It only fast-forwards a collection's clock
# (via /api/dev/collection-clock) and then triggers the REAL production cron
# handlers, so you're testing the real code path, not a mock.
#
# Hard-disabled in production (the dev helper 404s when VERCEL_ENV=production), so
# this only does anything against a preview/local deploy.
#
# ── Usage ─────────────────────────────────────────────────────────────────────
#   BASE=https://<preview>.vercel.app SECRET=<CRON_SECRET> \
#     ./scripts/test-crons.sh warn   <adminToken>
#   ./scripts/test-crons.sh delete <adminToken>
#   ./scripts/test-crons.sh purge  <adminToken>
#
# Actions:
#   warn    deadline → 3 days out (+ clear prior reminder) → deadline cron
#           → expect {"reminded":1}; organizer gets the "closes in 3 days" email.
#   delete  deadline → in the past → deadline cron
#           → unpaid: {"deleted":1} + deletion email; the manage link goes dead.
#             paid:   {"generated":1} instead — auto-generates + emails the deliverable.
#   purge   purge_after → now → purge cron  (collection must already be generated)
#           → {"purged":1}; the deliverable + all data are deleted.
#
# Config (env vars, or edit inline):
#   BASE     preview base URL                (required)
#   SECRET   CRON_SECRET for that env        (required)
#   TOKEN    adminToken                      (or pass as the 2nd arg)
#
# Notes:
#   • Get the adminToken from a test collection's manage URL: /collect/manage?t=<token>
#   • DISABLE_EMAIL must NOT be 'true' in that env or no emails send.
#   • delete/purge are IRREVERSIBLE — only run against throwaway test collections.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ACTION="${1:-}"
TOKEN="${2:-${TOKEN:-}}"
BASE="${BASE:-}"
SECRET="${SECRET:-}"

err() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; }
info() { printf '\033[36m→ %s\033[0m\n' "$1"; }
ok() { printf '\033[32m✓ %s\033[0m\n' "$1"; }

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
}

case "$ACTION" in
  warn | delete | purge) ;;
  -h | --help | help | '')
    usage
    exit 0
    ;;
  *)
    err "Unknown action: '$ACTION' (expected warn | delete | purge)"
    exit 2
    ;;
esac

[ -n "$BASE" ] || { err "BASE is not set (export BASE=https://<preview>.vercel.app)"; exit 2; }
[ -n "$SECRET" ] || { err "SECRET is not set (export SECRET=<CRON_SECRET>)"; exit 2; }
[ -n "$TOKEN" ] || { err "No adminToken (pass it as arg 2, or export TOKEN=...)"; exit 2; }

# Pretty-print JSON if jq is available; otherwise pass through raw.
pp() { if command -v jq >/dev/null 2>&1; then jq .; else cat; fi; }

clock() {
  curl -fsS -X POST "$BASE/api/dev/collection-clock" \
    -H "Authorization: Bearer $SECRET" \
    -H 'content-type: application/json' \
    -d "$1"
}

run_cron() {
  curl -fsS -H "Authorization: Bearer $SECRET" "$BASE$1"
}

case "$ACTION" in
  warn)
    CLOCK_BODY='{"adminToken":"'"$TOKEN"'","deadlineInDays":3,"clearReminder":true}'
    CRON_PATH='/api/cron/collection-deadlines'
    ;;
  delete)
    err "delete is IRREVERSIBLE for an unpaid collection. Ctrl-C within 3s to abort…"
    sleep 3
    CLOCK_BODY='{"adminToken":"'"$TOKEN"'","deadlineInPast":true}'
    CRON_PATH='/api/cron/collection-deadlines'
    ;;
  purge)
    err "purge is IRREVERSIBLE — deletes the deliverable + all data. Ctrl-C within 3s to abort…"
    sleep 3
    CLOCK_BODY='{"adminToken":"'"$TOKEN"'","purgeNow":true}'
    CRON_PATH='/api/cron/purge'
    ;;
esac

info "[$ACTION] fast-forwarding the clock on $BASE"
clock "$CLOCK_BODY" | pp

info "[$ACTION] triggering cron: $CRON_PATH"
run_cron "$CRON_PATH" | pp

ok "[$ACTION] done — check the result above (and the organizer's inbox if email is enabled)."
