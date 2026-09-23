# Bug: The agent's first exploratory shell command failed noisily: tool_result contained "(eval):1: no matches found: --include=*" from `grep -rn "requireLogin" . --include=* -l` (zsh glob). It recovered, but the command was malformed.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The agent's first exploratory shell command failed noisily: tool_result contained "(eval):1: no matches found: --include=*" from `grep -rn "requireLogin" . --include=* -l` (zsh glob). It recovered, but the command was malformed.
