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
claude --dangerously-skip-permissions --plugin-dir "$SUPERPOWERS_ROOT" --model opus
```

`$SUPERPOWERS_ROOT` is set in the inherited environment.

## Observing what Claude is doing

Claude writes its session log as JSONL files under
`~/.claude/projects/<derived-path>/session-*.jsonl`. You can `tail` or
`jq` this file to see what tools Claude has invoked. Useful when the
screen is mid-render or you want ground truth on tool usage.

The exact subdirectory under `~/.claude/projects/` is derived from the
cwd Claude was launched in. After launching, find the newest matching
file:

```
find ~/.claude/projects -name 'session-*.jsonl' -mmin -5 -print
```

## Shutdown

Type `/exit` and press Enter to end the session cleanly.
