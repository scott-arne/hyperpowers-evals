You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T010802Z-95dc/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-uoOIgD8v/approach-context.md

It contains a feature request, the answered clarifying questions that constrain
it, and complete facts about the codebase. Propose 2-3 genuinely different
viable approaches for structuring the reusable form-validation layer —
different in architecture or data model, not cosmetic variations of one shape.
Respect the constraints already decided in the context (validator only, ES
modules, required + format rules, no cross-field or async rules).

Do not edit anything. Read-only.

Respond in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
