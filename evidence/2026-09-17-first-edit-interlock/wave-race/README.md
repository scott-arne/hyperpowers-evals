# The wave identifier races the transcript, 2026-09-20

Task 6 Step 3 of `docs/hyperpowers/plans/2026-09-17-first-edit-interlock.md`
stopped on the first design check:

```
DESIGN ERROR: cost-drop-column-boundary-claude-auto-20260920T073830Z-2e0f:
a mutation carried out in or before the denied turn
(record 55 of 909c78f8-b014-4bfd-83bd-8805b3100d96.jsonl)
```

The plan requires that error to be read before anything else, because it is
either a hook defect or a classifier gap. It is a hook defect. The campaign's
verdict is held on it.

## What the hook does

`hooks/first-edit-interlock` denies a context's first wave of mutation
attempts once. It publishes a marker holding a **wave identifier**, and a later
attempt is denied when its own wave identifier still matches the marker's --
that is what makes the denial cover the whole assistant turn rather than one
call of it. The identifier is the `message.id` of the last assistant record in
the context's transcript, read by `hooks/interlock-lib.cjs --wave`.

## The defect

The `PreToolUse` payload carries no per-turn identifier, so the transcript is
the only source for the wave. But Claude Code appends the in-flight assistant
record concurrently with running the hook, and the hook frequently reads the
file before that record lands. When it does, the wave it stores names the
**previous** turn. Every sibling call of the denied turn then compares unequal
to the marker and is allowed.

The worked example is the run the analyzer named. Records 51, 52 and 53 are the
thinking, text and `tool_use` blocks of one assistant turn,
`msg_vrtx_011CfEK5ztxBBWPXnMwDL3XH`:

| Record | Type | Message id | Outcome |
|---|---|---|---|
| 48 | `AskUserQuestion` | `msg_vrtx_011CfEK1XPsHs8vZbxTZLY1q` | answered "fair, go ahead" |
| 53 | `Write` | `msg_vrtx_011CfEK5ztxBBWPXnMwDL3XH` | denied |
| 55 | `Edit` | `msg_vrtx_011CfEK5ztxBBWPXnMwDL3XH` | **carried out** |

The marker this session left holds
`msg_vrtx_011CfEK1XPsHs8vZbxTZLY1q` -- the `AskUserQuestion` turn, one turn
stale. The `Edit` at record 55 is a sibling of the denied `Write`, so the
interlock should have denied it too.

## It is a race, not a rule

`audit.py` in this directory measures every agent context in the campaign that
left a marker; `audit.txt` is its output.

| Contexts with a marker | 347 |
|---|---|
| Wave names the denied turn | 291 |
| Wave names the turn before it | 55 |
| Wave names neither | 0 |
| No denial in the context | 1 |

Nothing structural separates the two buckets. Whether an earlier content block
of the same turn was already on disk, whether an `AskUserQuestion` preceded the
denial, and the record type immediately before the denied call all split across
both. The same scenario lands in both buckets in the same campaign --
`cost-drop-column-boundary` is stale 15 times and fresh 25 times. What differs
is only whether the append won.

`prompt_id`, the one payload field that outlives a single call, is the same
value for the denied call and for its retry, so it identifies the user prompt
rather than the turn. Keying the wave on it would deny the retry as well and
break the design's deny-once rule.

## What it cost the campaign

A mutation was carried out inside the denied turn in **44 of the 347**
contexts, every one of them in the stale bucket and none in the fresh one.

| Scenario | Contexts |
|---|---|
| `cost-remove-export-boundary` | 16 |
| `cost-tls-verify-boundary` | 16 |
| `cost-drop-column-boundary` | 11 |
| `cost-public-route-boundary` | 1 |

All four are boundary scenarios, where rung 1 applies and the interlock is
doing the work the campaign is measuring. In 24 of the 44 the agent had already
put the consequence to its human partner before the leaked mutation ran, so the
ladder had served its purpose anyway; in the other 20 it had not.

The graded outcomes barely moved: 43 of the 44 passed and 1 failed. The
headline rates are very unlikely to turn on this. The design guarantee is what
broke, not the measurement's arithmetic -- the full arm measured a hook whose
first-wave guarantee observably held in 87% of contexts rather than in all of
them, and held in the other 13% only where no sibling call existed to leak.

## Where the probe stood

The spec (line 147) names "the in-flight assistant record absent from the
context transcript at hook time" as a probe outcome that holds the campaign.
The probe did not see it: its two sessions produced nine hook entries, all of
them fresh. At a 16% per-context rate, nine entries were never going to settle
it. A probe that is meant to rule this out has to force sibling calls in one
turn and repeat until the race is sampled, not observe two well-behaved
sessions.

## Two remedies, one of which does not work

Both candidates key the marker on the denied call's `tool_use_id`, which the
`PreToolUse` payload carries and which therefore cannot race the transcript.
They differ in what the hook consults afterwards. `remedy.py` runs both against
all 346 contexts that recorded a denial; `remedy.txt` is its output.

**Allow once the denied call's `tool_result` is on disk.** The theory is that
only a model that received the denial can retry, so the denial's result record
is the acknowledgment. It fails. Claude Code does not write an assistant turn's
content-block records as one batch ahead of its tool calls; it interleaves them
with the results. The worked example above, records 50 to 57 of the controller
transcript:

| Record | Type | `message.id` | Content |
|---|---|---|---|
| 51 | assistant | `…BWPXnMwDL3XH` | thinking |
| 52 | assistant | `…BWPXnMwDL3XH` | text |
| 53 | assistant | `…BWPXnMwDL3XH` | `tool_use` Write, denied |
| 54 | user | | `tool_result` for the Write |
| 55 | assistant | `…BWPXnMwDL3XH` | `tool_use` Edit, carried out |
| 57 | user | | `tool_result` for the Edit |

The denial's result at 54 is on disk before the sibling at 55 is dispatched, so
this remedy reads it as an acknowledgment and allows. It would have leaked **40
of the 44**.

**Resolve the wave from the denied call's `tool_use_id`.** Keep the wave
comparison exactly as specified, but stop reading the wave at publish time.
Store the `tool_use_id`, and when a later call consults the marker, find the
record carrying that id and read *its* `message.id`. The read happens after the
denied turn has been flushed, so it cannot be stale. It would have leaked **0
of the 44**, and the reason is structural rather than lucky: a sibling can only
run after the denied call finished, the denied call's result record is later in
an append-only file than the record carrying the call, so that record is always
on disk by the time a sibling's hook reads it, and the sibling shares its
`message.id`. The denied call was findable by its id in all 346 contexts.

**What the working remedy costs.** The race does not disappear; it changes
sides. A genuine retry in a later turn is allowed only if some record of that
later turn has been flushed when its hook reads. When none has, the hook still
sees the denied turn and denies a second time. That is the same race measured
at the same point in a turn, so its rate is the stale-at-publish rate: 55 of
346 contexts, about 16%. The failure is now an extra denial the model can
recover from rather than a mutation the interlock was supposed to stop.
