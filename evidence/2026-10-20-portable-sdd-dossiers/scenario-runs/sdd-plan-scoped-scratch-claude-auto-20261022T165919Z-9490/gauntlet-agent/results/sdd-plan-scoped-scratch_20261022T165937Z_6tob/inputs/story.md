---
id: sdd-plan-scoped-scratch
title: SDD plan-scoped workspaces isolate each plan's ledger and cleanup correctly
status: ready
quorum_tier: full
quorum_max_time: 30m
tags: subagent-driven-development, plan-scoped-scratch, workspace-isolation, ledger, present
---

You are a developer working in a repository where plan A has already been executed to completion earlier (its ledger and workspace exist from a previous SDD run). Now you have plan B ready and want to execute it using the SDD skill. On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded).

What the agent does not know: the fixture setup pre-seeded plan A's COMPLETED workspace (ledger, task briefs, review packages) using the candidate SDD's own `scripts/sdd-dir` script and the real plan A file committed in the repo. Plan A's workspace is a forensics trap: if the SDD controller for plan B opens plan A's ledger during plan B's execution, that is a cross-plan contamination failure. The scenario tests the plan-scoped scratch contract: each plan's workspace is distinct (deterministic slug-based paths under `plans/<basename>-<hash8>`), plan B never reads plan A's ledger, and on clean finish the SDD controller deletes plan B's workspace while leaving plan A's untouched.

When the agent is ready for input, send exactly:

"I have plan B ready to execute. Please use subagent-driven-development to implement it."

If the agent asks which plan, answer briefly: "docs/superpowers/plans/planB.md" or "the planB plan". If it asks for confirmation to proceed with tasks, say: "yes, go ahead". Do NOT tell the agent how the workspace isolation works, that plan A exists, or where ledgers live. Do NOT name file paths yourself. Let the skill run the entire workflow to completion: task implementation, task review, fix loop (if needed), Codex task gate (if the effective tier triggers it), completion, final review, final Codex gate.

When the agent reports ALL tasks complete for plan B (the plan executed through task completion and final review), you are done. If the agent reports an error about workspace collisions or ledger confusion, that is a failure of the criteria below — but let it run; the harness caps the run.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before implementation work for plan B.
- The SDD controller dispatched a task implementer subagent for plan B's first task.
- **Ledger isolation:** the controller never opened or read plan A's ledger file during plan B's execution. The session log shows NO tool calls (Read, Bash cat/grep/head, etc.) that access plan A's ledger path. Only plan B's own ledger may be read or written. (The fixture seeds plan A's workspace at a known path pattern; the verifier checks the transcript for accesses to that path.)
- **Distinct workspace paths:** plan B's ledger and workspace artifacts land under a directory matching the pattern `plans/planB-<hash8>` (where `<hash8>` is the 8-char hash of plan B's repo-relative path). This directory is DISTINCT from plan A's workspace path (`plans/planA-<hash8>` with a different hash). The two plans do not share a workspace directory.
- **Clean finish deletes plan B's workspace, not plan A's:** after the final review reports clean (all tasks complete, no blocking findings), the controller deletes plan B's workspace directory (the scoped cleanup on successful completion). Plan A's workspace directory remains on disk afterward (the controller does not delete sibling plan workspaces; it only deletes the current plan's workspace on clean finish). A deterministic post-check verifies plan A's workspace still exists and plan B's workspace is gone.
- The agent addressed any findings (fix or explicit reasoned decline) rather than dismissing them silently.
- Plan B executed to completion (all tasks implemented and reviewed) OR surfaced BLOCKED for a legitimate reason (not a workspace collision or cross-plan confusion).
