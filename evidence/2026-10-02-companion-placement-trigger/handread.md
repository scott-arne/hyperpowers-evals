# Hand-Read of the Treatment Sessions

Every counted session started the companion, and every composed final
passed, so the README's hand-read of not-started and failed sessions has no
sessions. What remains are the by-hand readouts: for every started session,
what its first companion screen showed, and for every session, the path it
announced. Both were read from the main session transcript. The first screen
is the first `.html` file written after the first `start-server.sh`; the
archive keeps each one under
`coding-agent-workdir/.hyperpowers/brainstorm/<session>/content/`. The path
is the first assistant text naming spike, bounded or architectural.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`brainstorming-bounded-companion-after-compaction-claude-auto-20261002T`.

## Summary

| Run | Skill tool | Path announced | `AskUserQuestion` before the start | First screen | Shows |
|---|---|---|---|---|---|
| 132948Z-63db | yes | bounded, before the start | Filters | Where should the filters go? | placements |
| 132948Z-d94d | yes | bounded, in the start turn | none | Where should the filter controls sit on the account activity page? | placements |
| 134009Z-bd65 | yes | bounded, in the start turn | none | Where should the activity filters go? | both |
| 134023Z-8ce5 | yes | bounded, in the start turn | none | Where should the filter controls go on Account activity? | placements |
| 134757Z-fb95 | yes | bounded, in the start turn | none | Where should the activity filters go? | placements |
| 134945Z-7b62 | yes | none | none | Where should the activity filters go? | placements |
| 135731Z-95db | yes | bounded, in the start turn | none | Where should the filters sit on the activity page? | placements |
| 140323Z-8135 | yes | bounded, in the start turn | none | Where should the filters go on the account activity page? | placements |
| 140808Z-e4f1 | yes | bounded, before the start | none | Where should the filter controls sit on the activity page? | both |
| 141526Z-5b89 | yes | bounded, in the start turn | none | Where should the filter controls go on Account activity? | placements |

Totals: first screens, 8 placements only, 2 both, 0 controls only. Path,
9 bounded, 0 spike, 0 architectural, 1 none.

Every first screen was named `filter-placement.html` and asked where the
filters go. No session asked permission to open the companion. The only
human message before each start was the brief, and the one question asked
before a start (63db, below) was about the filters, not the companion. "In the start turn" means the announcement came in the
turn that started the companion, after the `start-server.sh` call and before
the operator's first reply. All nine announcements came before that reply.

`132948Z-63db` is the one session with an `AskUserQuestion` before the start.
It asked what the table should be narrowed by, a non-visual question, and
opened the companion on placements after the answer. The other nine made the
placement their first question.

## First screens

Options are listed as each screen labeled them.

- **132948Z-63db.** "Same controls in each: two shortcuts (Failed sign-ins,
  Security changes), an Event type select, and a From / To date range".
  A filter bar above the table; shortcuts inline with the rest in a
  "Filters" popover; a sidebar to the left of the table.
- **132948Z-d94d.** An inline filter bar above the table; a "Filter" button
  with a popover panel; a side panel.
- **134009Z-bd65.** "Three placements for the account activity page." An
  inline filter bar above the table; a filter button, popover, and
  active-filter tags; an inline bar with a "Failed sign-ins only" shortcut.
  The third repeats the first placement with one control added, so the
  screen counts as both.
- **134023Z-8ce5.** "Each one shows an Event select, a Search field and a
  polite result count above or around the existing table." An inline filter
  bar above the table; a filter row inside the table header; a left rail; a
  filter button opening a popover.
- **134757Z-fb95.** A filter bar above the table; a filter button and
  popover with active filters as tags; a side panel with a checkbox list.
- **134945Z-7b62.** "Each sketch shows the same filters ... Only where they
  sit changes." A filter bar above the table, marked recommended; a
  "Filter" button opening a popover; controls in the column headers.
- **135731Z-95db.** "Controls shown are the likely set ...; which filters to
  include is a separate question." An inline filter row above the table; a
  filter panel beside the table; a filter button with popover and tags.
- **140323Z-8135.** "The controls inside each one are placeholders; the
  question is placement." A filter bar above the table; a filter button with
  popover plus active tags; a sidebar of checkboxes.
- **140808Z-e4f1.** An always-visible filter bar; the same bar plus a
  "Failed sign-ins" shortcut; a filter button that opens a popover, with
  active filters as removable tags. The second repeats the first placement
  with one control added, so the screen counts as both.
- **141526Z-5b89.** "All three use the same controls". A toolbar row above
  the table; quick-filter tags and a "Filters" popover; a filter panel
  beside the table.
