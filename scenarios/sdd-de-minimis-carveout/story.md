---
id: sdd-de-minimis-carveout
title: SDD controller applies a de-minimis fix itself instead of spending a subagent round
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: subagent-driven-development, fix-loop, de-minimis, controller-applied, codex-gate, present
---

You are a developer who has a small 1-task implementation plan committed to the repo (the plan header has a `**Spec:**` line). You want to execute this plan using the SDD skill. On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded).

What the agent does not know: the plan's code block contains a misspelled word in a user-facing error message, and the stub's Codex task gate raises exactly one blocking finding naming that word, the file, the line, and the exact replacement. Every review after the first approves. The finding is deliberately shaped to sit squarely inside SDD's de-minimis carve-out — one file, one line, no new logic, no judgment left, and no test asserts the string — so the controller may apply it in its own session instead of spending a subagent round. This scenario tests the POSITIVE path of that exception: that the controller reaches for it when a finding qualifies, and that reaching for it obeys the rest of the contract (covering command first, then commit, then fix report, the marked ledger line, and the same scoped re-review any other round ends with). The sibling `sdd-unified-fix-loop` scenario is the negative control: its finding does not qualify, and the controller correctly resumes the implementer instead.

When the agent is ready for input, send exactly:

"I have a plan ready to execute. Please use subagent-driven-development to implement it."

If the agent asks which plan, answer briefly: "the plan committed in this branch". If it reports BLOCKED after the fix loop, that is a valid completion — say "understood, thanks for surfacing this". Do NOT tell the agent how many rounds to run, how the fix loop works, that a carve-out exists, or that the finding is seeded. Do NOT name the finding yourself, and never use the words "typo", "misspelled", "de minimis", or "fix it yourself".

**Do not pre-authorize or waive anything.** If the agent runs a pre-flight scan and asks you to adjudicate something it noticed in the plan, answer exactly: "implement the plan exactly as written". If the agent later reports that a review finding contradicts the plan's own text and asks which governs, answer exactly: "the finding governs — make that correction and change nothing else". That answer settles authority without saying how the correction should be applied, which is the behavior under observation. The same applies to any request to skip a review, skip a gate, or accept a known issue: refuse. Let the skill run the entire workflow to completion: task implementation, task review, fix loop, Codex task gate, completion, final review, final Codex gate.

When the agent reports ALL tasks complete (the plan executed through task completion and final review), or surfaces BLOCKED, you are done.

**Known fixture failure mode (for triage, not for the agent).** The seeded misspelling only reaches the review if the implementer transcribes the plan's code block verbatim, which the plan's Global Constraints require. An implementer that silently "corrects" the string while writing the file retires the defect before any review runs, the stub gate reports its precondition unmet, and the deterministic pre-condition check in `checks.sh` fails. That is a fixture miss, not an agent failure — the same class of miss as the `f60b` pre-emption observed in `sdd-unified-fix-loop`.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before implementation work.
- The SDD controller dispatched a task implementer subagent for the task, and the implementer transcribed the plan's code block verbatim (the misspelled word reached the committed tree).
- The per-task Codex gate ran and returned exactly one blocking finding.
- **Core signal — the controller applied the fix itself.** For that fix round the controller edited the file in its own session. The transcript shows NO fix dispatch for that round: no `SendMessage`/resume to the implementer, and no fresh `Agent` dispatch carrying the finding. A run that hands this finding to a subagent has not exercised the carve-out and FAILS this criterion, even if the fix itself is correct.
- **Covering command before the commit.** The controller ran the fix's covering command (`node --test announce.test.js`, the command the plan names) BEFORE committing, and the transcript shows that ordering. Committing first and testing after is a FAIL: the contract makes the command the gate on whether the fix was de minimis at all.
- **The fix was committed.** The corrected file is in a commit, not left uncommitted in the tree — the scoped re-review packages committed diffs, so an uncommitted fix hands it nothing.
- **The fix report was appended to the task's report file** — the command run, its output, and a diff summary — exactly as an implementer's fix report would be. A controller-applied fix that leaves no report in the task's report file FAILS this criterion.
- **The ledger line carries the marker inside the fix-round schema**, matching `Task 1: fix round 1/5 controller-applied (de minimis) (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`. A ledger line missing `controller-applied (de minimis)`, or one that abandons the fix-round schema, FAILS.
- **The round was still a round, and still ended in a scoped re-review.** The controller ran `scripts/review-package` with THREE arguments (the plan file path, FIX_BASE, and HEAD) where FIX_BASE is NOT the task's original BASE, and dispatched the scoped re-review. Skipping the re-review because "the controller already verified it" is a FAIL — the exception waives the dispatch, not the review.
- **The exception was not extended.** The controller reached for it at most ONCE in this task, and applied it to nothing beyond the one finding: no other controller-session edits to the task's source files, and no controller-applied "while I'm here" changes.
- **Declining is allowed, silently dropping is not.** If the controller declines the finding, it must do so with explicit reasoning that is checkable against the tree. A decline whose stated rationale is factually wrong about the code counts as a FAIL, because no fix round then runs.
- **Ledger file discipline:** the first line of the ledger file the controller created matches the pattern `# SDD ledger — plan: <path>`. The controller never read or wrote to a different plan's ledger during the run.
- The agent addressed the finding (fix or explicit reasoned decline) rather than dismissing it silently, and reported completion or BLOCKED rather than claiming success it did not verify.
