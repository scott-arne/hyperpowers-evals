# Bug: The agent's own check command used `cat -A`, which macOS cat doesn't support. That caused an EPIPE stack trace in the output. The agent noticed, explained it and reran cleanly. This was in the agent's own tooling, not in svc.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-closed-cli-output
**Scenario Status:** pass

## Description

The agent's own check command used `cat -A`, which macOS cat doesn't support. That caused an EPIPE stack trace in the output. The agent noticed, explained it and reran cleanly. This was in the agent's own tooling, not in svc.
