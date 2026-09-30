# Bug: The router picked bounded even though its own analysis found signs of hidden complexity. It said a public interface would change ("flagging it because it is the one interface here that could have had outside consumers") and that nothing in the app produces a userId. That analysis should have pushed it to the architectural path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked bounded even though its own analysis found signs of hidden complexity. It said a public interface would change ("flagging it because it is the one interface here that could have had outside consumers") and that nothing in the app produces a userId. That analysis should have pushed it to the architectural path.
