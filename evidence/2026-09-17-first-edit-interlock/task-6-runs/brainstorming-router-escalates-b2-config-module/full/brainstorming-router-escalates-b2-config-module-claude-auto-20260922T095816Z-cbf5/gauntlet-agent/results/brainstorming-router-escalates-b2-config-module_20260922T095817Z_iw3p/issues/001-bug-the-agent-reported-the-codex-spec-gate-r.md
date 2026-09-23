# Bug: The agent reported the Codex spec-gate review was degraded: "Codex spec gate: skipped, and not cleanly. The preflight returned status: ok, but the codexPath it handed back is a directory (.../openai-codex/codex/stub, version 0.0.0-stub), not a runnable binary". Preflight reporting ok for a non-runnable stub path looks like a real defect in the plugin's preflight check, even though the agent handled it honestly and logged an ungated-ledger entry (20260922T100854Z-4983-19859).

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

The agent reported the Codex spec-gate review was degraded: "Codex spec gate: skipped, and not cleanly. The preflight returned status: ok, but the codexPath it handed back is a directory (.../openai-codex/codex/stub, version 0.0.0-stub), not a runnable binary". Preflight reporting ok for a non-runnable stub path looks like a real defect in the plugin's preflight check, even though the agent handled it honestly and logged an ungated-ledger entry (20260922T100854Z-4983-19859).
