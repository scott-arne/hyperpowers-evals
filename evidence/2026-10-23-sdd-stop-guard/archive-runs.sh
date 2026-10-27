#!/usr/bin/env bash
# archive-runs.sh <arm> <task-dir>
# Copies every run the arm's launch logs name from results/ into
# <task-dir>/<arm>/<run-id>/, with the run's workspace beside it in
# <task-dir>/<arm>/workspaces/<run-id>/, and applies ../README.md's pre-commit
# steps to the copies: strip-runs, the fixture's .git renamed to git-dir (and
# the SDD state checkout's gitfile with it), and the host state strip-runs
# leaves behind removed (the rest of home/.claude/plugins, home/.codex,
# browser profiles and Python or node caches). home/.cache/hyperpowers stays
# whole: this campaign's evidence is in it. The stop guard's receipts, the
# per-session mirrors, the plan workspaces and any state checkout are where
# analyze.py reads a run's decisions, its ledger and its jobs. results/ stays
# as quorum wrote it (copy, never move). A run already archived is skipped; a
# named run without a verdict stops the script. Each copy is built under
# <run-id>.partial and renamed only once it is complete. The arm names the
# subdirectory and the caller names the task directory, so the campaign files
# treatment to task-20-runs, smoke and t1 to task-19-runs, and the Z4
# contingency's repeat to task-21-runs. Staging (git add -f) and the leak scan
# are done at commit time; the post-check below runs here, over the copies, and
# archive-runs.test.sh covers it against synthetic runs.
# Adapted from ../2026-10-19-sdd-turn-liveness/archive-runs.sh.
set -euo pipefail
arm="$1"; task_dir="$2"
case "$arm" in treatment|smoke|t1) ;; *) echo "arm must be treatment, smoke or t1" >&2; exit 2 ;; esac
E="$(cd "$(dirname "$0")" && pwd)"
EV="${EVALS_DIR:-$(cd "$E/../.." && pwd)}"
logs="${LOGS:-$E/logs}"
out="$task_dir/$arm"
# The plan's last task, whose completion line marks a ledger as finished
# (analyze.py's LAST_TASK, over the same fixture plan).
LAST_TASK=6

# One glob covers both scenario names: the fork copy's logs are named
# <arm>-sdd-turn-liveness-fork-<proc>.log, so the arm prefix still selects this
# arm's launches and nothing else.
ids=$(cat "$logs/$arm"-sdd-turn-liveness-*.log | sed -n 's/^run-id: \([^ ]*\)$/\1/p')

clean() {
  local d=$1
  rm -rf "$d/home/.claude/plugins" "$d/home/.codex"
  find "$d/home/.tmp" -maxdepth 1 -name 'cdp-*' -exec rm -rf {} + 2>/dev/null || true
  find "$d" -type d \( -name node_modules -o -name .ruff_cache -o -name .mypy_cache -o -name __pycache__ \) -prune -exec rm -rf {} +
}

state_git() {
  local w=$1 g root
  root="$w/home/.cache/hyperpowers/state"
  [ -d "$root" ] || return 0
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    mv "$g" "$(dirname "$g")/git-dir"
  done < <(find "$root" -mindepth 2 -maxdepth 2 -name .git)
}

archive() {
  local id=$1
  local src="$EV/results/$id" wsrc="$EV/results/workspaces/$id"
  local dst="$out/$id" wdst="$out/workspaces/$id"
  if [ -e "$dst" ]; then echo "skip $arm $id (archived)"; return; fi
  [ -f "$src/verdict.json" ] || { echo "no verdict: $src" >&2; exit 1; }
  [ -d "$wsrc" ] || { echo "no workspace: $wsrc" >&2; exit 1; }
  mkdir -p "$out/workspaces"
  rm -rf "$dst.partial" "$wdst.partial"
  cp -Rp "$src" "$dst.partial"
  cp -Rp "$wsrc" "$wdst.partial"
  # strip-runs finds a run's home/ at <root>/workspaces/<name>/home, so it can
  # only strip once both copies exist; the .partial names are the run names here.
  # strip-runs skips a record touched within the last minute and still exits 0,
  # and cp -p keeps the run's timestamps; git keeps none, so backdating is free.
  touch -t 200001010000 "$dst.partial" "$dst.partial/verdict.json"
  "$EV/scripts/strip-runs" --results-root "$out" --run "$id.partial" --min-age-minutes 0
  for left in .claude/.claude-env .claude/sessions; do
    [ ! -e "$wdst.partial/home/$left" ] || { echo "strip-runs left $wdst.partial/home/$left" >&2; exit 1; }
  done
  clean "$dst.partial"
  if [ -d "$wdst.partial/coding-agent-workdir/.git" ]; then
    mv "$wdst.partial/coding-agent-workdir/.git" "$wdst.partial/coding-agent-workdir/git-dir"
  fi
  # A run whose SDD state lives on the per-repo branch keeps a second git entry
  # inside the cache this archive keeps: the state checkout's gitfile
  # (../README.md step 2). Git refuses to track any path under a .git
  # component, so an unrenamed one silently drops the whole checkout.
  state_git "$wdst.partial"
  clean "$wdst.partial"
  mv "$wdst.partial" "$wdst"
  mv "$dst.partial" "$dst"
  echo "archived $arm $id"
}

receipts_in() {
  # The receipt-shaped directories of an archived run: a published receipt, or
  # a staging whose final rename failed after finish marked it FINISHED
  # (analyze.py's _is_receipt).
  local root=$1 d
  [ -d "$root" ] || return 0
  while IFS= read -r d; do
    case "$(basename "$d")" in
      .*) if [ -f "$d/FINISHED" ]; then printf '%s\n' "$d"; fi ;;
      *) printf '%s\n' "$d" ;;
    esac
  done < <(find "$root" -mindepth 1 -maxdepth 1 -type d)
}

ledger_complete() {
  # Whether a ledger in the archived cache records the plan's last task
  # complete: the receipt's copy at receipts/<ws>/progress.md, or a live plan
  # workspace's at {state,sdd}/<key>/plans/<ws>/progress.md. Reported, never
  # decided on: the design lets every task be complete while the final review
  # and Finish remain, so this line says nothing about whether Finish ran.
  local cache=$1 f
  [ -d "$cache" ] || return 1
  while IFS= read -r f; do
    if grep -q "Task $LAST_TASK: complete" "$f"; then return 0; fi
  done < <(find "$cache" -maxdepth 5 -name progress.md -type f)
  return 1
}

finish_state() {
  # Whether the run reached Finish, read from its archived main transcript:
  # a Bash call running `sdd-state finish` whose tool result carries the
  # helper's `status=finished` line. Prints two words, `<yes|no> <yes|no|na>`:
  # whether Finish ran, and whether that line published a receipt
  # (`receipt=none` is a Finish that could not publish one).
  #
  # The receipt and the mirror cannot answer this question themselves: they are
  # the artifacts whose loss the post-check exists to detect, so a run that
  # lost its whole cache would read as "never finished" and pass. The
  # transcript is the independent record. The reader is the campaign's own
  # (analyze.main_transcript picks the transcript, analyze's lexer splits the
  # command) so that the archive and the analyzer never disagree about what a
  # run did.
  python3 -IB - "$1" "$E" <<'PY'
import re
import sys
from pathlib import Path

workspace = Path(sys.argv[1])
sys.path.insert(0, sys.argv[2])
import analyze

FINISHED = re.compile(r"^status=finished\b")


def runs_finish(command: str) -> bool:
    """Whether one Bash command runs `sdd-state finish`."""
    for segment in analyze._segments(command):
        words = analyze._command_words(segment)
        if not words:
            continue
        # `bash <path>/sdd-state finish ...` is the same call as the bare one.
        head = 1 if Path(words[0]).name in ("bash", "sh") and len(words) > 1 else 0
        if Path(words[head]).name == "sdd-state" and words[head + 1:head + 2] == ["finish"]:
            return True
    return False


transcript = analyze.main_transcript(workspace)
finished = published = unpublished = False
if transcript is not None:
    calls: set[str] = set()
    for rec in analyze.load(transcript):
        for use in analyze.tool_uses(rec):
            command = analyze.tool_input(use).get("command")
            if use.get("name") == "Bash" and isinstance(use.get("id"), str) and isinstance(command, str) and runs_finish(command):
                calls.add(use["id"])
        if not analyze.is_tool_result(rec):
            continue
        for block in analyze.blocks(rec):
            if block.get("type") != "tool_result" or block.get("tool_use_id") not in calls:
                continue
            if block.get("is_error") is True:
                continue
            for line in analyze.result_text(block).splitlines():
                if not FINISHED.match(line):
                    continue
                finished = True
                # A retry that published wins over an earlier staging failure.
                if "receipt=none" in line.split():
                    unpublished = True
                else:
                    published = True
print("yes" if finished else "no", "yes" if published else ("no" if unpublished else "na"))
PY
}

post_check() {
  # ../README.md step 4 asks whether each archived run carries what its outcome
  # leaves behind. For this campaign that is the stop guard's own record: a run
  # that reached Finish wrote a receipt (the ledger and job records the
  # analyzer reads) and the session mirror it unions with the receipt's log.
  # Both are read from the copy, because the copy is what the analyzer and the
  # tally read, and Finish is read from the transcript rather than from the
  # artifacts themselves. A run that never reached Finish is reported and
  # passes: the analyzer reads it from its live plan workspace.
  local id=$1
  local ws="$out/workspaces/$id"
  local cache="$ws/home/.cache/hyperpowers"
  local receipts mirrors ledger state finish published rc=0
  receipts=$(receipts_in "$cache/receipts" | wc -l | tr -d ' ')
  mirrors=0
  if [ -d "$cache/stop-guard" ]; then
    mirrors=$(find "$cache/stop-guard" -maxdepth 1 -type f -name '*.jsonl' | wc -l | tr -d ' ')
  fi
  if ledger_complete "$cache"; then ledger=yes; else ledger=no; fi
  if ! state=$(finish_state "$ws"); then
    echo "post-check $arm $id: the transcript reader failed" >&2
    return 1
  fi
  finish=${state% *}; published=${state#* }
  echo "post-check $arm $id: finish=$finish receipt_published=$published receipts=$receipts mirrors=$mirrors ledger_last_task=$ledger"
  [ "$finish" = yes ] || return 0
  if [ "$receipts" -eq 0 ]; then
    echo "post-check failed: $arm $id reached Finish with no receipt under home/.cache/hyperpowers/receipts" >&2
    rc=1
  fi
  if [ "$mirrors" -eq 0 ]; then
    echo "post-check failed: $arm $id reached Finish with no session mirror under home/.cache/hyperpowers/stop-guard" >&2
    rc=1
  fi
  if [ "$published" = no ]; then
    echo "post-check failed: $arm $id finished with receipt=none: Finish could not publish its receipt" >&2
    rc=1
  fi
  return $rc
}

for id in $ids; do archive "$id"; done
failed=0
for id in $ids; do post_check "$id" || failed=$((failed + 1)); done
[ "$failed" -eq 0 ] || { echo "$failed archived run(s) failed the post-check" >&2; exit 1; }
