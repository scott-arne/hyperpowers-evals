#!/usr/bin/env bash
# archive-runs.sh
# Copies every run the per-row logs name from results/ into
# runs/<arm>/<run-id>/ and applies ../README.md's pre-commit steps to the copy:
# strip-runs, the fixture's .git renamed to git-dir, and the host state
# strip-runs leaves behind removed (the rest of home/.claude/plugins,
# home/.codex, the node_modules of any npx tool a session ran, and headless
# Chrome profiles under home/.tmp/cdp-*). results/ stays as quorum wrote it
# (copy, never move). A run already archived is skipped, so the script can run
# again after the pilot, the batch, and any replacement or extension rows; a
# named run without a verdict stops it. Each copy is built under
# <run-id>.partial and renamed only once it is complete. Staging (git add -f)
# and the post-check are done at commit time.
# Adapted from ../2026-10-02-plans-component-library-baseline/archive-runs.sh;
# the evidence directory and the arms differ, and the npx node_modules and
# Chrome profiles are dropped here instead of by hand.
set -euo pipefail
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-02-plans-component-library-612"
for arm in v612 head; do
  for log in "$E/logs/$arm"-*.log; do
    [ -e "$log" ] || continue
    for id in $(sed -n 's/^run-id: \([^ ]*\)$/\1/p' "$log"); do
      src="$EV/results/$id"
      dst="$E/runs/$arm/$id"
      if [ -e "$dst" ]; then echo "skip $arm $id (archived)"; continue; fi
      [ -f "$src/verdict.json" ] || { echo "no verdict: $src" >&2; exit 1; }
      mkdir -p "$E/runs/$arm"
      rm -rf "$dst.partial"
      cp -Rp "$src" "$dst.partial"
      "$EV/scripts/strip-runs" --results-root "$E/runs/$arm" --run "$id.partial" --min-age-minutes 0
      if [ -d "$dst.partial/coding-agent-workdir/.git" ]; then
        mv "$dst.partial/coding-agent-workdir/.git" "$dst.partial/coding-agent-workdir/git-dir"
      fi
      rm -rf "$dst.partial/home/.claude/plugins" "$dst.partial/home/.codex"
      # An unmatched glob stays literal, and rm -rf ignores a missing path.
      rm -rf "$dst.partial"/home/.npm/_npx/*/node_modules "$dst.partial"/home/.tmp/cdp-*
      mv "$dst.partial" "$dst"
      echo "archived $arm $id"
    done
  done
done
