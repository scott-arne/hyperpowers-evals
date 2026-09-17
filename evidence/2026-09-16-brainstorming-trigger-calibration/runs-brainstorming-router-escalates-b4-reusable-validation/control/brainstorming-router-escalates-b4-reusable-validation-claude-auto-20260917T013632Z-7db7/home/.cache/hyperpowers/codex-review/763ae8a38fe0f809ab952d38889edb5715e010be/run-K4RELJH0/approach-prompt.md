You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T013632Z-7db7/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-K4RELJH0/approach-context.md

It describes a small static webapp and a request to make its form validation
reusable across multiple forms, along with the decisions already made with the
human partner (compute-only validator, native ES modules, no second form exists
yet).

Propose 2-3 genuinely different approaches — different architectures or data
models for how validation rules are declared and evaluated, not variations of
one shape. Weigh them against the fact that only one form exists today, so
over-generalization is a real cost.

Do not edit anything. Output only in this shape:

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
