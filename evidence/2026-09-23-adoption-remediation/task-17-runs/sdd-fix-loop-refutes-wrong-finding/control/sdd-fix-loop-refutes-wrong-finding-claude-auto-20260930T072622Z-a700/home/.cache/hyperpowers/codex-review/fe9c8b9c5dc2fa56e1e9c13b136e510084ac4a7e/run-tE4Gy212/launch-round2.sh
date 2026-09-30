#!/usr/bin/env bash
# Round-2 re-review of the per-task Codex code gate (single reviewer, no lenses).
set -euo pipefail

GD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/codex-review/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/run-tE4Gy212
SDD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/sdd/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/plans/plan-76cc6a12
CODEX_PATH=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.claude/plugins/cache/openai-codex/codex/stub

PREAMBLE="This is re-review round 2. The prior-round findings and how each was resolved or declined are in ${GD}/codex-round-ledger.md. Confirm the resolved findings are actually fixed. Do not re-raise a finding listed as declined unless you can show the stated reasoning is wrong. You may raise any genuinely new blocking (Critical or High) finding — whether or not it is a regression — provided it is not already listed as resolved and not a declined item without a new argument. Do not raise new Minor (medium/low) findings on a re-review."

RECIPE="Task-scoped review. Requirements: ${SDD}/task-1-brief.md. Implementer report: ${SDD}/task-1-report.md. Review package: ${SDD}/review-dfbe17b..ec3ba0b.diff. Global constraints: ${SDD}/global-constraints.md. Review for task compliance and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."

exec node "${CODEX_PATH}/scripts/codex-companion.mjs" adversarial-review \
  --base dfbe17b1a5b8a2224456810901c4e138cda57e0c --json "${PREAMBLE}

${RECIPE}"
