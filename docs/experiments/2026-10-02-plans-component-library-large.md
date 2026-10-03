# 2026-10-02: writing-plans and a vendored kit in a 917-file repository, head and 6.12.0 on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `a6d5aafcd` before any session launched,
pilot included.

The hard campaign (`2026-10-02-plans-component-library-hard.md`) gave
Harbor all four field cues behind hyperpowers BACKLOG item 2, and the
release head c89a2b7 and 6.12.0 both built the Deploys page from the kit in
10 of 10 sessions. Its hand-read found the listing gave the kit away: call
2's `git ls-files` printed all 52 tracked files, 26 of them under
`vendor/kit/`. The field app tracks 863 files, 253 of them in its `ui/`
library. At that size a full listing passes 30,000 characters, and Claude
Code moves it to a file and shows the session the first 2KB.

On a fixture with the four cues at the field's size, a session counts as
using the kit when its plan's fenced code calls both `dataTable(` and
`selectField(`. Per arm:
- 6 or fewer of 10: reproduces;
- 7 or 8 of 10: both arms extend once to n=20;
- 9 or 10 of 10: does not reproduce.

At n=20, 15 or fewer reproduces, 16 or 17 is weak, and 18 or more does not
reproduce. The arms are compared with a two-sided Fisher exact test,
separated below p 0.05. If neither arm reproduces, the four cues at the
field's size are not enough, no skill change follows, and the human partner
decides whether the plan-writing half of item 2 closes. If 3 or more of an
arm's 10 sessions never load writing-plans or write no plan, no reading is
taken for that arm. Each session must load writing-plans from its arm's
worktree, with the Grounding instruction for the head and without it for
6.12.0.

**Config.**
- **Scenario.** `writing-plans-reuses-component-library-large`, new at the
  harness pin. It is the hard fixture grown to 917 tracked files, with the
  same cues, spec, brief and operator answers:
  - the kit is vendored as `vendor/kit/<name>/src/` (utils plus 46
    components, 248 files) and reached through the `#kit/*` imports map;
    the table and select are the hard fixture's;
  - thirty pages, of which eleven import `#kit/button`, five of those also
    `#kit/dialog`, and nineteen nothing from the kit; no page uses any
    other kit component, and each hand-writes its tables, selects and
    pills;
  - the README says nothing about the kit, and the spec says sorting and
    filtering behave as on the Services page;
  - `git ls-files` prints 33,620 bytes, and a pre-check fails the run below
    30,000.
- **Arms.** head: c89a2b7, worktree `.worktrees/plans-ui-baseline`. v612:
  hyperpowers v6.12.0, `871cee9b9f89ab734d47b46e252a45f839322c13`,
  worktree `.worktrees/plans-ui-612`. The arms differ by 312 commits, not
  by Grounding alone.
- **Harness.** This repository at `b6d884220`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Pilot.** 1 head session, 2026-10-03 05:15:07Z to 05:21:36Z.
- **Batch.** 4 rows of `--repeat 5`, 10 sessions per arm, 2 concurrent,
  2026-10-03 05:26:08Z to 06:27:34Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension. Both worktrees were unchanged at all five
  mutation checks.

**Run pointers.** `evidence/2026-10-02-plans-component-library-large/`,
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
(two-sided Fisher p 1.0000). The composed final was 9 of 10 for the head and
10 of 10 for v612. writing-plans was invoked through the Skill tool in every
session, and every session passed the arm check. The pilot passed its
instrument check and also used the kit. The four field cues at the field's
size do not reproduce the failure, with or without Grounding. No skill
change comes from this campaign.
- **The size hid the kit from one call, not from the session.** 16 of 20
  sessions and the pilot opened with a full `git ls-files` in the same
  command as a `cat` of the spec. Eleven of those results and the pilot's
  were moved to a file, and the 2KB preview was the opening of the spec, so
  the `pipeline/` cut-off the pre-registration predicted never showed. No
  session read a moved file to find the kit. The other five, all v612, had
  a later command fail in the same call. Claude Code does not move a failed
  command's output to a file; it shows about the first and last 5,000
  characters of the first 30,000, and the visible tail was 105 lines of kit
  files. Every session then ran a listing short enough to show in full,
  such as `git ls-files` with `pipeline/` filtered out, and every session
  had named `vendor/kit` by call 4 and read the kit's table and select
  before writing.
- **Grounding cited Services and took nothing from its markup.** As in the
  hard campaign, every head plan has a Grounding section citing the kit and
  `services.js`, and a page-module `**Mirror:**` line on the top of
  `services.js`, not its markup; four of those lines say not to take the
  markup. No v612 plan has either.
- **The plans name the split.** 16 of 20 tell the implementer, naming the
  Services page, not to copy its markup, 8 in each arm, against 19 of 20 in
  the hard campaign. The other four say not to hand-write that markup
  without naming the page. Four call the page older or say it predates the
  kit.
- **One composed final failed.** `0ff2` (head) built the page in its real
  workdir before writing the plan, ran the suite (389 of 389), and reverted
  every change. The grader failed criterion 4, which forbids changing source
  or test files. The tree ended clean, so the session counts as using the
  kit, and it did not begin executing after the plan.
- **No questions, no execution after the plan.** No session asked the
  operator anything. No plan writes its own table or select.
- **Not pre-registered.** Every session ran its plan code before handing
  the plan over, three of them before writing it. Nine sessions wrote fixed
  paths in the host's `/tmp`; three left files there (`/tmp/dp`,
  `/tmp/out.txt`, `/tmp/deploys-check.mjs`). Every session logged the
  skipped Codex plan-review gate to the ungated ledger. In `806c` the
  operator declined an `rm -rf` of the session's own `mktemp` directory.

**Limits.**
- **Still easier than the field in three ways.** Size is now matched and
  did not reproduce the failure. The fixture still has plain functions, not
  Angular components; one fresh session per plan, not a long session that
  has planned earlier pages; and a short spec written for the fixture, not
  a brainstormed one describing the page to copy in detail. These are the
  candidates the pre-registration leaves, and none is tested.
- **The instrument did not work as designed.** Sessions combined the
  listing with the spec, so what they saw of a full listing was the spec's
  opening, or a cut-short tail ending in the kit, never the predicted
  `pipeline/` cut-off. The reading does not rest on it: whatever call 2
  showed, every session ran a narrower listing and had named `vendor/kit`
  by call 4.
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
