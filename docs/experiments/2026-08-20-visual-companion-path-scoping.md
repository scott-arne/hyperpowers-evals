# Visual companion: does path-scoping in the brainstorming router suppress it?

**Date:** 2026-08-20
**Verdict: INCONCLUSIVE.** The hypothesised failure mode is real and was
observed, but the fix is **not** distinguishable from the pre-fix skill at the
sample size purchased (post-fix 3/3 vs pre-fix 2/3 on the discriminating brief;
Fisher exact p = 1.0). Recorded here so the disproof is not re-purchased.

## Symptom

Maintainer report: the brainstorming visual companion stopped being offered.

## Hypothesis

Commit `69a703a` split the single 9-step brainstorming `## Checklist` into
Spike / Bounded / Architectural. The line "Use the visual companion
just-in-time" was pure context in that diff — never edited — but the new
`**Architectural:**` header landed directly above it, so it silently went from
step 2 of *every* brainstorm to step 2 of the architectural path only. Spike and
Bounded ended up with zero mention of the companion, and Bounded is the modal
classification for work in an existing repo.

Compounding, and all verified by reading the file:

- The digraph has never had a visual-companion node.
- `## Visual Companion` sat below `## After the Design (architectural path)`.
- In the same commit the Codex approach gate *did* receive an explicit
  path-independence paragraph. The companion received no equivalent.

**H1:** the path-scoping causes the agent to skip the companion on bounded tasks.

## Intervention under test

In `skills/brainstorming/SKILL.md`: a path-independent trigger paragraph
(mirroring the Codex approach gate's), a companion step added to the Bounded
checklist, `## Visual Companion` relocated above the architectural-only section,
and a Red Flags row for "It's bounded, so the visual companion doesn't apply".

## Method

Scenario `brainstorming-bounded-fires-visual-companion` (bounded relayout of an
existing 12-field settings page; the design question is inherently visual).
Coding-agent `claude-auto` → claude-opus-5; Gauntlet-Agent claude-opus-5.

Arms differ only in `SUPERPOWERS_ROOT`, which reaches the coding agent as
`claude --plugin-dir "$SUPERPOWERS_ROOT"`:

- **before** — `/tmp/hp-before`, a detached worktree at `f36b572` (pre-fix)
- **after** — the working tree (post-fix)

Every arm assignment below was verified from the run's own substituted
`launch-agent` line, not inferred from run order. Runs were sequential
throughout so resource conditions match across rounds.

The discriminating post-check is
`tool-arg-match Bash --matches 'command=start-server[.]sh'` — did the companion
server actually start.

## Round 1 — explicit visual cue (methodology error)

Brief ended: *"I can't picture it from a description — what would the grouped
layout actually look like?"*

| Run | Arm | Verdict | Companion |
|---|---|---|---|
| `20260820T172232Z-08fc` | after (post) | pass | started |
| `20260820T172912Z-3c00` | before (pre) | pass | started |

**Both arms passed — no discrimination.** The brief was the bug: asking to be
shown something is nearly an explicit instruction to open a mockup, and the
`## Visual Companion` section is present in the file regardless of checklist
scoping. A loud enough cue finds it, so checklist placement cannot matter. The
brief was tuned to remove every explicit visual cue: "Rework the layout so
related settings are grouped." — full stop, with the Gauntlet-Agent forbidden
from saying it wants to see anything.

## Round 2 — inferential cue (3 pairs)

| Run | Arm | Verdict | Companion |
|---|---|---|---|
| `20260820T191823Z-a938` | after (post) | pass | started |
| `20260820T192440Z-d302` | before (pre) | **fail** | **NOT started** |
| `20260820T195717Z-9998` | after (post) | pass | started |
| `20260820T200259Z-636f` | before (pre) | pass | started |
| `20260820T200816Z-f2ec` | after (post) | pass | started |
| `20260820T201528Z-6702` | before (pre) | pass | started |

**post-fix 3/3 started. pre-fix 2/3 started.**

## What the one failure showed

`d302` is the only run in the campaign where the companion did not open, and it
reproduced H1 almost verbatim. The pre-fix agent classified BOUNDED, then:

> it explicitly refused to open the visual companion — it stated **"stay in the
> terminal rather than opening the visual companion"** and presented the
> candidate layouts only as prose options.

That is the exact rationalization the added Red Flags row anticipates, produced
unprompted by an agent reading the pre-fix skill. The failure mode is therefore
real and reachable — not a theoretical reading of the diff.

## What the campaign does NOT show

That the fix repairs it. 3/3 vs 2/3 is indistinguishable from noise
(Fisher exact p = 1.0), and the first pair alone — which looked like a clean
discrimination — was refuted by the two confirming pairs. **Do not cite the
`a938`/`d302` pair on its own as before/after evidence.** Behaviour here is
probabilistic: the pre-fix skill usually opens the companion and occasionally
talks itself out of it.

Separating a hypothesised ~100% from ~67% at conventional power needs on the
order of 20-30 runs per arm — roughly 40-60M tokens and 5+ hours. Not purchased.

## Cost

8 runs, 12.29M tokens, ~55 min wall clock.

## Disposition

The change was kept on structural grounds, not on demonstrated efficacy:

- It removes a real and verified asymmetry (the Codex gate got a
  path-independence paragraph in `69a703a`; the companion did not).
- It targets a failure mode observed in the wild here, with the agent's own
  rationalization matching the Red Flags row added alongside it.
- It carries **no observed cost**: across all 6 round-2 runs the bounded
  classification held, no spec file appeared, and `writing-plans` never fired.
  The intervention did not inflate ceremony, which was the main risk.

The scenario is retained as a regression guard: it will catch the companion
being removed from the bounded path entirely, even though it cannot resolve a
probabilistic shift.
