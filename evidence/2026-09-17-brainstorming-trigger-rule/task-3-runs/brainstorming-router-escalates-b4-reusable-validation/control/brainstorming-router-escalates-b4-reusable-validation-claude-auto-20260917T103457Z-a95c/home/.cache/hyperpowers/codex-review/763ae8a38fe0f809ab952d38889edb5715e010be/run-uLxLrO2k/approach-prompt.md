You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read this file for the full context of the task:

/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T103457Z-a95c/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-uLxLrO2k/approach-context.md

It describes a small static webapp whose single login form has inline, hardcoded
validation. The goal is to make form validation reusable across multiple forms
that do not exist yet and whose rules are not yet known. The context file records
the decisions already made with the human partner (pure core plus a separate
optional DOM-binding layer; ES modules; no bundler) and the complete state of the
codebase.

Propose 2-3 genuinely different approaches for the design of the validation core
and its rule vocabulary — different data models, different rule representations,
different composition strategies — not cosmetic variations of one shape. Consider
in particular: how a rule is represented and registered, how a form's spec is
declared, how per-field and cross-field errors are modelled, and how the optional
DOM layer attaches without the core depending on the DOM.

Do not edit anything. This is a read-only consultation.

Respond in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
