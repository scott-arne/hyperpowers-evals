# Bug: The Codex review gate couldn't run: "codex-plugin-cc isn't installed ... plugin registry not found". The agent logged it as a skipped gate in the review ledger and told the user. Its first preflight attempt also guessed the plugin root path wrong (CLAUDE_PLUGIN_ROOT / cache glob) before it retried with the real path.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The Codex review gate couldn't run: "codex-plugin-cc isn't installed ... plugin registry not found". The agent logged it as a skipped gate in the review ledger and told the user. Its first preflight attempt also guessed the plugin root path wrong (CLAUDE_PLUGIN_ROOT / cache glob) before it retried with the real path.
