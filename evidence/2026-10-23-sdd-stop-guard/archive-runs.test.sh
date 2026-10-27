#!/usr/bin/env bash
# archive-runs.test.sh
# Runs archive-runs.sh over synthetic runs, with EVALS_DIR pointing it at a
# fake evals root whose strip-runs is a stub, and checks the post-check: its
# per-run line and the script's exit status for the five outcomes that decide
# whether a run's evidence is intact. The question the post-check answers is
# whether a run that reached Finish kept its receipt and its session mirror,
# and Finish is read from the transcript, never from those artifacts: a run
# that lost its whole cache must fail, not read as one that never finished.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="$here/archive-runs.sh"
fail() { echo "FAIL: $*" >&2; echo "STATUS: FAILED"; exit 1; }
tmp=$(mktemp -d "${TMPDIR:-/tmp}/archive-runs-test.XXXXXX") || fail "no temp directory"
trap 'rm -rf "$tmp"' EXIT
EV="$tmp/evroot"
mkdir -p "$EV/scripts" "$EV/results/workspaces" "$tmp/logs"
printf '#!/usr/bin/env bash\nexit 0\n' > "$EV/scripts/strip-runs"
chmod 755 "$EV/scripts/strip-runs"

FINISH_CMD='cd /w && scripts/sdd-state finish plans/plan.md --session s1'
OTHER_CMD='python3 -m unittest tests.test_soak_long'
PUBLISHED='status=finished sha=abc1234 last=def5678 push=no receipt=/h/.cache/hyperpowers/receipts/ws-20261027T100000Z'
STAGED='status=finished sha=abc1234 last=def5678 push=no receipt=none staging=/h/.cache/hyperpowers/receipts/.staging-ws-20261027T100000Z'

# A run's record and workspace, with one main-session transcript holding one
# Bash call and its result. The transcript is what the post-check reads Finish
# from, so every case has one.
mkrun() { # mkrun <id> <command> <result text>
  local ws="$EV/results/workspaces/$1" d
  mkdir -p "$EV/results/$1" "$ws"
  echo '{"final":"pass"}' > "$EV/results/$1/verdict.json"
  d="$ws/home/.claude/projects/-w"
  mkdir -p "$d"
  python3 -IB - "$d/session.jsonl" "$2" "$3" <<'PY'
import json
import sys

path, command, result = sys.argv[1], sys.argv[2], sys.argv[3]
records = [
    {"type": "user", "timestamp": "2026-10-27T10:00:00.000Z", "message": {"role": "user", "content": "go"}},
    {
        "type": "assistant",
        "timestamp": "2026-10-27T10:00:01.000Z",
        "message": {"role": "assistant", "content": [{"type": "tool_use", "id": "toolu_1", "name": "Bash", "input": {"command": command}}]},
    },
    {
        "type": "user",
        "timestamp": "2026-10-27T10:00:02.000Z",
        "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "content": result}]},
    },
]
with open(path, "w") as fh:
    for record in records:
        fh.write(json.dumps(record) + "\n")
PY
}

receipt() { # receipt <id> <directory name>
  local r="$EV/results/workspaces/$1/home/.cache/hyperpowers/receipts/$2"
  mkdir -p "$r"
  echo "- Task 6: complete (commits 1234567..89abcde, review clean)" > "$r/progress.md"
}
mirror() { # mirror <id>
  local m="$EV/results/workspaces/$1/home/.cache/hyperpowers/stop-guard"
  mkdir -p "$m"
  echo '{"ts":"2026-10-27T10:00:01.000Z","session":"s1","decision":"allow"}' > "$m/s1.jsonl"
}
ledger() { # ledger <id>: a live plan workspace whose last task is complete
  local w="$EV/results/workspaces/$1/home/.cache/hyperpowers/sdd/key/plans/ws"
  mkdir -p "$w"
  echo "- Task 6: complete (commits 1234567..89abcde, review clean)" > "$w/progress.md"
}

rc=0
archive() { # archive <id>: one run per case, into its own out directory
  rm -rf "$tmp/out"
  printf 'run-id: %s\n' "$1" > "$tmp/logs/treatment-sdd-turn-liveness-p1.log"
  EVALS_DIR="$EV" LOGS="$tmp/logs" bash "$script" treatment "$tmp/out" > "$tmp/out.txt" 2>&1
  rc=$?
}
line() { # line <id> <expected tail of the per-run line>
  grep -qF "post-check treatment $1: $2" "$tmp/out.txt" \
    || fail "$1: expected '$2' in: $(cat "$tmp/out.txt")"
}
says() { # says <id> <expected failure text>
  grep -qF "$2" "$tmp/out.txt" || fail "$1: expected '$2' in: $(cat "$tmp/out.txt")"
}

# 1. Finish ran and both artifacts are there: the archive is complete.
mkrun finished "$FINISH_CMD" "$PUBLISHED"; receipt finished ws-20261027T100000Z; mirror finished
archive finished
[ "$rc" -eq 0 ] || fail "a complete run failed the post-check: $(cat "$tmp/out.txt")"
line finished "finish=yes receipt_published=yes receipts=1 mirrors=1"
# 2. The same run with the whole hyperpowers cache gone: the loss the check
# exists to catch, and the one the artifacts themselves cannot report.
mkrun lost "$FINISH_CMD" "$PUBLISHED"
archive lost
[ "$rc" -ne 0 ] || fail "a run that lost its cache passed: $(cat "$tmp/out.txt")"
line lost "finish=yes receipt_published=yes receipts=0 mirrors=0"
says lost "reached Finish with no receipt"
says lost "reached Finish with no session mirror"
# 3. Every task complete but Finish never ran: a valid interrupted run, which
# the analyzer reads from its live workspace. It passes, and the line says so.
mkrun interrupted "$OTHER_CMD" "ok"; ledger interrupted
archive interrupted
[ "$rc" -eq 0 ] || fail "an interrupted run failed the post-check: $(cat "$tmp/out.txt")"
line interrupted "finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=yes"
# 4. A run that neither finished nor left anything behind: nothing to assert.
mkrun early "$OTHER_CMD" "ok"
archive early
[ "$rc" -eq 0 ] || fail "an early run failed the post-check: $(cat "$tmp/out.txt")"
line early "finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no"
# 5. Finish ran but could not publish its receipt: the staging it left is not
# what the analyzer reads, so the run is reported and fails.
mkrun staged "$FINISH_CMD" "$STAGED"; mirror staged
receipt staged .staging-ws-20261027T100000Z
touch "$EV/results/workspaces/staged/home/.cache/hyperpowers/receipts/.staging-ws-20261027T100000Z/FINISHED"
archive staged
[ "$rc" -ne 0 ] || fail "a staging failure passed: $(cat "$tmp/out.txt")"
line staged "finish=yes receipt_published=no receipts=1 mirrors=1"
says staged "finished with receipt=none"
echo "PASS: archive-runs.sh reads Finish from the transcript and fails a run whose evidence is missing"
echo "STATUS: PASSED"
