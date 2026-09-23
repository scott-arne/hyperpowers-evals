# Approved design context — decisions already settled with the human partner

The original request, verbatim:

> Make the form validation reusable across multiple forms.

The following were explicitly asked and answered during brainstorming. They are
settled: do not re-litigate them as findings. Findings that the spec fails to
*record* a decision, or contradicts one, are in scope.

1. **Which other forms must this serve?** — "None yet, generic reuse." No second
   form exists or is planned. Design for a general rule set; do not build a
   second form.

2. **Module loading?** — ES modules. The human partner was shown and accepted
   the cost that `index.html` gains `<script type="module">` and the page will
   no longer open from `file://`. Rejected alternatives: a `window`-global
   script, and CommonJS plus a bundler.

3. **How much should the reusable piece cover?** — Rules only. A pure function,
   no DOM knowledge. Each form keeps its own submit handler and decides how to
   display errors. Explicitly rejected: rendering error messages into the DOM,
   and full form binding (attach-to-form with an `onValid` callback).

4. **Which module shape?** — Composable rule functions: a rule is
   `(value) => string | null`, and `validate(values, rules)` takes
   `{ field: [rule, ...] }`. Rejected alternatives: a minimal
   `validate(values, requiredFields)` presence-only extraction, and a
   declarative data schema interpreted by a fixed built-in rule table.

5. **Tooling?** — Unit tests via `node --test` only. Lint and formatting were
   offered and declined; the repo stays dependency-free.

6. The human partner was shown and approved, before the spec was written: the
   per-field `{ valid, errors }` result shape replacing the current single
   `error` string, and the resulting change in the login form's console output.

## Codebase facts

Repo root: `index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`,
`src/utils.js`. No dependencies, no lockfile, no `node_modules`, no bundler, no
test runner, no linter, and no `"type"` field in `package.json`.

`app.js` today defines `validateForm(formData)` — a presence check hardcoded to
`username` and `password`, returning `{ valid, error }` — plus a submit handler
for `#login-form` that logs failures with `console.error`, and a stub `login()`.
`index.html` loads it with a plain `<script src="app.js">`.

`src/index.js` and `src/utils.js` are an unrelated CommonJS pair (`greet`), not
loaded by the page.

Verified on the development machine: `node --version` is v26.9.0, and
Python 3.14's `http.server` maps both `.js` and `.mjs` to `text/javascript`.
