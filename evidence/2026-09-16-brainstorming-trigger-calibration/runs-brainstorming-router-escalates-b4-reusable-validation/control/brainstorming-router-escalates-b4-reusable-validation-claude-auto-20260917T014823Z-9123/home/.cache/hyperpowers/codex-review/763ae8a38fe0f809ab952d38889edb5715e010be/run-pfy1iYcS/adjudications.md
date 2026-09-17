# Approved design decisions (settled with the human partner)

Original request, verbatim: "Make the form validation reusable across multiple forms."

These were each put to the human partner during brainstorming and approved.
They are settled inputs to the spec, not open questions:

1. **Driver: general prep / cleanup.** No concrete second form and no
   additional rules are confirmed. Approved on the understanding that the
   design stays small rather than anticipating unknown forms.

2. **Module scope: rules plus input reading.** The module validates a `<form>`
   element against a declared schema and returns errors to a caller-supplied
   callback. Rendering error UI was explicitly placed OUT of scope. The
   consequence — that `app.js` keeps logging validation failures to
   `console.error` where users cannot see them — was stated to the human
   partner before approval and accepted as a known remaining gap.

3. **ES modules.** Approved along with the stated consequence that
   `index.html` can no longer be opened via `file://` and needs a local HTTP
   server.

4. **Rules as data.** A schema of `{ field: [rule, ...] }` built from rule
   factories. The alternatives — the browser Constraint Validation API (rules
   as markup) and one hand-written validate function per form — were presented
   with tradeoffs and not chosen.

5. **Design section 1 approved as presented:** two-layer module (pure core
   plus DOM adapter), rule signature `(value, values) => string | null`,
   per-field errors, first-failing-rule-wins short-circuiting. Two offered
   revisions — dropping `minLength`, and collecting all errors per field —
   were both declined in favour of the design as presented.

6. **Tooling: unit tests, no linter.** `node:test` / `node:assert` only, zero
   dependencies. Adding eslint + prettier was offered and declined. Adding
   jsdom to unit-test the DOM adapter was offered and declined, which is why
   the spec records an explicit coverage gap for `attachValidation`.

## Codex approach gate

The approach gate fired and ran, but the companion returned an empty result
(`{}`). The gate degraded per its one-shot rule: the approaches presented to
the human partner were Claude's own, with no independent Codex input.
