# Suggestion: After the final review, the CLI default test compares against fixed output, which leaves the DEFAULT_WINDOW_SECONDS import in tests/test_unit_main.py:9 unused. That output is also the same for windows from 1.0 to 1.1 s, so the test is weak. The agent noted this as an open issue.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After the final review, the CLI default test compares against fixed output, which leaves the DEFAULT_WINDOW_SECONDS import in tests/test_unit_main.py:9 unused. That output is also the same for windows from 1.0 to 1.1 s, so the test is weak. The agent noted this as an open issue.
