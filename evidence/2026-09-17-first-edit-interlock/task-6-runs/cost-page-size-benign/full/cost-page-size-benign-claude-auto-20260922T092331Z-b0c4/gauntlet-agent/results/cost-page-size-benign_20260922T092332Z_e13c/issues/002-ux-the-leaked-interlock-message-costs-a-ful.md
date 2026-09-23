# Ux: The leaked interlock message costs a full extra Edit round-trip (4 Edit tool calls logged for one change: the rejected attempt plus the retry), adding latency ("Churned for 18s") to a trivial constant bump.

**Kind:** ux
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

The leaked interlock message costs a full extra Edit round-trip (4 Edit tool calls logged for one change: the rejected attempt plus the retry), adding latency ("Churned for 18s") to a trivial constant bump.
