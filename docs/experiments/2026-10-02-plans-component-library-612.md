# 2026-10-02: writing-plans and an existing component library, the 6.12.0 arm on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `3691919` before any session launched,
pilot included.

The baseline (`2026-10-02-plans-component-library-baseline.md`) found every
plan written at the release head c89a2b7 building the Deploys page from the
component library, 10 of 10. That cannot tell "Grounding fixed it" from "the
fixture is too easy". The field sessions behind hyperpowers BACKLOG item 2
loaded writing-plans from 6.2.1, 6.6.1, 6.9.2 and 6.12.0, none of which has a
Grounding section.

On the same scenario at the same pins, with a session counting as using the
library when its plan's fenced code calls both `dataTable(` and
`selectField(`, a 6.12.0 count against the head's 10 of 10:
- 6 or fewer of 10: separated, and the version matters on this fixture;
- 7 or 8 of 10: extends once to n=20 per arm, with 10 new head sessions run
  alongside;
- 9 or 10 of 10: not separated. 6.12.0 also builds the page from the
  library, so the fixture cannot reproduce the field failure and the
  baseline's 10 of 10 says nothing about Grounding. No skill change follows.

If 3 or more of 10 6.12.0 sessions never load writing-plans or write no
plan, no reading is taken. Each session must load writing-plans from its
arm's worktree, without the Grounding instruction for 6.12.0 and with it for
the head.

**Config.**
- **Scenario.** `writing-plans-reuses-component-library`, unchanged from the
  baseline at the same harness pin.
- **Arms.** v612: hyperpowers v6.12.0,
  `871cee9b9f89ab734d47b46e252a45f839322c13`, worktree
  `.worktrees/plans-ui-612`, the installed plugin version. head: c89a2b7,
  worktree `.worktrees/plans-ui-baseline`, counted from the baseline's 10
  sessions and archives. The arms differ by 312 commits, not by Grounding
  alone.
- **Harness.** This repository at `2dbae1f`, the baseline's pin.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Pilot.** 1 v612 session, 2026-10-02 22:10:24Z to 22:14:49Z.
- **Batch.** 2 rows of `--repeat 5`, 10 v612 sessions, 2 concurrent,
  2026-10-02 22:15:19Z to 22:40:45Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension. The v612 worktree was unchanged at all five
  mutation checks.

**Run pointers.** `evidence/2026-10-02-plans-component-library-612/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv` and `manifest-pilot.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p0`, `p1` and `p2`, both `launch-all` outputs,
  the two window stamps and `mutation-checks.txt`;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the run archives under `runs/v612/<run-id>/` (the pilot and 10).

**Verdict.** Not separated. Every 6.12.0 session built the page's table and
filter from the library, 10 of 10, the same as the head's 10 of 10
(one-sided Fisher p 1.0). The composed final was 10 of 10, writing-plans was
invoked through the Skill tool in 10 of 10, and every session passed the
arm check. The pilot passed its instrument check and also used the library.
The fixture is too easy to test whether Grounding helps, and the field
failure stays unexplained. No skill change comes from this campaign.
- **No Grounding, same outcome.** No 6.12.0 plan has a Grounding section, a
  `**Mirror:**` line or a `file:line` citation of a page or library file.
  Each lists the library components under Task 1's `Consumes:` slot, which
  both versions' templates have and the head's plans fill the same way.
- **The model page is named less often.** Three of 10 6.12.0 plans name
  `overview.js` as the page the new one follows. Every head plan's
  page-module Mirror is `overview.js`, 10 of 10. This is the version
  difference in the plan text; it did not change the count.
- **The plans still name the split.** All 10 tell the implementer not to
  copy `services.js` because it predates the library, as all 10 head plans
  do.
- **Same reading pattern.** Every session read the README, every library
  file and both pages in one call before writing. No session names a cue,
  and no plan cites the README.
- **No questions, no execution.** No session asked the operator anything,
  none began implementing, and no source file changed. The plan code's
  `<table` and `<select` lines are all test assertions.
- **Not pre-registered.** Every session dry-ran its plan code in a scratch
  copy and ran the tests before handing the plan over. Every session found
  codex-plugin-cc not installed at 6.12.0's plan-review gate.

**Limits.**
- **The fixture is easier than the field.** Harbor fits in one read, its
  README names the library, and one page already uses it. The field's
  Angular template is larger, with its library spread across modules. Both
  versions are at the ceiling here, so this says nothing about Grounding
  either way.
- **The whole version differs.** A separation would have pointed at the
  version, not at Grounding. The null result likewise covers all 312
  commits together.
- **One field version.** The field also ran 6.2.1, 6.6.1 and 6.9.2, and
  from 2026-09-29 a branch with Grounding (see Correction). Only 6.12.0
  ran here.
- **Different windows.** The head's sessions ran in the baseline's window,
  starting about 75 minutes earlier, at the same pins.
- **Plain functions, plans only.** Angular components are not tested, and
  neither is whether implementers and reviewers keep a plan's library use.
- **Power.** 10 of 10 excludes 6.12.0 library-use rates below 74%
  (one-sided 95%). At a rate of 0.8, 10 of 10 would still occur with
  probability 0.11.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

**Correction (2026-10-02).** The Hypothesis says the field sessions loaded
writing-plans only from 6.2.1, 6.6.1, 6.9.2 and 6.12.0. From
2026-09-29T07:39Z the predict-before-structure session loaded hyperpowers
from the `external-workflow-adoption` worktree, whose writing-plans has
Grounding and the Mirror line. Its 2026-09-29 predictions-browse plan
still hand-rolls a sort toggle mirrored from an existing page and never
names the library's toggle group. The verdict stands; "Grounding fixed it"
does not hold as a field explanation. Details in the evidence README's
Correction section.
