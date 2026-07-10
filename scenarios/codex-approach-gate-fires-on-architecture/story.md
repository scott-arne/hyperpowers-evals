---
id: codex-approach-gate-fires-on-architecture
title: Approach gate fires on architecture decision and excludes own candidates
quorum_tier: full
---

# Approach Gate Fires on Architecture-Rich Brainstorm

You are testing whether `hyperpowers:brainstorming` correctly fires the Codex approach gate when a task involves genuine architecture choices, and whether the blind handoff and aggregation work as specified.

## Your Role

You are bringing an architecture-rich idea to `hyperpowers:brainstorming`. You will answer its clarifying questions neutrally and observe whether it consults Codex for approaches, properly excludes its own candidate approaches from the handoff, and presents a shortlist with provenance tags.

## Opening Message

Send this exact message to the Coding-Agent. Do NOT paraphrase or reword it:

> Let's build a distributed job queue system. The queue should handle task scheduling, retries, and dead-letter processing. I expect this will involve architectural decisions about storage, coordination, and worker distribution.
>
> FIXTURE-IDEA-7Q4

## Responding to Questions

The brainstorming skill will ask clarifying questions. Answer neutrally and factually. Do NOT volunteer architecture preferences, algorithm suggestions, or implementation details — the point is to see if the gate fires and whether Codex's ideas are presented independently.

Suggested neutral responses:
- Scale questions: "Start with a few thousand tasks per day, growing to tens of thousands."
- Durability: "Tasks should survive process restarts."
- Language/stack: "Python, standard libraries preferred."
- Latency: "Best-effort delivery within a few seconds is fine."

## When to Stop

You are done when the Coding-Agent has presented 2-3 architecture approaches with tradeoffs and made a recommendation, OR when it says the brainstorming phase is complete. If it asks you to choose an approach, pick the first one it recommended.

## Acceptance Criteria

- The Coding-Agent invoked `hyperpowers:brainstorming` (native `Skill` call or shell read of `SKILL.md`).
- The approach gate fired before approaches were presented to you (evidence: Codex was invoked at the approaches step, visible in the transcript or session log).
- The blind handoff excluded the agent's own candidate approaches from the `approach-context.md` file handed to Codex. The handoff should contain the original idea text, clarifying Q&A, and codebase facts, but NOT Claude's own approaches or framings.
- The presented shortlist carried light provenance tags distinguishing Codex-sourced approaches (`(Codex)`) from convergence (`(both converged)`).

Grading notes:
- If the agent presents approaches without any evidence of Codex involvement, and the deterministic checks show no Codex stub call, the agent skipped the gate — this is a FAIL.
- If the agent pastes its own candidate approaches into the handoff context file, the blind-handoff contract is violated — this is a FAIL.
- If the final shortlist lacks provenance tags, or tags everything as its own work, the aggregation step failed — this is a FAIL.
- Partial credit: if the gate fired and the handoff was blind, but provenance is missing, that is a partial pass (document it in your grading notes).
