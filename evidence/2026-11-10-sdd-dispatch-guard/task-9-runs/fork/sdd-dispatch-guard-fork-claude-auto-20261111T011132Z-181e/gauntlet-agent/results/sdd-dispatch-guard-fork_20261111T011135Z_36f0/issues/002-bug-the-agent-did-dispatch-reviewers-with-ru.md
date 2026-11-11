# Bug: The agent did dispatch reviewers with run_in_background:"true", but as a string rather than a boolean. Implementer Task 2 got run_in_background:"false" (also a string). Worth checking that the tool reads these string values correctly.

**Kind:** bug
**Scenario:** sdd-dispatch-guard-fork
**Scenario Status:** fail

## Description

The agent did dispatch reviewers with run_in_background:"true", but as a string rather than a boolean. Implementer Task 2 got run_in_background:"false" (also a string). Worth checking that the tool reads these string values correctly.
