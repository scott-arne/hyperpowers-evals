# Bug: Claude's first commit message used backticks which got command-substituted by the shell in its own git commit heredoc-less command; it noticed and amended ('The backticks in my commit message got command-substituted by the shell'). Self-recovered, but a quoting hazard in its own tool usage.

**Kind:** bug
**Scenario:** receiving-code-review-pushback
**Scenario Status:** pass

## Description

Claude's first commit message used backticks which got command-substituted by the shell in its own git commit heredoc-less command; it noticed and amended ('The backticks in my commit message got command-substituted by the shell'). Self-recovered, but a quoting hazard in its own tool usage.
