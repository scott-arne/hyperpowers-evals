# 2026-10-02: writing-plans and a vendored kit no page uses, head and 6.12.0 on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `dead4f24c` before any session launched,
pilot included.

Both earlier campaigns
(`2026-10-02-plans-component-library-baseline.md`,
`2026-10-02-plans-component-library-612.md`) found every plan building the
Deploys page from the component library, at the release head c89a2b7 and at
6.12.0, so Harbor could not reproduce the field failure behind hyperpowers
BACKLOG item 2. Harbor gave four cues the field did not. The field's
library is one directory per component behind a path alias, the README does
not describe it, the pages use only its button and dialog, and specs name
an existing page to follow.

On a fixture with all four field cues, a session counts as using the kit
when its plan's fenced code calls both `dataTable(` and `selectField(`.
Per arm:
- 6 or fewer of 10: reproduces;
- 7 or 8 of 10: both arms extend once to n=20;
- 9 or 10 of 10: does not reproduce.

At n=20, 15 or fewer reproduces, 16 or 17 is weak, and 18 or more does not
reproduce. The arms are compared with a two-sided Fisher exact test,
separated below p 0.05. If neither arm reproduces, the four cues together
are not enough, and no skill change follows. If 3 or more of an arm's 10
sessions never load writing-plans or write no plan, no reading is taken for
that arm. Each session must load writing-plans from its arm's worktree,
with the Grounding instruction for the head and without it for 6.12.0.

**Config.**
- **Scenario.** `writing-plans-reuses-component-library-hard`, new at the
  harness pin. It is Harbor with the four field cues:
  - the kit is vendored as `vendor/kit/<name>/src/index.js` (utils plus 12
    components) and reached through the `#kit/*` imports map;
  - the README says nothing about it;
  - the five existing pages import only its button and dialog;
  - the spec says sorting and filtering behave as on the Services page,
    which hand-writes its table, select and pills.
- **Arms.** head: c89a2b7, worktree `.worktrees/plans-ui-baseline`. v612:
  hyperpowers v6.12.0, `871cee9b9f89ab734d47b46e252a45f839322c13`,
  worktree `.worktrees/plans-ui-612`. The arms differ by 312 commits, not
  by Grounding alone.
- **Harness.** This repository at `c56189c58`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Pilot.** 1 head session, 2026-10-03 00:03:30Z to 00:10:06Z.
- **Batch.** 4 rows of `--repeat 5`, 10 sessions per arm, 2 concurrent,
  2026-10-03 00:11:06Z to 01:01:51Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension. Both worktrees were unchanged at all five
  mutation checks.

**Run pointers.** `evidence/2026-10-02-plans-component-library-hard/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv` and `manifest-pilot.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs (head `p0`, `p1` and `p2`, v612 `p1` and
  `p2`), both `launch-all` outputs, the two window stamps and
  `mutation-checks.txt`;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the run archives under `runs/head/<run-id>/` (the pilot and 10) and
  `runs/v612/<run-id>/` (10).

**Verdict.** Neither reproduces; not separated. Every session in both arms
built the page's table and filter from the kit, 10 of 10 and 10 of 10
(two-sided Fisher p 1.0000). The composed final was 10 of 10 in each arm.
writing-plans was invoked through the Skill tool in every session, and
every session passed the arm check. The pilot passed its instrument check
and also used the kit. The four field cues together do not reproduce the
failure, with or without Grounding. No skill change comes from this
campaign.
- **The listing gave the kit away.** In every session, call 2's
  `git ls-files` printed all 52 tracked files, 26 of them under
  `vendor/kit/`, and call 4 `cat` every kit file in one loop. The cues hid
  the kit from the README and the pages, not from the listing. Of the
  candidates the pre-registered consequence leaves, this points at the
  template's size. The field app at its current head tracks 863 files,
  253 of them in its `ui/` library. That is an observation, not a tested
  cause.
- **Grounding cited Services and took nothing from its markup.** Every
  head plan has a Grounding section citing the kit and `services.js`, and
  a page-module `**Mirror:**` line on the top of `services.js`: the header
  comment, constants and query parsing. No v612 plan has either. The
  Mirror line did not pull the head toward the Services markup, which was
  the reason the comparison was two-sided.
- **The plans name the split.** 19 of 20 tell the implementer, naming the
  Services page, not to copy its markup, and the 20th builds from the kit
  "rather than hand-written HTML". Most reason from the spec: match the
  page's behavior, which the kit already implements. Three say the page
  predates the kit, against 10 of 10 in the 612 campaign, whose README
  said so.
- **No questions, no execution.** No session asked the operator anything,
  none began implementing, and no source file changed. The two `<select`
  lines outside assertions are a test regex and a code comment describing
  the kit select's output.
- **Not pre-registered.** Every session dry-ran its plan code in a scratch
  copy, and nine counted sessions and the pilot wrote fixed paths in the
  host's `/tmp` for it. None read stale content, and only
  `/tmp/newtests.js` was left. Every session logged the skipped Codex
  plan-review gate to the ungated ledger.

**Limits.**
- **Still easier than the field.** Harbor is still small. It has plain
  functions, not Angular components, one fresh session per plan, and a
  short spec written for the fixture. The size difference is what the
  hand-read points at, and it is untested.
- **Both arms at the ceiling.** This says nothing about Grounding either
  way.
- **Stacked cues.** Nothing reproduced, so the design says nothing about
  any single cue.
- **The whole version differs.** The null result covers all 312 commits
  together.
- **Plans only.** Whether implementers and reviewers keep a plan's kit use
  is not tested.
- **Power.** 10 of 10 excludes kit-use rates below 74% per arm (one-sided
  95%). At a rate of 0.8, 10 of 10 would still occur with probability
  0.11. A not-separated comparison is not evidence that the versions behave
  alike.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
