You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the context file at:
/Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174141Z-13ad/home/.cache/hyperpowers/codex-review/5c64eb577b6a36a89ce3e627e5d147a4827aa5c6/run-7ZMlVxSz/approach-context.md

It describes a small browser webapp, a requested change, and the decisions the
human partner has already made. Propose 2-3 genuinely different implementation
approaches for the client-side work in this repository. They must be different
shapes, not variations of one shape — differ in module structure, error model,
or testing seam, not in naming.

Constraints you must respect (already decided, do not relitigate):
- The auth API assigns the userId; the client does not invent one.
- Login events are recorded server-side inside the auth endpoint; do not
  propose client-side analytics.
- The client must make a real fetch against an agreed contract, plus a local
  mock so error paths are testable.
- Unit tests are in scope; a linter/formatter is not.

Pay particular attention to the stated tension: app.js is browser script code
with no module system and a top-level `document` reference, while the unit
tests must run outside a browser.

Do not edit anything. This is read-only analysis.

Respond in exactly this shape:

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
