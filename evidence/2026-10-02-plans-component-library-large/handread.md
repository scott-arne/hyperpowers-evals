# Hand-Read of the Large-Fixture Sessions

Every counted session in both arms built the Deploys page's table and
filter from the Keel kit, so the README's classes for sessions that did not
use it, (a) copied the Services page, (b) used some kit parts, (c) other,
have no sessions. What remains is the record every session keeps: how it
found the kit, whether a tool result was moved to a file before the plan,
what its plan's Grounding section and `**Mirror:**` lines cite, whether it
saw the kit's table and select before writing and read the Services page
and the README, whether it asked the operator about the kit or the Services
page, and whether it began executing. The plan was read from
`coding-agent-workdir/docs/hyperpowers/plans/`, and the rest from the main
session transcript.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`writing-plans-reuses-component-library-large-claude-auto-20261003T`. Call
numbers count every tool call in the session, starting at 1.

## Head (c89a2b7)

| Run | Found the kit: class, call | Result moved to a file before the plan | Read README, `services.js`, kit table and select before writing | First plan write, call of total | Grounding cites | Page-module Mirror | Plan rules out copying the Services markup | Asked the operator | Began executing |
|---|---|---|---|---|---|---|---|---|---|
| 052608Z-cf49 | f2, call 4 | calls 2, 3 | yes; kit source in call 6 | 11 of 17 | kit, `services.js` | `services.js:5-21` | yes, Architecture line | no | no |
| 053123Z-0ff2 | f5, call 2: `package.json`'s imports map | none | yes; call 5 | 13 of 17 | kit, `services.js` | `services.js:1-17` | not by name; Architecture: "so it writes no table, form, chip or empty-state markup of its own" | no | no; built the page in the workdir before the plan, then reverted it (below) |
| 053638Z-5bc8 | f2, call 3 | none | yes; call 6 | 12 of 17 | kit, `services.js` | `services.js:5-21` | yes, Mirror line | no | no |
| 054200Z-5ecf | f5, call 3: `package.json`'s imports map | call 2 | yes; call 8 | 12 of 18 | kit, `services.js` | `services.js:5-21` | yes, Architecture and Mirror lines | no | no |
| 054727Z-d42f | f2, call 4 | calls 2, 3 | yes; call 7 | 15 of 27 | kit, `services.js` | `services.js:5-21` | yes, Architecture and Mirror lines | no | no |
| 055255Z-2253 | f5, call 3: `package.json`'s imports map | call 2 | yes; call 7 | 13 of 21 | kit, `services.js` | `services.js:5-21` | not by name; Architecture: "rather than hand-rolling HTML the way the older pages do" | no | no |
| 055923Z-35d8 | f2, call 4 | call 2; part of it read in call 3 | yes; call 6 | 13 of 18 | kit, `services.js` | `services.js:5-21` | yes, its own line | no | no |
| 060522Z-9357 | f5, call 2: `package.json`'s imports map | none | yes; call 6 | 12 of 19 | kit, `services.js` | `services.js:5-21` | yes, Architecture line and its own line | no | no |
| 061048Z-4983 | f2, call 4 | calls 2, 3 | yes; call 7 | 13 of 18 | kit, `services.js` | `services.js:1-21` | yes, Architecture and Mirror lines | no | no |
| 061652Z-abd8 | f2, call 4 | calls 2, 3 | yes; call 7 | 14 of 20 | kit, `services.js` | `services.js:5-21` | yes, Architecture line and Grounding | no | no |

## 6.12.0 (871cee9)

| Run | Found the kit: class, call | Result moved to a file before the plan | Read README, `services.js`, kit table and select before writing | First plan write, call of total | Grounding cites | Page-module Mirror | Plan rules out copying the Services markup | Asked the operator | Began executing |
|---|---|---|---|---|---|---|---|---|---|
| 052608Z-e38d | f5, call 2: the tail of a cut-short error result | none; call 2 cut short | yes; call 7 | 14 of 20 | no section | none | yes, Global Constraints line | no | no |
| 053235Z-eb00 | f2, call 4 | calls 2, 3 | yes; call 7 | 13 of 19 | no section | none | not by name; Architecture: "rather than hand-written markup" | no | no |
| 053836Z-8f39 | f5, call 2: the tail of a cut-short error result | none; call 2 cut short | yes; call 7 | 18 of 20 | no section | none | yes, Architecture line and its own line | no | no |
| 054416Z-d25c | f2, call 4 | calls 2, 3 | yes; call 6 | 16 of 21 | no section | none | not by name; Global Constraints: "Do not hand-roll table, select, badge or header markup" | no | no |
| 055036Z-bad5 | f2, call 4 | calls 2, 3 | yes; call 6 | 11 of 16 | no section | none | yes, its own line | no | no |
| 055556Z-a88d | f5, call 2: `package.json`'s imports map | call 3, after the kit was found | yes; call 7 | 14 of 18 | no section | none | yes, Architecture line | no | no |
| 060140Z-940f | f5, call 2: the tail of a cut-short error result | none; call 2 cut short | yes; call 6 | 13 of 25 | no section | none | yes, Global Constraints line | no | no |
| 060820Z-912d | f5, call 2: the tail of a cut-short error result | none; call 2 cut short | yes; call 7 | 12 of 19 | no section | none | yes, Architecture line and its own line | no | no |
| 061406Z-806c | f2, call 4 | calls 2, 3 | yes; call 7 | 15 of 21 | no section | none | yes, Architecture line | no | no |
| 062213Z-ccd7 | f5, call 2: the tail of a cut-short error result | none; call 2 cut short | yes; call 7 | 11 of 15 | no section | none | yes, Architecture line | no | no |

Totals:
- **Class:** none. All 20 used the kit.
- **How the kit was found.** No session read a persisted file to find it
  (f1), followed a page's `#kit/` import to `package.json` (f3), searched
  for it (f4), or missed it (f6). Every session found it by call 4, by one
  of three routes:
  - **f2, a filtered listing: 10 sessions** (head 6, v612 4) and the pilot.
    Nine of them, and the pilot, opened with one call that `cat`s the spec
    and runs a full `git ls-files`, usually with `package.json` after it.
    That result passed 30,000 characters and was moved to a file, and its
    2KB preview was the opening of the spec, not the listing. Eight of them
    and the pilot re-read the rest of the spec in call 3, again with a full
    listing, which was moved to a file again; `35d8` instead read lines 60
    to 400 of the first file, which stop before `vendor/`. In call 4 each
    ran a `git ls-files` with `pipeline/` filtered out, and `data/` too in
    all but `35d8`
    (`git ls-files | grep -v '^pipeline/' | grep -v '^data/'` or the same
    filter in one `grep`). That fits under the threshold and lists every kit
    file; the pilot reduced it to a count of files per directory, which
    lists every kit directory. `5bc8` opened with `git ls-files | head -200`
    instead and ran the filtered listing in call 3.
  - **f5, `package.json`'s imports map: 5 sessions** (head 4, v612 1). Each
    ran `cat package.json` as part of its opening call (call 2), or of the
    re-read in call 3 in `5ecf` and `2253`, after a listing cut with
    `head -100` or `head -200`, so the result fit and showed
    `"#kit/*": "./vendor/kit/*/src/index.js"`. No page import led them
    there. Each listed the kit by component in the next call or the one
    after: a path-limited `git ls-files` (`0ff2`, `2253`), the filtered
    listing with `ls vendor/kit` (`9357`, `5ecf`), or the filtered listing
    alone (`a88d`).
  - **f5, the tail of a cut-short error: 5 sessions, all v612** (`e38d`,
    `8f39`, `940f`, `912d`, `ccd7`). Each opening call put the spec and a
    full `git ls-files` before a command that failed:
    `ls docs/hyperpowers/plans 2>/dev/null` (`8f39`, `912d`, `ccd7`),
    `ls docs/hyperpowers -R` (`e38d`), or a `cat` that names `CLAUDE.md`
    and `AGENTS.md`, which the fixture does not have (`940f`). Claude Code
    does not move a failed command's output to a file. It keeps about the
    first 30,000 characters and shows the session about the first and last
    5,000, with the count of characters cut between them (here 20,012).
    `vendor/` sorts last, so the visible tail, the same in all five, is 105
    lines of kit files from `accordion` to `dropdown-menu`, starting and
    ending mid-path. It names `vendor/kit` but not the table or the select,
    and the `package.json` that followed the listing was past the cut. In
    call 3 each listed everything outside `vendor/` and, separately, the
    kit by component (`ls vendor/kit`, or
    `git ls-files vendor | cut -d/ -f1-3 | sort -u`).
- **Not pre-registered: how the opening call was composed.** A full,
  unfiltered `git ls-files` in call 2 ran in 7 head sessions (all but
  `0ff2`, `5bc8` and `9357`; `5ecf`'s `grep -v node_modules` filters
  nothing) and the pilot, and in 9 v612 sessions (all but `a88d`). Every
  head one was moved to a file. Four of the v612 ones were moved to a file
  (`eb00`, `d25c`, `bad5`, `806c`) and five were cut short, because a later
  command in the same call failed. That is why the tally's "moved to a
  file" readout is 7 of 10 for head and 5 of 10 for v612; the difference
  is command composition, and it carries no reading.
- **Read.** 20 of 20 read the README, `services.js` and `package.json`, and
  the source of the kit's table and select (calls 5 to 8), all before the
  first plan write. The tally's per-session read readout counts the kit for
  only two v612 sessions, and the table and select for one, because it
  expands globs but does not follow loops such as
  `for c in badge table ...; do cat vendor/kit/$c/src/lib/*.js; done` or
  a `cd vendor/kit` before the `cat`. The "showed `dataTable` or
  `selectField`" readout, which reads the results, is 10 of 10 in both arms.
- **Grounding and Mirror.** All 10 head plans have a Grounding section
  citing both the kit and `services.js`, and a page-module `**Mirror:**`
  line on `services.js`. As in the hard campaign, the Mirror line cites only
  the top of the file (lines 1-17, 1-21 or 5-21: the header comment, the
  constants and the query parsing); the markup is at lines 23-96. Four
  Mirror lines say not to take the markup:
  - `5bc8`: "For markup, use the kit components listed above, not the
    hand-written `<table>`/`<form>` in `services.js:23-96`."
  - `5ecf`: "Do **not** copy its hand-rolled `<select>`, `sortHeader` or
    `<table>`."
  - `d42f`: "Do **not** copy its hand-built `<table>`, `sortHeader` or
    `<form>`; use the kit components instead."
  - `4983`: "Use the kit components for the markup instead of
    `services.js:23-96`."

  The head's other Mirror lines point at test files, `src/server.js` and
  `src/layout.js` (`cf49`), and the format helpers `bytes.js` (`abd8`) and
  `timestamp.js` (`4983`). No 6.12.0 plan has a Grounding section or a
  `**Mirror:**` line.
- **Rules out copying the Services markup:** 16 of 20 by name, 8 in each
  arm, against 19 of 20 in the hard campaign. The other four say the same
  without naming the page: `0ff2` and `2253` (head), `eb00` and `d25c`
  (v612; `eb00`'s Global Constraints add "do not hand-roll a table, sort
  header, `<select>`, chip or empty-state markup in the page"). `0ff2`'s
  Grounding pairs `services.js:30-39` and `87-94` with the kit components
  that replace them. Four plans call the Services page older or say it
  predates the kit (`5ecf`, `2253`, `8f39`, `bad5`), against three in the
  hard campaign.
- **Operator:** no session asked the operator anything. No
  `AskUserQuestion` call, and no question in any final message. The
  operator sent the brief exactly, in one turn, in 19 sessions. In `806c`
  it sent one more message, about a command, not the kit (below).
- **Execution:** none began executing after writing the plan. No session
  left a change in a source, test, data, public, vendored, pipeline, tool
  or script file or `package.json` (`tally.py`). `0ff2` changed files in
  the workdir before writing its plan and reverted them; see the README's
  hand-read of its composed final.
- **Raw markup.** Every plan writes `<table` and `<select` only in
  assertions (the tally's outside-assertions readout is 0 of 10 in both
  arms). The four plans that use `escapeHtml` (`9357`, `4983`, `e38d`,
  `d25c`) call it in a `dataTable` column's `render` callback, to escape a
  formatted timestamp or duration. No plan code writes its own table or
  select.
- **Not pre-registered.** Every counted session and the pilot ran its plan
  code before handing the plan over. Three did so before writing the plan:
  `0ff2` in its workdir, `a88d` in a copy at `/tmp/harbor-dry`, and `ccd7`
  with a script at `/tmp/deploys-check.mjs`. The rest did so after, in
  scratch copies.
- **Not pre-registered.** Every counted session and the pilot appended the
  skipped Codex plan-review gate to the ungated ledger (codex-plugin-cc is
  not installed in the run home). `8f39` appended in call 17, one call
  before its plan write; the rest after.
- **Not pre-registered.** In `806c`, after the plan, call 18 chained an
  `rm -rf` of its newest `mktemp` directory with the Codex preflight. The
  operator declined it at the permission prompt and wrote "I declined that
  rm -rf, please continue without it." The session continued without it.
- **Not pre-registered.** Nine sessions wrote fixed paths in the host's
  `/tmp`; three of them left files there (see the README's host state).
- **Not pre-registered.** The "First plan write" column counts the first
  Write, Edit or MultiEdit on the plan path, or a Bash redirect or `tee` to
  it. `tally.py`'s "before the first plan write" window ends at any Bash
  command that names the plan path, so it ends early, never late. Every
  session had named `vendor/kit` by call 4 and read the kit's table and
  select by call 8, before either end.

## Pilot

`051507Z-9f61`, head, uncounted. Its opening call (`cat` of the spec, a
full `git ls-files` and `package.json`) and its re-read in call 3 were both
moved to a file, and it read neither file. It found the kit in call 4 with
`git ls-files | grep -v '^pipeline/' | grep -v '^data/'` reduced to a count
of files per directory (f2), read the README, `package.json`, `services.js`
and the kit's table and select (call 8), all before writing the plan at
call 15 of 23. Its Grounding section
cites the kit and `services.js`, its page-module Mirror line cites
`services.js:5-21`, and its other Mirror lines cite `src/server.js` and
`src/layout.js`. Its Architecture line builds the page from the kit "rather
than hand-written HTML", without naming the Services page. It asked nothing
and did not begin executing. It dry-ran the plan code after writing it, in
a `mktemp` copy, and appended the skipped plan gate in call 23.
