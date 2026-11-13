# Bug: The fix subagent added a 'Co-Authored-By: Claude Sonnet 5.5' trailer to commit edca8a5 even though, by the controller's own account, the dispatch forbade it. The controller noticed, left it in place, and disclosed it at the finishing step.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The fix subagent added a 'Co-Authored-By: Claude Sonnet 5.5' trailer to commit edca8a5 even though, by the controller's own account, the dispatch forbade it. The controller noticed, left it in place, and disclosed it at the finishing step.
