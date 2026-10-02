# 2026-10-02: writing-plans and an existing component library, baseline on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `429a253` before any session launched,
pilot included.

hyperpowers BACKLOG item 2 is a field report: plans for a dashboard started
from an admin template built pages with their own markup instead of the
template's existing UI elements. Reading those sessions suggested that the
plan writer never looked for a component library and copied the existing
page it had read. That work ran on 6.12.0. The release head (6.15.0,
unreleased) adds a Grounding section to the writing-plans template. Grounding
could send the writer to the library. It could also reinforce copying,
because the nearest real example is a hand-written page.

On a repository whose component library already has every control a new
page needs, and whose most similar page was written by hand, a session
counts as using the library when its plan's fenced code calls both
`dataTable(` and `selectField(`:
- 6 or fewer of 10: reproduces, and a "UI components used" slot in the
  writing-plans template is drafted for its own campaign;
- 7 or 8 of 10: extends once to n=20 (15 or fewer reproduces, 16 or 17 is
  weak, 18 or more does not reproduce);
- 9 or 10 of 10: does not reproduce, and no skill change follows.

If 3 or more of 10 sessions never load writing-plans or write no plan, no
reading is taken.

**Config.**
- **Scenario.** `writing-plans-reuses-component-library`, new. Harbor, a
  small server-rendered Node dashboard. Its first commit vendors an admin
  template's component library in `src/ui/`, and its README names that
  directory as the library. The Overview page uses three library
  components. The Services page, the one most like the new page, was written
  by hand: its own `<table>`, `<select onchange>`, pill classes and
  `escapeHtml`. The spec for a Deploys page is already written and never
  mentions the library. The brief asks for the plan only, and the operator
  gives no cue about how to build the page.
- **Arm.** Control only, hyperpowers
  `c89a2b7a8e8cbbbd41a9ff1ee064a37ee065e3c4` (head of
  `external-workflow-adoption`, worktree `.worktrees/plans-ui-baseline`).
  The reading is absolute.
- **Harness.** This repository at `2dbae1f`, the commit that adds the
  scenario.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Pilot.** 1 session, 2026-10-02 20:52:32Z to 20:57:25Z.
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-02
  20:58:16Z to 21:24:07Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension.

**Run pointers.** `evidence/2026-10-02-plans-component-library-baseline/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv` and `manifest-pilot.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p0`, `p1` and `p2`, both `launch-all` outputs,
  the two window stamps and `mutation-checks.txt`;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the run archives under `runs/control/<run-id>/` (the pilot and 10).

**Verdict.** Does not reproduce. Every counted session built the page's
table and filter from the library, 10 of 10, which excludes library-use
rates below 74% (one-sided 95%). The composed final was 10 of 10, and
writing-plans was invoked through the Skill tool in 10 of 10. The pilot
passed its instrument check and also used the library. No skill change
comes from this campaign.
- **Grounding cited the hand-written page and limited it.** All 10
  Grounding sections cite `services.js`, each time only for its query
  parsing, naming or header comment. All 10 cite `overview.js` and the
  `src/ui/` files for the page itself, and every page-module Mirror is
  `overview.js`.
- **The plans name the split.** All 10 tell the implementer not to copy
  `services.js` because it predates the library.
- **No cue is named.** Every session read the README, every library file
  and both pages in one call before writing, so what led it to the library
  cannot be told apart. No plan cites the README's line naming the library.
- **No questions, no execution.** No session asked the operator anything,
  none began implementing, and no source file changed. The plan code's
  `<table` and `<select` lines are all test assertions.
- **Not pre-registered.** Every session dry-ran its plan code in a scratch
  copy and ran the tests before handing the plan over.

**Limits.**
- **The fixture is easier than the field.** Harbor fits in one read, its
  file listing shows `src/ui/`, and one page already uses the library. A
  larger repository, where the library is not in the first read, is not
  tested.
- **Only the release head ran.** The field failure was on 6.12.0, which has
  no Grounding section. With no 6.12.0 arm, this cannot tell "Grounding
  fixed it" from "the fixture is too easy".
- **Plain functions, plans only.** Angular components are not tested, and
  neither is whether implementers and reviewers keep a plan's library use.
- **Power.** At a library-use rate of 0.8, 10 of 10 would still occur with
  probability 0.11.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
