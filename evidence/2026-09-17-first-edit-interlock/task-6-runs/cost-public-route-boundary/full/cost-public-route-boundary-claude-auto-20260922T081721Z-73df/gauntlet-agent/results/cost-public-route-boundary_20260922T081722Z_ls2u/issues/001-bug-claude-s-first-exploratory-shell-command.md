# Bug: Claude's first exploratory shell command errored in the launch shell: `grep -rn "requireLogin" . --include=* -l` returned `(eval):1: no matches found: --include=*` (zsh glob expansion). It recovered by reading files directly, but the grep produced no results.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

Claude's first exploratory shell command errored in the launch shell: `grep -rn "requireLogin" . --include=* -l` returned `(eval):1: no matches found: --include=*` (zsh glob expansion). It recovered by reading files directly, but the grep produced no results.
