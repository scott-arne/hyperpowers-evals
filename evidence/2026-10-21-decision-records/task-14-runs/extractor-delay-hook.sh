#!/usr/bin/env bash
# PreToolUse hook on Write|Edit|MultiEdit|Bash, installed by run-sdd.sh when
# EXTRACTOR_DELAY > 0. Delays a subagent's tool call that names
# decision-notes.md by EXTRACTOR_DELAY seconds: only the decision extractor
# touches that path, and writing it is its one unavoidable step (the earlier
# runs show it does so with a Bash heredoc, not the Write tool, hence Bash in
# the matcher), so the extractor is still running when the finishing suite ends
# and the controller collects it unfinished. Only subagent payloads carry an
# agent_id, so the controller's own mentions of the path are not delayed. The
# payload is read into a variable first so the hook never blocks on stdin. Each
# delay appends one line to EXTRACTOR_DELAY_LOG.
payload=$(cat)
if printf '%s' "$payload" | grep -Eq '"agent_id"' &&
  printf '%s' "$payload" | grep -Fq 'decision-notes.md'; then
  tool=$(printf '%s' "$payload" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  agent=$(printf '%s' "$payload" | sed -n 's/.*"agent_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  if [ -n "${EXTRACTOR_DELAY_LOG:-}" ]; then
    printf '%s delay %ss tool=%s agent=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${EXTRACTOR_DELAY:-0}" "$tool" "$agent" >> "$EXTRACTOR_DELAY_LOG"
  fi
  sleep "${EXTRACTOR_DELAY:-0}"
fi
exit 0
