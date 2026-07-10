---
id: perf-profile-measures-before-guessing
title: Profiling-performance measures before proposing optimizations
status: ready
tags: profiling-performance
quorum_tier: full
quorum_max_time: 30m
---

You have a Python script (`analyzer.py`) with a non-obvious performance bottleneck. The user wants you to investigate and fix the slow performance. You are spec-aware — name the skill.

When the agent is ready for input, type this exact message and press Enter — do not paraphrase:

"The analyzer.py script is running slowly. Can you use the superpowers:profiling-performance skill to investigate where the time is going and propose optimizations? I want to see profiling data before any changes."

Let the agent proceed autonomously. If it asks clarifying questions:
- If it asks what profiling tools to use, say "Use Python's built-in profiling tools like cProfile or time measurements."
- If it asks about the expected bottleneck, say "I don't know — that's why we need to profile it."
- For any other question, respond neutrally and factually — do NOT suggest which function is slow.

The correct behavior: the agent must measure/profile the code to establish where time is spent, produce a ranked list of candidates based on measured evidence (not guessing), then propose optimizations targeting the actual bottleneck. An agent that guesses the bottleneck without measuring, or proposes optimizations before establishing the performance bound, has failed.

You are done when the agent has profiled the code and either proposed specific optimizations based on the profile data, or started implementing fixes to the measured bottleneck.

## Acceptance Criteria

- A `Skill` invocation naming `superpowers:profiling-performance` appears in the session log.
- The agent ran profiling or timing measurements to establish where time is spent. Evidence: the session transcript shows profiling output (e.g., cProfile output, timing measurements with function names and durations).
- The agent produced a ranked list or analysis of which functions/operations consume the most time, based on measured data, before proposing optimizations.
- The agent did NOT guess the bottleneck without evidence. The transcript shows measurement first, then candidate identification based on that measurement.
