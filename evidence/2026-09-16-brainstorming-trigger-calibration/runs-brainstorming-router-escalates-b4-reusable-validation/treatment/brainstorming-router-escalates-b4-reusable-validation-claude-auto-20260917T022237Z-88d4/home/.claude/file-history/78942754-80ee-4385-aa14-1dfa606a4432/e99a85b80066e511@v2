# Approved Design Context — Reusable Form Validation

Original user request, verbatim: "Make the form validation reusable across
multiple forms."

Repository state at the time of the request:

- `app.js` — a login form only: `validateForm()` hardcoded to `username` and
  `password`, returning `{ valid, error }` with one error string; a `submit`
  listener that reads the DOM, validates, and logs to the console; plus a
  `login()` stub and `API_ENDPOINT` constant.
- `index.html` — loads `app.js` with a plain `<script>` tag. Inputs carry `id`
  but no `name`. No error elements.
- `src/index.js`, `src/utils.js` — an unrelated CommonJS entry point (`greet`).
- `package.json` — no dependencies, no scripts, no `type` field.
- No tests, no linter, no build step.

## Decisions the user made during brainstorming

Each was presented with alternatives and trade-offs; the user chose the listed
option. These are settled, not open questions.

1. **Consumers** — "More forms coming, shapes unknown." No specific second form
   exists yet, so the design targets arbitrary field sets rather than named
   forms.
2. **Scope** — "Core + thin binder." A dependency-free validation core plus an
   optional helper that wires a `<form>` element to it and renders errors.
   Alternatives rejected: pure validation only; a single combined module.
3. **Rule API** — "Composable validator functions." Per field, an array of
   validator functions; built-ins ship as factories; custom rules are ordinary
   functions. Alternatives rejected: a declarative schema object; supporting
   both forms.
4. **Module system** — "ES modules." `index.html` switches to
   `<script type="module">`. Alternatives rejected: a `window` global
   namespace; CommonJS plus a bundler. The user was told explicitly that this
   means the page must be served over HTTP rather than opened from `file://`.
5. **Tooling** — "node:test unit tests" only. ESLint/Prettier, end-to-end
   browser tests, and no-tooling were all offered and declined. The repo stays
   dependency-free.

## Design sections the user approved in chat

- **Section 1 (core)**: module layout under `validation/`; validator contract
  `(value, data) => string | null`; `validate(data, rules)` returning
  `{ valid, errors }` with one message per field and first-failure-wins within
  a field; built-ins `required`, `minLength`, `maxLength`, `pattern`; no
  `email()` validator by deliberate choice. Approved including the
  `"type": "module"` conversion of the two `src/` files.
- **Section 2 (binder and integration)**: `bindForm(formEl, rules, onValid)`
  returning an unbind function; field names read from `name` attributes; error
  text rendered into `[data-error-for="<field>"]` with `aria-invalid` toggled;
  missing error slots skipped silently; `index.html` updated with `name`
  attributes and error elements; `login()` and `API_ENDPOINT` untouched; unit
  tests for the core and for the binder's extracted helpers, with `bindForm`'s
  event wiring verified manually rather than in a headless browser.

## Explicit non-goals, confirmed with the user

Async/server-side validation; live `blur`/`input` validation; a form-state
library; changes to the login stub; end-to-end browser tests; lint/format
tooling.
