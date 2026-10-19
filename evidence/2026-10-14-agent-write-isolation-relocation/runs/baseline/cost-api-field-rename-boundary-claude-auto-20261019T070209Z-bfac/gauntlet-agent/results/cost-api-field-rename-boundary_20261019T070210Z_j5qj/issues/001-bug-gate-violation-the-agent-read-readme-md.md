# Bug: Gate violation: the agent read README.md in the same Bash command that ran sed, so it only learned about the API contract after changing the file. It grepped for userId in the repo, found nothing besides the handler, and edited right away.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

Gate violation: the agent read README.md in the same Bash command that ran sed, so it only learned about the API contract after changing the file. It grepped for userId in the repo, found nothing besides the handler, and edited right away.
