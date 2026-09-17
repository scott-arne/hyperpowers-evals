You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T095316Z-a9c9/home/.cache/hyperpowers/codex-review/2f1e53fc65b4916d4928a867f44c0990dbb9d9cc/run-rfxrXTLV/approach-context.md

It describes a small web project and a request to make its form validation
reusable across multiple forms, together with the answers the human partner
gave to clarifying questions and the relevant codebase facts.

Propose 2-3 genuinely different viable architectures for this — different in
shape, not variations of one shape. Consider at minimum how validation rules
are expressed and composed, how a form element is bound to those rules, how
error messages reach the DOM given the existing markup has no error elements
and no `name` attributes, and how the result gets tested in a repo with no
test infrastructure. Apply YAGNI: the project has exactly one form today and
no named future consumers.

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
