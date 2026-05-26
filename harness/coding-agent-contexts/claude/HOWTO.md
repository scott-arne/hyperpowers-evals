# How to drive Claude Code (the agent under test)

You are driving Claude Code in a bash shell inside tmux. Claude Code is
itself an AI agent; what appears on screen is its work.

## First: cd into the scenario's prepared workdir

Your bash starts in a scratch directory, NOT the workdir the harness
prepared. Always start with:

```
cd "$HARNESS_AGENT_CWD"
```

`HARNESS_AGENT_CWD` is set in the inherited environment by the harness.
It points at the git repo the setup step prepared.

## Invocation

After `cd`, run:

```
CLAUDE_CONFIG_DIR="$CLAUDE_CONFIG_DIR" claude --dangerously-skip-permissions --plugin-dir "$SUPERPOWERS_ROOT" --model opus
```

The `CLAUDE_CONFIG_DIR` and `SUPERPOWERS_ROOT` values are burned into
this HOWTO at runtime by the harness — they look like env-var refs but
the harness has already substituted absolute paths. tmux strips arbitrary
env from new sessions, which is why we don't rely on inheritance.

`CLAUDE_CONFIG_DIR` points at a per-run isolated `.claude` dir (seeded
with dialog-bypass state) so no user-installed plugins or projects from
the host machine affect this run.

## Observing what Claude is doing

Claude writes its session log as JSONL files under
`$CLAUDE_CONFIG_DIR/projects/<derived-path>/<UUID>.jsonl`. The
`<derived-path>` is the launch cwd with every `/` replaced by `-`. The
filename itself is a UUIDv4 (e.g.
`7206a2c2-95f3-46e9-9bc8-8f6a863fcfc6.jsonl`).

The log is **ground truth** for what Claude has done — every tool call,
every Skill load, every file edit lands there. The screen is a
rendering that can lag, scroll off the top, or stay frozen during long
subagent runs even while Claude is busy. When in doubt, trust the log
over the screen.

**Use the log, not just `read_screen`, when:**

- Two `read_screen` calls in a row return near-identical content.
  Claude is probably running a long tool (subagent dispatch, a build,
  a test command) that produces no parent-screen output. Tail the log
  to see real activity.
- You need to verify a specific tool call or Skill load happened.
- The screen shows a spinner or "running" indicator with no detail.

Find the active session file:

```
find "$CLAUDE_CONFIG_DIR/projects" -name '*.jsonl' -mmin -5 -print
```

Tail it as JSONL:

```
tail -20 <path> | jq -c '{type, name: (.message.content[0].name // .type)}'
```

If the log keeps growing while the screen stays still, Claude is still
working — keep watching the log; don't conclude the run is stuck.

## Shutdown

Type `/exit` and press Enter to end the session cleanly.
