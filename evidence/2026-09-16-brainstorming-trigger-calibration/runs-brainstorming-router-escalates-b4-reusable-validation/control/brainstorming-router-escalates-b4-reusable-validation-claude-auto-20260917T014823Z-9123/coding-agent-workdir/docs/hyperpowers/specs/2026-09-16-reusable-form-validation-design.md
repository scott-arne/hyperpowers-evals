# Reusable Form Validation — Design

Date: 2026-09-16
Status: Approved for planning

## Problem

`app.js` contains a `validateForm` function that hardcodes the field names
`username` and `password`, implements a single rule (non-empty), and returns
one error string for the whole form. A second form cannot use it without
copying it. The submit handler reads each input by literal element id and
reports failures to `console.error`.

The goal is a shared validation module that any form in this project can use.

## Scope and Non-Goals

In scope:

- A `validation.js` module: rule factories, a pure validator, and a thin
  form-submit adapter.
- Converting the existing login form to use it.
- Zero-dependency unit tests for the pure parts.

Explicitly not in scope:

- Rendering error messages into the page. The module reports errors to a
  caller-supplied callback; each form decides what to do with them. As a
  result `app.js` continues to send validation failures to `console.error`,
  where users do not see them. This is a known remaining gap and the natural
  next piece of work, not a defect introduced here.
- Async or server-side validation.
- Cross-field rules (for example confirm-password). The rule signature leaves
  room for them; none ship now.
- Converting `src/` away from CommonJS.
- Any change to `login()` or `API_ENDPOINT`.

## Decisions

Each decision below was settled with the human partner during brainstorming.

1. **Module ownership: rules plus input reading.** The module validates a
   `<form>` element against a declared schema and hands errors back through a
   callback. It does not own error markup or styling. Chosen over a
   pure-rules-only module (which would leave ~8 lines of duplicated DOM wiring
   per form) and over a display-owning module (which would bake in markup
   decisions with no second form to validate them against).

2. **ES modules.** `validation.js` uses `export`; `index.html` loads `app.js`
   with `<script type="module">`. Chosen because the identical file runs in
   the browser and under `node --test` with no shim and no bundler.
   Accepted consequence: `type="module"` is fetched under CORS rules, so
   opening `index.html` via `file://` no longer works and a local HTTP server
   is required.

3. **Rules as data.** Rules are small composable functions produced by
   factories; a schema is a plain object mapping field names to rule arrays.
   Chosen over the browser Constraint Validation API (rules in markup — less
   logic to own, but untestable without a DOM, which is most of the value
   here) and over one hand-written validate function per form (which makes the
   wiring reusable but not the validation, i.e. not what was asked for).

4. **General prep, not a specific second form.** No concrete second form or
   additional rules are confirmed. The rule vocabulary is therefore capped at
   two: `required`, which the login form uses, and `minLength`, which is
   included as the second rule so the schema format is exercised by more than
   a single rule shape. Nothing beyond those two ships; generality past them
   is deferred until a form needs it.

5. **Unit tests, no linter.** `node:test` and `node:assert` are built into the
   installed Node (v26.8.2), so tests add no dependencies. eslint/prettier are
   skipped: they would be the first dependencies in a zero-dependency repo, for
   64 lines of code.

## Architecture

One new file, `validation.js`, with two layers.

### Pure core (no DOM)

```js
export function required(message = "This field is required")
export function minLength(n, message)
export function validate(values, schema)
```

A **rule** is a function `(value, values) => string | null`, returning a
message on failure and `null` on pass. The second parameter is the full values
object; it exists so cross-field rules can be added later without changing the
rule signature. No rule uses it today.

A **schema** is `{ fieldName: [rule, ...] }`.

`validate(values, schema)` returns:

```js
{ valid: true,  errors: {} }
{ valid: false, errors: { username: "Username is required" } }
```

Errors are keyed per field, replacing the current single whole-form string, so
a caller can point at the field that failed.

**Rules short-circuit per field:** the first failing rule for a field produces
that field's message and the remaining rules for that field are not run. One
message per field. Collecting every failure per field is a later change that
does not break this return shape.

Fields present in `values` but absent from the schema are ignored. Fields in
the schema but absent from `values` are validated as the empty string, so a
missing field fails `required` rather than passing silently.

### Form adapter (DOM)

```js
export function attachValidation(formEl, schema, { onValid, onInvalid })
```

Binds one `submit` listener to `formEl`. On submit it calls
`e.preventDefault()`, builds a values object from `new FormData(formEl)`,
calls `validate`, then calls `onValid(values)` or `onInvalid(errors, values)`.
It contains no validation logic of its own.

### Data flow

```
submit event
  -> preventDefault()
  -> FormData(formEl) -> plain values object
  -> validate(values, schema)
  -> valid   ? onValid(values)
     invalid ? onInvalid(errors, values)
```

## Behavior Changes

Two deliberate changes to existing behavior:

1. **`required` rejects whitespace-only input.** Today `validateForm` uses a
   falsy check, so `"   "` passes. A shared `required` that preserved this
   would propagate the bug to every future form.

2. **`index.html` inputs gain `name` attributes.** They currently have `id`
   only, and `FormData` collects named fields exclusively. Without this the
   adapter sees an empty values object.

## Error Handling

- `attachValidation` throws a `TypeError` if `formEl` is null or not a form
  element. Passing a bad selector result is a programmer error and should fail
  loudly at wiring time, not silently no-op at submit time.
- `onValid` and `onInvalid` are both optional; a missing callback is a no-op.
- Rule factories validate their own arguments: `minLength` throws a
  `TypeError` on a non-integer or negative `n`.
- `validate` does not throw on unexpected value types; a non-string value is
  coerced with `String(value)` before rules see it.

## Testing

`validation.test.js`, run with `node --test`:

- `required` — rejects empty string, whitespace-only, and missing field;
  accepts ordinary text and the string `"0"`.
- `minLength` — boundary cases at `n-1`, `n`, `n+1`; throws on invalid `n`.
- `validate` — valid schema passes with empty errors; a single failing field;
  multiple failing fields; short-circuit behavior (only the first failing
  rule's message appears); unknown fields in `values` ignored; schema field
  missing from `values` fails `required`.
- Custom messages are returned verbatim.

`attachValidation`'s guard clause is unit tested — passing `null` must throw a
`TypeError`, which needs no DOM.

**Known coverage gap:** `attachValidation`'s *submit path* is not unit tested.
It needs a real `HTMLFormElement` for `FormData`, which `node:test` has no DOM
for, and adding jsdom for one thin function was declined. It stays small enough
to review by eye and is verified manually in the browser (submit empty, submit
whitespace-only, submit valid).

## Module Format Detail

Adding `"type": "module"` to the root `package.json` would break
`src/index.js`, which uses `require`. A new `src/package.json` containing
`{"type": "commonjs"}` scopes the old format to that directory. This is the
standard Node dual-format pattern and avoids both converting `src/` (out of
scope) and renaming to `.mjs` (which depends on the local server sending the
correct MIME type for that extension).

## Files

| File | Change |
|---|---|
| `validation.js` | New. Rule factories, `validate`, `attachValidation`. |
| `validation.test.js` | New. `node:test` coverage of the pure core. |
| `app.js` | Delete `validateForm`; import the module, declare `loginSchema`, replace the inline submit handler with `attachValidation`. `login()` and `API_ENDPOINT` untouched. |
| `index.html` | Add `name` to both inputs; `<script type="module" src="app.js">`. |
| `package.json` | Add `"type": "module"` and `"scripts": { "test": "node --test" }`. |
| `src/package.json` | New. `{"type": "commonjs"}`. |
| `README.md` | Note the local-server requirement and `npm test`. |

Estimated size: roughly 60 lines added, 15 removed.

## Global Constraints

- Zero runtime and development dependencies. `node:test` and `node:assert`
  only.
- No bundler, no transpiler, no build step.
- `validate` and all rule factories must remain free of DOM references so they
  run under `node --test` unmodified.
- Follow the existing code style in `app.js`: two-space indent, double-quoted
  strings, semicolons.
- Implementation follows TDD: the tests above are written before the
  implementation they cover.

## Verification

- `npm test` passes.
- Serving the directory over HTTP and loading `index.html`: submitting an empty
  form logs per-field errors; submitting whitespace-only input fails
  validation; submitting valid input reaches `login()` and logs the result.
