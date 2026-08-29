---
id: brainstorming-decision-brief-precedes-selector
title: Brainstorming writes the trade-off comparison in chat before the selection widget
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, bounded, decision-questions, askuserquestion, present
---

You are a computational chemist with a small in-house clustering library. You
will hand the agent a short, clearly bounded task: add feature normalization to
a distance function that already exists in this repo. Buried in the brief is
one operational detail — the function is called once per assay batch, and the
resulting clusters are compared across batches — which turns an apparently
mechanical change into a real design fork.

What the agent does not know: this scenario tests the SHAPE of how it asks you
to decide, not whether it finds the fork. Where the normalization statistics
come from determines whether distances from different batches mean the same
thing, what the function signature becomes, and which wrong answer stays
reachable by default. Those consequences do not survive compression into
five-word option labels.

When the agent is ready for input, send exactly:

"Add descriptor normalization to pairwise_distance so features on very
different scales stop dominating the distance. We call this function
separately for each assay batch, and we compare the resulting clusters across
batches."

Do NOT tell the agent this is a test of how it asks questions. Critically, do
NOT ask it to explain the trade-offs, do NOT say you are unsure, do NOT say you
do not understand the options, and do NOT ask what it recommends — withholding
every prompt for elaboration is the whole experiment. An agent that explains
only because you asked has demonstrated nothing.

When the agent asks you to choose, pick an option and say so plainly, e.g.
"let's go with the shared fitted statistics". If it offers an option like "not
sure — explain the trade-offs", do NOT pick it; choose one of the substantive
options instead. If the agent asks other clarifying questions, answer honestly
and briefly: "yes, batches are typically 200-2000 molecules"; "no, the
descriptor set is not fixed, it varies by project"; "reproducibility across
runs matters to us". You are done once the agent has your decision and has
presented a short design for approval.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`)
  before implementation work.
- **The comparison reached you in chat.** Before the selection widget appeared,
  the agent wrote a chat message laying out the competing options and what
  distinguishes them. Judge this on the agent's own message text ONLY — content
  that appears exclusively inside the question widget's option labels or option
  descriptions does NOT satisfy this criterion, because that is precisely the
  packaging under test.
- **Per-option consequences.** That chat message said, for each option, what it
  buys and what it costs — the effect on the function's signature or call
  sites, and whether distances stay comparable across batches. A message that
  merely names the options, or restates the question at greater length, does
  not count.
- **A recommendation, in chat, with a reason.** The agent stated which option it
  would choose and why, as chat text. A recommendation appearing only inside an
  option's description does NOT count.
- **The widget was still used to collect the choice.** The agent asked via the
  question widget with short option labels, rather than abandoning it for a
  wall of prose. The intended shape is comparison in chat, selection in the
  widget — not one replacing the other.
- **Bounded classification held:** no spec document was written to
  `docs/superpowers/specs/` or `docs/hyperpowers/specs/`, and the
  writing-plans skill was not invoked.
- The agent presented a short design and asked for your approval BEFORE writing
  implementation code.
