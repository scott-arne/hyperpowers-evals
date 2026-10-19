#!/usr/bin/env bash
# archive-runs.sh <absolute-campaign-root>
# Copies every run the control's per-arm logs name from the campaign root into
# ../runs/<arm>/ and applies ../../README.md's steps 1 and 2 to the copy. The
# campaign root stays as quorum wrote it (copy, never move, never link), so the
# tally can be re-run against it. A copy mirrors its run's own layout: a
# baseline (legacy) run is one runs/baseline/<run>/; a new (relocated) run is
# runs/new/<run>/ beside runs/new/workspaces/<run>/.
# Step 1 runs scripts/strip-runs over the copy, with --min-age-minutes 0
# because the originals are minutes old; step 2 renames the fixture's .git to
# git-dir. home/.codex is removed too. Staging (git add -f) and step 4's
# post-check are archive-check.sh's. A run already archived stops the script.
set -euo pipefail
[ "$#" -eq 1 ] || { echo "usage: archive-runs.sh <absolute-campaign-root>" >&2; exit 1; }
root="$1"
case "$root" in /*) ;; *) echo "campaign root '$root' is not absolute" >&2; exit 1 ;; esac
here="$(cd "$(dirname "$0")" && pwd -P)"     # evidence/<dir>/control
ev="$(dirname "$here")"                       # evidence/<dir>
repo="$(cd "$ev/../.." && pwd -P)"
for arm in baseline new; do
  dest="$ev/runs/$arm"
  for log in "$here/logs/$arm"/control-*-[pr][0-9]*.log; do
    [ -e "$log" ] || continue
    id="$(sed -n 's/^run-id: \([A-Za-z0-9][A-Za-z0-9._-]*\)$/\1/p' "$log")"
    if [ -z "$id" ] || [ "$(printf '%s\n' "$id" | wc -l)" -ne 1 ]; then
      echo "not exactly one run id in $log" >&2; exit 1
    fi
    [ -f "$root/$id/verdict.json" ] || { echo "no verdict: $root/$id" >&2; exit 1; }
    [ ! -e "$dest/$id" ] || { echo "already archived: $dest/$id" >&2; exit 1; }
    mkdir -p "$dest"
    cp -Rp "$root/$id" "$dest/$id"
    if [ "$arm" = new ]; then
      [ -d "$root/workspaces/$id" ] || { echo "no workspace: $root/workspaces/$id" >&2; exit 1; }
      mkdir -p "$dest/workspaces"
      cp -Rp "$root/workspaces/$id" "$dest/workspaces/$id"
      tree="$dest/workspaces/$id"
    else
      [ ! -e "$root/workspaces/$id" ] || { echo "baseline run with a workspace: $id" >&2; exit 1; }
      tree="$dest/$id"
    fi
    "$repo/scripts/strip-runs" --results-root "$dest" --run "$id" --min-age-minutes 0
    if [ -d "$tree/coding-agent-workdir/.git" ]; then
      mv "$tree/coding-agent-workdir/.git" "$tree/coding-agent-workdir/git-dir"
    fi
    rm -rf "$tree/home/.codex"
    echo "archived $arm $id"
  done
done
