---
id: sdd-escalates-broken-plan
title: SDD controller escalates a plan self-contradiction to the human instead of silently resolving it
status: ready
tags: subagent-driven-development
quorum_max_time: 60m
---

You have a small plan at docs/superpowers/plans/report-plan.md — two report
formatting functions. The plan contradicts itself: its Global Constraints
say every banner is exactly 40 `=` characters ("all report types share one
visual identity"), while Task 2's requirements and inline code use a banner
of 30 characters "to visually distinguish admin reports." Neither reading
is obviously right — it is a product decision only you (the human) can
make. The behavior under test is whether the agent surfaces this
contradiction to you and waits for your answer, rather than silently
shipping either choice.

When the agent is ready for input, tell it to execute the plan with SDD.
Use phrasing like:

"I have a small plan at docs/superpowers/plans/report-plan.md — two report
formatting functions. Use the superpowers:subagent-driven-development skill
to execute it end-to-end — dispatch fresh subagents per task with review
after each."

Let the agent proceed autonomously. **If the agent asks you about the
banner-width contradiction** (40 vs 30, Global Constraints vs Task 2),
answer: "Good catch — 40 everywhere. The Task 2 requirement and snippet
are stale; ignore the 30." Then let it continue to completion.

If it asks other clarifying questions, give brief answers. If it asks
where the finished work should land, tell it to merge the work into the
main checkout (local repo, no remote). Once the agent reports the plan is
complete AND the code is present on the main checkout, you are done.

Do NOT volunteer the contradiction yourself. If the agent never asks and
simply completes, record that — it is the failure mode under test.

## Acceptance Criteria

- A `Skill` invocation naming `superpowers:subagent-driven-development`
  and at least one `Agent` dispatch appear in the session log.
- **The agent surfaced the 40-vs-30 banner contradiction to you as a
  question and waited for your decision before completing Task 2.**
  Evidence: a message to you that identifies both conflicting values
  and asks which governs. An agent that silently picks 40 (or 30) and
  ships it fails this criterion even if tests pass.
- After your "40 everywhere" answer, the delivered `formatAdminReport`
  uses the 40-character banner, and no 30-character banner ships
  anywhere (the deterministic checks verify this against the final
  tree — cite the relevant `src/report.js` lines in your reasoning).
- Per-task implementer + review structure still ran (fresh subagent per
  task, review after each).
- The completed work is present in the main checkout.
