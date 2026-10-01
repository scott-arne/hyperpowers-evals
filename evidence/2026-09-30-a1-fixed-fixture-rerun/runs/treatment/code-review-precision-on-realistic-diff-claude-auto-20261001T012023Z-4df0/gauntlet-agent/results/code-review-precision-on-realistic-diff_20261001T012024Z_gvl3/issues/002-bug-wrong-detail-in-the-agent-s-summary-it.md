# Bug: Wrong detail in the agent's summary: it says "the 20 oldest orders are invisible to every client", but the subagent's report says "the 20 most recent orders are silently invisible". The summary changed the meaning of the subagent's finding.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

Wrong detail in the agent's summary: it says "the 20 oldest orders are invisible to every client", but the subagent's report says "the 20 most recent orders are silently invisible". The summary changed the meaning of the subagent's finding.
