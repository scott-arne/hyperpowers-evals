# Bug: The router's first classification of a signature-changing request ('add a userId parameter to login') was 'bounded'. It escalated only after the user said they wanted persistence. The agent's own analysis noted the change 'changes the signature' and changes login()'s return contract, but it did not count that as a reason to take the architectural path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router's first classification of a signature-changing request ('add a userId parameter to login') was 'bounded'. It escalated only after the user said they wanted persistence. The agent's own analysis noted the change 'changes the signature' and changes login()'s return contract, but it did not count that as a reason to take the architectural path.
