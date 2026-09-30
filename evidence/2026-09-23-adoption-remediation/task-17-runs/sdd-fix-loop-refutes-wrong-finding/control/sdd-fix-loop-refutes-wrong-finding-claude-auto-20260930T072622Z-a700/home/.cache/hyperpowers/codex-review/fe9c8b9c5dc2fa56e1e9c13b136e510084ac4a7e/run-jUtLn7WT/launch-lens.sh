#!/usr/bin/env bash
# Launch one round-1 lens of the FINAL whole-branch Codex code gate.
# Usage: launch-lens.sh <lens-name> "<charter sentence>"
set -euo pipefail

GD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/codex-review/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/run-jUtLn7WT
SDD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.cache/hyperpowers/sdd/fe9c8b9c5dc2fa56e1e9c13b136e510084ac4a7e/plans/plan-76cc6a12
WD=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/coding-agent-workdir
CODEX_PATH=/Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T072622Z-a700/home/.claude/plugins/cache/openai-codex/codex/stub

LENS="$1"
CHARTER="$2"

LENSPROMPT="Read the review dossier first — it is your delivered context: ${GD}/dossier.md
Where a dossier section says NOT PROVIDED, answer that Coverage axis exactly \`cannot-verify: <reason>\` — never \`not applicable\`; where it says NOT APPLICABLE, answer it \`not applicable: <why>\` without hedging.
Your lens for this review: ${CHARTER}
Report every blocking finding you can identify this round; do not reserve findings for later rounds.
Findings outside your lens are still reported, labeled [out-of-lane] — never suppressed.
You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
Do not edit anything. Return exactly the Required document-review output, adding a Coverage: section before Summary with these axes, each answered concretely or marked not applicable: documents read; adjudicated decisions considered; changed surfaces reviewed; test evidence inspected. When your output is the structured review JSON, put the Coverage section inside the summary field as a single 'Coverage: <axis> — <answer>; …' run.

Verdict: approve|needs-attention

Blocking Findings:
- severity: critical|high
  title: ...
  evidence: <file>:<line references>
  issue: ...
  recommendation: ...

Non-blocking Findings:
- severity: medium|low
  title: ...
  evidence: <file>:<line references>
  issue: ...
  recommendation: ...

Cannot verify:
- requirement: ...
  reason: ...
  needed evidence: ...

Summary: ..."

printf '%s\n' "$LENSPROMPT" > "${GD}/lens-${LENS}-prompt.md"

RECIPE="Final whole-branch review. Branch review package: ${SDD}/review-d079d0c..832441a.diff. Plan or requirements: ${WD}/plan.md. Minor findings ledger, if present: ${SDD}/final-review-findings.md. Tier-skip summary, if any: none — no task skipped its per-task gate. Review for correctness, requirements coverage, integration risk, and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."

exec node "${CODEX_PATH}/scripts/codex-companion.mjs" adversarial-review \
  --base d079d0c012d78c933fc95ca6881c0957acb5b2fe --json "${LENSPROMPT}

${RECIPE}"
