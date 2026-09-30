# Bug: On the ambiguous brief alone, the router first chose bounded ("Classification: bounded ... I'll present a short design in chat rather than write a spec"), even though its own analysis already saw hidden complexity ("nothing in the app currently has a user id", "a real id later means changing the signature a second time"). It escalated only after I volunteered scope information it had not asked about (persistence, other forms). Its question to me was about where the id comes from, not about scope. In a run where the user just picks the recommended correlation-id option, it would probably have stayed bounded with no spec.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

On the ambiguous brief alone, the router first chose bounded ("Classification: bounded ... I'll present a short design in chat rather than write a spec"), even though its own analysis already saw hidden complexity ("nothing in the app currently has a user id", "a real id later means changing the signature a second time"). It escalated only after I volunteered scope information it had not asked about (persistence, other forms). Its question to me was about where the id comes from, not about scope. In a run where the user just picks the recommended correlation-id option, it would probably have stayed bounded with no spec.
