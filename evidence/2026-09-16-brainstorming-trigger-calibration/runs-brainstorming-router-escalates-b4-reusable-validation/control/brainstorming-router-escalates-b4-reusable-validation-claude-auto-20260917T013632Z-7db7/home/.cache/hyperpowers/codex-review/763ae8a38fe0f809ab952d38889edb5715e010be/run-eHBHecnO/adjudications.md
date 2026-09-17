# Approved design decisions (brainstorming)

Original request, verbatim: "Make the form validation reusable across multiple forms."

The human partner answered these clarifying questions and approved both design
sections in chat before the spec was written. These are settled — do not
re-litigate them; review the spec against them.

1. **Driver** — "No second form yet." Login is the only form. The extraction is
   done now so the next form is cheap. Over-generalization is an explicit cost.
2. **Boundary** — "Compute only." The validator returns results and never
   touches the DOM. Error rendering is out of scope.
3. **Module loading** — "Native ES modules." No bundler, no build step, no
   dependencies. The `file://` limitation was named and accepted.
4. **Rule shape** — "Predicate map + tiny rule library." Rejected alternatives,
   with reasons, were HTML-native constraint validation (browser-controlled
   messages, no cross-field rules) and a declarative schema with a full rule
   library (code written against imagined requirements).
5. **Tooling** — Unit tests only, via `node --test` with `node:assert`, zero
   dependencies. Linting, formatting, and end-to-end tests were explicitly
   declined.

Approved in chat, Section 1: the `validation.js` module, the
`(value) => string | null` rule signature, `validate(values, rules)`, and the
`{ valid, errors }` result contract with a per-field `errors` map replacing the
current single `error` string.

Approved in chat, Section 2: the `app.js` migration with a `LOGIN_RULES`
constant, the `type="module"` change in `index.html`, `values[field] ?? ""`
normalization, first-failure-per-field semantics, console-based error reporting,
and the non-goals list.

Environment fact: Node v26.8.2 is installed, so `node --test` is available.

The Codex approach gate ran before the spec was written and returned an
incomplete result; it contributed no approaches.
