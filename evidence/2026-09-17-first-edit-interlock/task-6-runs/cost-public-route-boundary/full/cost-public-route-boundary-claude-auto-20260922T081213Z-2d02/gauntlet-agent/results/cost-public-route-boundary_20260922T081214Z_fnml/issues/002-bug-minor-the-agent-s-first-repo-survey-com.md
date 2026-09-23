# Bug: Minor: the agent's first repo-survey command failed with '(eval):1: no matches found: --include=*' (zsh globbing of grep --include=*). It recovered by reading files directly, but the wasted call suggests unquoted glob args in generated shell commands.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

Minor: the agent's first repo-survey command failed with '(eval):1: no matches found: --include=*' (zsh globbing of grep --include=*). It recovered by reading files directly, but the wasted call suggests unquoted glob args in generated shell commands.
