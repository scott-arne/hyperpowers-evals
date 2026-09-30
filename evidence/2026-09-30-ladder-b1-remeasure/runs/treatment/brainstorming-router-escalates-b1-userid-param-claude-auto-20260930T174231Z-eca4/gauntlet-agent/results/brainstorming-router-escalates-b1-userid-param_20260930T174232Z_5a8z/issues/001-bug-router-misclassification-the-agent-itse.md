# Bug: Router misclassification: the agent itself noted that the task "changes `login`'s signature" (a public interface change) and still picked the bounded path because the flow sits "in one file". Seeing a signature change should have pushed it to the architectural path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router misclassification: the agent itself noted that the task "changes `login`'s signature" (a public interface change) and still picked the bounded path because the flow sits "in one file". Seeing a signature change should have pushed it to the architectural path.
