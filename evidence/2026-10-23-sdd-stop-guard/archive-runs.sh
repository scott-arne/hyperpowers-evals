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
# are done at commit time; the post-check below runs here, over the copies.
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
  # workspace's at {state,sdd}/<key>/plans/<ws>/progress.md.
  local cache=$1 f
  [ -d "$cache" ] || return 1
  while IFS= read -r f; do
    if grep -q "Task $LAST_TASK: complete" "$f"; then return 0; fi
  done < <(find "$cache" -maxdepth 5 -name progress.md -type f)
  return 1
}

post_check() {
  # ../README.md step 4 asks whether each archived run carries what its outcome
  # leaves behind. For this campaign that is the stop guard's own record: a run
  # that reached Finish wrote a receipt, and every run the hook ran in wrote the
  # session mirror the analyzer unions with the receipt's log. Both are read
  # from the copy, because the copy is what the analyzer and the tally read.
  local id=$1
  local cache="$out/workspaces/$id/home/.cache/hyperpowers"
  local receipts mirrors finish=no
  receipts=$(receipts_in "$cache/receipts" | wc -l | tr -d ' ')
  mirrors=0
  if [ -d "$cache/stop-guard" ]; then
    mirrors=$(find "$cache/stop-guard" -maxdepth 1 -type f -name '*.jsonl' | wc -l | tr -d ' ')
  fi
  if [ "$receipts" -gt 0 ] || ledger_complete "$cache"; then finish=yes; fi
  echo "post-check $arm $id: finish=$finish receipts=$receipts mirrors=$mirrors"
  if [ "$finish" = yes ] && { [ "$receipts" -eq 0 ] || [ "$mirrors" -eq 0 ]; }; then
    echo "post-check failed: $arm $id reached Finish with receipts=$receipts mirrors=$mirrors" >&2
    return 1
  fi
  return 0
}

for id in $ids; do archive "$id"; done
failed=0
for id in $ids; do post_check "$id" || failed=$((failed + 1)); done
[ "$failed" -eq 0 ] || { echo "$failed archived run(s) failed the post-check" >&2; exit 1; }
