# Hand-Read of the Sessions That Did Not Start the Companion

Every counted session whose `start-server[.]sh` post-check failed in
`tally.txt` was read by hand from its main session transcript, from the
opening brief through the approval of the in-chat design. The classes are
the README's:
- (a) asked the layout choice through `AskUserQuestion`, noting whether a
  Deciding Together comparison preceded it in chat;
- (b) described the layouts in chat only, with no selection widget;
- (c) never reached a layout choice: implemented directly, or asked only
  non-visual questions;
- (d) other, described.

The deterministic count governs the reading. The hand-read explains it.

Run ids below drop the common prefix
`brainstorming-bounded-companion-default-window-claude-auto-20261002T`.

## Summary

| Run | Class | Skill tool | Path announced | Control question through `AskUserQuestion` | `AskUserQuestion` headers before the design |
|---|---|---|---|---|---|
| 085500Z-bdd8 | (a), no comparison | yes | bounded | event types | Filter by, Type filter |
| 090230Z-b8ef | (a), no comparison | yes | bounded | event types, week | Filter by, Type filter, Security grp, Week filter, Tokens |
| 090559Z-7a18 | (a), no comparison | yes | bounded | week | Filters, Security set, Week picker, Tokens |
| 091503Z-817d | (a), no comparison | yes | bounded | event types, week | Filter scope, Event filter, Week filter |
| 092321Z-6d1b | (a), no comparison | yes | bounded | event types, week | Filter scope, Type filter, Date filter, Tokens |
| 093354Z-9ad4 | (a), no comparison | yes | bounded | week | Filter by, Security set, Week picker, Token sheet |

Totals: 6 (a), 0 (b), 0 (c), 0 (d). No session read `visual-companion.md`,
and none compacted.

Every one of the six invoked `brainstorming` through the Skill tool and
announced the bounded path. Every one sent a full comparison in chat before
its first question, which filters to build, and asked it through
`AskUserQuestion`. None wrote anything in chat between the previous answer
and its control question, so no Deciding Together comparison preceded that
question.

As in stage 1, the question sent to `AskUserQuestion` was which control
picks something, not where the controls sit. Four sessions asked which
control picks event types. Two asked only which control picks the week: a
week select or a date range. Stage 1's README treats the week picker as "the
same kind of question" as the type picker (its pilot 3), so both count as
(a) here. The reading does not depend on it: the class explains the count,
it does not set it.

In no session did the agent offer where the filter controls sit as a choice.
All six placed them above the table in the in-chat design, and the operator
approved that design.

## (a): the control choice through `AskUserQuestion`

**085500Z-bdd8.** "Type filter: How should people pick which event types to
see?", with the options "Named groups", "Nine checkboxes" and "Groups +
checkboxes". The operator answered "I don't have a strong preference on the
look — whatever is quickest to scan." It took that as settling the week too:
"For the week, the same reasoning points to a **"Week" Select** rather than a
pair of date pickers, so I've put that straight into the design below." The
design opened "A filter row above the table with two native `<select>`
elements". It asked for approval through `AskUserQuestion`, and the operator
chose "Approve as written".

**090230Z-b8ef.** "Type filter: How should the event type filter work?",
with the options "Select with shortcuts", "Nine checkboxes" and "Select,
types only", sent in one call with the question of which types the "Security
changes" shortcut covers. It then asked the week picker and the token source
through `AskUserQuestion`, and sent the design in chat: "Two native
`<select>` controls above the table, with visible labels on top". The
operator approved it ("Approved, and yes, add the content-width token to
01. Go ahead.").

**090559Z-7a18.** No event-type control question. After the filter scope,
it asked which types "Security changes" includes, then "Week picker: How
should people pick the week to look at?" with the options "Week select" and
"Date range", then the token source. The design: "A filter row between the
intro text and the table, with two labeled native `<select>` controls side
by side". The operator replied "Yes, go ahead."

**091503Z-817d.** "Event filter: How should people pick the kind of event to
show?", with the options "Select with named views", "Named views, incl.
Settings" and "Checkbox list of nine types", then the week picker. The
design: "A filter bar above the table with two Selects, labels above the
controls". The operator approved it ("Yes, that looks right. Go ahead with
the tokens.css approach").

**092321Z-6d1b.** "Type filter: How should the event-type filter work?",
with the options "Checkbox list", "Single Select" and "Grouped Select", then
the week picker ("Date range + presets" or "Week-of Select") and the token
source. The design put "A `<form class="activity-filters" hidden>` between
the intro paragraph and the table". The operator approved it ("Yes, that
works.").

**093354Z-9ad4.** The same question sequence as 7a18: the filter scope, the
"Security changes" set, "Week picker" ("Week Select" or "Date range
pickers"), and the token source. It is the only session in either campaign
whose visible text weighs the companion and declines it. The design message
opens: "The layout is two dropdowns above the table, which is simple enough
to describe in text, so I'm not opening a browser mockup." The operator
replied "Yes, go ahead." The sessions' thinking is not recorded in the
transcripts, so whether the other five weighed it is not visible.

## For comparison: the started sessions

Not part of the hand-read; listed because the contrast is the point.

Every started session read `visual-companion.md` before running
`start-server.sh`, and every one opened with three candidate layouts.
Three asked through `AskUserQuestion` before starting and one asked in chat
only:
- `091214Z-ae41` announced bounded and asked the filters, the token source
  and the no-JS gap through `AskUserQuestion`, then: "The last open question
  is layout, which is easier to show than describe, so I'll read the visual
  companion guide first."
- `092157Z-664e` wrote no visible text before its first question (filters,
  through `AskUserQuestion`) and announced no path. After the answer it read
  the guide and opened "three layout sketches in a browser tab, since this is
  easier to see than read".
- `092955Z-f2d8` announced bounded and asked both its questions in chat.
  Then: "The next question is how the filter controls should look and sit
  above the table. That's easier to judge by seeing it, so I'm opening a
  browser tab."
- `085500Z-38a9` announced bounded and sent the event-type control question
  through `AskUserQuestion`, as four of the six failures did, but after a
  Deciding Together comparison of the three controls in chat (the choice,
  one paragraph per option, "I recommend B"). After the answer it read the
  guide and opened "three layouts in a browser tab, since they're easier to
  compare by sight". Its screen's three layouts "use the same controls and
  differ only in placement".

The started sessions put the layout on screen. The six failures never made
the placement a question.
