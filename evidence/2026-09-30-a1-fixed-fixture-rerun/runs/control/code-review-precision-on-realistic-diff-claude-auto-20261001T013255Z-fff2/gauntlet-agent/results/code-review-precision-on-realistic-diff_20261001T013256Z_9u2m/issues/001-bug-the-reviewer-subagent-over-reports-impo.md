# Bug: The reviewer subagent over-reports. Important findings about withRetry (only reachable if config sets attempts to 0 or leaves it out, but config.json sets 3), about listOrders called with no arguments (no such caller exists), and about the log-and-rethrow catch are presented as Should Fix and hold back the merge.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

The reviewer subagent over-reports. Important findings about withRetry (only reachable if config sets attempts to 0 or leaves it out, but config.json sets 3), about listOrders called with no arguments (no such caller exists), and about the log-and-rethrow catch are presented as Should Fix and hold back the merge.
