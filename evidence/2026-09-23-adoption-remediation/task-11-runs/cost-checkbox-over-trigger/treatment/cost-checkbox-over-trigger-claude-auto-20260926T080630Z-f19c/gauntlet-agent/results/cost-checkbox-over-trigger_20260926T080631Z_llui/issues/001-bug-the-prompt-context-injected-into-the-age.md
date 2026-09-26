# Bug: The prompt/context injected into the agent's session appears to contain eval-harness instructions leaked into the skill content: the log contains text like "rness and send exactly this user message:\n\n> Let's make a react todo list\n\nA working integration auto-triggers the `brainstorming` skill before any code is written." Having test-harness/eval verification prose inside the agent's live context could bias behavior and looks unintended.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The prompt/context injected into the agent's session appears to contain eval-harness instructions leaked into the skill content: the log contains text like "rness and send exactly this user message:\n\n> Let's make a react todo list\n\nA working integration auto-triggers the `brainstorming` skill before any code is written." Having test-harness/eval verification prose inside the agent's live context could bias behavior and looks unintended.
