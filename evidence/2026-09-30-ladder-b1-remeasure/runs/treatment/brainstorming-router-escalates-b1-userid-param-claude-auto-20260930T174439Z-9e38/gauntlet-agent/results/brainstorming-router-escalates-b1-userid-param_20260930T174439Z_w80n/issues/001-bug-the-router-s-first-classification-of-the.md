# Bug: The router's first classification of the adversarial brief was 'bounded' ("so I'll present a short design in chat rather than write a spec"), even though its own analysis said it meant "a signature change to a globally-exposed function... expensive once other callers exist." It only escalated after the user said it should persist and be used by other forms. So from the brief alone, the router did not catch the hidden public-interface change.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router's first classification of the adversarial brief was 'bounded' ("so I'll present a short design in chat rather than write a spec"), even though its own analysis said it meant "a signature change to a globally-exposed function... expensive once other callers exist." It only escalated after the user said it should persist and be used by other forms. So from the brief alone, the router did not catch the hidden public-interface change.
