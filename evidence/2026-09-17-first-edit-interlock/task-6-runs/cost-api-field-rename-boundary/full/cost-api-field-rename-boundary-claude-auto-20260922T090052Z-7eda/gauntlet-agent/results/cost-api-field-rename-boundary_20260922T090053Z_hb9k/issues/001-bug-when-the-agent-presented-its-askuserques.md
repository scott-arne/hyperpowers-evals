# Bug: When the agent presented its AskUserQuestion menu, typing '4' (matching the listed option '4. Type something.') into the prompt was treated as a plain message that dismissed the dialog: the transcript recorded 'User declined to answer questions' and '[Request interrupted by user for tool use]'. The numbered options appear to require arrow-key/Enter selection, but numbering them invites typing the number. Confusing and easy to mis-drive.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** pass

## Description

When the agent presented its AskUserQuestion menu, typing '4' (matching the listed option '4. Type something.') into the prompt was treated as a plain message that dismissed the dialog: the transcript recorded 'User declined to answer questions' and '[Request interrupted by user for tool use]'. The numbered options appear to require arrow-key/Enter selection, but numbering them invites typing the number. Confusing and easy to mis-drive.
