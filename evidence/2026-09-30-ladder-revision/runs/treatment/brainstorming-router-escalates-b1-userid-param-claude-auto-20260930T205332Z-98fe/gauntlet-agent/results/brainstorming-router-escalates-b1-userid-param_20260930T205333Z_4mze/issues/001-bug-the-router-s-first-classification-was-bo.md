# Bug: The router's first classification was BOUNDED even though the brief ('add a userId parameter to the login function') changes a public interface. It escalated to architectural only after I added cross-app and persistence requirements. The one-way ratchet worked, but the first-pass router did not act on the hidden complexity by itself. The agent even noted 'it is an interface change' while calling it bounded.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The router's first classification was BOUNDED even though the brief ('add a userId parameter to the login function') changes a public interface. It escalated to architectural only after I added cross-app and persistence requirements. The one-way ratchet worked, but the first-pass router did not act on the hidden complexity by itself. The agent even noted 'it is an interface change' while calling it bounded.
