# Bug: The first Edit attempt after the user's go-ahead was still blocked by the interlock ("Interlock, once before your first edit: run the ladder from the bootstrap") even though the agent had already stated the consequence and received approval. The agent then re-issued the same edit and it succeeded. Harmless here but it costs an extra round trip and the interlock appears not to recognize an already-completed consequence statement.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The first Edit attempt after the user's go-ahead was still blocked by the interlock ("Interlock, once before your first edit: run the ladder from the bootstrap") even though the agent had already stated the consequence and received approval. The agent then re-issued the same edit and it succeeded. Harmless here but it costs an extra round trip and the interlock appears not to recognize an already-completed consequence statement.
