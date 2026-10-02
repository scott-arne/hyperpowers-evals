# Hand-Read of the Control Sessions

Every counted session built the page's table and filter from the library, so
the README's classification of sessions that did not use it, (a) copied the
Services page, (b) used some library parts, (c) other, has no sessions. What
remains is the record every session keeps: what its Grounding section and
`**Mirror:**` lines cite, what it read, whether it asked the operator about
the library or the Services page, and whether it began executing. The plan
was read from `coding-agent-workdir/docs/hyperpowers/plans/`, and the rest
from the main session transcript.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`writing-plans-reuses-component-library-claude-auto-20261002T`.

## Summary

| Run | Read `src/ui`, `services.js`, README | Grounding cites `services.js` for | Page-module Mirror | Plan rules out copying `services.js` | Asked the operator | Began executing | `<table`/`<select` in fenced code |
|---|---|---|---|---|---|---|---|
| 205817Z-3ad0 | yes, yes, yes | query parsing, "the **only** part of `services.js` to imitate" | `overview.js:1-24` | yes | no | no | `<table`, test assertion |
| 210442Z-69f6 | yes, yes, yes | naming (`:5`), query fallback (`:3-7`) | `overview.js:1-23` | yes | no | no | both, test assertions |
| 210934Z-1238 | yes, yes, yes | query parsing, "imitate only the parsing" | `overview.js:1-24` | yes | no | no | both, test assertions |
| 211412Z-0396 | yes, yes, yes | "**Do not mirror** `src/pages/services.js`", query idiom only | `overview.js:1-24` | yes | no | no | `<table`, test assertion |
| 211905Z-1f6c | yes, yes, yes | module shape and query normalization, "Copy **only** this part" | `overview.js:1-24` | yes | no | no | `<table`, test assertion |
| 205817Z-3ce4 | yes, yes, yes | query parsing, "Imitate only this part of the file; its markup is pre-library" | `overview.js:1-24` | yes | no | no | both, test assertions |
| 210324Z-f2c9 | yes, yes, yes | query parsing, "imitate only this part of that file" | `overview.js:1-24` | yes | no | no | both, test assertions |
| 210831Z-5f2b | yes, yes, yes | query parsing, "Imitate *only* these lines" | `overview.js:1-24` | yes | no | no | `<table`, test assertion |
| 211319Z-b870 | yes, yes, yes | query fallback, "Mirror only this" | `overview.js:1-24` | yes | no | no | both, test assertions |
| 211806Z-f76d | yes, yes, yes | module shape, "shape only, not its markup" | `overview.js:1-23` | yes | no | no | both, test assertions |

Totals:
- **Class:** none. All 10 used the library.
- **Read:** 10 of 10 read every `src/ui/` file, `services.js` and the README
  before writing. In each session, the second Bash call was one loop that
  `cat`s `README.md`, `src/pages/*.js` and `src/ui/*.js`. `tally.py` reports
  `services.js` read in 7 of 10 because it does not expand the
  `src/pages/*.js` glob. The by-hand count is 10 of 10.
- **Grounding:** all 10 plans have a Grounding section. All 10 cite
  `src/pages/overview.js` as the page built from the library and cite
  `src/ui/` files for each control (`table.js`, `filter-bar.js`, `select.js`,
  `chip.js`, `empty-state.js`). All 10 also cite `services.js`, for the
  allow-list query parsing, the `render<Page>` naming, or the header comment.
  Nine of the ten limit that citation in the Grounding line itself (quoted in
  the table). `69f6` limits it in its constraints and its Mirror line ("Take
  only the naming and query-fallback idiom from `src/pages/services.js:3-7`,
  not its markup"). Nine cite `test/pages/services.test.js` for the
  page-test shape; `5f2b` cites `test/pages/overview.test.js`.
- **Mirror:** every plan's page-module Mirror is `src/pages/overview.js`.
  Five also mirror `services.js`, each scoped to the query idiom or the header
  comment (`3ad0`, `69f6`, `1f6c`, `5f2b`, `b870`). `f76d` mirrors
  `test/ui/table.test.js` and `test/ui/select.test.js` for its assertions.
- **Rules out copying `services.js`:** 10 of 10, in the Architecture line
  or the global constraints. For example: "`src/pages/services.js` predates
  the template and hand-rolls its table, `<select>`, pills and `escapeHtml`;
  do not copy it and do not refactor it (out of scope)" (`3ad0`), and "It is
  built entirely from the vendored component library in `src/ui/` ... the way
  `src/pages/overview.js` does, **not** by hand-rolling HTML the way the older
  `src/pages/services.js` does" (`b870`).
- **Asked the operator:** none. Each session had one operator turn, the
  brief, and called `AskUserQuestion` 0 times. The operator's "your call"
  answer was never needed.
- **Began executing:** none. Each final message says it has not started
  implementing, and no session changed `src`, `test`, `data` or `public`.
- **Raw markup:** every `<table` and `<select` line in fenced plan code is a
  test assertion, none is page code. The 10 `<table` lines are
  `assert.doesNotMatch(html, /<table/)` in the empty-state test. The 6
  `<select` lines assert the library's own output, e.g.
  `assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/)`;
  in `69f6` it is one regex inside a multi-line `assert.match`. The pilot's
  two hits are the same two assertions.

## What Led Each Session to the Library

No session names a cue. Each read the README, every `src/ui/` file and both
pages in the same call, before any text about the design. So the README,
the Overview page and the file listing cannot be told apart in this sample.
- Two sessions said which they noticed first, right after `git ls-files`,
  whose output lists the `src/ui/*.js` files. The pilot `205233Z-d29f`: "There's a UI component library. Let me read everything." `210324Z-f2c9`: "There's a component library in src/ui. Let me read everything."
- No plan cites the README's Layout section, the line that names `src/ui/` as
  the template's component library. Four plans cite the README only for "No
  dependencies; Node 20 or later" (`3ad0`, `69f6`, `0396`, `f76d`).
- The reason the plans give is the split between the two pages: Overview is
  built from the library, and Services predates it. All 10 say so.

## Not Pre-Registered

- **Every session dry-ran its plan code.** All 10 counted sessions, and the
  pilot, copied the fixture to a scratch directory, wrote the plan's code
  there and ran the tests before handing the plan over. Four used
  `/tmp/harbor-*` directories (`3ad0`, `0396`, `1f6c`, `5f2b`), and `1238`
  wrote extracted blocks to `/tmp/blk*.js`. The rest used `mktemp -d`. After
  the batch, no `harbor-*` or `blk*` entry remained in `/tmp`.
- **Grounding cited the hand-written page in every session, and each time
  the plan said which part of it to imitate.** The README's Question raised
  the risk that Grounding reinforces copying, because the nearest real
  example is the hand-written page. Here it cited that page every time
  without copying its markup. With no arm on a writing-plans that lacks
  Grounding, this campaign cannot say whether Grounding caused that.
- **The Codex gate did not run.** codex-plugin-cc is absent in the run's
  home. The final messages that report the gate say `not-installed`, except
  `1238`, which says `preflight-error` (the preflight script is not on a
  resolvable plugin path, exit 127) and could not record the ungated event.
  This does not touch the measure.
