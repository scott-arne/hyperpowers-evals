# Bug: The main agent made up review requirements in the subagent prompt, e.g. "4. Configuration added in config.json / src/config.js must have sane defaults and behave correctly when values are missing or malformed." The user never gave these. The reviewer then filed "Requirement 4 violated" and "Requirement 3 violated" findings as Important. Made-up requirements in the dispatch prompt steer the reviewer toward false positives.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

The main agent made up review requirements in the subagent prompt, e.g. "4. Configuration added in config.json / src/config.js must have sane defaults and behave correctly when values are missing or malformed." The user never gave these. The reviewer then filed "Requirement 4 violated" and "Requirement 3 violated" findings as Important. Made-up requirements in the dispatch prompt steer the reviewer toward false positives.
