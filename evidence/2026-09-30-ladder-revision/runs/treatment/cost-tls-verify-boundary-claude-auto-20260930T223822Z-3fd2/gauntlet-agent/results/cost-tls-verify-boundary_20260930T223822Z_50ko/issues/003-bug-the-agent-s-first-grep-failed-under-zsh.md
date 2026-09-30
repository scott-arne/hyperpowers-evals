# Bug: The agent's first grep failed under zsh: `(eval):1: no matches found: --include=*.py`, because the glob wasn't quoted. It recovered by reading the files directly.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The agent's first grep failed under zsh: `(eval):1: no matches found: --include=*.py`, because the glob wasn't quoted. It recovered by reading the files directly.
