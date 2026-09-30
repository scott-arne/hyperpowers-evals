Read the review dossier first — it is your delivered context: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T075547Z-70e8/home/.cache/hyperpowers/codex-review/1e5c4eb432e3baa10579bf58f4c9fe20d227416d/run-cYNuwHSH/dossier.md
Where a dossier section says NOT PROVIDED, answer that Coverage axis exactly `cannot-verify: <reason>` — never `not applicable`; where it says NOT APPLICABLE, answer it `not applicable: <why>` without hedging.
Your lens for this review: Do the tests prove the claims; is the executed evidence in the dossier consistent with the diff; gaps between claim and proof.
Report every blocking finding you can identify this round; do not reserve findings for later rounds.
Findings outside your lens are still reported, labeled [out-of-lane] — never suppressed.
You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
Do not edit anything. Return exactly the Required document-review output below, adding a Coverage: section before Summary with these axes, each answered concretely or marked not applicable: documents read; adjudicated decisions considered; changed surfaces reviewed; test evidence inspected.

When your output is the structured review JSON, the schema has no room for extra sections: put the Coverage section inside the `summary` field as a single `Coverage: <axis> — <answer>; …` run.

Required output:

```markdown
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
```

Every finding should include line references when the artifact has stable line numbers. If there are no findings in a section, write `None`.

Final whole-branch review. Branch review package: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T075547Z-70e8/home/.cache/hyperpowers/sdd/1e5c4eb432e3baa10579bf58f4c9fe20d227416d/plans/plan-76cc6a12/review-019fed8..4ecae16.diff. Plan or requirements: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T075547Z-70e8/coding-agent-workdir/plan.md. Minor findings ledger, if present: /Users/johnss51/Development/agents/hyperpowers/evals/results/sdd-fix-loop-refutes-wrong-finding-claude-auto-20260930T075547Z-70e8/home/.cache/hyperpowers/sdd/1e5c4eb432e3baa10579bf58f4c9fe20d227416d/plans/plan-76cc6a12/minor-ledger.md. Tier-skip summary, if any: NONE — no task skipped its per-task gate. Review for correctness, requirements coverage, integration risk, and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything.
