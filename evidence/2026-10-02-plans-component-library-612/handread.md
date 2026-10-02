# Hand-Read of the 6.12.0 Sessions

Every counted v612 session built the page's table and filter from the
library, so the README's classes for sessions that did not use it, (a)
copied the Services page, (b) used some library parts, (c) other, have no
sessions. What remains is the record every v612 session keeps: whether its
plan has Grounding or `**Mirror:**` content anyway, what it read, whether it
asked the operator about the library or the Services page, and whether it
began executing. The plan was read from
`coding-agent-workdir/docs/hyperpowers/plans/`, and the rest from the main
session transcript. There was no extension, so no head session is read here;
the head's ten are in `../2026-10-02-plans-component-library-baseline/handread.md`.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`writing-plans-reuses-component-library-claude-auto-20261002T`.

## Summary

| Run | Read `src/ui`, `services.js`, README | Grounding or Mirror | Names `overview.js` as the page to follow | Plan rules out copying `services.js` | Asked the operator | Began executing | `<table`/`<select` in fenced code |
|---|---|---|---|---|---|---|---|
| 221520Z-6c13 | yes, yes, yes | none | yes, Architecture line | yes | no | no | both, test assertions |
| 222057Z-1501 | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 222605Z-26ef | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 223144Z-5bf3 | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 223633Z-ebb9 | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 221520Z-dbad | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 222041Z-e89d | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 222539Z-ee38 | yes, yes, yes | none | yes, Architecture line | yes | no | no | both, test assertions |
| 223043Z-d61e | yes, yes, yes | none | no | yes | no | no | both, test assertions |
| 223531Z-753e | yes, yes, yes | none | yes, implementer note | yes | no | no | both, test assertions |

Totals:
- **Class:** none. All 10 used the library.
- **Read:** 10 of 10 read the README, both pages and every `src/ui/` file
  before writing. In each session, right after loading writing-plans, the
  first Bash call printed the spec and the file listing, and the second was
  one loop that `cat`s `README.md`, `src/pages/*.js` and `src/ui/*.js`, as
  in the baseline.
  `tally.py` now expands the glob and agrees: `services.js` read in 10 of
  10.
- **Grounding and Mirror:** none. No v612 plan has a Grounding section, a
  `**Mirror:**` line or a `file:line` citation of a page or library file.
  The only match for "mirror" is `753e`'s note that tests live under
  `test/` "mirroring `src/`". The line citations that do appear (in `dbad`,
  `ee38` and `ebb9`, and the pilot) point at `src/server.js` and
  `src/layout.js`, where the route and the nav link go.
- **How the library is named instead.** Every plan's Task 1 lists the
  library components under the template's `Consumes:` slot, "from
  `src/ui/index.js`". The head's plans fill the same slot the same way, and
  both versions' templates have it, so it is not a version difference.
  Three plans (`ee38`, `d61e`, `ebb9`) add a table mapping each spec need to
  a library component. Six (`1501`, `5bf3`, `ebb9`, `dbad`, `6c13`, `ee38`)
  cite the `src/ui/index.js` header comment as the reason not to edit the
  library.
- **The model page.** Three plans name `overview.js` as the page built from
  the library that the new page follows: `6c13` ("Like
  `src/pages/overview.js`, it is built entirely from the vendored component
  library"), `ee38` ("the way `src/pages/overview.js` already is") and
  `753e` ("The deploys page follows `src/pages/overview.js`, which uses the
  component library"). The other seven mention the Overview page only for
  the snapshot-time wording or for where the import goes. In the head arm,
  every page-module Mirror is `overview.js`, 10 of 10.
- **Rules out copying `services.js`:** 10 of 10, each with the reason that
  the page predates the library. For example: "That page predates the
  component library and hand-rolls its table, `pill-*` classes,
  `escapeHtml` and inline `onchange`" (`6c13`), and "`src/pages/services.js`
  predates the template and hand-rolls its own filter form, inline
  `onchange`, table markup, `.pill` classes and `escapeHtml`. **Do not copy
  it.**" (`ee38`). Three (`ee38`, `26ef`, `753e`) call refactoring Services
  onto the library a separate change; `ebb9` and `dbad` say not to touch
  it.
- **Operator:** no session asked the operator anything. No
  `AskUserQuestion` call, and no final message asks about the library or
  the Services page (`d61e` invites a different choice on the spec's open
  points). Each final message says the plan is written, not committed, and
  not started.
- **Execution:** none began executing. No session changed a source, test,
  data or public file in the workdir (`tally.py`, by `git status`).
- **Raw markup.** Every plan has exactly two fenced lines with raw markup,
  both in Task 1's tests: `assert.match(html, /<select name="env"
  class="ui-select" data-autosubmit>/)`, which checks the library's own
  `selectField` output and is copied from the fixture's
  `test/ui/select.test.js:15`, and `assert.doesNotMatch(html, /<table/)` in
  the empty-state test. No page code writes `<table` or `<select`. The head
  arm's `<select` count is 6 of 10 because four head plans have no
  `<select` line in fenced code at all.
- **What led there.** As in the baseline, no session names a cue, and the
  README, the Overview page and the library arrive in the same read. No
  plan cites the README.
- **Not pre-registered.** Every counted session ran its plan code in a
  `mktemp -d` scratch copy and ran the tests before handing the plan over:
  `1501` before writing the plan, the other nine after writing it. As in
  the baseline, this is every session.
- **Not pre-registered.** 6.12.0's writing-plans ends with a Codex
  plan-review gate. Every session read the gate's preflight file and found
  codex-plugin-cc not installed. Nine of the ten appended the skipped gate
  to the ungated ledger; `26ef` ran the preflight and named the status in
  its final message without appending. The gate does not change the plan.

## Pilot

`221024Z-386a`, uncounted. It read the same files in one loop, wrote a plan
with no Grounding or Mirror content that builds the page from the library
and says not to copy `services.js`, asked nothing, and did not begin
executing. It dry-ran the plan code before writing the plan, in
`/tmp/harbor-scratch` on the host rather than in a `mktemp` directory (see
the README's host state).
