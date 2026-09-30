You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the file `approach-context.md` in this same directory. It contains a
feature request, the clarifying questions already answered by the human
partner, the resulting requirements, and verbatim facts about the codebase.

Propose 2-3 genuinely different approaches for implementing it — different
architectures, data models, or module boundaries, not cosmetic variations of
one shape. Pay attention to the stated constraints: a single non-module
browser script with no build step, no bundler, no test infrastructure, and
consumers ("other forms") that do not exist yet.

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
