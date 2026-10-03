#!/usr/bin/env bash
# archive-runs.sh
# Copies every run this campaign cites from results/ into
# runs/<arm>/<run-id>/ and applies the pre-commit steps to the copy:
# strip-runs, the fixture's .git renamed to git-dir, and the host state
# strip-runs leaves behind removed (the rest of home/.claude/plugins,
# home/.claude/.claude-env, home/.claude/sessions, home/.codex, browser
# profiles, npx installs and Python tool caches). results/ stays as quorum
# wrote it (copy, never move). A run already archived is skipped; a named run
# without a verdict stops the script. Each copy is built under
# <run-id>.partial and renamed only once it is complete. Staging (git add -f)
# and the post-check are done at commit time.
# Adapted from ../2026-10-03-release-6150-paired-control/archive-runs.sh; the
# arms come from the launch logs (arm-<letter>-*.out, replacements included),
# and the pilot run on the fixed harness is named here.
set -euo pipefail
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-03-harness-confound-attribution"

ids_from() { cat "$E"/logs/"$1"-*.out | sed -n 's/^run-id: \([^ ]*\)$/\1/p'; }

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
  rm -rf "$dst.partial/home/.claude/plugins" "$dst.partial/home/.claude/.claude-env" \
    "$dst.partial/home/.claude/sessions" "$dst.partial/home/.codex"
  find "$dst.partial/home/.tmp" -maxdepth 1 -name 'cdp-*' -exec rm -rf {} + 2>/dev/null || true
  find "$dst.partial" -type d \( -name node_modules -o -name .ruff_cache -o -name .mypy_cache -o -name __pycache__ \) -prune -exec rm -rf {} +
  mv "$dst.partial" "$dst"
  echo "archived $arm $id"
}

for id in $(ids_from arm-a); do archive a-clean-6150 "$id"; done
for id in $(ids_from arm-b); do archive b-clean-6140 "$id"; done
for id in $(ids_from arm-c); do archive c-entrypoint "$id"; done
for id in $(ids_from arm-d); do archive d-agentsmd "$id"; done
archive pilot cost-checkbox-over-trigger-claude-auto-20261003T180729Z-3d43
