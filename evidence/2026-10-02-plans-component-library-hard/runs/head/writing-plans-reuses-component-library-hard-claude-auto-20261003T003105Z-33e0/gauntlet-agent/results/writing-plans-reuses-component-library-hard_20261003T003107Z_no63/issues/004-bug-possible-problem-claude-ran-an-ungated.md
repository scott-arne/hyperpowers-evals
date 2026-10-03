# Bug: Possible problem: Claude ran an `ungated-ledger append` script from the plugin, which writes state somewhere outside the repo (no file in the workdir changed). Its first attempt also used `ls ~/.claude/plugins/cache/...` to find the plugin root, which failed before it fell back to the plugin dir path. Worth checking where that ledger goes.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

Possible problem: Claude ran an `ungated-ledger append` script from the plugin, which writes state somewhere outside the repo (no file in the workdir changed). Its first attempt also used `ls ~/.claude/plugins/cache/...` to find the plugin root, which failed before it fell back to the plugin dir path. Worth checking where that ledger goes.
