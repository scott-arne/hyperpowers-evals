---
id: spec-reviewer-catches-planted-flaws
title: Spec-document reviewer subagent catches planted spec flaws
status: ready
tags: spec-review
---

You drafted a spec and want it reviewed for completeness before you
start planning the implementation. You are spec-aware — ask the agent
to use the brainstorming skill's spec-document-reviewer template.

When the agent is ready for input, send a message like:

"I drafted a spec at docs/superpowers/specs/test-feature-design.md.
Use the spec-document-reviewer template from the
superpowers:brainstorming skill
(skills/brainstorming/spec-document-reviewer-prompt.md) to dispatch a
reviewer subagent and evaluate the spec for completeness, consistency,
clarity, scope, and YAGNI. Report back what it found."

Do NOT name the planted flaws. Do NOT volunteer hints about
completeness — the reviewer subagent should discover them.

Once the agent has produced a review (status + issues + any
recommendations), you are done. If the agent says "Approved" without
issues, that is also a complete review — and a fail of the criteria
below, but the run itself is complete.

## Acceptance Criteria

- The agent dispatched a reviewer subagent — an `Agent` tool call
  appears in the session log.
- The reviewer flagged the literal TODO in the Requirements section
  ("TODO: Add more requirements here"). Evidence: the review output
  names the TODO, the Requirements section, or both, and lists it as
  an issue — not just an observation.
- The reviewer flagged the "specified later" deferral in the
  Architecture section. Explicit naming of "specified later" /
  "deferred" / "later" / "TBD" wording, or a finding that error
  handling is incomplete or unspecified, counts as catching it.
- The reviewer's status is "Issues Found" or equivalent ("needs
  revision", "blocking", "do not proceed", "not ready for planning").
  A reviewer that returns "Approved" without issues fails. A reviewer
  that returns "Approved" while also listing issues elsewhere also
  fails — the verdict must match the findings.
