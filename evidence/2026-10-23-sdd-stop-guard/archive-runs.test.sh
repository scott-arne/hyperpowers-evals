#!/usr/bin/env bash
# archive-runs.test.sh
# Runs archive-runs.sh over synthetic runs, with EVALS_DIR pointing it at a
# fake evals root whose strip-runs is a stub, and checks the post-check: its
# per-run line and the script's exit status for the five outcomes that decide
# whether a run's evidence is intact. The question the post-check answers is
# whether a run that reached Finish kept its receipt and its session mirror,
# and Finish is read from the helper's status line in the transcript -- never
# from those artifacts, and never from the command that printed the line: a
# run that lost its whole cache must fail, not read as one that never
# finished.
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
# The shapes a session reaches Finish through besides a bare call: the output
# captured into a variable, the call tested by `if`, and the call handed to a
# shell as a `-c` operand. Each runs Finish and returns its status line.
CAPTURED_CMD="finish_out=\$(bash /w/scripts/sdd-state finish plans/plan.md); printf '%s\\n' \"\$finish_out\""
CONDITIONAL_CMD='if bash /w/scripts/sdd-state finish plans/plan.md; then echo done; fi'
SHELL_C_CMD="sh -c 'cd /w && bash scripts/sdd-state finish plans/plan.md'"
# And the two spellings no reading of the command text catches: a backslash
# continuation splitting the call across lines, and the helper's path held in
# a variable, where the words `sdd-state finish` never appear at all.
CONTINUED_CMD='bash /w/scripts/sdd-state \
  finish plans/plan.md'
VARIABLE_CMD='"$SDD" finish plans/plan.md'
OTHER_CMD='python3 -m unittest tests.test_soak_long'
PUBLISHED='status=finished sha=abc1234 last=def5678 push=no receipt=/h/.cache/hyperpowers/receipts/ws-20261027T100000Z'
STAGED='status=finished sha=abc1234 last=def5678 push=no receipt=none staging=/h/.cache/hyperpowers/receipts/.staging-ws-20261027T100000Z'
# An echo of the line, which the post-check takes at face value on purpose.
FORGED='status=finished backend=plain receipt=/x/receipts/ws-1'
FORGED_CMD="echo '$FORGED'"

# A run's record and workspace, with one main-session transcript holding one
# Bash call and its result. The transcript is what the post-check reads Finish
# from, so every case has one.
mkrun() { # mkrun <id> <command> <result text> [error] [tool]
  local ws="$EV/results/workspaces/$1" d
  mkdir -p "$EV/results/$1" "$ws"
  echo '{"final":"pass"}' > "$EV/results/$1/verdict.json"
  d="$ws/home/.claude/projects/-w"
  mkdir -p "$d"
  python3 -IB - "$d/session.jsonl" "$2" "$3" "${4:-}" "${5:-Bash}" <<'PY'
import json
import sys

path, command, result, error, tool = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
block = {"type": "tool_result", "tool_use_id": "toolu_1", "content": result}
if error == "error":
    block["is_error"] = True
# A Bash call carries the command; any other tool (case 14's Read) carries a
# path, so the status line can only reach the transcript through the result.
use = {"type": "tool_use", "id": "toolu_1", "name": tool}
use["input"] = {"command": command} if tool == "Bash" else {"file_path": command}
records = [
    {"type": "user", "timestamp": "2026-10-27T10:00:00.000Z", "message": {"role": "user", "content": "go"}},
    {
        "type": "assistant",
        "timestamp": "2026-10-27T10:00:01.000Z",
        "message": {"role": "assistant", "content": [use]},
    },
    {
        "type": "user",
        "timestamp": "2026-10-27T10:00:02.000Z",
        "message": {"role": "user", "content": [block]},
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
# 6. The same loss behind a captured Finish: `out=$(... sdd-state finish ...)`
# runs Finish as surely as a bare call does, so a lost cache must still fail.
mkrun captured "$CAPTURED_CMD" "$PUBLISHED"
archive captured
[ "$rc" -ne 0 ] || fail "a captured Finish with no cache passed: $(cat "$tmp/out.txt")"
line captured "finish=yes receipt_published=yes receipts=0 mirrors=0"
says captured "reached Finish with no receipt"
# 7. A Finish tested by `if` is a Finish.
mkrun conditional "$CONDITIONAL_CMD" "$PUBLISHED"; receipt conditional ws-20261027T100000Z; mirror conditional
archive conditional
[ "$rc" -eq 0 ] || fail "a conditional Finish failed the post-check: $(cat "$tmp/out.txt")"
line conditional "finish=yes receipt_published=yes receipts=1 mirrors=1"
# 8. So is one handed to a shell as a -c operand.
mkrun operand "$SHELL_C_CMD" "$PUBLISHED"; receipt operand ws-20261027T100000Z; mirror operand
archive operand
[ "$rc" -eq 0 ] || fail "a shell-operand Finish failed the post-check: $(cat "$tmp/out.txt")"
line operand "finish=yes receipt_published=yes receipts=1 mirrors=1"
# 9. A Finish the helper refused never finished: the status line, not the call,
# is what says the workspace was published and removed.
mkrun refused "$FINISH_CMD" "status=busy"
archive refused
[ "$rc" -eq 0 ] || fail "a refused Finish failed the post-check: $(cat "$tmp/out.txt")"
line refused "finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no"
# 10. Nor did one whose tool result came back an error.
mkrun errored "$FINISH_CMD" "$PUBLISHED" error
archive errored
[ "$rc" -eq 0 ] || fail "an errored Finish failed the post-check: $(cat "$tmp/out.txt")"
line errored "finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no"
# 11. A Finish split across lines by a backslash continuation: the command
# text reads as two lines, the status line in its result does not change, and
# a run that lost its cache must still fail.
mkrun continued "$CONTINUED_CMD" "$PUBLISHED"
archive continued
[ "$rc" -ne 0 ] || fail "a continued Finish with no cache passed: $(cat "$tmp/out.txt")"
line continued "finish=yes receipt_published=yes receipts=0 mirrors=0"
says continued "reached Finish with no receipt"
says continued "reached Finish with no session mirror"
# 12. Nor does holding the helper's path in a variable hide the Finish, though
# the command never spells the helper's name.
mkrun variable "$VARIABLE_CMD" "$PUBLISHED"
archive variable
[ "$rc" -ne 0 ] || fail "a variable-held Finish with no cache passed: $(cat "$tmp/out.txt")"
line variable "finish=yes receipt_published=yes receipts=0 mirrors=0"
says variable "reached Finish with no receipt"
# 13. An echoed status line reads as a Finish, which is the documented
# over-recognition: the check guards against evidence loss, so taking the line
# at face value only demands the receipt and the mirror, which this run kept.
mkrun forged "$FORGED_CMD" "$FORGED"; receipt forged ws-1; mirror forged
archive forged
[ "$rc" -eq 0 ] || fail "a forged status line with both artifacts failed: $(cat "$tmp/out.txt")"
line forged "finish=yes receipt_published=yes receipts=1 mirrors=1"
# 14. A line a non-Bash call returned is not a Finish: reading a log that
# quotes one leaves nothing to demand of the archive.
mkrun quoted /w/logs/finish.log "$PUBLISHED" "" Read
archive quoted
[ "$rc" -eq 0 ] || fail "a quoted status line failed the post-check: $(cat "$tmp/out.txt")"
line quoted "finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no"
echo "PASS: archive-runs.sh reads Finish from the transcript and fails a run whose evidence is missing"
echo "STATUS: PASSED"
