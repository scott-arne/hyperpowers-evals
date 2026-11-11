#!/usr/bin/env bash
# archive-runs.sh <arm> <task-dir>
# Copies every run the arm's launch logs name (logs/<arm>-*.log, their
# `run-id:` lines) from results/ into <task-dir>/<arm>/<run-id>/, with its
# workspace in <task-dir>/<arm>/workspaces/<run-id>/, and applies the
# evidence hygiene to the copies: strip-runs on the copy, the fixture's .git
# renamed to git-dir (and any SDD state checkout's .git with it), and the host
# state strip-runs leaves behind removed (the rest of home/.claude/plugins,
# home/.codex, Chrome profiles, the node compile cache, the npm cache, node and
# Python caches). home/.cache/hyperpowers stays whole: the guard's log and the
# stop guard's mirror are this campaign's evidence. results/ stays as quorum
# wrote it (copy, never move). A run already archived is skipped; a named run
# without a verdict stops the script. Each copy is built under
# <run-id>.partial and renamed once complete. A setup void may have no
# workspace; its record is archived alone. Then every named run is checked
# against the outcome shapes in ../README.md ("Before committing a run", step
# 4): no .git entry left, and a result with a transcript, a transport void
# with its run.jsonl and a transcript, or a setup void with its phase.json and
# provenance.json and no transcript.
# Adapted from ../2026-10-23-sdd-stop-guard/archive-runs.sh.
set -euo pipefail
arm="$1"; task_dir="$2"
case "$arm" in treatment|fork) ;; *) echo "arm must be treatment or fork" >&2; exit 2 ;; esac
E="$(cd "$(dirname "$0")" && pwd)"
EV="${EVALS_DIR:-$(cd "$E/../.." && pwd)}"
logs="${LOGS:-$E/logs}"
out="$task_dir/$arm"
ids=$(cat "$logs/$arm"-*.log | sed -n 's/^run-id: \([^ ]*\)$/\1/p')
[ -n "$ids" ] || { echo "no run-id lines in $logs/$arm-*.log" >&2; exit 1; }
# Every id becomes a path component under results/ and the task directory,
# where this script copies, removes and renames, so each must be one token
# that cannot name a parent or another directory. All are checked before
# anything is touched.
for id in $ids; do
  case "$id" in ''|.|..|*[!A-Za-z0-9._-]*) echo "unsafe run id '$id' in $logs/$arm-*.log; nothing was archived" >&2; exit 1 ;; esac
done

clean() {
  local d=$1
  rm -rf "$d/home/.claude/plugins" "$d/home/.codex" "$d/home/.tmp/node-compile-cache" "$d/home/.npm/_cacache"
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
  mkdir -p "$out/workspaces"
  rm -rf "$dst.partial" "$wdst.partial"
  cp -Rp "$src" "$dst.partial"
  if [ -d "$wsrc" ]; then cp -Rp "$wsrc" "$wdst.partial"; fi
  touch -t 200001010000 "$dst.partial" "$dst.partial/verdict.json"
  "$EV/scripts/strip-runs" --results-root "$out" --run "$id.partial" --min-age-minutes 0
  clean "$dst.partial"
  if [ -d "$wdst.partial" ]; then
    for left in .claude/.claude-env .claude/sessions; do
      [ ! -e "$wdst.partial/home/$left" ] || { echo "strip-runs left $wdst.partial/home/$left" >&2; exit 1; }
    done
    if [ -d "$wdst.partial/coding-agent-workdir/.git" ]; then
      mv "$wdst.partial/coding-agent-workdir/.git" "$wdst.partial/coding-agent-workdir/git-dir"
    fi
    state_git "$wdst.partial"
    clean "$wdst.partial"
    mv "$wdst.partial" "$wdst"
  fi
  mv "$dst.partial" "$dst"
  echo "archived $arm $id"
}

# count <find arguments>: how many paths find prints, 0 when a start path is
# absent. The `|| true` keeps a missing directory (a setup void has no
# workspace) from failing the pipeline under pipefail.
count() { { find "$@" 2>/dev/null || true; } | wc -l | tr -d ' '; }

check() {
  local id=$1 n t
  n=$(count "$out/$id" "$out/workspaces/$id" -name .git)
  [ "$n" = 0 ] || { echo "check $id: $n .git entries left" >&2; return 1; }
  t=$(count "$out/workspaces/$id/home/.claude/projects" -name '*.jsonl' -type f)
  if [ ! -d "$out/$id/gauntlet-agent" ]; then
    { [ -f "$out/$id/phase.json" ] && [ -f "$out/$id/provenance.json" ] && [ "$t" = 0 ]; } || { echo "check $id: a setup void needs phase.json and provenance.json and no transcript" >&2; return 1; }
    return 0
  fi
  [ "$t" -ge 1 ] || { echo "check $id: no transcript" >&2; return 1; }
  n=$(count "$out/$id/gauntlet-agent/results" -name result.json -type f)
  [ "$n" = 1 ] && return 0
  [ "$n" = 0 ] || { echo "check $id: $n Gauntlet result.json files" >&2; return 1; }
  [ "$(count "$out/$id/gauntlet-agent" -name run.jsonl -type f)" -ge 1 ] || { echo "check $id: a transport void without its run.jsonl" >&2; return 1; }
}

for id in $ids; do archive "$id"; done
bad=0
for id in $ids; do check "$id" || bad=1; done
exit "$bad"
