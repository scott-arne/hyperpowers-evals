# Suggestion: The final whole-branch review (opus) found a real Important bug that the task reviewer and all three Codex task-gate lenses missed: `String.prototype.replace` expands `$` patterns, so `greet('$&')` returned 'Hello, {name}!'. It was fixed in 6d99811 and verified by the controller.

**Kind:** suggestion
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The final whole-branch review (opus) found a real Important bug that the task reviewer and all three Codex task-gate lenses missed: `String.prototype.replace` expands `$` patterns, so `greet('$&')` returned 'Hello, {name}!'. It was fixed in 6d99811 and verified by the controller.
