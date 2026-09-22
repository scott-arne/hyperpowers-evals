# Live probe of the first-edit interlock, 2026-09-20

Task 5 of `docs/hyperpowers/plans/2026-09-17-first-edit-interlock.md`, re-run
against the amended hook. The first run of this task is preserved beside this
one at `../probe-2026-09-19-held/`: it held the campaign because a subagent's
`PreToolUse` payload carries the **controller's** `transcript_path`, so a
controller and all its subagents collapsed into one interlock context. Task 2
was amended to key the context on `agent_id`, the spec was re-gated, and this
run measures the amended hook.

## Commands as run

Both sessions ran from the evals clone with the probe copy of the plugin
(the branch head with a logging wrapper around the hook), with
`ANTHROPIC_MODEL=claude-opus-5` and the proxy variables set as for the
campaign. `P=$TMPDIR/interlock-probe`.

```
SUPERPOWERS_ROOT="$P/plugin" ANTHROPIC_MODEL=claude-opus-5 env -u SLASH_COMMAND_TOOL_CHAR_BUDGET \
  bun run quorum run --scenarios-root "$P/scenarios" probe-create --coding-agent claude-auto --repeat 1

SUPERPOWERS_ROOT="$P/plugin" ANTHROPIC_MODEL=claude-opus-5 env -u SLASH_COMMAND_TOOL_CHAR_BUDGET \
  bun run quorum run --scenarios-root "$P/scenarios" probe-subagent --coding-agent claude-auto --repeat 1
```

Both sessions ran inside the Claude Code Bash sandbox and neither failed in
`setup.sh`. The held run needed the sandbox disabled to get past `git init`;
this pair did not. Treat the sandbox requirement recorded with that run as a
property of the attempt, not of the harness.

Neither session was voided. Two attempts, two completed sessions.

## Run directories

| Session | Scenario | Run directory | Harness verdict |
|---|---|---|---|
| one | `probe-create` | `results/probe-create-claude-auto-20260920T063333Z-c86c` | pass, 1 post-check |
| two | `probe-subagent` | `results/probe-subagent-claude-auto-20260920T063702Z-6c71` | pass, 3 post-checks |

The scenarios are throwaway and are not committed. Session one asks the agent
to create `hello.txt` itself. Session two asks for three files from three
writers: the controller writes `one.txt`, then dispatches one subagent for
`two.txt` and, after it finishes, a second for `three.txt`.

## Session one, the main agent makes the first edit

Session id `f03b7560-3ec5-4dad-8ee5-2f2bf95203cc`.

| Call | tool_use id | message.id | Outcome |
|---|---|---|---|
| first `Write` | `toolu_vrtx_01X6YUYdE5woE4PtxNrU7xvN` | `msg_vrtx_011CfEE4rXK8dbqi4sH8YEbX` | denied |
| retry `Write` | `toolu_vrtx_01F4DFgfZfe1MzijaidDHiV8` | `msg_vrtx_011CfEE5GPFphidFT6d7VRub` | allowed |

Exactly one `tool_result` in the transcript carries the denial text
`Interlock, once before your first edit`, and it names the first `Write`. The
retry lands in a later assistant turn and succeeds. `hello.txt` holds `hello`.
The `hook.log` entry for the denied call logs
`wave=msg_vrtx_011CfEE4rXK8dbqi4sH8YEbX`, the `message.id` of the assistant
record that carries the denied `tool_use`. No entry in either session logs
`wave=unknown`.

The judge read the denial as a transient internal error the agent recovered
from, which is what a caller sees and is not a check.

## Session two, three writers in one session

Session id `57e4ffa0-3aca-47cf-8d7e-e744304fa183`. Each of the three contexts
mutated, and each was interlocked at its own first write.

| Context | Denied tool_use | message.id of the denied call | Retry message.id | Retry outcome |
|---|---|---|---|---|
| controller (`one.txt`) | `toolu_vrtx_01BUQcVukMaHUGoutFgP22tY` | `msg_vrtx_011CfEELL1xXAVpiELQgKsrh` | `msg_vrtx_011CfEELiu7wdkAqQCWDg4rL` | allowed |
| `agent-a2c080753c6fa71ec` (`two.txt`) | `toolu_vrtx_01LUoiPtCnZyvR1EsWFck8X8` | `msg_vrtx_011CfEEMHWvDqtXQ8QtroCTk` | `msg_vrtx_011CfEEMaGyu7oRwMHd94Zod` | allowed |
| `agent-a071b07ff7fa14631` (`three.txt`) | `toolu_vrtx_01Q3zKkG6MH7uKYgFHjnhydi` | `msg_vrtx_011CfEEND44SXz2nFiSuo35j` | `msg_vrtx_011CfEENaSRu7FsurGxNLLfV` | allowed |

Each `message.id` above comes from the transcript of the context that made the
call: the controller's from
`home/.claude/projects/*/57e4ffa0-….jsonl`, each subagent's from its own
`…/57e4ffa0-…/subagents/agent-<id>.jsonl`. A later controller `Bash` call
(`msg_vrtx_011CfEEP2DyD7As27CTKu15A`) was allowed. `one.txt`, `two.txt`, and
`three.txt` all exist with their own word.

### The four checks

1. **Each subagent's denial logs a wave from that subagent's own transcript.**
   Held. `agent-a2c080753c6fa71ec` logged
   `wave=msg_vrtx_011CfEEMHWvDqtXQ8QtroCTk` and `agent-a071b07ff7fa14631`
   logged `wave=msg_vrtx_011CfEEND44SXz2nFiSuo35j`; both are `message.id`
   values in the subagent's own transcript, and neither matches any controller
   record. This is the check the 2026-09-19 run failed.
2. **The second subagent was gated too.** Held. Both subagents were denied
   their first `Write` and both retried successfully. The held run gated only
   the first.
3. **Exactly three marker directories, never one shared directory.** Held.
   Counted before the strip, under
   `<run-dir>/home/.cache/hyperpowers/interlock/57e4ffa0-3aca-47cf-8d7e-e744304fa183/`:
   `57e4ffa0-3aca-47cf-8d7e-e744304fa183`, `agent-a071b07ff7fa14631`, and
   `agent-a2c080753c6fa71ec`. Each `wave` file holds its own context's denied
   `message.id`, the three values in the table above.
4. **Every subagent payload carries `agent_id`.** Held. The four subagent
   entries in `hook.log` carry `agent_id` (`a2c080753c6fa71ec`,
   `a071b07ff7fa14631`); the three controller entries carry none, which is the
   shape the context rule expects.

## What is here

`hook.log` holds all nine entries from both sessions, each a header line
(`--- <time> decision=… context=… wave=… ctx_transcript=…`) followed by the
`PreToolUse` payload the hook read. Session one is the first four lines, two
entries; session two is the remaining fourteen lines, seven entries. `session-one/` and `session-two/` hold each run's
`verdict.json`, its `run-dir.txt`, and its `home/.claude/projects/` tree,
stripped as Task 6 Step 4 strips a run.

## Pins

```
full_root=9f1ce762ad4ee771c25ceae3c5f56e04e7310e73
claude_code=2.1.276
```

campaign: may start
