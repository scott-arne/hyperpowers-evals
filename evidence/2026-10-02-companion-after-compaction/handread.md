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
`brainstorming-bounded-companion-after-compaction-claude-auto-20261002T`.

## Summary

| Run | Class | Skill tool | Compactions in the window (context tokens before) | Last summary before the decision names the companion | Path announced | `AskUserQuestion` headers before the design |
|---|---|---|---|---|---|---|
| 062340Z-d34d | (c) | yes | 62039, 80571 | yes | none | none |
| 063315Z-00fe | (c) | yes | 62168, 80007 | yes | none | Filters, Security grp, No-JS gap, Tokens |
| 064239Z-5e52 | (c) | yes | 60956, 77389 | yes | bounded | none |
| 064345Z-bff1 | (a), no comparison | yes | 61814, 79885 | yes | none | Filters, Event types, Week |
| 065311Z-201e | (a), no comparison | yes | 60331, 76779 | yes | none | Filters, Security, Type control, Week, Tokens, No-JS |

Totals: 2 (a), 0 (b), 3 (c), 0 (d). No session read `visual-companion.md`.

Every one of the five invoked `brainstorming` through the Skill tool, took
two auto-compactions between the skill load and the decision point, and
carried the companion into the last summary before that point. In the
summaries the companion appears in the skill's own conditional wording, for
example "Open the visual companion only if a question is genuinely visual
(read `skills/brainstorming/visual-companion.md` before first use)". The
field summaries dropped it; these did not. The summary carrying the step was
not enough here.

In no session did the agent offer where the filter controls sit as a choice.
All five placed them above the table in the in-chat design, and the operator
approved that design.

## (c): never reached a layout choice

**062340Z-d34d.** It asked nothing. Two minutes after the second compaction
it sent a single in-chat design: "A small filter form goes above the table",
with an event-type dropdown and the rest of the controls specified. The
operator replied with the needs from the story and "Otherwise that's fine, go
ahead", and it began implementation. No visible text names a path. The last
summary before the operator's reply says to "Open the visual companion only
if a question is genuinely visual".

**063315Z-00fe.** It asked four questions through `AskUserQuestion`: which
filters, whether "Settings updated" belongs to the security group, the
existing no-JS gap, and where design tokens live. None is a layout or control
question. It then sent the design in chat ("A filter panel sits above the
table with two controls"), and the operator approved it ("The filter panel
above the table sounds right — go with that"). Its last summary before the
first question named the companion with a forecast attached: "The visual
companion is probably not needed. If a layout question comes up (for
example, where the filters sit or chips versus a select), read
visual-companion.md first." The design then settled where the filters sit
without asking. No visible text names a path.

**064239Z-5e52.** It asked nothing. It announced "This is bounded: the page
and how it renders already exist, so I'll put a short design here instead of
writing a spec" and sent the design in chat with a filter bar above the
table. The operator approved it and added the story's needs, so it sent a
revised part in chat ("Event type: checkboxes instead of a Select") and was
approved again. The harness interrupted it during implementation. Its last
summary before the operator's first reply named the companion once:
"Consider the visual companion only if a layout question really needs to be
shown rather than described".

## (a): the control choice through `AskUserQuestion`

In both sessions the question sent to `AskUserQuestion` was which control
picks event types, not where the controls sit. The README treats this
question the same way for pilot 2 ("Type picker"), and the operator answered
it with the story's line about the look. Neither session wrote anything in
chat between the previous answer and the widget, so no Deciding Together
comparison preceded it.

**064345Z-bff1.** "Event types: How should people choose which event types
to show?", with the options "Checkboxes + shortcuts", "Single type Select"
and "Select with group entries". The operator answered "I don't have a strong
preference on the look — whatever is quickest to scan." It asked the week
picker through `AskUserQuestion` too, then sent the design in chat: two
one-click buttons above the table next to a "Filter" button that opens a
popover. The operator approved it.

**065311Z-201e.** "Type control: How should people choose which event types
to show?", with the options "Three-way radio", "Select with all nine" and
"Checkbox list". It asked six questions through `AskUserQuestion` in all,
including the week picker, then sent the design in chat: "The filter bar is a
panel above the table." The operator approved it.

## For comparison: the started sessions

Not part of the hand-read; listed because the contrast is the point.

All five started sessions also took two compactions before their first
question, and that question was "Filters" through `AskUserQuestion` in all
five. Four of them then named the placement as the next question ("The next
question is where the filters go on the page", e360; "Next is where the
controls sit on the page", 639f; "Next is how the controls are laid out",
178d) or put it on screen directly (62ef). The fifth, `070058Z-f309`, sent
the event-type control question through `AskUserQuestion` first, exactly as
bff1 did, got the same answer, and then opened the companion: "'Quickest to
scan' is easier to judge by looking than from my description". Every started
session read `visual-companion.md` before running `start-server.sh`.
