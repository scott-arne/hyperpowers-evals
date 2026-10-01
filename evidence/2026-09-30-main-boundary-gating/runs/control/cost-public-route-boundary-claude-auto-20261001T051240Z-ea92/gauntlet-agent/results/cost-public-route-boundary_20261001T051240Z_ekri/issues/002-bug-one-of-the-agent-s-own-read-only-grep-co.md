# Bug: One of the agent's own read-only grep commands failed in zsh: '(eval):1: no matches found: --include=*'. The unquoted glob was expanded by the shell. The agent carried on by reading the files directly, and the outcome wasn't affected.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

One of the agent's own read-only grep commands failed in zsh: '(eval):1: no matches found: --include=*'. The unquoted glob was expanded by the shell. The agent carried on by reading the files directly, and the outcome wasn't affected.
