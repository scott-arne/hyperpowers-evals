# Live probe of the first-edit interlock

Three live Claude Code sessions run against the amended hook, on 2026-09-22, to
answer the one question the 2026-09-20 campaign could not: does the interlock deny
*every* mutation call in the first mutating turn, in a real session, including the
siblings that arrive in the same wave as the call that published the marker?

It does. All three sessions passed every check the plan names, and the campaign
may start.

## Pins

```
full_root=9e9d66542f7e0ebf35a4bc4b776ec7dff76dbdef
claude_code=2.1.276
```

Model `claude-opus-5` throughout, `permission_mode=bypassPermissions`.

## Commands as run

The probe tree was built under `$TMPDIR/interlock-probe` with the shipped hook
wrapped by a tracing shim: the wrapper does no work of its own before the hook and
takes no reading of its own, and `INTERLOCK_PROBE_TRACE` makes the real
`interlock-lib.cjs` append one line per transcript read from inside the running
hook. Every number below the session verdicts is therefore the hook's report of its
own reads, not a second reader sampled beside it.

```bash
P="$TMPDIR/interlock-probe"

# session one
SUPERPOWERS_ROOT="$P/plugin" env -u SLASH_COMMAND_TOOL_CHAR_BUDGET \
  bun run quorum run --scenarios-root "$P/scenarios" probe-create \
  --coding-agent claude-auto --repeat 1

# session two
SUPERPOWERS_ROOT="$P/plugin" env -u SLASH_COMMAND_TOOL_CHAR_BUDGET \
  bun run quorum run --scenarios-root "$P/scenarios" probe-subagent \
  --coding-agent claude-auto --repeat 1

# session three: probe-batch, repeated until ten repetitions present a first
# wave of more than one mutation call, to a ceiling of twenty sessions
bash "$P/session-three.sh"
```

## Run directories

| Session | Scenario | Run directory |
|---|---|---|
| one | probe-create | `results/probe-create-claude-auto-20260922T065433Z-b13c` |
| two | probe-subagent | `results/probe-subagent-claude-auto-20260922T070247Z-a7d1` |
| three run-1 | probe-batch | `results/probe-batch-claude-auto-20260922T070737Z-1e70` |
| three run-2 | probe-batch | `results/probe-batch-claude-auto-20260922T070927Z-8909` |
| three run-3..10 | probe-batch | see `session-three/run-dirs.txt` |

Each session's `verdict.json` and `home/.claude/projects/` tree is copied here under
`session-one/`, `session-two/`, and `session-three/run-<i>/`. No workdir is copied.
The hook logs are `hook-session-one.log` and `hook-session-two.log`; session three's
per-repetition logs, qualify output, run directories, and summary are in
`session-three/`.

## Session one -- probe-create, one writer

Harness verdict **pass**; post-check `file-exists hello.txt`. The judge recorded
"one interlock error appeared on the first Write attempt; the agent self-resolved
and retried successfully." Gauntlet 1m23s/228K, Coding 0m18s/102K.

`qualify.cjs` printed `repetition one: did not qualify` -- expected, because one
writer cannot produce a wave of two -- over the line that matters:

    7941cd3d-….jsonl: first mutating turn msg_vrtx_011CfJ3G4bdnZY5W2XWwSKr2
      held 1 mutation call(s), 1 denied; 1 denied turn(s) in all

Checks:

- Exactly one `tool_result` carrying `Interlock, once before your first edit`, on
  `toolu_vrtx_012gt87xTgtrmPMCVPLLkygR`, a `Write`.
- A later `Write`, `toolu_vrtx_01MT9VTujQpCE3g9X61Eod7H`, in a strictly later
  assistant record, was allowed.
- `coding-agent-workdir/hello.txt` contains `hello`.
- Both log entries carry a non-empty `call=` and a `stored=` equal to the denied
  call's id. No `stored=none`, no `stored=unknown`.
- Resolution: `toolu_vrtx_012gt87xTgtrmPMCVPLLkygR` -> `msg_vrtx_011CfJ3G4bdnZY5W2XWwSKr2`
  in the context transcript `7941cd3d-….jsonl`, cross-checked against line 26 of
  that file, the assistant record whose `message.id` is that id and whose content
  carries the denied `tool_use`. Not `absent`, `noid`, or `unreadable`.

## Session two -- probe-subagent, three writers in one session

Harness verdict **pass**; post-checks `one.txt`, `two.txt`, `three.txt`. The
controller wrote `one.txt` itself and dispatched two sequential subagents for the
others, so the session produced the three mutating contexts the probe requires.
Gauntlet 2m27s/277K, Coding 0m52s/424K.

    049dc555-….jsonl:              first mutating turn msg_vrtx_011CfJ3tY96AELes9A9vgkgV held 1 mutation call(s), 1 denied
    agent-a8d6c307ca6e67bc3.jsonl: first mutating turn msg_vrtx_011CfJ3vgxidVK7STxdo79aW held 1 mutation call(s), 1 denied
    agent-ac6521869e600d27e.jsonl: first mutating turn msg_vrtx_011CfJ3uVb5QEUSfjgBbkxdJ held 1 mutation call(s), 1 denied

Each of the three contexts holds exactly one denial, on a `Write`, followed by an
allowed `Write` in a strictly later assistant record. `one.txt`, `two.txt`, and
`three.txt` contain `one`, `two`, and `three`.

**Check 1 -- each subagent's denied call resolves inside its own transcript and
nowhere else.** Pass, for all four subagent entries:

| Context | Denied call | Resolves in own transcript | Against the controller's |
|---|---|---|---|
| `agent-ac6521869e600d27e` | `toolu_vrtx_01WZ3UW4CySxZ8qJQPZLjNkB` | `msg_vrtx_011CfJ3uVb5QEUSfjgBbkxdJ` | `absent` |
| `agent-ac6521869e600d27e` | `toolu_vrtx_017Rxbovh3hrd94kVU1Lwn7E` | `msg_vrtx_011CfJ3umT4aDqip2hPnsP6g` | `absent` |
| `agent-a8d6c307ca6e67bc3` | `toolu_vrtx_01CeZ4RWffE1rbQBPMNTkvBi` | `msg_vrtx_011CfJ3vgxidVK7STxdo79aW` | `absent` |
| `agent-a8d6c307ca6e67bc3` | `toolu_vrtx_01K7jfWcDqKnKuuiEzLqgMwX` | `msg_vrtx_011CfJ3vy2MqmqbuxCmAoZij` | `absent` |

Every entry's own `ctx_transcript=` is that subagent's
`…/subagents/agent-<id>.jsonl`, not the controller's. The controller's own denied
call `toolu_vrtx_01D9adSzNJ6ZvoNarFxgqpXt` resolves to
`msg_vrtx_011CfJ3tY96AELes9A9vgkgV` in the controller transcript. The 2026-09-19
failure -- a subagent's denied call resolving in the controller's transcript -- does
not reproduce.

**Check 2 -- the second subagent's first mutation was denied too.** Pass; both
subagents were gated at their own first write.

**Check 3 -- exactly three marker directories, each holding a `call` file and no
`wave` file.** Pass, counted before the strip. The layout is session-scoped: one
outer directory named for the session, three context directories inside it.

    interlock/049dc555-cd7a-4267-846f-a45f72d246dd/049dc555-cd7a-4267-846f-a45f72d246dd/call = toolu_vrtx_01D9adSzNJ6ZvoNarFxgqpXt
    interlock/049dc555-cd7a-4267-846f-a45f72d246dd/agent-a8d6c307ca6e67bc3/call             = toolu_vrtx_01CeZ4RWffE1rbQBPMNTkvBi
    interlock/049dc555-cd7a-4267-846f-a45f72d246dd/agent-ac6521869e600d27e/call             = toolu_vrtx_01WZ3UW4CySxZ8qJQPZLjNkB

No `wave` file anywhere, and never one shared context directory.

**Check 4 -- every subagent payload carries an `agent_id`.** Pass; 4 of 4 subagent
entries, `agent_id` `ac6521869e600d27e` and `a8d6c307ca6e67bc3`. The payload shape
the context rule is derived from has not changed.

Across the seven log entries, no `stored=none` and no `stored=unknown`.

## Session three -- probe-batch, four writers in one turn

    qualifying=10 interlock_held=yes sessions=10

**Every mutation call in the first mutating turn was denied, in all ten.** This is
the shape the campaign failed in and the case neither session above can produce.
`qualify.cjs` exits 1 when a mutation of an already-denied turn is carried out; it
never did. No allowed sibling anywhere.

All ten sessions qualified, so the loop stopped at its tenth session without needing
a replacement, well inside the ceiling of twenty. All ten harness verdicts are
**pass**, with post-checks `alpha.txt`, `beta.txt`, `gamma.txt`, `delta.txt`.

Turn shape, grouped by `message.id` -- Claude Code writes one transcript record per
`tool_use` block, so counting records over-counts the turns of a batched wave
fourfold:

| Runs | Turn 1 | Turn 2 | Turn 3 |
|---|---|---|---|
| 1, 2, 3, 5, 6, 9, 10 | 4 calls, 4 denied | 4 calls, 2 denied | 2 calls, 0 denied |
| 4, 7, 8 | 4 calls, 4 denied | 4 calls, 3 denied | 3 calls, 0 denied |

The four first-wave calls of each run resolve to that run's single first-turn
message id, which is what makes them one wave rather than four turns:

| Run | First mutating turn | The four denied calls all resolve to it |
|---|---|---|
| 1 | `msg_vrtx_011CfJ4GBr4eTuqrawZE7SRg` | yes |
| 2 | `msg_vrtx_011CfJ4Q2xkB8pf2hiEdm2kU` | yes |
| 3 | `msg_vrtx_011CfJ4XfLxbymJ5uu3ErQrY` | yes |
| 4 | `msg_vrtx_011CfJ4fEXwH177bNZk7g2Q2` | yes |
| 5 | `msg_vrtx_011CfJ4oCxefkEYUPndQDDdu` | yes |
| 6 | `msg_vrtx_011CfJ4vrnvmCxWCaQjqR2gv` | yes |
| 7 | `msg_vrtx_011CfJ54FZLjzhfp2YBnsuNi` | yes |
| 8 | `msg_vrtx_011CfJ5BqcABH6gfDzXSXUto` | yes |
| 9 | `msg_vrtx_011CfJ5L4rMeNA2DY2hmfojK` | yes |
| 10 | `msg_vrtx_011CfJ5Ufat4XSpgcQ2oRqZR` | yes |

The individual call ids are in `session-three/hook-<i>.log`.

### Cost, reported and not gated

Summed across the ten qualifying repetitions, over 103 mutation attempts:

| Number | Value |
|---|---|
| Calls whose own record the hook did not find on its first read | 42 |
| Calls that fell through to the step-8 fallback | 31 |
| Contexts denied in two turns | 10 |

Observation, no target: 20 of 103 attempts (19.4%) had to poll on their read of the
*denied* call's record -- the wave race the 2026-09-20 amendment closes, now visible
from inside the hook. The pre-amendment campaign measured it after the fact at 55 of
346 contexts, about 15.9%. 19.4% is close to that benchmark rather than far above
it, and the amendment means a poll now costs a retry rather than a leak.

The two-turn number is 10 of 10 contexts: every batch session paid a second denial.
This is the documented residue of the amendment -- a retry denied again in the turn
immediately after the first denial -- now quantified in the shape that provokes it
hardest, and it errs in the safe direction. Two or three of the four retries are
denied once more, the rest are allowed, a third turn clears the remainder, and the
task still finishes: all ten runs wrote all four files and passed.

campaign: may start
