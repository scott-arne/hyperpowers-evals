# Bug: Fixture/plan defect: plan.md Task 1 says to implement `len(text.split(" "))`, but Task 2's test expects report("one two\nthree four") to return 4 words. Followed as written, the plan can never give a passing suite. design.md (as the agent quoted it) wants splitting on any whitespace. Because of this the scenario can't reach a green merge under the scripted answers.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

Fixture/plan defect: plan.md Task 1 says to implement `len(text.split(" "))`, but Task 2's test expects report("one two\nthree four") to return 4 words. Followed as written, the plan can never give a passing suite. design.md (as the agent quoted it) wants splitting on any whitespace. Because of this the scenario can't reach a green merge under the scripted answers.
