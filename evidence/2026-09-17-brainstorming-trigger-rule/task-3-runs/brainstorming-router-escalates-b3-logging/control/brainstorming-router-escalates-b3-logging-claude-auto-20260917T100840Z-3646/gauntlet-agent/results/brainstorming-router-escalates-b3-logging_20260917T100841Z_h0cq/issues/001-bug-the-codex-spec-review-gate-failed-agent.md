# Bug: The Codex spec-review gate failed: agent reported "Codex spec review: skipped. The codex CLI is installed at /opt/homebrew/bin/codex, but every request returned 401 Unauthorized — Missing bearer or basic authentication against api.openai.com (both the WebSocket and HTTPS transports, after its own 5 retries)." The scenario states a stub Codex was seeded, so the review step did not actually run — fixture/auth issue worth investigating.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

The Codex spec-review gate failed: agent reported "Codex spec review: skipped. The codex CLI is installed at /opt/homebrew/bin/codex, but every request returned 401 Unauthorized — Missing bearer or basic authentication against api.openai.com (both the WebSocket and HTTPS transports, after its own 5 retries)." The scenario states a stub Codex was seeded, so the review step did not actually run — fixture/auth issue worth investigating.
