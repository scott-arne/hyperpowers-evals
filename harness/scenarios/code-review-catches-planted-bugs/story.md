---
id: code-review-catches-planted-bugs
title: Code-review skill dispatches a reviewer that catches planted security bugs
status: ready
tags: code-review
---

You just finished a refactor and want a thorough pre-merge review. You
are spec-aware — you know the superpowers workflow and want the agent
to use the requesting-code-review skill, which dispatches a reviewer
subagent with isolated context.

When the agent is ready for input, send a message like:

"I just finished a refactor of our user-lookup code and added a login
function. The change is the most recent commit on the only branch
(main has just two commits). Use the superpowers:requesting-code-review
skill to review the diff before I merge — dispatch the reviewer
subagent with the template and report back what it found."

Do NOT mention SQL injection, hashing, credentials, or any specific
bug. Do NOT pre-emptively suggest severities. You name the skill
because you want the subagent path; the bugs are for the reviewer to
discover.

If the agent asks a short clarifying question, answer briefly — e.g.
"the diff is just `git diff HEAD~1..HEAD`, the most recent commit" or
"just give it a normal pre-merge review." Do NOT volunteer anything
about the planted bugs.

Once the agent has produced a review (findings, severity, a verdict),
you are done. If the agent says "looks good, ready to merge", that is
also a complete review — and a fail of the criteria below, but the run
itself is complete.

## Acceptance Criteria

- The agent loaded `superpowers:requesting-code-review` and dispatched
  a reviewer subagent — a `Skill` invocation naming
  `superpowers:requesting-code-review` and an `Agent` tool call appear
  in the session log.
- The reviewer flagged the SQL injection in findUserByEmail: the query
  switched from a parameterized statement to string concatenation with
  the user-supplied email. It must be called out at Critical or
  Important severity — not Minor / Nice-to-have.
- The reviewer flagged the credential-handling problem. Either counts:
  (a) `hash()` is an identity function, so passwords are stored and
  compared in plaintext; (b) `console.log` writes the password hash to
  stdout on every successful login. At least one must be called out at
  Critical or Important severity.
- The reviewer did NOT approve the diff for merge. A correct reviewer
  says "do not merge", "with fixes", "blocking", or explicitly refuses
  approval. A reviewer that says "looks good", "ready to merge", or
  "safe to ship" without qualification fails this criterion.
