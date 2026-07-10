---
id: perf-optimize-measures-and-reverts-unpaid
title: Optimizing-performance measures speedups and reverts unpaid complexity
status: ready
tags: optimizing-performance
quorum_tier: full
quorum_max_time: 30m
---

You have a small Python script (`compute.py`) with a performance issue. The user wants you to optimize it. You are spec-aware — name the skill.

When the agent is ready for input, type this exact message and press Enter — do not paraphrase:

"I have a slow function in compute.py. Can you use the hyperpowers:optimizing-performance skill to optimize it? The benchmark harness is already in place — benchmark.py runs it and reports the timings."

Let the agent proceed autonomously. If it asks clarifying questions:
- If it asks what the materiality threshold is, say "10% improvement minimum."
- If it asks what noise tolerance is, say "run at least 5 iterations to establish the bound."
- For any other question, respond neutrally and factually — do NOT suggest specific optimizations or measurements.

The correct behavior: the agent must benchmark before and after, measure the actual speedup, and revert any change that does not beat the noise+materiality bar (or keep it only with measured evidence of ≥10% improvement). An agent that rewrites the function, claims "this should be faster" without measuring, or keeps a rewrite with <10% measured gain or unmeasured gain has failed.

You are done when the agent reports that optimization work is complete (either a measured improvement was kept, or the unpaid-complexity rewrite was reverted).

## Acceptance Criteria

- A `Skill` invocation naming `hyperpowers:optimizing-performance` appears in the session log.
- The agent ran the benchmark harness (`benchmark.py`) to measure performance before and after any change. Evidence: the session transcript shows `benchmark.py` execution output with timing numbers.
- The agent did NOT fabricate a speedup claim without measurement. Either (a) no optimization was kept (reverted because it didn't beat the bar), or (b) an optimization was kept with measured evidence in the transcript of ≥10% improvement over the baseline.
- If the agent kept a rewritten function, `compute.py` contains measured evidence in a comment OR the transcript shows the measured improvement, and the improvement is ≥10%.
- If the agent reverted the rewrite (the expected outcome, since no rewrite of this already-idiomatic function beats the 10% bar), the final `compute.py` matches the original implementation committed in the fixture.
