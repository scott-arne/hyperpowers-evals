# Live probe of the first-edit interlock

Task 5 of `docs/hyperpowers/plans/2026-09-17-first-edit-interlock.md`. Two live
Claude Code sessions through the quorum harness, against a throwaway copy of the
branch plugin whose `hooks/first-edit-interlock` is wrapped so that every call
appends its stdin payload and the wave identifier the library read to
`hook.log`. Nothing in the worktree was changed; the two probe scenarios were
never committed.

## Commands as run

Both from the evals clone, with `ANTHROPIC_MODEL=claude-opus-5`, the proxy
variables set as for the campaign, and `P="$TMPDIR/interlock-probe"`:

```
SUPERPOWERS_ROOT="$P/plugin" env -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run --scenarios-root "$P/scenarios" probe-create --coding-agent claude-auto --repeat 1
SUPERPOWERS_ROOT="$P/plugin" env -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run --scenarios-root "$P/scenarios" probe-subagent --coding-agent claude-auto --repeat 1
```

Each live run had to be launched with the Claude Code Bash sandbox disabled.
Inside the sandbox every attempt died in `setup.sh` at `git init` with
`fatal: cannot copy '.../commit-msg.sample': Operation not permitted`: git
copies its hook templates with `copyfile()`, which carries ACLs and extended
attributes, and the sandbox refuses that for a bun-spawned descendant. Three
void attempts preceded session one: `probe-create-claude-auto-20260919T212014Z-7759`,
`-20260919T212302Z-eaff`, and `-20260919T212514Z-cc02`. None reached the agent,
so none wrote a `hook.log` entry.

## Session one, the main agent makes the first edit

Run directory: `probe-create-claude-auto-20260919T212533Z-4109` (copied here as
`session-one/`). Verdict `pass`; the Gauntlet-Agent recorded the interlock
denial as an observation, not a criterion failure.

| Check | Result |
|---|---|
| Exactly one `tool_result` carrying the interlock message | held, 1 |
| Its `tool_use_id` names a mutating call | held, `toolu_vrtx_01PMHDSrghMY9yjikSG9kwiU`, a `Write` |
| A later mutation whose result is not a denial | held, `toolu_vrtx_01VQVcGmLrSNxXWuz3UXHyze` |
| `hello.txt` in `coding-agent-workdir` with the word `hello` | held |
| The logged wave equals the in-flight record's `message.id` | held, `msg_vrtx_011CfDWJ3YoyuFp3JsgjJ49Y` |
| No entry shows `wave=unknown` | held, 2 entries, both real ids |

The main-agent path works exactly as the design states: one denial on the first
wave, the ladder run, the retry in the next assistant message carried out.

## Session two, a delegated edit

Run directory: `probe-subagent-claude-auto-20260919T213132Z-927d` (copied here as
`session-two/`). Verdict `pass` on the acceptance criterion, because a second
subagent eventually created the file; the path there is the finding.

Two subagents ran, in this order:

| Subagent transcript | Window | First mutation | Outcome |
|---|---|---|---|
| `agent-afa670b9caa2be07e` | 21:32:40Z to 21:33:19Z | `toolu_vrtx_012BFnSHxbghmfWCmEop8iz4`, a `Write`, in record `msg_vrtx_011CfDWkWn8wmYgGBupGEmKk` | denied, and so were its next three `Write` calls; it abandoned the task |
| `agent-a9e4dce5b5d3d45a3` | 21:34:31Z to 21:34:59Z | `toolu_vrtx_01BKNyVKXgtDTdH2cvxyKxzM`, a `Write`, in record `msg_vrtx_011CfDWthp8U5TJFguHs7Qat` | not denied; it wrote the file |

The first subagent's four denied `Write` calls sat in four different assistant
records: `msg_vrtx_011CfDWkWn8wmYgGBupGEmKk`, `msg_vrtx_011CfDWksS7Bw9PcVZts8qMe`,
`msg_vrtx_011CfDWmBdygYCeYKbNfK8bF`, `msg_vrtx_011CfDWmx7AffnCQL3viK1No`. Between
the second and the third it loaded the bootstrap and stated the ladder result
aloud. `hook.log` shows all four reading the same wave,
`msg_vrtx_011CfDWkXWHxPaC8kGpSDWhn`, which is none of them: it is a record in the
**controller's** transcript, timestamped 21:32:43Z, the last assistant record
written before the controller blocked on the `Agent` call. Its own closing words
were that four attempts had been refused by the same hook, including after it
had run the ladder the message asked for.

| Check | Result |
|---|---|
| The subagent's first mutation is denied with the interlock message | held for subagent one, failed for subagent two |
| A retry in a later assistant message succeeds | **failed** for subagent one, denied four times, never escaped |
| The main transcript holds no denial | held, the controller attempted no mutation (`ls -a` and `grep -rl` only) |
| `hello.txt` in the workdir with the word `hello` | held |
| The logged wave equals the `message.id` of the subagent record carrying the denied call | **failed**, it is the controller's id |
| No entry shows `wave=unknown` | held, 11 entries across both sessions, all real ids |

## Why

Claude Code puts the **controller's** `transcript_path` in the `PreToolUse`
payload for a tool call a subagent makes. Every subagent payload in `hook.log`
names `.../396df24b-eafe-4531-bea2-299339d474ce.jsonl`, never a file under
`subagents/`. The hook derives two things from that path, and both are wrong for
a subagent:

- **The state key.** `<session_id>/<transcript basename>` is meant to give a
  controller and each of its subagents one interlock apiece; the hook's own
  header says so. The run left a single marker directory,
  `home/.cache/hyperpowers/interlock/396df24b-.../396df24b-.../wave`, shared by
  the controller and both subagents. That is why subagent two was never
  interlocked: the marker already existed and the controller's wave had moved
  on, so the hook allowed its first write.
- **The wave.** A subagent's wave is read from the controller's transcript,
  which does not advance while the subagent runs. Every retry the subagent makes
  in a fresh assistant record still reads the wave frozen at dispatch, matches
  the marker, and is denied again. The first-wave rule becomes a trap with no
  exit inside the subagent's turn.

Together these invert the intended behavior: the first delegated context is
denied without limit, and every later one is not interlocked at all.

## Pins

```
full_root=2a901603a7dc862148a5b6c61c67084a99aa1439
claude_code=2.1.276
```

## Files here

`session-one/` and `session-two/` each hold the run's `verdict.json`, its
`home/.claude/projects/` transcripts, and `run-dir.txt`. `hook.log` is the
wrapper's log for both sessions in order. No workdir was copied.

campaign: held: the subagent denials carried the controller's wave id instead of the in-flight subagent record's, and the second subagent's first write was not denied
