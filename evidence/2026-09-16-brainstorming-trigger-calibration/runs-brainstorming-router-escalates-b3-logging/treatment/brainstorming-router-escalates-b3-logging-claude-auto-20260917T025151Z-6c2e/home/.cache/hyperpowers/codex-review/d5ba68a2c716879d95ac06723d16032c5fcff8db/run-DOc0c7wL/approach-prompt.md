You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Read `approach-context.md` in this same directory. It contains a feature request, the answered
clarifying questions, and the complete relevant facts of a small codebase.

Propose 2-3 genuinely different viable architectures for the logging subsystem described there.
Genuinely different means different structural shapes, not variations of one shape with different
names. Consider in particular: how the shared core and the two runtime adapters are factored given
that the browser side has no bundler and uses plain `<script>` globals while the Node side is
CommonJS; how records are persisted on each side; how allow-list redaction is enforced; how
persisted logs are retrieved for debugging; and how the log level is controlled at runtime.

Do not edit anything. This is read-only analysis.

Respond in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
