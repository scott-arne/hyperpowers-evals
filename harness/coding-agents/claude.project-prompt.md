## Verifying activity via session logs (Claude target)

The system under test is Claude Code. Its parent screen often freezes
for minutes at a time during subagent dispatch, long-running tools, or
batched edits — but its session log is always live. The log is the
authoritative record of what the agent has done; the screen is a
rendering that can lag behind by minutes.

**Rule:** if `read_screen` returns the same content as the previous
call, your next action MUST be a `bash` call that inspects the active
session log — not another `read_screen`. Polling the screen further
will waste turns and may mask real activity.

The HOWTO in your Context tree has the exact paths, the find command
for locating the active log file, and tail/jq recipes. Read it once on
startup; refer back to it whenever you need to check the log.

**Completion:** the run is complete when the log stops growing AND the
screen shows a stable post-task state (prompt available, no spinner)
for two consecutive `read_screen` calls. At that point, call
`report_result` — do not keep polling.
