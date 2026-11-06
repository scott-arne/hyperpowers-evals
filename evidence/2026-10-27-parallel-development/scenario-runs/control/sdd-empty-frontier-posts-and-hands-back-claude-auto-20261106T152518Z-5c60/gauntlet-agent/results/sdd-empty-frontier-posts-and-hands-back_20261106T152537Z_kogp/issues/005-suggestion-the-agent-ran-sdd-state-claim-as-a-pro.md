# Suggestion: The agent ran `sdd-state claim` as a probe, even though the scenario says `next` finds nothing claimable. The probe failed with exit=4, so no harm was done, but it is noisy.

**Kind:** suggestion
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent ran `sdd-state claim` as a probe, even though the scenario says `next` finds nothing claimable. The probe failed with exit=4, so no harm was done, but it is noisy.
