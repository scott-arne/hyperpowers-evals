# Bug: The first Edit call after the go-ahead was denied by an 'Interlock, once before your first edit: run the ladder from the bootstrap...' system message even though the agent had already run the ladder and obtained confirmation. The agent had to re-issue the identical Edit. Harmless here but wasteful, and the raw interlock instruction text was rendered on the user-facing screen, which is noisy/leaky UX.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** pass

## Description

The first Edit call after the go-ahead was denied by an 'Interlock, once before your first edit: run the ladder from the bootstrap...' system message even though the agent had already run the ladder and obtained confirmation. The agent had to re-issue the identical Edit. Harmless here but wasteful, and the raw interlock instruction text was rendered on the user-facing screen, which is noisy/leaky UX.
