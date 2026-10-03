# Baseline (no skill), 2026-10-03

Subagents: general-purpose, fresh context, default model. Each wrote its message to a file with the Write tool.

## s1-report (5 reps): report to the human partner after an investigation

Tells found by hand:

- Figurative "gate" for the CI step the notes called "a step that blocks deploy": r2, r3, r4 (3/5).
  - r2: "The CI schema-snapshot gate passed on every failing night."
  - r3: "The CI schema-snapshot gate passed on every failing night; it is not a factor."
  - r4: "The CI schema-snapshot gate passed on every failing night, so this is not schema drift."
- "blast radius": r3 (1/5): "If you would rather take (b) to limit blast radius, I can have that up faster"
- Narrating the layout of the message: r3 "summary first, details after."; r4 "Summary first, then the options and what I need from you." (2/5)
- "surfaced" as a verb for "became visible": r1, r4 (2/5)
- Closing offer or decision ask: r1 "Tell me if you want me to go ahead."; r2 "Want me to open the PR for (a) and start the importer check?"; r5 "Want me to go ahead?" (3/5). All three name a real decision, so they are not chatbot residue.
- "papers over it": r4.
- No em dashes, bold, markdown headers, or "load-bearing", "footgun", "yak shaving", "spine", "seams", "belt-and-suspenders" in any rep.
- Length 351 to 445 words; every rep restated nearly every note.

## s2-reply (5 reps): chat answer to "retry and ship Friday, or fix properly?"

- Negative parallelism, 4/5 reps:
  - r1: "`reserve()` isn't the flaky part; `sync.py` is calling it before the row exists." (corrects the partner's own words "flaky call"; the one legitimate case)
  - r2: "That's still not an argument for the retry, just for not letting the proper fix drift past next release."
  - r3: "The question isn't retry vs. proper fix for Friday; it's whether billing needs to change this week at all, and it doesn't." and "it doesn't buy safety, since reconciliation already contains the damage; it buys fewer flags" and "not as \"the fix\" and not bundled into Friday."
  - r5: "A few more days of that is fine. What isn't fine is a compressed soak"
- One-line closers that restate, 3/5:
  - r3: "That's the fact that decides it."
  - r4: "That asymmetry decides it."
  - r5: "That's a better outcome than cutting the soak."
- "So:" as a paragraph opener before the recommendation: r1, r2, r4.
- No jargon from the list, no dashes, no bold, no headers.
- Length 263 to 343 words.

## s3-design-review (5 reps): "poke holes in this before I send it to the team"

- Bold label opening every paragraph or list item, 5/5 (5 to 9 bold spans per reply):
  - r1: "**4 is the one that worries me.**", "**The contract is missing.**", "**One meta question:**"
  - r3: "**1. The stateless assumption is load-bearing and one-third verified.**" through "**8. Double validation: drift more than cost.**"
  - r4: "**5. `options: dict` ignoring unknown keys is a time bomb.**"
- "load-bearing", 2/5: r3 "The stateless assumption is load-bearing and one-third verified."; r5 "is the load-bearing assumption for the whole migration". r2 and r4 said the same thing without the word ("carries the whole proposal", "That assumption carries the whole plan").
- Figurative "gate": r2 "differential test as the merge gate"; r3 "it gates everything else" (2/5).
- "X, not Y" contrasts, 5/5:
  - r2: "that split is a behavior change, not a move."; "these are nine internal formats, not a third-party ecosystem."
  - r3: "Fail loudly, not last-one-wins."; "Not a reason to skip the refactor, but..."
  - r4: "'Two weeks' is a calendar, not an exit criterion."; "the import-isolation question is a blocker, not an open question"
  - r5: "Two weeks is a calendar, not evidence."; "That contract is the design; the directory layout is a detail."
  - r1: "That is the actual API"
- Sayings with "the real" or "the actual": r1 "The real safety net is differential"; r2 "it's the actual safety net"; r3 "The real worry is two validators"
- Closers: r4 "Last-wins is a silent regression waiting six months."; r5 "that's the sentence that makes the rest credible."; r2 "the case makes itself."
- Other metaphors: r1 "a lot of surface", "backstop"; r2 "the kicker", "will not survive review"; r4 "time bomb"; r5 "the kind of thing that bites a year from now".
- Length 603 to 926 words. No dashes.

## Totals across 15 control runs

| Tell | Runs with at least one |
|---|---|
| Figurative jargon from the list other than load-bearing (gate x5, blast radius x1) | 5/15 |
| "load-bearing" | 2/15 (both in s3) |
| Not X but Y, any form | 9/15 (0/5 s1, 4/5 s2, 5/5 s3) |
| Bold labels | 5/15 (all s3) |
| One-line closer that restates | 6/15 |
| Narrating the message's layout | 2/15 |
| Em or en dashes | 0/15 |
| Markdown headings | 0/15 |
| footgun, yak shaving, spine, seams, belt-and-suspenders | 0/15 |

# Trigger baseline (no cross-references), 2026-10-03

Live `claude -p` sessions, worktree loaded with `--plugin-dir`, empty `CLAUDE_CONFIG_DIR`, model claude-opus-5-5, `--dangerously-skip-permissions`, five per scenario. Runs under `trigger/runs/control/`.

| Scenario | Process skill invoked | communication invoked | Human-facing output observed |
|---|---|---|---|
| brainstorm (2 turns) | brainstorming 5/5 | 0/5 | turn 2 design presentation, 385 to 454 words, bold section labels in 5/5 ("**Tag rule**", "**What counts as a tag**", "**How tags are read**") |
| plan | writing-plans 5/5, then SDD and using-git-worktrees | 0/5 | plan written, Codex gate ran for real, session ended on the worktree-consent question (113 to 369 words) |
| debug | systematic-debugging 5/5 | 0/5 | report of 234 to 277 words; fixture test data passes by coincidence, so each reported "could not reproduce" and then the real bug; bold labels in 5/5 ("**Root cause:**", "**The bug:**", "**Test run**") |
| trivial ("What does the add command do?") | none | 0/5 | 112 to 195 words with bold-labelled bullets in 4/5 |
| oneliner ("Which branch is this repo on?") | none | 0/5 | 5 to 35 words |

Fixture note: `docs/spec-tags.md` was present for every scenario, so the brainstorm sessions read it and classified the work as bounded; the design presentation still happened in turn 2.

# Trigger treatment (one REQUIRED SUB-SKILL line per skill, plus a Skill Priority bullet in using-hyperpowers), 2026-10-03

Same launcher and model. Runs under `trigger/runs/treatment/`.

| Scenario | communication invoked | Where in the call sequence | Bold spans in the human-facing final (control for comparison) |
|---|---|---|---|
| brainstorm | 5/5 | turn 1, after brainstorming and before or during the repo read; the design presentation is turn 2 | turn 2: 4, 0, 4, 5, 0 (control 5, 6, 5, 5, 5) |
| plan | 5/5 | after writing-plans, before the plan file is written in 4/5 | plan file not scored |
| debug | 4/5 | last call before the report | 0, 0, 4 (the miss), 0, 0 (control 3, 3, 4, 2, 5) |
| trivial | 0/5 | never | 4, 3, 3, 4, 0 (control 6, 0, 0, 3, 4) |
| oneliner | 0/5 | never | 5 to 35 words, no bold |

Reading: the REQUIRED SUB-SKILL lines bind (14/15 across the three process-skill scenarios). The Skill Priority bullet in using-hyperpowers did not bind for a reply outside any process skill (trivial 0/5), and it did not over-trigger (oneliner 0/5). Where communication was invoked right before the report (debug), the bold labels vanished; where it was invoked a turn before the presentation (brainstorm), the effect is partial (2/5 clean against 0/5).
