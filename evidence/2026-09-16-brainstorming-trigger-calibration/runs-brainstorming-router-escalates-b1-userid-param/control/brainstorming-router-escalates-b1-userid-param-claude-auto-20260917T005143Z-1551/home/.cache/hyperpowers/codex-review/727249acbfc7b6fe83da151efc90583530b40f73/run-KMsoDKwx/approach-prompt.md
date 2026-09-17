You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the file `approach-context.md` in this same directory. It contains a feature request, the answers a human partner gave to clarifying questions, and facts about the codebase.

Propose 2-3 genuinely different viable architectures or data models for implementing it. They must be materially different in shape and tradeoffs, not variations of one design. Consider module structure, how the identifier and consent state are stored and shaped, and how consumers reach the identifier given there is no module system in this codebase.

Do not edit anything. This is read-only analysis.

Output in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
