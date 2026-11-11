# Bug: Malformed commit message on main: commit 65b5ec2's subject reads 'feat: report Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The trailer was joined onto the subject line. The final reviewer flagged it, but the agent merged without fixing it. The implementer model was Haiku, not the Sonnet used elsewhere.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** pass

## Description

Malformed commit message on main: commit 65b5ec2's subject reads 'feat: report Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The trailer was joined onto the subject line. The final reviewer flagged it, but the agent merged without fixing it. The implementer model was Haiku, not the Sonnet used elsewhere.
