#!/usr/bin/env bash
# archive-runs.sh
# Copies every run the per-row logs name from results/ into
# runs/<arm>/<run-id>/ and applies ../README.md's pre-commit steps to the copy:
# strip-runs, the fixture's .git renamed to git-dir, and the host state
# strip-runs leaves behind removed (the rest of home/.claude/plugins and
# home/.codex). results/ stays as quorum wrote it (copy, never move). A run
# already archived is skipped, so the script can run again after replacement
# rows; a named run without a verdict stops it. Staging (git add -f) and the
# post-check are done at commit time.
# Adapted from ../2026-10-02-companion-after-compaction/archive-runs.sh; the
# evidence directory differs, there is no pilot arm, and each copy is built
# under <run-id>.partial and renamed only once it is complete. Stage 1's copy
# failed partway in the sandbox (the fixture's .git/config), and its script
# then skipped the partial copy as archived on the next pass.
set -euo pipefail
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-02-companion-default-window"
for arm in control; do
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
      mv "$dst.partial" "$dst"
      echo "archived $arm $id"
    done
  done
done
