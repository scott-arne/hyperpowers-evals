---
id: codex-plan-gate-algorithm-locked-after-round1
title: Plan gate algorithm lock after accepting round-1 alternative
quorum_tier: full
quorum_max_time: 25m
---

# Plan Gate Algorithm Locked After Round 1

You are testing whether the plan-gate Algorithm Assessment (round 1 only) correctly adjudicates an `alternative-suggested` verdict, revises the plan, locks the algorithm, and runs a confirming re-review with the lock line present and the assessment section omitted.

## Your Role

You are asking the Coding-Agent to create an implementation plan for a spec that contains a defensibly wrong algorithm choice for its stated scale. The stub Codex will suggest a clearly correct alternative in round 1. You will observe whether the agent accepts the alternative, revises the plan, locks the algorithm in the ledger, and runs a confirming round 2 with the lock line present and no Algorithm Assessment section.

## Opening Message

Send this exact message to the Coding-Agent. Do NOT paraphrase or reword it:

> Create an implementation plan for the spec at `spec.md` using `hyperpowers:writing-plans`. The spec describes a system that processes user activity logs — millions of records per day — and needs to find all records matching a given user ID for compliance reporting.

## Setup Context

The fixture contains a `spec.md` that specifies:
- A compliance-reporting system processing activity logs.
- Input scale: millions of log records per day.
- Query pattern: "Find all activity records for user ID X" (frequent queries, cold data).
- The spec suggests using a nested loop scan over unsorted log files as the lookup mechanism.

This algorithm is defensibly wrong for the stated scale (O(n²) over millions of rows). The stub Codex will return:
- `Verdict: approve` (no blocking findings).
- Algorithm Assessment with one `alternative-suggested`: "Use a hash-indexed lookup table (user ID -> record offsets) built at ingestion time" with justification (O(1) lookup vs O(n) scan, appropriate for the stated query frequency and cold-data access pattern).

## Responding to Questions

Answer neutrally:
- Language: "Python."
- Deployment: "Single-server for now, later distributed."

Algorithm questions need care — this scenario only works if the DRAFT plan
inherits the spec's nested loop scan, so the round-1 Codex review has
something to catch:

- If the agent asks about the algorithm BEFORE the Codex plan review has run
  (e.g. "should I plan an indexed approach instead of the spec's nested
  scan?"): "Draft the plan following the spec as written — keep the nested
  loop scan. I'd rather let the review process weigh in on any algorithm
  changes."
- If the agent asks AFTER the Codex review suggested the hash-indexed
  alternative: "Yes, accept the hash-indexed approach."
- Never volunteer the indexed alternative yourself.

## When to Stop

You are done when the Coding-Agent has completed the plan, run the Codex plan review gate (both round 1 and the confirming round 2), and handed the plan back to you, OR when it says the planning phase is complete.

## Acceptance Criteria

- The Coding-Agent invoked `hyperpowers:writing-plans` (native `Skill` call or shell read of `SKILL.md`).
- The plan-gate Algorithm Assessment fired in round 1 (evidence: the round-1 Codex call received a prompt containing "Algorithm Assessment (round 1 only)").
- The agent accepted the alternative (revised the affected plan task to use the hash-indexed lookup instead of the nested scan).
- The round ledger contains an algorithm lock entry stating the accepted alternative (format: `Algorithm locked: <new> (was <old>) — <rationale>`).
- A confirming round 2 ran after the plan revision (evidence: a second Codex call occurred).
- The round-2 prompt contains the lock preamble line "locked per the ledger" AND omits the "Algorithm Assessment (round 1 only)" section.

Grading notes:
- If the agent flags the spec's algorithm before drafting, that is fine — answer per the script above so the draft keeps the nested loop scan. Do not fail the run merely because the agent asked early; the criteria concern the gate flow from round 1 onward.
- If the agent declines the alternative without justification or leaves the original wrong algorithm, this is a FAIL (the alternative is clearly correct for the stated scale).
- If the agent accepts the alternative but does NOT run a confirming round 2, this is a FAIL (the spec requires a confirming re-review after material plan revision).
- If round 2 still contains the "Algorithm Assessment (round 1 only)" section, the one-shot contract is violated — this is a FAIL.
- If the ledger has no algorithm lock entry, or the lock format is wrong, this is a partial FAIL (document it in grading notes).
