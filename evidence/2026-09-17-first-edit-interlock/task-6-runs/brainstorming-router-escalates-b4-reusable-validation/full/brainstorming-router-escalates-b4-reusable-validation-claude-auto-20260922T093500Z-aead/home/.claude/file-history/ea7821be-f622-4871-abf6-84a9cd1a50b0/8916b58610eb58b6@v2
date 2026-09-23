# Reusable Form Validation — Design

Date: 2026-09-22
Status: approved for planning

## Problem

Form validation lives inside `app.js` as `validateForm`, a file-local function
with the login form's rules hardcoded into its body:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

Any second form would have to copy this function and edit the field names. The
goal is a shared validation engine that a second form can use without
modification, introduced before a second form exists.

## Constraints

These were decided with the human partner during brainstorming and bound the
design:

1. **No second form exists or is scheduled.** Capability beyond what the login
   form needs today is speculation, so only the `required` rule ships. The
   engine's shape must make adding rules later purely additive.
2. **No third-party validation dependency and no build step.** The repo has no
   bundler, transpiler, or npm dependencies; `index.html` loads `app.js` with a
   bare `<script>` tag.
3. **Dual export.** The module must work as a browser global with no build and
   be `require()`-able from Node, so the engine is unit-testable.
4. **Validation logic only.** Shared error *display* is explicitly out of
   scope. The login form's on-page behavior is unchanged.
5. **Unit tests via Node's built-in `node:test`.** No linter or formatter is
   introduced by this change.

## Non-goals

- Rendering validation messages in the DOM.
- Rules beyond `required` (`minLength`, `email`, `pattern`, and similar).
- Async or cross-field validation.
- Linting, formatting, end-to-end tests, fuzz or mutation testing.
- Any change to `src/index.js` or `src/utils.js`, which are unrelated to forms.

## Architecture

One new file, `src/validation.js`, containing a rule table, a default-message
table, and a single exported `validate` function. It contains nothing specific
to any form; field names and rules are supplied by the caller.

Each form owns its own schema constant, declared next to that form's submit
handler. For the login form that is a `LOGIN_SCHEMA` in `app.js`.

### API

```
validate(values, schema) -> { valid, errors }
```

**`values`** — a plain object mapping field name to value, which is what the
submit handler already assembles.

**`schema`** — a plain object mapping field name to an array of rule entries. A
rule entry is either:

- a string naming a rule, which uses that rule's default message; or
- an object `{ rule, message }` supplying a custom message for that field.

```js
const LOGIN_SCHEMA = {
  username: ["required"],
  password: ["required"],
};
```

**Return value** — always an object of the same shape:

- `{ valid: true, errors: {} }` when every field passes.
- `{ valid: false, errors: { <field>: <message> } }` otherwise, with one entry
  per failing field.

### Semantics

- **All fields are evaluated.** A form reports every failing field in one pass
  rather than stopping at the first.
- **Within one field, the first failing rule wins.** Only one message per field
  appears in `errors`. This matters only once a field carries multiple rules,
  but it is fixed now because it is part of the result contract.
- **`required` fails on** `undefined`, `null`, the empty string, and
  whitespace-only strings. This is deliberately stricter than the current
  `!formData.username` test, which also rejects `0` and `false`. For text
  inputs the difference is immaterial; rejecting whitespace-only input is an
  intentional improvement.
- **An unknown rule name throws.** A schema referring to a rule that is not in
  the rule table is a programmer error and must fail loudly rather than
  silently passing.
- **A schema field absent from `values`** is treated as empty and therefore
  fails `required`.
- **Keys in `values` with no schema entry are ignored.**

### Module loading

`src/validation.js` ends with a conditional export: it assigns
`module.exports = { validate }` when `module` is defined, and otherwise
attaches `{ validate }` to `globalThis` as `Validation`. This keeps the browser
path build-free and `file://`-openable while making the engine loadable in
Node.

`index.html` gains `<script src="src/validation.js"></script>` immediately
before the existing `app.js` script tag, so the global exists before `app.js`
runs.

## Changes to existing files

**`index.html`** — one added `<script>` tag before the `app.js` tag. No markup
changes; the form and its inputs are untouched.

**`app.js`** — `validateForm` is deleted. A `LOGIN_SCHEMA` constant is added,
and the submit handler calls `Validation.validate({ username, password },
LOGIN_SCHEMA)`. `API_ENDPOINT`, `login`, and the structure of the submit
handler are unchanged.

**`package.json`** — a `scripts` block with `"test": "node --test"`. No
dependencies are added.

## Accepted behavior change

Today a failure logs the single generic string
`Validation error: Missing required fields` no matter which field is empty.
With per-field errors the logged text becomes field-specific. Nothing rendered
on the page changes and no user-facing behavior changes, but the console text
is not byte-identical to today's. The human partner accepted this in place of
collapsing per-field errors back into one generic string, which would discard
the benefit of the new result shape.

## Error handling

- Invalid schemas fail fast by throwing, as described under Semantics. The
  engine does not attempt to recover from or paper over a malformed schema.
- The engine performs no I/O and has no async behavior, so it has no failure
  modes beyond a malformed schema.
- Calling-code failures (a missing DOM element, for example) are outside the
  engine's responsibility and are unchanged by this work.

## Testing

Implementation follows TDD: tests are written first and watched fail before
the engine is written.

Tests live in a `test/` directory, run by `node --test`, and cover:

1. All fields present and non-empty — `valid: true`, empty `errors`.
2. `username` missing — invalid, with exactly a `username` entry.
3. `password` missing — invalid, with exactly a `password` entry.
4. Both missing — invalid, with both entries present in one result.
5. Whitespace-only value — treated as missing.
6. A schema field absent entirely from `values` — treated as missing.
7. A key in `values` with no schema entry — ignored, does not appear in
   `errors`.
8. A `{ rule, message }` entry — the custom message is returned instead of the
   default.
9. An unknown rule name — throws.

Manual verification: open `index.html`, submit the login form empty and confirm
a validation error is logged, then submit with both fields filled and confirm
the login result is logged as before.

## Alternatives rejected

- **Ship a starter rule library** (`minLength`, `email`, `pattern`, custom
  predicates). Rejected as speculation with no second form to constrain it;
  adding rules later is additive and cheap.
- **Adopt zod, yup, or valibot.** Rejected as disproportionate: it requires a
  bundler or import map that this repo does not have, for a 28-line `app.js`.
- **Native ES modules.** Rejected because `<script type="module">` requires an
  HTTP origin, breaking `file://` opening, and clashes with the CommonJS
  already in `src/`.
- **Browser global only.** Rejected because the engine could not be loaded in
  Node, making the most testable code in the repo untestable.
- **Include shared error display.** Deferred. Display is where per-form
  differences are largest, and there is no second form to reveal what the
  shared parts would be.

## Open questions

None. All design decisions above were resolved during brainstorming.
