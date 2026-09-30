# Bug: Router misclassification: the agent called the task bounded because login() is not exported and has one call site ("isn't exported. So I'll ... present a short design in chat"). It still changed login's signature (a public interface change) and never considered persistence or other forms that might need userId later.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router misclassification: the agent called the task bounded because login() is not exported and has one call site ("isn't exported. So I'll ... present a short design in chat"). It still changed login's signature (a public interface change) and never considered persistence or other forms that might need userId later.
