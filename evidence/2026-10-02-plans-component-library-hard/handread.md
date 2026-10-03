# Hand-Read of the Hard-Fixture Sessions

Every counted session in both arms built the Deploys page's table and
filter from the Keel kit, so the README's classes for sessions that did not
use it, (a) copied the Services page, (b) used some kit parts, (c) other,
have no sessions. What remains is the record every session keeps: what its
plan's Grounding section and `**Mirror:**` lines cite, whether it saw the
kit's table and select before writing and read the Services page and the
README, whether it asked the operator about the kit or the Services page,
and whether it began executing. The plan was read from
`coding-agent-workdir/docs/hyperpowers/plans/`, and the rest from the main
session transcript.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`writing-plans-reuses-component-library-hard-claude-auto-20261003T`.

## Head (c89a2b7)

| Run | Read README, `services.js`, kit table and select before writing | First plan write, call of total | Grounding cites | Page-module Mirror | Plan rules out copying the Services markup | Asked the operator | Began executing | `<table`/`<select` outside assertions |
|---|---|---|---|---|---|---|---|---|
| 001108Z-0809 | yes | 15 of 16 | kit, `services.js` | `services.js:5-16` | yes, Architecture line | no | no | none |
| 001636Z-b881 | yes | 10 of 14 | kit, `services.js` | `services.js:5-21` | yes, Architecture and Mirror lines | no | no | none |
| 002119Z-c3df | yes | 6 of 11 | kit, `services.js` | `services.js:5-21` | yes, Architecture line | no | no | `<select`, a test regex |
| 002635Z-85b3 | yes | 8 of 12 | kit, `services.js` | `services.js:5-21` | not by name; Architecture: "rather than hand-written HTML" | no | no | none |
| 003105Z-33e0 | yes | 8 of 12 | kit, `services.js` | `services.js:13-21` | yes, Architecture line | no | no | none |
| 003509Z-d2ed | yes | 10 of 14 | kit, `services.js` | `services.js:5-16` | yes, its own line | no | no | none |
| 003946Z-77f5 | yes | 7 of 12 | kit, `services.js` | `services.js:5-16` | yes, Architecture and Mirror lines | no | no | none |
| 004538Z-4242 | yes | 8 of 13 | kit, `services.js` | `services.js:5-21` | yes, Architecture line | no | no | none |
| 005058Z-d5c8 | yes | 8 of 11 | kit, `services.js` | `services.js:5-21` | yes, Global Constraints line | no | no | none |
| 005550Z-d614 | yes | 9 of 12 | kit, `services.js` | `services.js:5-16` | yes, Architecture line | no | no | none |

## 6.12.0 (871cee9)

| Run | Read README, `services.js`, kit table and select before writing | First plan write, call of total | Grounding cites | Page-module Mirror | Plan rules out copying the Services markup | Asked the operator | Began executing | `<table`/`<select` outside assertions |
|---|---|---|---|---|---|---|---|---|
| 001108Z-9462 | yes | 11 of 14 | no section | none | yes, Architecture line | no | no | `<select`, a code comment |
| 001650Z-2247 | yes | 7 of 13 | no section | none | yes, Architecture line | no | no | none |
| 002137Z-57eb | yes | 9 of 12 | no section | none | yes, Architecture line | no | no | none |
| 002613Z-1399 | yes | 10 of 14 | no section | none | yes, Architecture line | no | no | none |
| 003024Z-b759 | yes | 10 of 14 | no section | none | yes, Architecture line | no | no | none |
| 003609Z-aa87 | yes | 12 of 14 | no section | none | yes, Architecture line | no | no | none |
| 004058Z-2864 | yes | 11 of 15 | no section | none | yes, Architecture line | no | no | none |
| 004610Z-2da4 | yes | 9 of 13 | no section | none | yes, its own line | no | no | none |
| 005128Z-0f40 | yes | 7 of 12 | no section | none | yes, Architecture line | no | no | none |
| 005617Z-3a5b | yes | 7 of 13 | no section | none | yes, Architecture line | no | no | none |

Totals:
- **Class:** none. All 20 used the kit.
- **How the kit was found.** No session needed a cue. In all 20, and in
  the pilot, the first tool result that named the kit was call 2's
  `git ls-files`, whose listing has every `vendor/kit/` file. The README
  says nothing about the kit, and the Services page imports only the kit's
  button and dialog, so the listing is the cue the fixture leaves. Call 4
  in every session was one loop that `cat`s each kit entry point and
  implementation file
  (`for f in vendor/kit/*/src/index.js vendor/kit/*/src/lib/*.js`). In
  `b759`, that call exited 1, and the session re-read the select in call 5.
- **Read.** 20 of 20 read the README (call 3, or call 2 in `d2ed` and
  `3a5b`), `services.js` (call 3), `package.json` with its `#kit/*` imports
  map (call 2 or 3), and the kit's table and select (call 4), all before the
  first plan write.
- **Grounding and Mirror.** All 10 head plans have a Grounding section
  citing both the kit and `services.js`, and a page-module `**Mirror:**`
  line on `services.js`. The Mirror line cites only the top of the file:
  the header comment, the constants and the query parsing (lines 5-16,
  5-21 or 13-21), not the markup. Two Mirror lines say so: "take markup
  from the kit components, not from this file" (`b881`) and "Don't copy
  its hand-built `<table>`/`<form>`/`.pill` markup; the kit components
  replace them." (`77f5`). The head's other Mirror lines point at test
  files and at `src/server.js` and `src/layout.js`. No 6.12.0 plan has a
  Grounding section or a `**Mirror:**` line.
- **Rules out copying the Services markup:** 19 of 20 by name. Every
  Architecture line says the page is built from the kit components. `85b3`
  says "rather than hand-written HTML" without naming the Services page;
  its plan names `services.js` only for the query parsing and the import
  style. `d2ed` has its own line, "Do **not** copy the hand-written table,
  `<select>` and `pill` markup from `services.js`.", and `2da4` has
  "**Reuse the kit, not the Services page markup.**" Most give the spec's
  reason: it asks for the Services page's behavior, and the kit already
  does what that page does by hand. Only three plans (`0809`, `c3df`,
  `9462`) say the Services page predates the kit, against 10 of 10 in the
  612 campaign, whose README said so.
- **Operator:** no session asked the operator anything. The operator sent
  the brief exactly, in one turn. No `AskUserQuestion` call, and no
  question in any final message. Each final message says the plan is
  written and not started; several say to build on the kit rather than the
  Services page.
- **Execution:** none began executing. No session changed a source, test,
  data, public or vendored file or `package.json` in the workdir
  (`tally.py`).
- **Raw markup.** Every plan writes `<table` only in assertions, and the
  tally's two `<select` lines outside assertions are not page markup.
  `c3df` line 149 is a test regex of the markup the kit select produces,
  on its own line, so the per-line cut counts it. `9462` line 59 is a
  comment on `import { selectField } from '#kit/select'` that describes
  its output. No plan code writes its own table or select.
- **Not pre-registered.** Every counted session, and the pilot, ran its
  plan code in a scratch copy of the workdir and ran the tests before
  handing the plan over. Seven did so before writing the plan (`0809`,
  `d2ed`, `4242`, `1399`, `aa87`, `2864`, `2da4`, and the pilot), and
  thirteen after. As in both earlier campaigns, this is every session.
- **Not pre-registered.** Every counted session and the pilot appended
  the skipped Codex plan-review gate to the ungated ledger
  (codex-plugin-cc is not installed in the run home). `0809` appended at
  call 9, before its plan write. The gate does not change the plan.
- **Not pre-registered.** Nine sessions and the pilot wrote fixed paths in
  the host's `/tmp` during that scratch work. Seven sessions and the pilot
  put their scratch copy there: each ran `rm -rf` on the path first, and
  `d2ed` made its copy with `git worktree add` and removed it afterwards
  with `git worktree remove --force` and `git worktree prune`. `33e0` and
  `9462` copied into `mktemp` directories but extracted plan code blocks
  to `/tmp/newtests.js` and `/tmp/blk<n>.js`, writes that truncate the
  file. None read stale content (see the README's host state).
- **Not pre-registered.** The "First plan write" column counts the first
  Write, Edit or MultiEdit on the plan path, or a Bash redirect or `tee`
  to it (`2864` wrote its plan with a Bash heredoc). `tally.py`'s
  "before the first plan write" window ends at any Bash command that names
  the plan path, so it ends early, never late. In `0809` it ends at the
  ledger append in call 9, and the tally's 10 of 10 still holds there.

## Pilot

`000355Z-e4fc`, head, uncounted. It found the kit through call 2's
`git ls-files` like every counted session, read the README, `package.json`,
the kit's table and select, and `services.js` (through a persisted-output
Read in call 5), all before writing the plan at call 11 of 15. Its
Grounding section cites the kit and `services.js`, and its page-module
Mirror line cites `services.js:5-16`. Its Architecture line builds the page
from the kit and says the Services page's hand-written markup "is not
copied". It asked nothing and did not begin executing. It dry-ran the plan
code before writing the plan, in `/tmp/deploys-proto` on the host.
