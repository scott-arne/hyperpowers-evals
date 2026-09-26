# Reusable Form Validation — Design

Date: 2026-09-26
Status: Approved design, pending spec review

## Problem

Validation currently lives in `app.js` as `validateForm(formData)`, hardcoded to
the login form's two fields and returning a single flat error string. The
submit listener separately reads field values by element id and reports failures
with `console.error`. A second form cannot reuse any of this: the rules, the
field list, and the error shape are all specific to login.

The goal is a validation module that any form in this app can use, without that
module dictating how a form displays its errors.

## Scope

In scope:

- A new `src/validation.js` providing rules, a `validate` entry point, and a
  helper that reads values out of a `<form>` element.
- Converting the existing login form to use it.
- Unit tests for the module.

Out of scope:

- Error display. Each form decides how to surface messages; the login form
  keeps logging to the console, as it does today.
- Submit interception and form wiring. Forms keep their own listeners.
- Converting `src/utils.js` or `src/index.js` to a different module style.
- Linting and formatting configuration.
- Any second form. This work makes reuse possible; it does not add consumers.

## Global Constraints

- **Zero runtime dependencies.** `package.json` currently declares none, and
  this work adds none.
- **Test infrastructure: `node:test`**, Node's built-in runner. `package.json`
  gains `"scripts": { "test": "node --test" }`. No test framework dependency.
- **`index.html` must remain openable as a `file://` URL.** This rules out ES
  module scripts, which are CORS-restricted under `file://`.
- **No linter or formatter** is introduced; unrelated files are not reformatted.

## Architecture

### Module style

`src/validation.js` is a classic script that ends with a dual export:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { required, validate, readFormValues };
} else {
  window.FormValidation = { required, validate, readFormValues };
}
```

This is the only style that satisfies two constraints at once: the browser loads
it as a plain `<script>` with no dev server, and Node imports it directly so the
module can be unit-tested without a DOM library.

`src/utils.js` already uses CommonJS, so the Node half of this is consistent with
existing repo style. `app.js` already relies on globals, so the browser half is
consistent with that.

### Public interface

```js
required(message?)        // -> (value, allValues) => string | null
validate(values, schema)  // -> { valid: boolean, errors: { field: message } }
readFormValues(formEl)    // -> { fieldName: value }
```

**Rule contract.** A rule is a function `(value, allValues) => string | null`.
It returns `null` when the value passes and an error message when it fails. The
`allValues` argument exists so cross-field rules (confirm-password, date ranges)
are possible later without an interface change.

Because the contract is just a function, a one-off rule is written inline at the
call site and needs no module change:

```js
const schema = {
  username: [required("Username is required")],
  password: [required(), (v) => (v.length < 8 ? "Too short" : null)],
};
```

**`required(message?)`** returns a rule that fails when the value is absent,
empty, or whitespace-only — a string value is trimmed before the emptiness
check, so `"   "` fails. This is a deliberate behavior change from the current
`validateForm`, which accepts a space-only username. `message` defaults to
`"This field is required"`.

Trimming applies only to the check. Validation never mutates the `values`
object, so the form submits whatever the user actually typed; if a form wants
trimmed input it trims at its own call site.

Non-string values (`undefined`, `null`, and any future non-text control) are
tested for emptiness without trimming, so `required` never throws on a value
that has no `trim` method.

**`validate(values, schema)`** iterates the schema's fields. For each field it
runs that field's rules in order and records the **first** failure only, so one
field never accumulates multiple messages. It does not stop at the first failing
field — every failing field appears in `errors`, which is what allows a form to
mark all bad inputs in a single pass. `valid` is `true` exactly when `errors`
has no keys. A field named in the schema but missing from `values` is validated
as `undefined`, so `required` fails it rather than the field being skipped.

**`readFormValues(formEl)`** collects `input`, `select`, and `textarea`
descendants of the form and returns an object keyed by each control's `name`,
falling back to its `id` when `name` is absent. The fallback exists so markup
that predates this change keeps working. Controls with neither `name` nor `id`
are skipped.

### Rule set

Version one ships `required` and nothing else. Built-ins such as `minLength`,
`email`, and `pattern` are each a few lines and are added when a form actually
needs one; the custom-function escape hatch means no form is ever blocked
waiting for a built-in. Shipping a speculative rule library is how a reusable
module accumulates rules nobody calls.

## Data flow

1. The form's submit listener calls `readFormValues(formEl)` to get a plain
   values object.
2. It passes those values and its own schema to `validate`.
3. On `valid: false` it does whatever that form does with `errors` — for the
   login form, one `console.error`.
4. On `valid: true` it proceeds with submission.

The module never touches the DOM except to read values, and never renders.

## Changes to existing files

### `app.js`

`validateForm` is deleted. Nothing else in the repo references it —
`src/index.js` and `src/utils.js` do not. The submit listener becomes:

```js
const loginSchema = { username: [required()], password: [required()] };

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const values = readFormValues(form);
  const { valid, errors } = validate(values, loginSchema);
  if (!valid) {
    console.error("Validation errors:", errors);
    return;
  }
  console.log("Login result:", login(values.username, values.password));
});
```

`login()` and `API_ENDPOINT` are untouched.

### `index.html`

- Add `name="username"` and `name="password"` to the two inputs, so the form is
  standards-correct and `readFormValues` keys on `name` rather than the `id`
  fallback.
- Add `<script src="src/validation.js"></script>` before the existing
  `<script src="app.js"></script>`, so `required`/`validate`/`readFormValues`
  exist as globals when `app.js` runs.

### `package.json`

Add `"scripts": { "test": "node --test" }`.

## Behavior changes

These are intended and were approved:

| Before | After |
|---|---|
| One flat `error` string | Per-field `errors` object |
| `"   "` passes as a username | Whitespace-only fails `required` |
| Console shows `"Missing required fields"` | Console names the failing fields |

Unchanged: an empty username or password still blocks the `login()` call, and
failures still go to the console rather than the page.

## Testing

`test/validation.test.js`, run with `node --test`:

- `required` fails on `undefined`, `""`, and `"   "`; passes on `"a"`.
- `required` uses the custom message when given one, the default otherwise.
- `validate` returns `valid: true` and empty `errors` when all rules pass.
- `validate` reports every failing field at once, not just the first.
- `validate` keeps only the first failure per field when a field has two
  failing rules.
- `validate` fails a schema field that is absent from `values`.
- A custom function rule is honored, and receives `allValues` as its second
  argument.
- `readFormValues` prefers `name` over `id`, falls back to `id`, and skips
  controls with neither.

`readFormValues` is tested against a small hand-rolled fake exposing
`querySelectorAll`, rather than a DOM library. The function's only DOM
dependency is that one call, so the fake stays a few lines and the repo keeps
zero dependencies.

The login form's wiring in `app.js` is not unit-tested — it is DOM event glue
with no logic left in it once validation moves out. It is verified by opening
`index.html` and submitting the form empty, then with values.

## Error handling

- `validate` with a schema field whose rule list is empty treats the field as
  passing.
- A rule that throws is not caught; a throwing rule is a programming error and
  should surface loudly rather than silently mark a field valid.
- `readFormValues` on a form with no controls returns `{}`, and `validate` then
  fails every `required` field — the correct outcome.
