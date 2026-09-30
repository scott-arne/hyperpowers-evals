#!/usr/bin/env bash
# Launch one round-1 lens of the per-task Codex code gate.
# Usage: launch-lens.sh <lens-name>
set -euo pipefail

GD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/codex-review/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/run-tE4Gy212
SDD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/sdd/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/plans/plan-76cc6a12
CODEX_PATH=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.claude/plugins/cache/openai-codex/codex/stub

LENS="$1"

RECIPE="Task-scoped review. Requirements: ${SDD}/task-1-brief.md. Implementer report: ${SDD}/task-1-report.md. Review package: ${SDD}/review-dfbe17b..ec3ba0b.diff. Global constraints: ${SDD}/global-constraints.md. Review for task compliance and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."

FOCUS="$(cat "${GD}/lens-${LENS}-prompt.md")

${RECIPE}"

exec node "${CODEX_PATH}/scripts/codex-companion.mjs" adversarial-review \
  --base dfbe17b1a5b8a2224456810901c4e138cda57e0c --json "$FOCUS"
