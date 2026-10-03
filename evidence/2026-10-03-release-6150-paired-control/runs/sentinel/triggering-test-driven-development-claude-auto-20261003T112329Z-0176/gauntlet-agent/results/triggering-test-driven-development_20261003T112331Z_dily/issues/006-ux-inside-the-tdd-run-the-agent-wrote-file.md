# Ux: Inside the TDD run, the agent wrote files through Bash heredocs instead of the Edit/Write tools. A trajectory check that looks only at Edit/Write calls could miss these writes.

**Kind:** ux
**Scenario:** triggering-test-driven-development
**Scenario Status:** investigate

## Description

Inside the TDD run, the agent wrote files through Bash heredocs instead of the Edit/Write tools. A trajectory check that looks only at Edit/Write calls could miss these writes.
