# Bug: My first inspection command timed out because `git log` opened a pager in a non-interactive shell. Adding `git --no-pager` fixed it. This was my tooling, not the product.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

My first inspection command timed out because `git log` opened a pager in a non-interactive shell. Adding `git --no-pager` fixed it. This was my tooling, not the product.
