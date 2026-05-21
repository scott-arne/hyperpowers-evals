#!/usr/bin/env bash
# Fixture invariants — the .agents symlink must resolve to the codex
# tool-mapping reference the prompt tells the agent to read.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -f "$HARNESS_WORKDIR/.agents/skills/superpowers/using-superpowers/references/codex-tools.md"
