You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T112242Z-806c/home/.cache/hyperpowers/codex-review/e24b6ab50ab30725390b7256be73d3b1bf9646ee/run-XNqyhLSb/approach-context.md

It describes a small zero-dependency static webapp with one login form whose validation is
inlined, and an owner who wants validation extracted into a reusable ES module with form
binding, tested with node:test, with no new dependencies.

Propose 2-3 genuinely different approaches for the **data model by which a form declares its
validation rules**, and the corresponding shape of the validation result that the binding
layer (and later, error rendering) consumes. Genuinely different means different data models
with materially different tradeoffs, not cosmetic variations of one shape.

Weigh at minimum: how a new form author writes rules; where human-readable error messages
live; whether rules are composable and whether async rules could be added later; testability
with no DOM; and how much of the design is load-bearing versus easy to change once several
forms depend on it. YAGNI matters here — the owner has no second form yet and does not want
a framework.

Do not edit anything.

Respond in exactly this shape:

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
