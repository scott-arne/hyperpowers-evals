# 2026-10-01: the bounded visual-companion scenario at the shipping head on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `6f9b342` before any session launched.

In predict-before-structure, three brainstorms (2026-09-29 to 2026-10-01) ran `claude-opus-5-5` under Claude Code 2.1.283 and 2.1.284. They loaded the brainstorming skill from the hyperpowers `external-workflow-adoption` branch. Between them they asked six visual questions, and every one went to `AskUserQuestion`. None started the visual companion. The only earlier measurement of `brainstorming-bounded-fires-visual-companion` (`2026-08-20-visual-companion-path-scoping.md`, round 2) found the companion started in 3 of 3 sessions on `claude-opus-5`. That was before Deciding Together entered the skill.

The question: does this scenario reproduce the field failure at the shipping head, on the field's model and Claude Code version? A session counts as started when its deterministic post-check `tool-arg-match Bash --matches 'command=start-server[.]sh'` passes. The count is read against the best a fix could do, 10 of 10, by one-sided Fisher exact p:
- 6 or fewer reproduces;
- 7 extends once to n=20;
- 8 or more does not reproduce.

If the scenario reproduces the failure, a fix is written and measured on it. If not, no skill change follows, and the next step is a scenario built on field conditions.

**Config.**
- **Arm.** Hyperpowers `external-workflow-adoption` at `4fe932ed9e71c1bd300b3f20f125eff018c03ce6`, detached worktree `.worktrees/companion-baseline`, arm label `control`. Its brainstorming skill is the one all three field brainstorms loaded, and its bootstrap matches the third (no ladder).
- **Harness.** This repository at `7eeb1e5`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code 2.1.284, default listing budget. The Gauntlet-Agent judged on `claude-opus-5-5`.
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-01 07:50:50Z to 08:07:58Z.
- **Clean run.** No grader voids, no setup voids, no indeterminates, no extension.

**Run pointers.** `evidence/2026-10-01-companion-baseline/`, containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p1` and `p2`, `launch-all.out` and the window stamp;
- `tally.py` and `tally.txt`;
- the 10 run archives under `runs/control/<run-id>/`.

**Verdict.** The scenario does not reproduce the field failure. The shipping head started the companion in 10 of 10 sessions (p = 1.000 against a perfect fix). The composed final was 10 of 10, and `brainstorming` was invoked through the Skill tool in 10 of 10.

This is a negative result for the scenario as a test of the field failure. It is not evidence that the skill is sound under field conditions. No skill change follows.

The transcripts show one route in all ten. Each session:
- invoked the skill;
- read the fixture and `visual-companion.md`;
- started the server in the first turn, before asking anything;
- put three layout sketches on screen and asked which one in chat;
- implemented the answer.

No session called `AskUserQuestion`, and none sent a Deciding Together comparison. No session announced a path, although the skill says to.

**Why the scenario and the field differ.** In this scenario the layout question is the opening brief. In the field, each visual question came several questions into an architectural brainstorm in an existing application, after other choices had already gone through `AskUserQuestion`. A scenario that reproduces that order is the next step.

**A harness observation.** Every transcript records three host `CLAUDE.md` files in context:
- the human partner's private `~/.claude/CLAUDE.md`;
- the hyperpowers repository's file;
- this repository's file.

The run directory sits under the evals clone, inside the human partner's home. The same holds for every archived transcript under `evidence/` from `2026-09-17-first-edit-interlock` (Claude Code 2.1.276) onward. `docs/eval-harness-portfolio.md` says the private file does not leak. That is no longer true for these runs. The field sessions also had the global file, and none of the three mentions the companion, so the reading here does not rest on it.

**Limits.**
- **Scope.** One model, one Claude Code version, one scenario.
- **Ceiling.** At 10 of 10 the scenario has no room for a fix to show an effect. It cannot be the failing test for this failure.
- **What it does not test.** Whether the companion opens when the visual question arrives late, inside an architectural brainstorm, after `AskUserQuestion` has become the session's habit.
- **Earlier transcripts.** Campaigns on 2.1.261 recorded no `CLAUDE.md` in their transcripts, so whether they loaded host files cannot be read from them.
