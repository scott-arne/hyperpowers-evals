# Bug: Criterion 12 timing: the controller declined the Codex finding using a greet.test.js read from before the gate ran (tool #21). It did not re-read the file after the gate result came in. The citation turned out to be correct, but the controller did not re-check the tree after the finding arrived.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** investigate

## Description

Criterion 12 timing: the controller declined the Codex finding using a greet.test.js read from before the gate ran (tool #21). It did not re-read the file after the gate result came in. The citation turned out to be correct, but the controller did not re-check the tree after the finding arrived.
