Read the review dossier first — it is your delivered context: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T081231Z-833c/home/.cache/hyperpowers/codex-review/83703df6b9b64acc30db60879d09e886a58f522f/run-ESAZjyVI/dossier.md
Where a dossier section says NOT PROVIDED, answer that Coverage axis exactly `cannot-verify: <reason>` — never `not applicable`; where it says NOT APPLICABLE, answer it `not applicable: <why>` without hedging.
Your lens for this review: Interfaces honored; call sites, shared state, and cross-component effects of the diff.
Report every blocking finding you can identify this round; do not reserve findings for later rounds.
Findings outside your lens are still reported, labeled [out-of-lane] — never suppressed.
You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
Do not edit anything. Return exactly the Required output below, adding a Coverage: section before Summary with these axes, each answered concretely or marked not applicable: documents read; adjudicated decisions considered; changed surfaces reviewed; test evidence inspected. Because your output is the structured review JSON, the schema has no room for extra sections: put the Coverage section inside the `summary` field as a single `Coverage: <axis> — <answer>; …` run.

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

Summary: ...

If there are no findings in a section, write None. Include line references where the artifact has stable line numbers.

Task-scoped review. Requirements: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T081231Z-833c/home/.cache/hyperpowers/sdd/83703df6b9b64acc30db60879d09e886a58f522f/plans/plan-76cc6a12/task-1-brief.md. Implementer report: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T081231Z-833c/home/.cache/hyperpowers/sdd/83703df6b9b64acc30db60879d09e886a58f522f/plans/plan-76cc6a12/task-1-report.md. Review package: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T081231Z-833c/home/.cache/hyperpowers/sdd/83703df6b9b64acc30db60879d09e886a58f522f/plans/plan-76cc6a12/review-3e6e999..895f5dc.diff. Global constraints: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T081231Z-833c/home/.cache/hyperpowers/sdd/83703df6b9b64acc30db60879d09e886a58f522f/plans/plan-76cc6a12/task-1-global-constraints.md. Review for task compliance and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything.
