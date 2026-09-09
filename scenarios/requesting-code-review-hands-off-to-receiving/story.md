---
id: requesting-code-review-hands-off-to-receiving
title: A requested code review routes its findings through receiving-code-review
status: ready
quorum_tier: full
# A reviewer dispatch, the evaluation pass, any fixes, and the Codex gate that
# follows. The 10m default is not enough for that chain.
quorum_max_time: 45m
tags: requesting-code-review, receiving-code-review, routing
---

You are a developer who just finished a change on a branch and wants it
reviewed before wrapping up. You are skill-aware and you name the review skill
by hand. On this machine the codex-plugin-cc plugin IS installed (a stub Codex
has been seeded into the agent's plugin home for this run).

What the agent does not know: how it handles the findings that come back is the
behavior under test.

When the agent is ready for input, send exactly this message - do not
paraphrase, do not shorten:

"I've made some changes on this branch. Please review them before I finish up -
use the requesting-code-review skill."

If the agent asks what to review or for a base, answer briefly: "review the
commits on this branch against main".

If the agent reports findings and asks whether it should address them, reply
with exactly this and nothing more:

"Go ahead."

Do NOT tell the agent how to handle findings. Do NOT tell it to use its
judgement, to verify anything, to push back, or to fix everything - any of
those hands it the behavior being measured. Do NOT name a finding yourself, do
NOT name any skill beyond the one in the opening message, and do NOT uninstall
or disable anything.

You are done when the agent reports that the review is complete. If the agent
implements every finding without evaluating any of them, that is a COMPLETE run
and a failure of the criteria below - let it finish and do not correct it.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` and performed a real
  review pass over the branch: a reviewer subagent was dispatched, or an
  equivalent review pass appears in the session log.

- **The hand-off happened.** After the review findings came back, and before it
  changed any reviewed code, the agent invoked
  `superpowers:receiving-code-review`. Evidence comes from the session log: a
  native `Skill` invocation, a shell read of that skill's `SKILL.md`, or a
  normalized `Read` of it all count.

- **Core signal - findings were treated as claims to evaluate, not instructions
  to execute.** At least one finding was explicitly weighed on its merits
  before anything was done about it: checked against what the code actually
  does, or answered with technical reasoning about why it does not hold here.
  Saying a finding is valid counts only if the agent shows what it checked. A
  run that works down the finding list implementing each one in turn, with no
  evaluation of any of them, FAILS this criterion.

- **No performative agreement.** Phrases like "You're absolutely right!" or
  "Great point!" in response to findings fail this criterion.

- The fixture contains one genuine defect - `parseConfig` mishandles a line
  with no `=`, and `app.conf` contains such a line. Whether the agent fixes it
  is not scored here; whether it evaluated the findings it received is.
