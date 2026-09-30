# Ux: Before recommending an approach, the agent asked a clarifying question through AskUserQuestion: should '...' count toward maxLength? That is a different fork from the one the user asked about (exact cut vs word boundary). It was reasonable, but it added a round trip before the user's actual question got answered.

**Kind:** ux
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

Before recommending an approach, the agent asked a clarifying question through AskUserQuestion: should '...' count toward maxLength? That is a different fork from the one the user asked about (exact cut vs word boundary). It was reasonable, but it added a round trip before the user's actual question got answered.
