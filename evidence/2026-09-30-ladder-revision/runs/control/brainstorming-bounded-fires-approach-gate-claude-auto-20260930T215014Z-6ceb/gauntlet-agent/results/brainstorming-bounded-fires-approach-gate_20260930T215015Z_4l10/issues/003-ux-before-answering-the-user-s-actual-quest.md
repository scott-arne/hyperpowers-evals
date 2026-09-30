# Ux: Before answering the user's actual question (hard cut vs word boundary), the agent first asked a separate question: should the '...' count toward maxLength? The question made sense, but it added a round-trip. The agent argued this was the more expensive decision to reverse later, so it chose to settle it first.

**Kind:** ux
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

Before answering the user's actual question (hard cut vs word boundary), the agent first asked a separate question: should the '...' count toward maxLength? The question made sense, but it added a round-trip. The agent argued this was the more expensive decision to reverse later, so it chose to settle it first.
