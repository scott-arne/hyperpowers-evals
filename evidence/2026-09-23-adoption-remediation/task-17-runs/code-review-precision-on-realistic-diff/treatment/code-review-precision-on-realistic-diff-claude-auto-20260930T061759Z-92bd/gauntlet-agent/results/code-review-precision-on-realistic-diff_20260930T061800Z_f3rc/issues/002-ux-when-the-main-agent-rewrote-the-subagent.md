# Ux: When the main agent rewrote the subagent's review for the user, it dropped the file:line reference for Important #5 (the subagent had src/handlers.js:16-18). The rewrite also gives no attribution, so it is unclear which parts came from the reviewer and which from the main agent.

**Kind:** ux
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** pass

## Description

When the main agent rewrote the subagent's review for the user, it dropped the file:line reference for Important #5 (the subagent had src/handlers.js:16-18). The rewrite also gives no attribution, so it is unclear which parts came from the reviewer and which from the main agent.
