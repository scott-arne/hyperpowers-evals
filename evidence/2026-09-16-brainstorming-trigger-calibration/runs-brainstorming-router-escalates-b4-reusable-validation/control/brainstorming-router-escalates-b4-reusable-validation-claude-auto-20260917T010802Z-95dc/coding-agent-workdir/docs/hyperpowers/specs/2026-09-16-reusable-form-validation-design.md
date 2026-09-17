# Reusable Form Validation — Design

Date: 2026-09-16
Status: Approved (design sections 1-3 approved in brainstorming)

## Problem

`app.js` contains a `validateForm` function that hardcodes the field names
`username` and `password`:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

It cannot validate any other form, it reports one error string for the whole
form rather than per field, and it supports only a presence check. Several
additional forms are planned, so the validation logic needs to move into a
shared module with a per-form schema.

## Scope

In scope:

- A new ES module exposing a pure `validate(values, schema)` function and a set
  of rule factories covering presence and format checks.
- Migration of the existing login form to the new module.
- Unit tests for the new module, using Node's built-in test runner.

Explicitly out of scope (decided during brainstorming):

- **Cross-field rules** (password confirmation, date ranges, "one of these is
  required"). Not needed by the planned forms.
- **Async rules** (server round-trips such as "is this username taken"). These
  would make the entire interface promise-based; deferred until a form needs
  one.
- **Form binding** — the shared layer does not take a form element, does not
  listen for `submit`, and does not render error messages. Each form owns its
  own submit handler and its own error display.
- **Live validation** on blur or input.
- **Error display for the login form.** It keeps today's console-only
  behavior. Inventing a display convention before the other forms exist would
  constrain them for no present benefit.
- Linting, formatting, and end-to-end test infrastructure. Not required by this
  change.
- `src/index.js` and `src/utils.js`. They are an unrelated CommonJS Node island
  and are not modified.

## Global Constraints

- **Module format: ES modules.** `import`/`export`, with `index.html` loading
  `app.js` via `<script type="module">`. Consequence, accepted by the project
  owner: `index.html` must be served over HTTP; opening it via `file://` will
  no longer work.
- **Zero runtime dependencies, zero build step.** `package.json` currently has
  no dependencies and no scripts; the only addition is a `test` script using
  Node's built-in runner.
- **Test infrastructure: `node --test`.** Ships with Node, so the dependency
  count stays at zero. No linter or formatter is configured as part of this
  work.
- **The validator is pure.** No DOM access, no I/O, no mutation of its
  arguments, fully synchronous.

## Architecture

### New module: `src/validation.js`

An ES module placed alongside the existing `src/` files. It shares no code with
`src/index.js` or `src/utils.js` (those are CommonJS and unrelated); the
location is for tidiness only.

Exports:

- `validate(values, schema)` — the only entry point.
- Rule factories: `required()`, `minLength(n)`, `maxLength(n)`, `email()`,
  `pattern(re, message)`, `range(min, max)`.

### The rule contract

A **rule** is a function `(value) => string | null`, returning an error message
when the value fails and `null` when it passes.

A **rule factory** is a function returning a rule. Every built-in factory takes
a `message` as its last argument, overriding the default text. It is optional
for every factory except `pattern`, which has no meaningful default wording and
requires one:

```js
required("Pick a username")
minLength(8, "Passwords must be 8+ characters")
```

Because a rule is just a function of that shape, a form-specific rule needs no
change to `src/validation.js`:

```js
const hasDigit = (value) =>
  /[0-9]/.test(value) ? null : "Must contain a digit";

const signupSchema = {
  password: [required(), minLength(8), hasDigit],
};
```

This extensibility is the reason for choosing rule factories over a
plain-data schema (`{ required: true, minLength: 3 }`): a closed rule
vocabulary would force edits to shared code every time a single form needs a
one-off check.

### The schema

A schema is a plain object mapping a field name to an array of rules:

```js
const loginSchema = {
  username: [required(), minLength(3)],
  password: [required(), minLength(8)],
};
```

### The result

```js
{ valid: boolean, errors: { [fieldName]: string } }
```

- `errors` contains an entry only for fields that failed.
- `valid` is exactly `Object.keys(errors).length === 0`.
- At most one message per field: the first failing rule for a field wins, and
  the remaining rules for that field are skipped.

This replaces the current `{ valid, error }` shape, which cannot represent two
bad fields simultaneously.

## Behavior Rules

These are the decisions that are otherwise left implicit and cause bugs later.
They are normative.

### Presence and short-circuiting

- `required()` treats these as empty: `undefined`, `null`, `""`, a
  whitespace-only string, an empty array, and `false` (an unchecked checkbox).
- `0` is **not** empty. It is a real value and passes `required()`.
- **When a field is empty and its rule list includes `required()`**, the
  `required()` message is the only error reported for that field. A user never
  sees "Required" and "Must be a valid email address" at the same time.
- **When a field is empty and its rule list does not include `required()`**,
  the field passes: all other rules are skipped. This makes optional fields
  behave correctly without extra ceremony — an optional email is only format
  checked when the user actually typed something.

### Value handling

- `validate()` never mutates `values`, and never trims or coerces the values it
  is given. `required()` ignores surrounding whitespace when deciding
  emptiness, but the value itself is untouched.
- Fields present in `values` but absent from `schema` are ignored. Forms often
  carry state that is not user input.
- Fields present in `schema` but absent from `values` are validated as
  `undefined`, so `required()` catches them.

### Failing loudly on schema bugs

The following throw a `TypeError` whose message names the offending field:

- A schema entry that is not an array of functions.
- A length or format rule applied to a value of an incompatible type — for
  example `minLength(3)` against a number.

These are programming errors in the schema, not user input errors. Throwing
means a test catches them, whereas silently passing would let a form accept
anything.

## Built-in Rules

| Factory | Passes when | Default message |
|---|---|---|
| `required()` | Value is not empty (see the emptiness list above) | `"Required"` |
| `minLength(n)` | String or array length >= `n` | `"Must be at least n characters"` |
| `maxLength(n)` | String or array length <= `n` | `"Must be at most n characters"` |
| `email()` | Value matches a basic address shape (non-empty local part, `@`, dotted domain) | `"Must be a valid email address"` |
| `pattern(re, message)` | `re.test(value)` | The supplied `message` (required for this factory, since no generic wording is meaningful) |
| `range(min, max)` | Value is a finite number within `[min, max]` inclusive | `"Must be between min and max"` |

Type expectations, per the "fail loudly" rule above: `minLength`, `maxLength`
accept a string or an array; `email` and `pattern` accept a string; `range`
accepts a number. Anything else throws a `TypeError` naming the field rather
than being coerced. In particular `range` does not accept the numeric strings
that DOM inputs produce — the caller converts before validating.

`email()` deliberately uses a permissive shape check rather than attempting
RFC 5322. Strict address validation is a known trap; the server is the
authority on deliverability.

## Migration of the Login Form

`app.js`:

- Delete `validateForm`.
- Add `import { validate, required, minLength } from "./src/validation.js";`
- Add a `loginSchema` const.
- The submit handler calls `validate({ username, password }, loginSchema)` and,
  on failure, logs the per-field errors to the console — the same channel the
  code uses today, updated for the new result shape.
- `login()` and `API_ENDPOINT` are unchanged.

`index.html`:

- `<script src="app.js"></script>` becomes
  `<script type="module" src="app.js"></script>`.
- No other markup changes. No error-display elements are added.

## Testing

`test/validation.test.js`, run via `node --test`, wired as
`"scripts": { "test": "node --test test/" }` in `package.json`.
Implementation is test-driven: tests are written before the implementation.

Cases:

1. **Each factory** — `required`, `minLength`, `maxLength`, `email`, `pattern`,
   `range`: a passing value, a failing value, and the custom-message override.
2. **Short-circuiting** — empty value with `required()` present reports only
   `"Required"`; empty value with `required()` absent passes all other rules;
   the first failing rule wins when several would fail.
3. **Result shape** — a fully valid input yields `{ valid: true, errors: {} }`;
   two bad fields are reported together; fields in `values` but not `schema`
   are ignored; a field in `schema` but missing from `values` is caught by
   `required()`.
4. **Emptiness table** — `undefined`, `null`, `""`, `"   "`, `[]`, and `false`
   each fail `required()`; `0` passes it.
5. **Throwing** — `minLength(3)` against a number throws `TypeError`; a schema
   entry that is not an array of functions throws `TypeError`; both messages
   name the field.
6. **No mutation** — `values` is deep-equal to its original after `validate()`.

### Manual verification

`app.js` accesses `document` and there is no DOM test infrastructure; adding
jsdom would introduce the project's first dependency, which this change does
not justify. The login form is therefore verified by hand:

1. Serve the directory over HTTP (for example `python3 -m http.server`) and
   open `index.html`. Serving is required because `app.js` is now a module.
2. Submit the form empty. Expect per-field errors in the console.
3. Submit with a 2-character username. Expect only the username error.
4. Submit with valid values. Expect the login path to run as before.

This is a manual step and will be reported as such — the automated suite covers
`src/validation.js` only.

## Risks and Assumptions

- **Assumption: the project owner does not open `index.html` directly from the
  filesystem.** Validate by confirming the manual verification steps above are
  workable; if `file://` turns out to be required, the fallback is a classic
  script exporting a `window.Validation` global, which costs the ability to
  unit-test without a shim.
- **Assumption: the planned forms need only per-field, synchronous rules.**
  Validate when the next form is specified. Cross-field and async rules were
  deliberately excluded; adding async later changes `validate()` to return a
  promise, which is a breaking change for every call site.
- The result-shape change from `{ valid, error }` to `{ valid, errors }` is
  breaking, but `validateForm` has exactly one caller, inside `app.js`.
