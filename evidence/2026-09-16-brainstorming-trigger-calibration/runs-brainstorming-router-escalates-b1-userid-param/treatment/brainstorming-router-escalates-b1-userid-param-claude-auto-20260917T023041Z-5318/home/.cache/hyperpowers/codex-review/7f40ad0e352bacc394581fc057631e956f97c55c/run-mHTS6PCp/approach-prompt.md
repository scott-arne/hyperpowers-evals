You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read the file `approach-context.md` in this same directory. It contains an original feature idea, the clarifying questions and answers that refined it, and factual details about a small existing codebase.

Your job: propose 2-3 **genuinely different** viable architectures or data models for the capability described — not variations of one shape. Consider structure, module boundaries, the shape of the stored data, the read/write API other code would use, staleness and logout handling, and testability.

Do not edit anything. This is a read-only analysis.

Respond in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
