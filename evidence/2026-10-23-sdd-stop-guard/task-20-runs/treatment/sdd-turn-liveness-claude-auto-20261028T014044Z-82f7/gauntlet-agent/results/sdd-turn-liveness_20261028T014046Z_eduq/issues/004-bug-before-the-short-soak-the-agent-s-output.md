# Bug: Before the short soak the agent's output redirect failed because the reports directory didn't exist yet. It said 'My redirect failed because the reports directory didn't exist yet' and reran. The soak wrapper should create that directory itself.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Before the short soak the agent's output redirect failed because the reports directory didn't exist yet. It said 'My redirect failed because the reports directory didn't exist yet' and reran. The soak wrapper should create that directory itself.
