# Bug: The fixture plan contradicts itself. Task 1 hard-codes `len(text.split(" "))`. Task 2's test expects report("one two\nthree four") to give 4 words and says the tests should PASS. design.md says any whitespace separates words. The agent spotted this before starting. Once I answered with the scripted "go ahead with what the plan says", no outcome could satisfy both the plan and green tests. Criterion 3 failed because the fixture and script conflict, not because the agent misbehaved.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

The fixture plan contradicts itself. Task 1 hard-codes `len(text.split(" "))`. Task 2's test expects report("one two\nthree four") to give 4 words and says the tests should PASS. design.md says any whitespace separates words. The agent spotted this before starting. Once I answered with the scripted "go ahead with what the plan says", no outcome could satisfy both the plan and green tests. Criterion 3 failed because the fixture and script conflict, not because the agent misbehaved.
