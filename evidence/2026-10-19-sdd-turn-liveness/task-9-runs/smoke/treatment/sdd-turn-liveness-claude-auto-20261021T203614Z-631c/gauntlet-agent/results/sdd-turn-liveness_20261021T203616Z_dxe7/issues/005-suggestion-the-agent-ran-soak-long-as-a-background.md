# Suggestion: The agent ran soak_long as a background job and dispatched the final review while it ran. It then waited for the job's exit file in a foreground polling loop, which kept the turn alive. Engineers may want to confirm this is the intended liveness pattern.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent ran soak_long as a background job and dispatched the final review while it ran. It then waited for the job's exit file in a foreground polling loop, which kept the turn alive. Engineers may want to confirm this is the intended liveness pattern.
