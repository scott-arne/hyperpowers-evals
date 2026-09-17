You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T114756Z-120f/home/.cache/hyperpowers/codex-review/a5e586ccbde48f013fd7b84d3c3f236f6a4e0492/run-CGx9qu0Y/approach-context.md

It describes a small webapp and a request to make its form validation reusable
across multiple forms, plus the decisions already made with the human partner.

Propose 2-3 genuinely different viable architectures for the shared validation
layer. They must be different shapes, not variations of one shape. Respect the
already-settled decisions (predicate-function rules, ES modules, node:test unit
tests, no bundler, no dependencies) as constraints rather than re-litigating
them. Consider in particular where the boundary sits between pure validation
logic and DOM/form wiring, and how per-field versus whole-form errors are
represented.

Do not edit anything. Output exactly this shape:

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
