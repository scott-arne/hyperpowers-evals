# How to drive Pi (the agent under test)

You are driving Pi in a bash shell inside tmux. Pi is itself an AI agent; what appears on screen is its work.

## Launch Pi with one command

Your bash starts in a scratch directory, NOT the workdir quorum prepared. quorum has generated a launcher that handles everything: it cds into the prepared workdir, sources the run-local Pi auth env file, sets the isolated `PI_CODING_AGENT_DIR`, points Pi at the isolated session directory, selects the configured model, loads the Superpowers extension from `SUPERPOWERS_ROOT` and the `pi-subagents` extension, disables ambient skill and context-file discovery, explicitly loads `SUPERPOWERS_ROOT/skills`, and enables the built-in coding tools plus the `subagent` tool.

Type this one line, verbatim, as your first action:

```bash
"$QUORUM_LAUNCH_AGENT"
```

Do not hand-type a bare `pi` or reconstruct the command yourself. Launching from the scratch directory makes quorum discard the run as misconfigured.

## Observing what Pi is doing

Pi writes JSONL session logs under:

```text
$PI_CODING_AGENT_DIR/sessions/*.jsonl
```

The session JSONL is ground truth for tool calls and agent actions. The screen can lag, scroll off the top, or stay frozen while Pi is still working. When the screen and logs disagree, trust the logs.

Find the newest session:

```bash
ls -t "$PI_CODING_AGENT_DIR"/sessions/*.jsonl 2>/dev/null | head -1
```

Tail that file to inspect recent activity.

## Waiting for Pi to work

When Pi is busy, do not poll the screen with repeated sleeps. Register the session glob once after launch, then block-wait:

```text
watch_logs(glob="$PI_CODING_AGENT_DIR/sessions/*.jsonl")
wake_on_idle_log(idle_ms=60000, timeout_ms=240000)
```

Use `wake_on_idle_log(...)` to spend one inference turn waiting until the log goes idle, a new session appears, or the timeout expires.

## Tool mapping notes

Pi raw tool names are lowercase. quorum normalizes them to canonical names: `read` to `Read`, `write` to `Write`, `edit` to `Edit`, `bash` to `Bash`, `grep` to `Grep`, and `find` or `ls` to `Glob`.

Pi does not expose Claude Code's native `Skill` tool. Superpowers skill use may appear as Pi reading `skills/<name>/SKILL.md`; quorum recognizes those `Read` calls as skill invocations.

Pi also loads the `pi-subagents` extension, which provides a `subagent` tool for delegating to child agents (reviewer, worker, scout, ...). quorum normalizes `subagent` execution calls to `Agent`; management calls (`action: "list"`, `status`, ...) keep the raw name. Child agent sessions write to a subdirectory of the sessions dir named after the parent session file, so the newest `*.jsonl` directly in the sessions dir remains the main agent's log.

## Shutdown

Press Ctrl+D or type `/exit` if Pi accepts it.
