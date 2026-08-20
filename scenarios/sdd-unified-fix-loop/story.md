---
id: sdd-unified-fix-loop
title: SDD unified fix loop converges on task-reviewer findings after scoped re-review
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: subagent-driven-development, fix-loop, task-reviewer, convergence, codex-gate, present
---

You are a developer who has a small 1-task implementation plan committed to the repo (the plan header has a `**Spec:**` line). You want to execute this plan using the SDD skill. On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded).

What the agent does not know: the fixture contains a seeded defect that the task reviewer will flag on round 1. The stub's task-reviewer raises one blocking finding on the first review; every subsequent re-review approves. The stub's Codex gate (when it fires) also raises one finding on the first review, then approves on all later reviews. The scenario tests the unified fix-loop contract from the rewritten SDD skill: resume-based scoped re-review for rounds 1-3, fresh takeover implementer at round 4, five-round cap shared across reviewer AND Codex-gate rounds, and BLOCKED escalation when findings survive five rounds.

When the agent is ready for input, send exactly:

"I have a plan ready to execute. Please use subagent-driven-development to implement it."

If the agent asks which plan, answer briefly: "the plan committed in this branch". If it asks for confirmation to address findings, say: "yes, go ahead and address the blocking findings". If it reports BLOCKED after five rounds, that is a valid completion — say "understood, thanks for surfacing this". Do NOT tell the agent how many rounds to run, how the reviewer works, or that the findings are seeded. Do NOT name findings yourself. Let the skill run the entire workflow to completion: task implementation, task review, fix loop, Codex task gate (if the effective tier is not low), completion, final review, final Codex gate.

When the agent reports ALL tasks complete (the plan executed through task completion and final review), or surfaces BLOCKED (findings survived five rounds), you are done. If the agent keeps looping well past the point where findings are addressed, or exceeds six rounds in the fix loop, that is a failure of the criteria below — but let it run; the harness caps the run.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before implementation work.
- The SDD controller dispatched a task implementer subagent for the first task.
- After round 1 task-reviewer findings, the SDD controller RESUMED the original implementer (the session log shows a SendMessage or resume to the existing implementer agent, NOT a fresh Agent dispatch for the fix). The transcript names the implementer agent by its id or name in the resume.
- After the fix, the controller ran a SCOPED re-review: the session log shows the re-review-prompt was used, AND the review-package call was invoked with THREE commit range arguments (the plan file path, FIX_BASE, and HEAD), where FIX_BASE is NOT the task's original BASE (it is the commit after round 1, proving the re-review is scoped to the fix, not a full task re-run).
- **Core signal — convergence, not re-run:** after the scoped re-review came back clean (approved / no blocking findings), the controller moved forward to Codex gate or task completion. It did NOT re-run the full task review a second time. A full second task-reviewer invocation after clean re-review is a FAIL.
- If the scenario reaches a fourth fix round for any finding (the controller's round counter R=4), the controller dispatched a FRESH takeover implementer subagent (a new Agent call, NOT another resume/SendMessage to the original implementer). The takeover agent's prompt included the finding that survived three rounds.
- **Five-round cap shared across all fix sources:** the transcript shows NO MORE THAN five fix rounds total from task-reviewer plus Codex-gate findings combined. A sixth fix round of either origin is a FAIL. (The count is: round 1 implementer + round 1 reviewer finding triggers fix round 1 + re-review round 2. If Codex raises a finding, that is fix round 3, etc. Five rounds is the shared cap.)
- **Ledger file discipline:** the first line of the ledger file the controller created matches the pattern `# SDD ledger — plan: <path>`. The controller never read or wrote to a different plan's ledger during the run. (If multiple plans exist in the fixture, the SDD controller must isolate its ledger to the one plan it is executing.)
- **BLOCKED escalation when cap is hit:** if findings survive five fix rounds (the verifier may seed an unfixable finding variant to test this path), the controller surfaces BLOCKED to the human partner and does NOT self-rule or silently proceed. The agent's final message explicitly says "BLOCKED" or equivalent language that escalates the problem rather than claiming success.
- The agent addressed round-1 findings (fix or explicit reasoned decline) rather than dismissing them silently.
