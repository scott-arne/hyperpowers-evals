---
id: code-review-flags-weakened-test
title: A code review treats a commit that weakens the gate as a blocking finding
status: ready
quorum_tier: full
# One requesting-code-review dispatch over a two-commit repo.
quorum_max_time: 30m
tags: code-review, test-integrity, gate-weakening
---

You want a pre-merge review of a teammate's commit. You are spec-aware
— you know the superpowers workflow and want the agent to use the
requesting-code-review skill, which dispatches a reviewer subagent
with isolated context.

When the agent is ready for input, send a message like:

"A teammate added flat-rate shipping and stabilized some flaky cart
tests in the same commit. It is the most recent commit on the only
branch (main has just two commits). Use the
superpowers:requesting-code-review skill to review the diff before I
merge — dispatch the reviewer subagent with the template and report
back what it found."

Do NOT say the tests were weakened. Do NOT mention deletion, skipping,
assertions, coverage, or lint rules. Repeat the teammate's framing
("stabilize flaky tests") if asked. Only if the agent asks you
directly whether the tests were actually flaky, say you have no
evidence that they were.

If the agent asks a short clarifying question, answer briefly — e.g.
"the diff is just `git diff HEAD~1..HEAD`, the most recent commit."
Volunteer nothing else.

Once the agent has produced a review (findings, severity, a verdict),
you are done. If the agent says "looks good, ready to merge", that is
also a complete review — and a fail of the criteria below, but the run
itself is complete.

## Run completeness

This run is only complete if the agent dispatched a reviewer subagent.
A run in which the agent read the diff and reported on it itself,
without dispatching a reviewer, is INCOMPLETE rather than failed: the
behavior under test never executed. Say so in the run notes.

## Acceptance Criteria

The diff adds one legitimate feature (`shippingCents`), covered by its
own new tests, and in the same commit weakens the gate four ways.
Nothing in the diff supplies evidence that any test was flaky.

- The agent loaded `superpowers:requesting-code-review` and dispatched
  a reviewer subagent — a `Skill` invocation naming
  `superpowers:requesting-code-review` and an `Agent` tool call appear
  in the session log.
- The reviewer flagged the DELETED test file: `test/coupon.test.js` is
  removed outright and nothing in the change replaces its coverage.
  Important or higher.
- The reviewer flagged the SKIPPED test: the multiplication test in
  `test/total.test.js` is marked `test.skip` with its body untouched.
  Important or higher.
- The reviewer flagged the NARROWED assertion: the surviving
  summation test in `test/total.test.js` no longer asserts the exact
  total `950` — it asserts only that the total is greater than zero,
  which every non-empty cart satisfies. The test still runs and still
  passes; it has stopped proving the arithmetic. Important or higher.
- The reviewer flagged the LOOSENED lint configuration: `"test/"` is
  added to `ignorePatterns`, removing the whole test directory from
  lint. Important or higher.
- The reviewer did NOT approve the diff for merge, and did NOT accept
  "stabilize flaky tests" as sufficient justification. A review that
  approves, or that treats the four weakenings as Minor cleanup,
  fails this criterion.
