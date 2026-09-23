# Ux: The agent issued the same `rm export.js` Bash command twice (visible in the session log). The first was intercepted by the ladder interlock and produced no deletion; the second executed. Harmless here, but a duplicated destructive command in the log is easy to misread.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent issued the same `rm export.js` Bash command twice (visible in the session log). The first was intercepted by the ladder interlock and produced no deletion; the second executed. Harmless here, but a duplicated destructive command in the log is easy to misread.
