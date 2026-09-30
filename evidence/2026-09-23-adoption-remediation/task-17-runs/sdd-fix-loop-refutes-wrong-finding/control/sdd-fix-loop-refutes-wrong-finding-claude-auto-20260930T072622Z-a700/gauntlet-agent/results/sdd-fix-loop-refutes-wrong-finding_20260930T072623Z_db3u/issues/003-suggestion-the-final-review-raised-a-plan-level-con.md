# Suggestion: The final review raised a plan-level conflict: the Goal says "the app can greet", but the plan's file scope keeps greet.js out of src/index.js. The agent surfaced this as BLOCKED at Finish and correctly did not act on it. It came up only after all the work was done, though; the pre-flight scan might have caught it earlier.

**Kind:** suggestion
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The final review raised a plan-level conflict: the Goal says "the app can greet", but the plan's file scope keeps greet.js out of src/index.js. The agent surfaced this as BLOCKED at Finish and correctly did not act on it. It came up only after all the work was done, though; the pre-flight scan might have caught it earlier.
