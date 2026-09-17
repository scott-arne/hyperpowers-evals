# Reusable Form Validation — Design

Date: 2026-09-16
Status: approved in brainstorming, pending user review of this document

## Problem

`app.js` contains a `validateForm` that checks two hardcoded fields
(`username`, `password`) and returns a single form-level error string. The
submit handler reads each field with its own `document.getElementById` call and
reports failures with `console.error`, so a validation failure produces no
user-visible output at all.

There is exactly one form in the repository today. Additional forms are
anticipated. As written, every new form would duplicate the field reads, the
ad-hoc checks, and the (currently nonexistent) error display.

## Goal

A shared module that any form can use to validate its fields and display the
resulting messages, so adding a form means declaring its rules rather than
rewriting the mechanics.

## Scope

In scope:

- Per-field rules: required, and format rules (email, min/max length, numeric
  range, regex pattern).
- Rendering error messages into the DOM next to the offending field, with
  accessible markup.
- Migrating the existing login form onto the shared module.

Explicitly out of scope:

- Cross-field rules (password confirmation, date ordering). No hooks are built
  for them.
- Asynchronous or server-side rules (username-taken, coupon-valid). The API is
  synchronous throughout.
- Live validation on blur or keystroke. Validation runs on submit only.
- Submit wiring. The module never attaches a submit listener; each form keeps
  its own handler and calls the module from it.

## Global Constraints

- **Module format: ES modules.** The shared module uses `export`;
  `index.html` loads the app with `<script type="module" src="app.js">`.
  Consequence: the page must be served over HTTP (`npx serve .` or equivalent);
  opening `index.html` via `file://` no longer works.
- **File extension `.mjs` for the shared module.** `package.json` has no
  `"type"` field, so Node treats `.js` as CommonJS and could not import an ESM
  `validation.js` in a test. Setting `"type": "module"` would break the
  unrelated CommonJS files `src/index.js` and `src/utils.js`. The `.mjs`
  extension is read as ESM by Node and is irrelevant to browsers.
- **Testing: `node:test`, zero dependencies.** The repository takes no new
  dependencies as part of this work. Unit tests cover the pure layer only; the
  DOM layer is verified manually in a browser (see Testing).
- **No linter or formatter** is introduced. Match the existing file style:
  two-space indent, double-quoted strings, semicolons.
- The CommonJS tree under `src/` is not touched.

## Architecture

New file `validation.mjs` at the repository root, next to `app.js`. Three
layers in one file, each usable independently:

### Layer 1 — Rule factories (pure, no DOM)

Each factory returns a validator `(value) => string | null`, returning the
error message on failure and `null` on pass. Each accepts an optional custom
message as its final argument so a form can override the default wording
without authoring a new rule.

- `required(message?)`
- `email(message?)`
- `minLength(n, message?)`
- `maxLength(n, message?)`
- `range(min, max, message?)`
- `pattern(regexp, message)` — message is required here; there is no sensible
  default wording for an arbitrary pattern.

A custom rule needs no registration: any `(value) => string | null` function
may appear in a schema.

### Layer 2 — Pure validation (no DOM)

```
validate(values, schema) -> { valid: boolean, errors: { [field]: string } }
```

`schema` maps a field name to an array of validators. Rules run in array order
and evaluation of a field stops at its first failure, so each field yields at
most one message. `errors` contains only failing fields; `valid` is
`errors` being empty.

### Layer 3 — DOM integration

- `showErrors(formEl, errors)` — renders messages (see Error Rendering).
- `clearErrors(formEl)` — removes all rendered messages and ARIA attributes.
- `validateForm(formEl, schema) -> { valid, values, errors }` — the function
  forms call. It clears existing errors, reads the values, runs `validate`,
  renders any errors, and returns the result including `values` so the caller
  need not read the DOM again.

### Consumer shape

```js
import { validateForm, required, minLength } from "./validation.mjs";

const loginSchema = {
  username: [required(), minLength(3)],
  password: [required(), minLength(8)],
};

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const { valid, values } = validateForm(e.target, loginSchema);
  if (!valid) return;
  console.log("Login result:", login(values.username, values.password));
});
```

## Data Flow

1. The form's own submit handler calls `preventDefault()` and then
   `validateForm(formEl, schema)`.
2. `validateForm` calls `clearErrors(formEl)`.
3. For each field name in the schema, it resolves the element via
   `formEl.elements[name]` and reads its value.
4. It calls `validate(values, schema)`.
5. If there are errors, it calls `showErrors(formEl, errors)`.
6. It returns `{ valid, values, errors }` to the caller, which proceeds with
   submission only when `valid` is true.

## Error Rendering Convention

This convention is a contract shared by every form; changing it later means
touching all of them.

For each invalid field:

- Find-or-create `<span class="field-error" data-error-for="<name>"
  id="<formId>-<name>-error">` positioned immediately after the input, and set
  its text content to the message.
- Set `aria-invalid="true"` on the input.
- Set `aria-describedby` on the input to the span's id, so assistive
  technology announces the message rather than only marking the field invalid.

`clearErrors` removes created spans, empties pre-placed ones, and removes both
ARIA attributes from every input in the form.

Find-or-create rather than always-create, for two reasons: repeated submits
must not stack duplicate spans, and a form needing the message in a specific
position for layout can pre-place the span in its own HTML and have the module
fill it in.

The id is prefixed with the form's `id` because `aria-describedby` requires a
page-unique target and two forms on one page may both contain an `email`
field. When a form has no `id`, the module substitutes a generated
per-page counter.

Styling: `index.html` gains a small inline `<style>` block giving
`.field-error` a red color and a smaller font size. Without it the messages
render as ordinary black body text, indistinguishable from labels. There is no
CSS file in the repository and this work does not add one.

## Edge Cases and Error Handling

- **Schema names a field absent from the DOM** — throw an `Error` naming the
  field. This condition is always a typo or a stale schema; skipping it
  silently would ship a field with no validation and no signal.
- **A grouped control (`RadioNodeList`) or multi-value input is named in the
  schema** — throw an `Error` naming the field. v1 supports single-value
  inputs only; half-supporting groups is worse than refusing them clearly.
- **Whitespace-only input** — `required()` treats `"   "` as empty. No value is
  trimmed globally and `values` is returned exactly as typed: trimming every
  value would silently alter passwords, which is a correctness bug rather than
  a convenience. A form wanting trimmed input adds a rule for it.
- **A field present in the DOM but absent from the schema** — ignored, not an
  error. Forms legitimately contain fields needing no validation.
- **Empty schema** — valid, no errors.
- **Non-string values** — rules coerce with `String(value ?? "")` before
  testing, except `range`, which parses with `Number` and fails with its
  message when the result is `NaN`.

## Testing

Unit tests in `validation.test.mjs`, run with `node --test` via a `"test"`
script added to `package.json`. No dependencies.

Written test-first, driving the implementation.

Coverage:

- Each rule factory: passing value, failing value, custom message override,
  boundary values for `minLength` / `maxLength` / `range`.
- `required()` against `""`, `"   "`, and a valid value.
- `validate()`: first-failure-wins ordering, multiple failing fields, empty
  schema, a field in the schema with an empty rule array.
- Non-string coercion and the `range` `NaN` path.

**Known coverage gap, accepted:** layer 3 (`showErrors`, `clearErrors`,
`validateForm`) is not unit-tested, because testing it requires a DOM and the
repository is taking no new dependencies such as `jsdom`. That layer is
verified manually in a browser against the login form: an empty submit shows
both messages, fixing one field and resubmitting clears only that message, a
valid submit renders no messages, and repeated submits never duplicate a span.
The find-or-create logic and the ARIA wiring are the highest-risk untested
code; adding `jsdom` later is the remedy if this layer grows.

## Files Changed

- `validation.mjs` — new. The shared module.
- `validation.test.mjs` — new. Unit tests for layers 1 and 2.
- `app.js` — import the module, delete the local `validateForm`, take field
  values from the `validateForm` return rather than `getElementById`.
- `index.html` — add `name` attributes to the two inputs, switch to
  `<script type="module" src="app.js">`, add the `.field-error` style block.
- `package.json` — add `"scripts": { "test": "node --test" }`.
- `.gitignore` — already created during brainstorming, ahead of implementation, so
  this spec is not committed by accident. Ignores `docs/superpowers` and
  `docs/hyperpowers`.

## Assumptions

- Assumption: the anticipated forms are conventional text-input forms
  (signup, contact) with no grouped controls requiring validation; validate by
  confirming the next form added fits the single-value-input constraint before
  building on v1.
- Assumption: serving the page over HTTP is acceptable in whatever workflow
  currently opens `index.html`; validate by confirming no tooling or
  documentation depends on `file://` access.
