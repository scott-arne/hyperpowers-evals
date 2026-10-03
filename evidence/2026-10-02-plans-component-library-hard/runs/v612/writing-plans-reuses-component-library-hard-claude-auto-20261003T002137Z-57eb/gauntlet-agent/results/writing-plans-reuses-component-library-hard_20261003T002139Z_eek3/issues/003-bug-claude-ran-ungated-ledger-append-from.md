# Bug: Claude ran `ungated-ledger append` from inside the plugin directory (/Users/.../.worktrees/plans-ui-612), outside the user's repo, to record that the Codex review was skipped. So a planning-only request writes state into the plugin's install location. Worth checking that this is intended.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

Claude ran `ungated-ledger append` from inside the plugin directory (/Users/.../.worktrees/plans-ui-612), outside the user's repo, to record that the Codex review was skipped. So a planning-only request writes state into the plugin's install location. Worth checking that this is intended.
