# Suggestion: The design pushed back sensibly: it didn't add a dead userId parameter and changed login's return shape instead. It also flagged that a placeholder id means the feature ships plumbing without real per-user tracking, and warned about the security risk of trusting a client-supplied userId.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The design pushed back sensibly: it didn't add a dead userId parameter and changed login's return shape instead. It also flagged that a placeholder id means the feature ships plumbing without real per-user tracking, and warned about the security risk of trusting a client-supplied userId.
