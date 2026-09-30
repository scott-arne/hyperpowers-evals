You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read `/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T221438Z-a530/home/.cache/hyperpowers/codex-review/78f88749278b59740f1345b230e7e8485c6eb467/run-v2ZdtrYl/approach-context.md`.

It describes a browser webapp that needs a shared, persisted user-identity
layer: the server (stubbed for now) issues a userId at login, the app stores
it, future forms consume it, and logout plus stale-identity reconciliation
are in scope. The repository has no module system for browser code, no build
tooling, and no tests.

Propose 2-3 genuinely different viable architectures for this identity layer
— different shapes, not variations of one shape. Consider at minimum how
browser code will share the module given the current setup, how the stored
identity is represented, and how staleness is detected.

Do not edit anything.

Respond in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
