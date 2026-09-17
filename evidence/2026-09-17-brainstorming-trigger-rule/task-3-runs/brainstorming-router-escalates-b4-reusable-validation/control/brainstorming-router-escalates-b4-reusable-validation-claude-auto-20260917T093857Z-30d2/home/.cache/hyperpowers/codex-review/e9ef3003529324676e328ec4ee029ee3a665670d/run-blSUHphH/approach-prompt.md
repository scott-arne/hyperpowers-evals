You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T093857Z-30d2/home/.cache/hyperpowers/codex-review/e9ef3003529324676e328ec4ee029ee3a665670d/run-blSUHphH/approach-context.md

It describes a small static webapp and a request to make its form validation
reusable across multiple forms, along with the decisions already made by the
human partner (validation-only scope, ES modules, a few similar forms with
required-field plus simple format rules).

Propose 2-3 genuinely different approaches for the design of the reusable
validation module — different architectures or data models, not variations of
one shape. Focus especially on how validation rules are expressed and how
validation results are shaped, since that is the decision with the longest
half-life.

Do not edit anything. This is a read-only consultation.

Respond in exactly this shape:

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
