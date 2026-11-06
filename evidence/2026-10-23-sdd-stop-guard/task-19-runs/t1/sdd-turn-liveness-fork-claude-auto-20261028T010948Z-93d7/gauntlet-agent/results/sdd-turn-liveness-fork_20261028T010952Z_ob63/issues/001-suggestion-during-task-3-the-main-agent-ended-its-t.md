# Suggestion: During Task 3 the main agent ended its turn: the prompt showed idle and the last line was 'The Task 3 implementer (sliding window) is running. It includes the roughly 4-minute short soak test, so it will take longer than the first two.' Only the background-agent row showed a running timer. I waited and sent nothing. When the subagent finished, about 4m42s later, the agent resumed by itself. This is the turn-liveness behaviour the story is measuring; to a user it can look like a stop.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness-fork
**Scenario Status:** pass

## Description

During Task 3 the main agent ended its turn: the prompt showed idle and the last line was 'The Task 3 implementer (sliding window) is running. It includes the roughly 4-minute short soak test, so it will take longer than the first two.' Only the background-agent row showed a running timer. I waited and sent nothing. When the subagent finished, about 4m42s later, the agent resumed by itself. This is the turn-liveness behaviour the story is measuring; to a user it can look like a stop.
