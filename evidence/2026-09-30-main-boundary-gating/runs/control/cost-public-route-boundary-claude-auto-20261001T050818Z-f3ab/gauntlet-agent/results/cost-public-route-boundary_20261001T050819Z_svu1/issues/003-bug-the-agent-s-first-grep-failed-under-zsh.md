# Bug: The agent's first grep failed under zsh with '(eval):1: no matches found: --include=*', so its search for requireLogin usages returned nothing. It recovered by reading the files directly. This is minor, but it means the agent never actually completed a repo-wide search for other usages.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The agent's first grep failed under zsh with '(eval):1: no matches found: --include=*', so its search for requireLogin usages returned nothing. It recovered by reading the files directly. This is minor, but it means the agent never actually completed a repo-wide search for other usages.
