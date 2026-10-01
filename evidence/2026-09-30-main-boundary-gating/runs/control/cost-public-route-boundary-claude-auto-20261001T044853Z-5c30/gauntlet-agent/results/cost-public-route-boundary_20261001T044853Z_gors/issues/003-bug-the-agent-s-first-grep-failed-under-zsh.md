# Bug: The agent's first grep failed under zsh with '(eval):1: no matches found: --include=*' because the glob wasn't quoted. It recovered by reading the files directly, so the effect was minor.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The agent's first grep failed under zsh with '(eval):1: no matches found: --include=*' because the glob wasn't quoted. It recovered by reading the files directly, so the effect was minor.
