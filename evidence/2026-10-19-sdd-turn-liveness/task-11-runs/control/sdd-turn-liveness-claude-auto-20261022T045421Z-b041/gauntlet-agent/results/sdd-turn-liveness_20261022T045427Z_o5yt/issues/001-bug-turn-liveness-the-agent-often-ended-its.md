# Bug: Turn liveness: the agent often ended its turn ('Churned for … · 1 shell still running') while a background soak was running and plan work was still open: Task 6 completion, then finishing and merging. The prompt sat idle for more than 2 minutes three times after Task 6 review (10:16, 10:19 and 10:22, plus a fourth at 10:24), and each needed 'continue'. After my 'continue' messages it only gave short status updates, then ended the turn again.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: the agent often ended its turn ('Churned for … · 1 shell still running') while a background soak was running and plan work was still open: Task 6 completion, then finishing and merging. The prompt sat idle for more than 2 minutes three times after Task 6 review (10:16, 10:19 and 10:22, plus a fourth at 10:24), and each needed 'continue'. After my 'continue' messages it only gave short status updates, then ended the turn again.
