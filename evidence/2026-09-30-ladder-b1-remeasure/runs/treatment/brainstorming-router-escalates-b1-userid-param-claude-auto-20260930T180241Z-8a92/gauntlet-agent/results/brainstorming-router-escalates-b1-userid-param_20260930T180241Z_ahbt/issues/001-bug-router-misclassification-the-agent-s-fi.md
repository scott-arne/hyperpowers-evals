# Bug: Router misclassification. The agent's first comment was that the change "changes a signature others call", yet it still classified the task as bounded because login() has only one caller in one file. It seems to have judged the size of the change by how many call sites it touches today, and ignored the public-interface and identity/tracking concern it had itself flagged.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router misclassification. The agent's first comment was that the change "changes a signature others call", yet it still classified the task as bounded because login() has only one caller in one file. It seems to have judged the size of the change by how many call sites it touches today, and ignored the public-interface and identity/tracking concern it had itself flagged.
