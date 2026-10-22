# Suggestion: The final review found a mismatch: design.md says the integration test runs on the real clock, but test_unit_integration.py uses FakeClock. The agent called this minor because the long soak test covers the real clock, and left it as is.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review found a mismatch: design.md says the integration test runs on the real clock, but test_unit_integration.py uses FakeClock. The agent called this minor because the long soak test covers the real clock, and left it as is.
