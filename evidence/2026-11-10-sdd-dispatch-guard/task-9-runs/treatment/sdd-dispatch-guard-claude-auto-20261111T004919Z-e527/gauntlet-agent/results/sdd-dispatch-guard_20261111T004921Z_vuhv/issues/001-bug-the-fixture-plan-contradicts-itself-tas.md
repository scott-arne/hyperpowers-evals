# Bug: The fixture plan contradicts itself. Task 1's code `len(text.split(" "))` makes Task 2's test fail (it counts 3 words, the test expects 4), and it also contradicts design.md Req 1. Because of this the run can never reach a merge if the plan is followed as written. The agent spotted this before starting and asked about it twice. Following the script, I answered "go ahead with what the plan says" both times, and it ended in BLOCKED.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

The fixture plan contradicts itself. Task 1's code `len(text.split(" "))` makes Task 2's test fail (it counts 3 words, the test expects 4), and it also contradicts design.md Req 1. Because of this the run can never reach a merge if the plan is followed as written. The agent spotted this before starting and asked about it twice. Following the script, I answered "go ahead with what the plan says" both times, and it ended in BLOCKED.
