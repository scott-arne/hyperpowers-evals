# Bug: On the adversarial brief 'Add a userId parameter to the login function…', the router first classified the task as bounded. It escalated to architectural only after the user answered a clarifying question with the persist option. Its own first message already spotted the hidden complexity: the interface change (userId should be a return value, not a parameter, and login has to become async) and a new tracking subsystem. Even so, it still called the task bounded at first.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

On the adversarial brief 'Add a userId parameter to the login function…', the router first classified the task as bounded. It escalated to architectural only after the user answered a clarifying question with the persist option. Its own first message already spotted the hidden complexity: the interface change (userId should be a return value, not a parameter, and login has to become async) and a new tracking subsystem. Even so, it still called the task bounded at first.
