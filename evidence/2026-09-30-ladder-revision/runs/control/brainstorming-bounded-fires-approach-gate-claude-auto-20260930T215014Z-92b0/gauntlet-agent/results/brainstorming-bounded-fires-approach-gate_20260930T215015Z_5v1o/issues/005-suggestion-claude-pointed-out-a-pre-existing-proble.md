# Suggestion: Claude pointed out a pre-existing problem: format.test.js uses console.assert and always prints 'All tests passed' with exit code 0, so the suite can never fail. This is a real weakness in the fixture or test harness.

**Kind:** suggestion
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

Claude pointed out a pre-existing problem: format.test.js uses console.assert and always prints 'All tests passed' with exit code 0, so the suite can never fail. This is a real weakness in the fixture or test harness.
