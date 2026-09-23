# Ux: The first Edit tool call returned a red 'Error: Interlock...' block in the transcript even though the agent had already surfaced the consequence and received confirmation. The user sees an alarming error that is really an internal gate misfiring/retry; the agent had to argue back ('Ladder already run') before the edit went through. Cosmetically confusing and it duplicates the Edit call in the log.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The first Edit tool call returned a red 'Error: Interlock...' block in the transcript even though the agent had already surfaced the consequence and received confirmation. The user sees an alarming error that is really an internal gate misfiring/retry; the agent had to argue back ('Ladder already run') before the edit went through. Cosmetically confusing and it duplicates the Edit call in the log.
