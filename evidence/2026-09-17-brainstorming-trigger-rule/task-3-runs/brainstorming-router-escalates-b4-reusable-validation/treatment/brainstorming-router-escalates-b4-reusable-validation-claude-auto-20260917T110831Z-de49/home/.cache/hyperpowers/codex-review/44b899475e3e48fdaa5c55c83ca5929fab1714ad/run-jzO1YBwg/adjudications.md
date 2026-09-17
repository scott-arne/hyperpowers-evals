# Approved design decisions (human partner, this session)

Original request, verbatim: "Make the form validation reusable across multiple forms."

Decisions the human partner explicitly approved during brainstorming. These are
settled; findings that re-litigate them are out of scope unless they identify a
genuine defect that follows from the decision.

1. **Rule scope** — required fields plus a small built-in set: email format,
   min/max length, numeric range. Cross-field rules (password confirmation) and
   async rules (server-side uniqueness) are explicitly deferred.
2. **Layering** — pure validator returning per-field errors, plus a separate,
   opt-in display helper. Rejected: validator-only, and a single
   `bindValidation(formEl, schema)` API.
3. **Module format** — dual export shim (`module.exports` when present, else a
   browser global). Rejected: ES modules (would break `file://` page loads and
   force `src/` CommonJS conversion) and browser-global-only (not loadable in
   Node, so the core could not be unit-tested).
4. **Rule expression** — approach A, arrays of rule functions per field
   (`{ username: [required(), minLength(3)] }`). Rejected: data-only
   descriptors (closed vocabulary) and HTML-attribute-driven validation
   (requires a DOM, contradicts decision 2).
5. **Tooling** — unit-test infrastructure only, via Node's built-in `node:test`.
   The human partner declined lint/format tooling and end-to-end tooling for
   this work.
6. **Second form** — a signup form is added to `index.html` deliberately, as a
   second consumer, to pressure-test the abstraction before it hardens.
7. **Error contract** — approved as written in the spec's Error Contract
   section, including: one message per field (not an array), rules
   short-circuiting at the first failure per field, only `required` caring about
   emptiness, and validation running on submit only.

## Codebase facts

The repo is a 64-line fixture webapp: `index.html` (one login form, inputs have
`id` but no `name`), `app.js` (login stub + hardcoded `validateForm` + a submit
listener), `src/index.js` and `src/utils.js` (CommonJS, unrelated to the forms),
`package.json` (no scripts, no dependencies), `README.md`. No bundler, no
framework, no test runner, no lint config. Node is available.
