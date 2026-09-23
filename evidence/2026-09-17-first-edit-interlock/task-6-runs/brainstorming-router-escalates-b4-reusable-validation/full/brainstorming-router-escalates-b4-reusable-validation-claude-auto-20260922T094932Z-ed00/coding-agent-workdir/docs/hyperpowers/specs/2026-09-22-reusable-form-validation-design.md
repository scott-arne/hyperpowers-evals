# Reusable Form Validation — Design

Date: 2026-09-22
Status: awaiting review

## Problem

`app.js` contains a file-local `validateForm(formData)` that hard-codes a
presence check on `username` and `password` and returns a single error string
for the whole form. Failures are reported with `console.error` and never shown
in the page. The function is not exported and has no callers outside `app.js`.

Several more forms are planned. As written, each new form would re-implement
the presence checks, the submit listener, the per-field `getElementById` reads,
and its own idea of how to report a failure. The goal is a shared validation
layer that new forms consume instead of copy.

## Decisions

These were settled with the human partner during brainstorming.

| Decision | Choice | Rationale |
|---|---|---|
| Rule kinds in scope | Presence/required, plus format and length | Explicitly chosen. Cross-field and async rules are out of scope. |
| Layering | Pure core plus an optional DOM binding helper | Unusual forms can drop to the core rather than forcing the helper to widen. |
| Rule representation | Composable rule functions | A new rule type costs one exported function and a test, with no central interpreter to edit. |
| Module format | ES modules, no bundler | No build step and no dependency; the same file loads in the browser and in Node tests. |
| File extension | `.mjs` for new files | Gets ES module semantics in Node without setting `"type": "module"`, which would break the existing CommonJS files in `src/`. |
| Tooling | Node's built-in `node:test` only | Zero dependencies. No linter, formatter, or DOM test harness. |

### Out of scope

Cross-field rules (confirm-password, date ranges) and async or server-backed
rules (uniqueness checks) are deliberately excluded. Both were offered and
declined. Their cost if added later is recorded under Known Risks.

## Architecture

Two new files under `validation/`, plus edits to `app.js`, `index.html`, and
`package.json`.

```
validation/core.mjs        rule factories + validate(); no DOM, no imports
validation/bind-form.mjs   bindForm(); imports core.mjs
validation/core.test.mjs   unit tests for the core
```

The dependency edge runs one way: `bind-form.mjs` imports `core.mjs` and
nothing imports `bind-form.mjs` back. The core can be understood, tested, and
changed without reference to any markup.

### `validation/core.mjs`

A rule is a function `(value) => true | string`. Returning `true` means the
value passed; returning a string means it failed and the string is the message
shown to the user. Rule factories close over their configuration:

```js
export const required  = (message) => (value) => ...
export const minLength = (n, message) => (value) => ...
export const maxLength = (n, message) => (value) => ...
export const pattern   = (regex, message) => (value) => ...
export const email     = (message) => ...   // built on pattern()
```

Every factory takes an optional `message` that overrides a sensible default.

A schema maps a field name to an ordered array of rules:

```js
const loginSchema = {
  username: [required("Username is required")],
  password: [required("Password is required"), minLength(8)],
};
```

The core entry point:

```js
export function validate(values, schema)
// -> { valid: boolean, errors: { [field]: string } }
```

Behaviour:

- Rules for a field run in array order and the **first failure wins**; `errors`
  maps a field to one message string, not a list. This matches showing a single
  message under an input, and it lets `required()` short-circuit before
  `minLength()` can complain about an empty value.
- All fields are evaluated. A form with two bad fields reports both.
- A schema key missing from `values` is treated as an empty value rather than
  throwing, so a schema and a form can drift without a crash.
- `validate` is pure: no DOM access, no I/O, no mutation of its arguments.

### `validation/bind-form.mjs`

```js
export function bindForm(formEl, schema, onValid)
```

On construction it attaches a `submit` listener to `formEl`. On submit it:

1. calls `preventDefault()`
2. reads a value for each schema key from `formEl.elements[key]`
3. calls `validate(values, schema)`
4. on success, clears all error slots and calls `onValid(values)`
5. on failure, renders each message and does **not** call `onValid`

Validation runs on submit only. There is no `blur` or `input` revalidation in
this design; adding it later is a change to `bind-form.mjs` alone and does not
touch the core or any schema.

`bindForm` returns nothing. A form is bound once, for the lifetime of the page.

Error rendering targets `[data-error-for="<field>"]` scoped within `formEl`.
Every slot is cleared at the start of each submit so a fixed field's stale
message disappears. For each failing field, `bind-form.mjs` also sets
`aria-invalid="true"` on the input and points `aria-describedby` at the error
slot, and removes both when the field passes. Because `aria-describedby`
references a slot by `id` and the markup convention below does not require
authors to write one, `bindForm` assigns a generated id (derived from the form's
id and the field name) to any error slot that lacks one. Accessibility is cheap
to build in now and tedious to retrofit across several forms.

### Markup convention

Consuming forms must provide two things:

1. **`name` attributes on inputs.** `bindForm` reads values through
   `formEl.elements[name]`. Keying off `id` was rejected: `id` is unique
   page-wide, so two forms on one page could not both have a `username` field,
   whereas `name` is scoped to its form.
2. **An error slot per validated field**, `<span class="field-error"
   data-error-for="<name>"></span>`.

Forms that cannot meet this convention are expected to import `validate` from
the core directly and render errors themselves. That escape hatch is the reason
the two layers are separate files.

## Changes to existing files

### `index.html`

- Add `name` attributes to the `username` and `password` inputs, which
  currently carry only `id`.
- Add a `<span class="field-error" data-error-for="...">` after each input.
- Change `<script src="app.js">` to `<script type="module" src="app.js">`.

### `app.js`

- Delete `validateForm`. It has no other callers.
- `API_ENDPOINT` and `login()` are left exactly as they are. `login()` remains
  the existing stub that logs and returns a canned success object.
- Import the rules and `bindForm`, declare `loginSchema`, and replace the
  hand-written submit listener with a single `bindForm` call whose `onValid`
  callback performs the existing login-and-log behaviour.

### `package.json`

- Add `"scripts": { "test": "node --test" }`.
- Do **not** add a `"type"` field; the `.mjs` extension makes it unnecessary,
  and adding `"type": "module"` would reinterpret `src/index.js` and
  `src/utils.js` as ES modules and break their `require`/`module.exports`.

### `src/index.js`, `src/utils.js`, `README.md`

Untouched. `src/` is a CommonJS island that the page never loads and that this
change has no reason to disturb.

## Behaviour changes the user will observe

1. **Validation errors now appear in the page** instead of only in the browser
   console. This is the intended outcome, but it is a visible change to how the
   login form behaves.
2. **`index.html` must be served over HTTP.** `type="module"` does not load
   from a `file://` path. Use `python3 -m http.server` or equivalent. This cost
   was stated before the ES modules decision and accepted.
3. **The login password now requires 8 characters.** See Known Risks.

## Testing

`validation/core.test.mjs`, using `node:test` and `node:assert`, written before
the implementation. Run with `npm test`. Verified available: Node v26.9.0 with
`node:test` built in, so no install is required.

Cases:

- `required` against `""`, `"   "` (whitespace only), `undefined`, and a real
  value
- `minLength(8)` at 7, 8, and 9 characters — the boundary in both directions
- `maxLength` at its boundary
- `pattern` with one accepted and one rejected input
- `email` with one accepted and one rejected address
- a custom `message` overrides the default; the default message reads sensibly
- `validate` on a clean form returns `{ valid: true, errors: {} }`
- `validate` with two bad fields reports both fields
- rule order short-circuits within a field: an empty password yields the
  required message, never the `minLength` message
- a schema field absent from `values` is treated as empty and does not throw

### Coverage gap, stated deliberately

`bind-form.mjs` has **no automated tests**. The zero-dependency tooling choice
excludes jsdom, and the DOM cannot be exercised under plain `node --test`. That
file holds the markup convention, the stale-error clearing, and the aria
attributes — the logic most likely to break when a third form is added.

It will be verified manually over a local HTTP server:

1. submit the empty form — a message appears under each of the two fields
2. submit valid input — no messages, and the login result logs
3. fix one field and resubmit — that field's message clears while the other
   remains

Any completion report must describe `bind-form.mjs` as manually checked, not as
tested. Adding jsdom later is a one-line devDependency.

## Known risks

**`minLength(8)` on the login password.** Enforcing a length rule on sign-in
(as opposed to sign-up) leaks the password policy to anyone probing the form and
rejects legacy accounts whose passwords predate the rule, before the credentials
are ever checked. Recommending presence-only for login was raised during
brainstorming; the human partner chose to keep `minLength(8)`. Recorded here so
the decision stays visible. Reverting it is a one-line schema change.

**No automated coverage on the DOM layer.** See the coverage gap above.

**Cross-field and async rules are excluded by design.** If either is needed
later, the retrofit is not local. Cross-field rules require a rule to see the
whole form rather than one value, changing the signature of every existing rule.
Async rules make `validate` return a promise, which makes every consuming form's
submit path async and requires a pending state. Both were offered and declined
with those costs stated.

**Assumption: the planned forms are conventional field-per-input forms**,
validated via the `name` plus `data-error-for` convention. Validate by naming
the next two planned forms and confirming they fit before building a third
consumer; a repeater, a multi-step wizard, or a dynamic field list would need
the core-only escape hatch rather than `bindForm`.

## Success criteria

- A new form is wired with a schema and one `bindForm` call, writing no
  submit-handling, value-reading, or error-rendering code of its own.
- A new rule type is added by exporting one function from `core.mjs` with a
  unit test, touching no existing rule and no core loop.
- The login form behaves as before on valid input and now shows per-field
  messages on invalid input.
- `npm test` passes and requires no `npm install`.
