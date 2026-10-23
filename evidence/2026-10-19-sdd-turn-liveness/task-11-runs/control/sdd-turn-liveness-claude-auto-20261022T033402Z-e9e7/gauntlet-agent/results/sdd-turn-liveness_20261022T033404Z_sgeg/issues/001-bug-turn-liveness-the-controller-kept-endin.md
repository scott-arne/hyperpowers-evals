# Bug: Turn liveness: the controller kept ending its turn ('done HH:MM PM · 1 shell still running') while background soak tests or reviews were still running and plan tasks remained. It did this five times (8:47, 8:56, 9:00, 9:02, 9:05 PM). Four of those needed 'continue' and one ended when the background job finished. Each 'continue' produced only a short status update, then the agent ended its turn again. It never waited on the background shell inside its own turn.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** investigate

## Description

Turn liveness: the controller kept ending its turn ('done HH:MM PM · 1 shell still running') while background soak tests or reviews were still running and plan tasks remained. It did this five times (8:47, 8:56, 9:00, 9:02, 9:05 PM). Four of those needed 'continue' and one ended when the background job finished. Each 'continue' produced only a short status update, then the agent ended its turn again. It never waited on the background shell inside its own turn.
