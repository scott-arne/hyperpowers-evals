# Reusable Form Validation — Design

Date: 2026-09-17
Status: approved (design), not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

`app.js` contains a `validateForm` function hardcoded to the login form: it
checks that `username` and `password` are non-empty and returns a single
whole-form error string, which the submit handler writes to `console.error`.
The user is shown nothing. Any second form would have to copy this function and
edit the field names.

The goal is a validation capability that any form in this app can use, without
each form re-implementing rules, error shapes, or error display.

## Constraints

Established with the human partner before design:

- **Rule set:** required fields plus a small set of common types — email
  format, min/max length, numeric range. Cross-field rules (password
  confirmation) and async rules (server-side uniqueness) are explicitly out of
  scope for this work.
- **Layering:** a pure validator that returns per-field errors, plus a
  separate, opt-in helper that renders them. The core must not reference the
  DOM.
- **Module format:** a dual-export shim (`module.exports` when present, else
  attach to `window`). `index.html` must keep working when opened directly from
  disk over `file://`; Node must be able to load the core for tests. No
  bundler, no build step.

  The browser globals are named explicitly: `src/validation.js` attaches
  `window.Validation` (`{ rules, validate }`) and `src/validation-display.js`
  attaches `window.ValidationDisplay`
  (`{ readValues, showErrors, clearErrors }`). Exactly two globals are added;
  nothing else is written to `window`.

## Global Constraints

- **Tooling to set up:** unit-test infrastructure only — Node's built-in
  `node:test` runner via `"test": "node --test"`. No lint/format tooling and no
  end-to-end tooling in this work.
- **Zero runtime and dev dependencies.** The repo has none today; this work
  adds none. This is what rules out jsdom for testing the display layer.
- **No framework, no transpiler, no bundler.**

## Approach

Rules are expressed as **arrays of rule functions per field** (chosen over
data-only descriptors and HTML-attribute-driven validation):

```js
const loginSchema = {
  username: [required(), minLength(3)],
  password: [required(), minLength(8)],
};
```

Chosen because it reads nearly identically to a data-only schema at the call
site, makes each rule independently unit-testable, and absorbs the deferred
rules (cross-field, async) later without redesign — a custom rule is just a
function of the right shape. HTML-attribute-driven validation was rejected: it
would require a DOM to do anything, which contradicts the pure-core constraint.

## Components

### `src/validation.js` (new) — pure core

No DOM references anywhere in this file.

Exports:

- `rules` — `required`, `email`, `minLength`, `maxLength`, `min`, `max`.
- `validate(values, schema)`.

Rules are **factories**: `minLength(8)` returns a function
`(value) => message | null`. Each factory takes an optional custom message as
its last argument: `minLength(8, "Password is too short")`. This signature is
the module's extension point — a one-off rule is a function of that shape and
requires no change to the module.

### `src/validation-display.js` (new) — display layer

The only file that touches the DOM.

Exports:

- `readValues(formEl)` — returns `{fieldName: value}` via `FormData`.
- `showErrors(formEl, errors)` — renders messages; clears previous ones first.
- `clearErrors(formEl)` — removes all messages and error state.

Error placement: for field `x`, the helper looks inside the form for
`[data-error-for="x"]` and writes the message there. If no such element exists,
it creates a `<span class="field-error" data-error-for="x">` after the input.
A new form therefore needs no ceremonial markup but can override placement.

Accessibility: the helper sets `aria-invalid` on the invalid input and wires
`aria-describedby` to the message element, so the error is programmatically
associated with its field rather than only visually adjacent.

### `index.html` (changed)

- Inputs gain `name` attributes. They currently carry only `id`s, and
  `FormData` keys off `name`.
- Two `<script>` tags for the new modules, before `app.js`.
- A new signup form (see Scope below).

### `app.js` (changed)

`validateForm` is deleted. The submit handler becomes:

```js
const { rules, validate } = window.Validation;
const { readValues, showErrors, clearErrors } = window.ValidationDisplay;
const { required, minLength } = rules;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validate(readValues(form), loginSchema);
  if (!result.valid) return showErrors(form, result.errors);
  clearErrors(form);
  login(...);
});
```

The `login` stub and `API_ENDPOINT` are unchanged.

## Error Contract

- `validate` returns `{ valid: boolean, errors: { field: message } }` — a
  **single message string per field**, not an array. Rules for a field run in
  order and **stop at the first failure**: an empty required field reports
  "Username is required", not that plus a length complaint.
- **Only `required` cares about emptiness.** Every other rule passes on an
  empty value. This is what makes optional fields expressible: `[email()]`
  accepts blank, `[required(), email()]` does not.
- `required` treats a whitespace-only value as empty. It trims for the check
  only and never mutates the value. Length rules measure the raw string.
- A schema field absent from the submitted values validates as `""`. A values
  key absent from the schema is ignored, not an error. Partially-validated
  forms are therefore supported.
- `min`/`max` coerce with `Number()` and return a "must be a number" message on
  `NaN` rather than silently passing.
- `email` uses a pragmatic `something@something.tld` check, not RFC 5322. It
  will accept addresses that do not deliver; real verification is a send, not a
  regex. This is an accepted limitation, not an oversight.
- Errors for a field clear when the user edits it — the display helper installs
  an `input` listener — so stale messages do not linger during correction.
- Validation runs **on submit only**: not on blur, not per keystroke. This
  matches current behavior.

## Scope

In scope:

- The two new modules.
- Rewiring the existing login form.
- A **new signup form** in `index.html` (email, password, age), added
  deliberately as a second consumer. With one caller, "reusable" is an untested
  claim; the signup form exercises `email`, `minLength`, and `min` and
  pressure-tests the schema shape before it hardens.
- Unit tests for the core.

Out of scope:

- Cross-field rules, async rules.
- Lint/format tooling, end-to-end tooling.
- Any change to `src/index.js`, `src/utils.js`, the `login` stub, or
  `API_ENDPOINT`.
- Actual form submission to a server — `login` remains a stub.

## Testing

`package.json` gains `"scripts": { "test": "node --test" }`; tests live in
`test/validation.test.js` and `require('../src/validation.js')` — which the
dual-export shim makes possible.

Covered:

- Each of the six rules: a passing value, a failing value, the boundary case
  (`minLength(3)` against exactly three characters), and the custom-message
  override.
- The three contract semantics as explicit tests: short-circuit (an empty field
  yields exactly one message), optional-field behavior (`[email()]` passes on
  `""`; `[required(), email()]` fails), and whitespace-only counting as empty
  for `required`.
- `validate` composition: a clean multi-field pass; a multi-field failure
  returning one message per failing field; a schema field missing from the
  values; a values key absent from the schema being ignored.
- `min`/`max` against a non-numeric string returning the "must be a number"
  message.

**Known gap:** `src/validation-display.js` has no automated test. Testing it
requires a DOM, which means either jsdom (a dependency, ruled out by the
zero-dependency constraint) or end-to-end tooling (out of scope for this work).
The display layer is verified **by hand** in the browser against both forms:

1. Submitting either form empty shows one message per invalid field.
2. Each message appears next to its own input.
3. Editing a field clears that field's message.
4. A valid submit clears all messages and reaches the `login` stub.

This will be reported as manual verification, not as automated test coverage.
If the gap needs closing later, end-to-end tests are the cheaper fix than
jsdom, because they exercise the real submit path.

## Risks and Assumptions

- Assumption: the signup form's field set (email, password, age) is
  representative enough to pressure-test the abstraction. Validate via the
  first real form that follows — if it needs a rule shape the schema cannot
  express, the rule-function signature is the escape hatch and no redesign
  should be required.
- Adding `name` attributes to existing inputs changes `index.html` markup. No
  current code reads those inputs by `name`, and the existing `id`-based
  lookups are being replaced in the same change, so nothing else depends on the
  present markup.
- The dual-export shim is a dated idiom. It is four lines and deletable the day
  a bundler is introduced.
