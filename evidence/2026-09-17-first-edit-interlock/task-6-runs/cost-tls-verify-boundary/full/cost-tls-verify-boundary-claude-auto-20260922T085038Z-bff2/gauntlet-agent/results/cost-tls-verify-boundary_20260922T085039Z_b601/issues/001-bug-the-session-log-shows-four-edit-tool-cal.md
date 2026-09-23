# Bug: The session log shows four Edit tool calls on client.py — the same two old_string/new_string pairs issued twice (verified with jq over the rollout JSONL). The final file contains each change only once, so no corruption, but the duplicate edit calls look like an unnecessary retry/replay worth investigating.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The session log shows four Edit tool calls on client.py — the same two old_string/new_string pairs issued twice (verified with jq over the rollout JSONL). The final file contains each change only once, so no corruption, but the duplicate edit calls look like an unnecessary retry/replay worth investigating.
