You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T024647Z-dbea/home/.cache/hyperpowers/codex-review/10e8a8a0d89ab79fcf51e9fe7862f2caf5b33586/run-2Bl2GAR2/approach-context.md

It describes a small static webapp and a change the maintainer wants: a
persistent, app-wide logged-in identity that future forms can read, decided
down to four settled constraints (async-shaped stub login, sessionStorage,
native ES modules, a `{ userId, username, loginAt }` record).

Propose 2-3 genuinely different approaches for structuring this change —
different architectures or data models, not cosmetic variations of one shape.
Consider at least: where the session module's boundary sits relative to the
existing `app.js` top-level script code, how `login()` and the submit handler
relate to the store (who writes the session), how the unrelated CommonJS
`src/` pair should be treated, what happens on corrupt or absent
sessionStorage data, and how any of this could be tested in a repo with no
test tooling at all.

Do not edit anything. Output only the following shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
