---
id: code-review-precision-on-mixed-diff
title: A code review catches both real bugs and reports nothing blocking on the clean hunks
status: ready
quorum_tier: full
# One requesting-code-review dispatch over a two-commit repo.
quorum_max_time: 30m
tags: code-review, precision, reviewer-noise
---

You just finished a change and want a thorough pre-merge review. You
are spec-aware — you know the superpowers workflow and want the agent
to use the requesting-code-review skill, which dispatches a reviewer
subagent with isolated context.

When the agent is ready for input, send a message like:

"I added a session module and simplified our user lookup. The change
is the most recent commit on the only branch (main has just two
commits). Use the superpowers:requesting-code-review skill to review
the diff before I merge — dispatch the reviewer subagent with the
template and report back what it found."

Do NOT mention SQL injection, passwords, credentials, or any specific
bug, and do NOT say anything about which hunks are fine. Do NOT
pre-emptively suggest severities. You name the skill because you want
the subagent path; what is and is not a problem is for the reviewer to
discover.

If the agent asks a short clarifying question, answer briefly — e.g.
"the diff is just `git diff HEAD~1..HEAD`, the most recent commit" or
"just give it a normal pre-merge review." Do NOT volunteer anything
about the code.

Once the agent has produced a review (findings, severity, a verdict),
you are done. If the agent says "looks good, ready to merge", that is
also a complete review — and a fail of the criteria below, but the run
itself is complete.

## Acceptance Criteria

This scenario grades PRECISION as well as recall. The diff contains
exactly two real defects, both in `src/db.js`. Everything else in the
diff is correct code deliberately shaped to attract a reflexive
finding.

- The agent loaded `superpowers:requesting-code-review` and dispatched
  a reviewer subagent — a `Skill` invocation naming
  `superpowers:requesting-code-review` and an `Agent` tool call appear
  in the session log.
- The reviewer flagged the SQL injection in `findUserByEmail`: the
  query switched from a parameterized statement to string
  concatenation with the user-supplied email. Critical or Important.
- The reviewer flagged the plaintext password comparison in `login`:
  the stored value is compared with `===` against the submitted
  password, so passwords are stored and compared unhashed. Critical or
  Important.
- The reviewer did NOT approve the diff for merge.
- The reviewer raised NO Critical or Important finding against any of
  these six, each of which is correct as written. Count each one that
  drew a blocking finding:
  1. `expiresAt` uses the bare constant `86400`. It is seconds in a
     day and the function name says so. "Magic number" is not a
     blocking finding here.
  2. `displayName` dereferences `session.user.displayName` only after
     a guard that returns early when `session` or `session.user` is
     falsy. This is not a possible null dereference.
  3. `nextToken` does not validate its argument. Its only caller,
     `rotate`, validates immediately above it. This is not missing
     input validation.
  4. `close` calls `recordLatency` without awaiting it, marked with
     `void`. The detachment is deliberate telemetry. This is not a
     missing await.
  5. `describe` is a long exhaustive switch over a closed set of
     states. This is not an over-long or over-complex function.
  6. `test/session.test.js` hardcodes `issuedAt`, a display name, and
     a dummy `apiKey`. Literal values in a test fixture are correct,
     and the key is not a real credential.
- Minor or Nice-to-have observations on any of those six do not fail
  this criterion. Only Critical and Important do.
