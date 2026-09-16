# Over-trigger measurement — analysis (2026-09-16)

**Instrument.** hyperpowers-evals at `b234bbc` (harness unchanged); hyperpowers
worktree at `c6b69d8` (the `skills/` tree byte-identical to every measured
head since `7e8ba23`); model `claude-opus-5`; Claude Code 2.1.261. Each run is
one `quorum run` trial; processes of five trials ran four at a time per
condition. The SessionStart payload hashed the same in every run
(`c7f3140578fb`); the only difference between conditions is the skill
listing the session received: `d5d6ad6f` (1 of 15 hyperpowers descriptions
present) as-is versus `c976aa40` (15 of 15) with
`SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` in the runner's environment.

**Dependent variables.** `final` verdict; the first tool call of the
session (turn-1 action class: `Skill(hyperpowers:brainstorming)`,
exploration such as `Bash`, or a direct edit); token totals.

## cost-checkbox-over-trigger ("add a basic checkbox, nothing fancy")

| condition | n | fail | pass | fail rate (95% Wilson) | first action: Skill(brainstorming) | first action: explore |
|---|---|---|---|---|---|---|
| as-is (descriptions dropped) | 20 | 2 | 18 | 10% (3–30%) | 1 | 19 |
| descriptions-on | 21 (20 + pilot) | 17 | 4 | 81% (60–92%) | 17 | 4 |

The description of the brainstorming skill, when it reaches the model,
multiplies the over-trigger rate on a trivial request by roughly eight. In
the descriptions-on condition the failing runs invoked the skill as their
very first action in 17 of 17 cases; in the as-is condition 19 of 20 runs
explored first and 18 then implemented directly. The two conditions are
identical in every other recorded input.

The as-is rate (10%) is the rate the earlier sentinel batches sampled: nine
batches produced one failure in nine single runs of this scenario, and this
measurement's 2 in 20 agrees with it.

## brainstorming-resists-jump-to-implementation (calibration twin)

| condition | n | pass | fail | indeterminate | first action: Skill(brainstorming) | first action: other |
|---|---|---|---|---|---|---|
| as-is | 10 | 8 | 0 | 2 | 10 | 0 |
| descriptions-on | 10 | 9 | 0 | 1 | 10 | 0 |

No failure in either condition: on the request that should trigger
brainstorming ("build a notifications system"), the skill fired every time
whether or not its description was visible, so the description is not what
makes the wanted trigger happen, and exposing it buys nothing on this side.
The three indeterminates are the grader returning `investigate` at its
wall while the agent's design conversation was still running; in each the
seven deterministic checks (`skill-called`, `skill-before-implementation-tool`
twice, the file checks) passed, the same shape as the eighth sentinel
batch's indeterminate. They are counted as neither pass nor fail.

## What this says about the recorded regression

The eighth sentinel batch's failure was a draw from the as-is 10% rate, not
a change in the skills tree: the same tree yields the same rate in 20 fresh
runs. The larger finding is upstream of this branch: the brainstorming
description ("You MUST use this before any creative work - creating
features, building components, adding functionality, or modifying
behavior...") is a strong over-trigger when visible, and whether it is
visible depends on Claude Code's skill-listing budget (1% of the context
window in characters; bundled skills first, then plugin skills by usage), so
users see different behaviour by installed plugin set, model, and history.

## Limits

One head, one model, one Claude Code version; a single-run judge per trial;
the descriptions-on condition raises the whole listing's budget, not only
brainstorming's line, so it also exposes the other fourteen descriptions.
