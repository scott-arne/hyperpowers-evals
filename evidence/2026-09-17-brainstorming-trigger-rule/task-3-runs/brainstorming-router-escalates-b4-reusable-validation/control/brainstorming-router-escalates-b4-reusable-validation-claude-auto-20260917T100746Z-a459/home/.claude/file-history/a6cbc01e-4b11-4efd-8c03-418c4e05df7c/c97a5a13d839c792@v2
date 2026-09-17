# Approved design decisions (brainstorming record)

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Decisions the human partner made, in order

1. **Rule scope** — required fields plus basic formats (email format, min/max
   length, numeric range). Synchronous, self-contained per field. Cross-field
   rules and async/server-checked rules were offered and NOT chosen; they are
   deliberately out of scope.
2. **Error presentation** — inline per-field messages in the DOM, cleared on
   the next submit. Console-only, a single summary block, and
   inline-plus-live-validation-with-disabled-submit were offered and NOT
   chosen. Live/blur validation and submit-button disabling are therefore
   deliberately out of scope.
3. **Module format** — native ES modules (`<script type="module">`). A global
   namespace script and CommonJS-plus-bundler were offered and NOT chosen. The
   page will be served over `http://`.
4. **Approach** — a pure rules/evaluation core plus a generic form controller
   (`attachValidation`). A rules-only library and the native Constraint
   Validation API were offered and NOT chosen.
5. **Tooling** — unit tests only, via Node's built-in `node:test`, zero
   dependencies. Lint/format (ESLint + Prettier) and end-to-end tests
   (Playwright) were offered and NOT chosen. The absence of lint and e2e
   infrastructure is an accepted decision, not an oversight.

## Design sections explicitly approved in chat

- Section 1 (architecture and module boundaries: `rules.js`, `validate.js`,
  `form.js`; data flow; `src/index.js` and `src/utils.js` left untouched) —
  approved verbatim.
- Section 2 (DOM contract via `name` attributes and `data-error-for` nodes,
  auto-creation of missing error nodes, clear-on-submit, `aria-invalid` and
  `role="alert"`, throw-on-programmer-error, no-catch on rule/callback throws)
  — approved verbatim.
- Section 3 (testing: `node:test`, the `src/validation/package.json`
  `{"type":"module"}` marker to avoid breaking the existing CommonJS files,
  unit tests for the pure core only, `form.js` manually verified, TDD for the
  core) — approved verbatim.

## Codebase facts

Pre-existing repository contents: `index.html` (one `login-form` with two
inputs carrying only `id` attributes), `app.js` (hardcoded `validateForm()`
plus a submit listener, `login()` stub, `API_ENDPOINT`), `src/index.js` and
`src/utils.js` (unrelated CommonJS, never loaded by the page), `package.json`
(no dependencies, no scripts), `README.md`. No build step, no tests, no
linter, no framework.

## Notes for the reviewer

- Items listed above as "offered and NOT chosen" are settled scope decisions.
  Do not report them as gaps or missing requirements.
- The absence of automated tests for `form.js` is a disclosed, accepted gap
  (it follows directly from decision 5). Report it only if the spec's stated
  mitigation is itself inadequate.
