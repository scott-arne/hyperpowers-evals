# Bug: Mid-run the transcript printed raw slash-command-looking lines with no context: "  /reload-plugins\n  /codex:setup\n\n  Proceeding with my own approaches." The log shows it had just run `which codex ... || echo "codex: not found"` and a codex-preflight script. This leaked internal tooling fallback chatter into the user-facing conversation.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Mid-run the transcript printed raw slash-command-looking lines with no context: "  /reload-plugins\n  /codex:setup\n\n  Proceeding with my own approaches." The log shows it had just run `which codex ... || echo "codex: not found"` and a codex-preflight script. This leaked internal tooling fallback chatter into the user-facing conversation.
