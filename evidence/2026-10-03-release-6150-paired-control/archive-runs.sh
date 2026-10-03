#!/usr/bin/env bash
# archive-runs.sh
# Copies every run this campaign cites from results/ into
# runs/<arm>/<run-id>/ and applies ../README.md's pre-commit steps to the copy:
# strip-runs, the fixture's .git renamed to git-dir, and the host state
# strip-runs leaves behind removed (the rest of home/.claude/plugins,
# home/.codex, browser profiles, npx installs and Python tool caches).
# results/ stays as quorum wrote it (copy, never move). A run already archived
# is skipped; a named run without a verdict stops the script. Each copy is
# built under <run-id>.partial and renamed only once it is complete. Staging
# (git add -f) and the post-check are done at commit time.
# Adapted from ../2026-10-02-plans-component-library-baseline/archive-runs.sh;
# the arms come from four launch logs, and the two sentinel runs are named
# here because the batch log does not print run ids.
set -euo pipefail
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-03-release-6150-paired-control"

ids_from() { sed -n 's/^run-id: \([^ ]*\)$/\1/p' "$E/logs/$1"; }

archive() {
  local arm=$1 id=$2
  local src="$EV/results/$id" dst="$E/runs/$arm/$id"
  if [ -e "$dst" ]; then echo "skip $arm $id (archived)"; return; fi
  [ -f "$src/verdict.json" ] || { echo "no verdict: $src" >&2; exit 1; }
  mkdir -p "$E/runs/$arm"
  rm -rf "$dst.partial"
  cp -Rp "$src" "$dst.partial"
  "$EV/scripts/strip-runs" --results-root "$E/runs/$arm" --run "$id.partial" --min-age-minutes 0
  if [ -d "$dst.partial/coding-agent-workdir/.git" ]; then
    mv "$dst.partial/coding-agent-workdir/.git" "$dst.partial/coding-agent-workdir/git-dir"
  fi
  rm -rf "$dst.partial/home/.claude/plugins" "$dst.partial/home/.codex"
  find "$dst.partial/home/.tmp" -maxdepth 1 -name 'cdp-*' -exec rm -rf {} + 2>/dev/null || true
  find "$dst.partial" -type d \( -name node_modules -o -name .ruff_cache -o -name .mypy_cache -o -name __pycache__ \) -prune -exec rm -rf {} +
  mv "$dst.partial" "$dst"
  echo "archived $arm $id"
}

for id in $(ids_from arm-a-v6140.out); do archive control "$id"; done
for id in $(ids_from arm-b-5bef46c.out); do archive treatment "$id"; done
for id in $(ids_from side-c-tdd.out) $(ids_from side-d-notodo.out); do archive side "$id"; done
for id in cost-checkbox-over-trigger-claude-auto-20261003T112329Z-7629 \
          triggering-test-driven-development-claude-auto-20261003T112329Z-0176; do
  archive sentinel "$id"
done
