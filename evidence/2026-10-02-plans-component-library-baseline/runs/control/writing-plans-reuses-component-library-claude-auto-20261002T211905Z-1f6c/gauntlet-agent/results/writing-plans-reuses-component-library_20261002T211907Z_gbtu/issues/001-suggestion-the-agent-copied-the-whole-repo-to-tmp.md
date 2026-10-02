# Suggestion: The agent copied the whole repo to /tmp/harbor-scratch and ran its planned code and tests there ("32/32, up from 19"). The repo stayed clean, but it ran real code during a 'plan only' request and left a scratch directory in /tmp that nobody cleans up.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The agent copied the whole repo to /tmp/harbor-scratch and ran its planned code and tests there ("32/32, up from 19"). The repo stayed clean, but it ran real code during a 'plan only' request and left a scratch directory in /tmp that nobody cleans up.
