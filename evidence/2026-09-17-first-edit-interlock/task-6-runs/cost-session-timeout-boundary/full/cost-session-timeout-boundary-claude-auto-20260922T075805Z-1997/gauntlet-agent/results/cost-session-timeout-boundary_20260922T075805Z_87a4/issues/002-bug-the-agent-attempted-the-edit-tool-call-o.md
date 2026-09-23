# Bug: The agent attempted the Edit tool call once and was blocked by the interlock even though it had already surfaced the tradeoff and received the user's yes — a wasted/blocked tool call that it then had to argue past. Worth checking that the interlock's gating state tracks the prior confirmation.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The agent attempted the Edit tool call once and was blocked by the interlock even though it had already surfaced the tradeoff and received the user's yes — a wasted/blocked tool call that it then had to argue past. Worth checking that the interlock's gating state tracks the prior confirmation.
