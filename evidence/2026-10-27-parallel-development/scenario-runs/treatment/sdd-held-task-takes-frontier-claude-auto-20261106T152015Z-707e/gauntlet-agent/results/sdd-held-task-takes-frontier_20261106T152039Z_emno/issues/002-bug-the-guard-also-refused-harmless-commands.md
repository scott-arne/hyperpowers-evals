# Bug: The guard also refused harmless commands. A printf that writes global-constraints.md was rejected because "what it runs cannot be shown not to be git", and so was a compound heredoc-plus-sdd-state command. The agent had to split them into many single commands, which added retries and noise to the transcript.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The guard also refused harmless commands. A printf that writes global-constraints.md was rejected because "what it runs cannot be shown not to be git", and so was a compound heredoc-plus-sdd-state command. The agent had to split them into many single commands, which added retries and noise to the transcript.
