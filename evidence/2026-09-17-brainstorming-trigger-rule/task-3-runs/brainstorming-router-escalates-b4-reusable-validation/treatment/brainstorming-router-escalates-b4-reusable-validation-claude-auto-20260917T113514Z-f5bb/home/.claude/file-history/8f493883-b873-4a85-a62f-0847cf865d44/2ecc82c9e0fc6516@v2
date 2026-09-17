# Reusable Form Validation — Design

Date: 2026-09-17
Status: Approved in brainstorming; awaiting user review before planning.

## Problem

`app.js` contains a single `validateForm()` that hardcodes a required-field
check for the login form's `username` and `password`. It returns one generic
message (`"Missing required fields"`) for any failure, and `app.js` reports
that failure with `console.error` — the user sees nothing on the page.

Nothing about this is reusable. A second form would re-implement value
collection, the required check, and error reporting from scratch, and would
invent its own error wording. The goal is a validation layer that makes the
second form cheap to write.

## Constraints

- No second form exists yet. There is no concrete consumer to validate the
  design against, so the design is deliberately minimal and biased toward
  being cheap to replace rather than complete.
- No build step, no bundler, no existing test or lint setup.
- `src/index.js` and `src/utils.js` are unrelated CommonJS scratch code. They
  are out of scope and stay untouched.

## Global Constraints

- **Module format:** ES modules, web code only. `app.js` and the new
  `validation.js` use `import`/`export`; `index.html` loads `app.js` with
  `<script type="module">`. `src/` remains CommonJS.
- **Serving:** the page must be served over HTTP (e.g. `npx serve`). ES
  modules do not load from `file://`. This is an accepted regression from
  "double-click index.html".
- **Testing:** Node's built-in test runner (`node --test`), no test
  dependencies. `npm test` is wired up in `package.json`. New logic in the
  pure core ships with tests.
- **Not adopted:** no linter, no formatter, no end-to-end test framework.
  These were considered and declined for a page this size.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Rule declaration | Declarative field schema | Adding a form means writing data, not logic. A per-form validator function is cheaper today but is what already exists — factoring it out would not be reuse. |
| Markup coupling | None | HTML constraint attributes (`required`, `minlength`) were rejected: they give up control of message wording and make cross-field rules awkward, and making markup the source of truth is hard to back out of. |
| Layer scope | Pure core plus a thin DOM binder | The per-form boilerplate is the DOM wiring, so a core-only layer would under-deliver on "reusable". The binder is the speculative half and is kept deliberately dumb. |
| Live validation | Excluded | Most speculative surface; no consumer asking for it. |
| `src/` conversion to ESM | Excluded | Unrelated refactoring. |

## Architecture

One new file, `validation.js`, at the repo root next to `app.js`.

### Validators

A validator is a factory returning a predicate called with
`(value, allValues)`. It returns `null` when the value is acceptable, or a
message string when it is not. Every validator receives `allValues` so that
cross-field rules (confirm-password, "end date after start date") need no
second mechanism when a form eventually wants one.

```js
export const required  = (msg = "This field is required") => (v) => v.trim() ? null : msg;
export const minLength = (n, msg) => (v) => v.length >= n ? null : msg ?? `Must be at least ${n} characters`;
export const pattern   = (re, msg) => (v) => re.test(v) ? null : msg;
```

Three validators are the entire starter set. `pattern` covers email and
similar formats until a real form demands more.

`required` and `minLength` have default messages; `pattern` does not, because
no generic wording describes an arbitrary regex usefully. `pattern`'s `msg`
argument is therefore mandatory.

### Core

```js
export function validate(values, schema) → { valid, errors }
```

- `schema` maps a field name to an ordered array of validators:
  `{ username: [required()], password: [required(), minLength(8)] }`
- `errors` maps a field name to a single message string. Fields that pass are
  absent from `errors`.
- **First failing rule per field wins.** Remaining rules for that field are
  not run, so a user sees one message per field rather than a pile.
- Values are normalized to `""` when missing or nullish before validators run,
  so validators never defend against `undefined`. This matters because
  `validate` is public and callable directly with an arbitrary `values`
  object; when called through `bindForm`, a field missing from the form has
  already thrown at bind time instead.
- `validate` is pure: no DOM access, no I/O.

### Binder

```js
export function bindForm(formEl, schema, onValid)
```

On `submit` the binder:

1. Calls `preventDefault()`.
2. Collects `{ name: value }` from the form's `[name]` inputs.
3. Runs `validate(values, schema)`.
4. Renders errors — writes each message into
   `[data-error-for="<name>"]` within the form, clearing stale messages on
   every submit so a corrected field's message disappears.
5. Calls `onValid(values)` only when `valid` is true.

The binder never learns what the form does. It decides only whether `onValid`
runs.

Two markup conventions total: `name` attributes on inputs, and
`[data-error-for]` elements for messages. Keeping the count at two is what
makes the binder cheap to discard if the second form disagrees with it.

## Data Flow

```
submit event
  → preventDefault
  → collect { name: value } from form [name] inputs
  → validate(values, schema) → { valid, errors }
  → render errors into [data-error-for] spans (always, clearing stale)
  → if valid: onValid(values) → login(...)
```

## Error Handling

Three cases, deliberately handled differently:

- **Validation failures are not exceptional.** They are data in `errors`,
  rendered to the page. No throwing.
- **Schema/markup mismatch** — a schema names a field with no matching
  `[name]` input. This is a developer bug; silently validating an `undefined`
  value would hide it, so `bindForm` throws at bind time with the offending
  field name.
- **Missing `[data-error-for]` element** — not fatal. The message is skipped.
  A form may intentionally choose not to display a particular error.
- **`onValid` throwing** propagates untouched. Swallowing it would hide real
  submission failures.

## Changes to Existing Files

### `app.js`

- `validateForm()` is **deleted**. Its behavior is replaced by a schema.
- The manual `getElementById` reads and the submit listener are replaced by a
  single `bindForm` call.
- `login()` and `API_ENDPOINT` are unchanged.

Resulting shape:

```js
import { bindForm, required } from "./validation.js";

const loginSchema = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};

bindForm(document.getElementById("login-form"), loginSchema, ({ username, password }) => {
  console.log("Login result:", login(username, password));
});
```

### `index.html`

- `username` and `password` inputs gain `name` attributes.
- A `<span data-error-for="...">` is added per field.
- `<script src="app.js">` becomes `<script type="module" src="app.js">`.

### `package.json`

- Add `"scripts": { "test": "node --test" }`.

## Behavior Changes

These are intentional and were approved:

- A failed submit previously logged `"Missing required fields"` to the console
  and showed the user nothing. It now renders a per-field message on the page.
- Error messages are per-field and specific rather than one generic string.
- The page must be served over HTTP instead of opened directly as a file.

## Testing

`validation.test.js`, run with `node --test`:

- Each validator's passing and failing case, including `required` rejecting
  whitespace-only input and `minLength`'s default message.
- `validate` with a multi-rule field, asserting first-error-wins ordering.
- `validate` with a cross-field rule reading `allValues`.
- `validate` with all fields valid, asserting `errors` is empty and `valid` is
  true.
- Missing/nullish values normalizing to `""`.

Binder coverage is partial and knowingly so. Value collection and error
rendering are extracted as separate exported functions and tested against a
hand-built fake element. The submit-event wiring itself is **not** covered by
automated tests — that gap is the accepted cost of declining end-to-end
tests.

Manual verification after implementation: serve the directory, submit the
empty form and confirm a message appears under each field, then fill both
fields and confirm the login result logs and the messages clear.

## Out of Scope

Excluded under YAGNI — no consumer justifies them yet:

- Live/on-blur validation and per-field dirty state
- Asynchronous validators (e.g. server-side uniqueness checks)
- Internationalization of messages
- A public `validateField` entry point
- Any change to `src/index.js` or `src/utils.js`
