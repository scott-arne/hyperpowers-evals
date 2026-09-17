# Reusable Form Validation — Design

Date: 2026-09-17
Status: approved design, not yet implemented

## Problem

`app.js` contains a single `validateForm()` that hardcodes two field names
(`username`, `password`), checks only presence, returns one first-failure error
string, and reports failures to `console.error`. Adding a second form means
copying that function, the submit handler that reads DOM values by element id,
and whatever error reporting the new form invents. Nothing about the current
shape is reusable: the rules, the wiring, and the error display are all fused
into one login-specific block.

The goal is that adding a form costs a schema and one function call.

## Scope

In scope:

- Required-field and basic-format rules: required, email, min length, max
  length, numeric range. Synchronous, each rule self-contained per field.
- Inline per-field error messages rendered in the DOM, cleared on each submit.
- Native ES modules, no build step.
- Migration of the existing login form onto the new layer.
- Unit-test infrastructure and tests for the pure core.

Explicitly out of scope (deferred, with room left in the design):

- Cross-field rules (password confirmation, date ordering).
- Async / server-checked rules (username availability).
- Live validation on blur or input; submit-button disabling.
- Linting and formatting infrastructure.
- End-to-end / browser-driven tests.

## Decisions

These were settled during brainstorming and are not open questions:

1. **Rule scope:** required plus basic formats. Synchronous, per-field.
2. **Error presentation:** inline per-field messages in the DOM.
3. **Module format:** native ES modules (`<script type="module">`). The page is
   served over `http://`, not opened as a `file://` path.
4. **Approach:** a pure rules/evaluation core plus a generic form controller
   that owns DOM reading and error rendering — rather than a rules-only library
   (which makes every form re-solve error UI) or the native Constraint
   Validation API (which limits rule expressiveness and custom message wording,
   and is not unit-testable without a DOM).
5. **Tooling:** unit tests only, via `node:test`. No linter, no formatter, no
   e2e harness.

## Architecture

Three new files under `src/validation/`, layered so each has one job and each
layer is usable without the one above it.

### `src/validation/rules.js`

Pure, DOM-free rule factories. Each returns a validator with the signature
`(value: string) => string | null` — the message on failure, `null` on pass.

```
required(message?)
email(message?)
minLength(n, message?)
maxLength(n, message?)
range(min, max, message?)
```

Each accepts an optional message override; otherwise it supplies a default
("This field is required", "Enter a valid email address", and so on).

Rule semantics, made explicit so they are not re-decided during
implementation:

- Every validator receives a **string** (values arrive from DOM inputs).
- `required` fails on the empty string. Because values are trimmed before
  validation, whitespace-only input fails too.
- `email` uses a pragmatic check — non-empty local part, a single `@`, a
  domain containing a dot with non-empty labels — not RFC 5322. The intent is
  to catch typos, not to be an authority on address syntax; real verification
  is a server's job.
- `minLength` / `maxLength` compare `value.length`, inclusive at both bounds
  (`minLength(3)` passes on exactly 3 characters).
- `range(min, max)` parses the value with `Number(value)` and fails with its
  message if the result is `NaN`, so a non-numeric entry reports the range
  message rather than throwing. Bounds are inclusive.
- Only `required` fails on empty input. Every other rule treats `""` as a pass,
  so an optional field with a format rule is valid when left blank; pair it
  with `required()` when the field is mandatory.
- Rules target text-like inputs (`text`, `password`, `email`, `number`,
  `textarea`). Checkboxes, radio groups, and multi-selects are out of scope.

A validator is just a function, so a one-off custom rule needs nothing from
this module — any `(value) => string | null` works in a schema.

Depends on: nothing.

### `src/validation/validate.js`

```
validate(values, schema) -> { valid, errors }
```

A schema maps field name to an array of validators:

```js
{ username: [required()], email: [required(), email()] }
```

Behavior:

- Runs each field's validators in array order and keeps the **first** failure
  for that field. `errors` is `{ fieldName: message }` containing only failing
  fields.
- `valid` is `Object.keys(errors).length === 0`.
- A key present in `values` but absent from `schema` is ignored.
- A key present in `schema` but absent from `values` is validated as `""`.

Depends on: the validator calling convention only, not on `rules.js` itself.

### `src/validation/form.js`

```
attachValidation(formEl, schema, onValid) -> void
```

The only file that touches the DOM. It registers a `submit` listener that:

1. Calls `preventDefault()`.
2. Collects values from `formEl.elements` by schema key, trimming each.
3. Calls `validate(values, schema)`.
4. On failure, renders the errors. On success, clears all errors and calls
   `onValid(values)`.

Depends on: `validate.js` and the DOM.

### Data flow

```
submit event
  -> formEl.elements
  -> values object (trimmed)
  -> validate(values, schema)
  -> { valid, errors }
  -> error rendering   (invalid)
  -> onValid(values)   (valid)  -> login()
```

The key property: `rules.js` and `validate.js` never reference a DOM API, so
they run and are tested in plain Node. `form.js` is the only part that needs a
browser.

## DOM contract

**Field identification.** Values are read via `formEl.elements[name]`, so every
validated input needs a `name` attribute matching its schema key. The two login
inputs gain `name="username"` and `name="password"`; their existing `id`
attributes stay.

**Trimming.** Values are trimmed before validation, so a whitespace-only entry
fails `required()`.

**Error message placement.** For each field, the controller looks for an
element matching `[data-error-for="<fieldName>"]` inside the form.

- If one exists, it is used.
- If not, the controller creates
  `<span class="field-error" data-error-for="<fieldName>"></span>` and inserts
  it immediately after the input.

Auto-creation is what keeps adding a form cheap; an error node is hand-placed
in the markup only when it needs to live somewhere other than directly after
its field.

**Clearing.** On every submit, the controller clears the text of every error
node it manages before rendering the current failures, so a message cannot
outlive the problem that produced it.

**Accessibility.** A failing input gets `aria-invalid="true"` (removed when it
passes); its error node carries `role="alert"`. Two attributes, applied now
rather than retrofitted.

## Error handling

The controller is defensive about programmer error and transparent about
everything else.

Throws at **attach time**, not at submit time — both conditions are knowable
when `attachValidation` is called, and a page that is wired wrong should say so
on load rather than on the user's first submit:

- `formEl` is null/undefined or is not a `<form>` element.
- A schema key has no matching named input inside the form. Silently
  validating a field that does not exist is the failure mode that costs an
  afternoon of debugging.

Not caught, deliberately:

- A validator that throws. That is a bug in the rule; swallowing it hides it.
- `onValid` throwing. The controller is not the right place to decide what a
  submit-handler failure means.

User-facing validation failures are not errors in this sense — they are the
normal path, and they are reported through the returned `errors` object and the
inline messages.

## Changes to existing files

- **`index.html`** — add `type="module"` to the `app.js` script tag; add
  `name` attributes to the two inputs.
- **`app.js`** — delete `validateForm()`; import `attachValidation` and the
  rules; declare the login schema; replace the hand-written submit listener
  with one `attachValidation` call whose `onValid` calls `login()`. `login()`
  and `API_ENDPOINT` are otherwise unchanged.
- **`package.json`** — add `scripts.test`.
- **`src/index.js`, `src/utils.js`** — untouched. They are unrelated CommonJS,
  are never loaded by the page, and stay as they are.

## Testing

**Runner:** `node:test` with `node:assert/strict`. `npm test` runs
`node --test test/`. No dependencies are added.

**Module resolution constraint.** Node reads `.js` as CommonJS unless told
otherwise, and `src/index.js` / `src/utils.js` are CommonJS that this work does
not touch — so a root-level `"type": "module"` would break them. Instead,
`src/validation/package.json` contains exactly `{"type": "module"}`, marking
only that directory as ESM. Browsers ignore the file; Node respects it. Test
files use the `.mjs` extension so they are ESM regardless of location.

**Unit tests** cover `rules.js` and `validate.js`:

- Each rule's pass and fail cases, plus boundaries: empty string,
  whitespace-only, exact min and max length, range endpoints, a non-numeric
  value passed to `range`, a set of valid and invalid email inputs, and the
  "only `required` fails on empty" rule applied to each format rule.
- Message overrides: a rule given a custom message returns it rather than the
  default.
- `validate`: first-failure-per-field ordering, fully clean input, multiple
  failing fields at once, a key in `values` absent from the schema, and a key
  in the schema absent from `values`.

**`form.js` has no automated tests.** It requires a DOM, and the jsdom /
Playwright infrastructure that would supply one is out of scope. This is a
known, accepted gap: the DOM contract (error node placement, clearing,
`aria-invalid`) is verified manually in a browser, and any claim about it must
be reported as manually verified rather than tested. It is also the reason
`form.js` stays thin — logic belongs in the tested core.

**Method:** TDD for the core. The test for a rule is written before the rule.

## Success criteria

1. Adding a new form requires only: markup with `name` attributes, a schema
   object, and one `attachValidation` call. No new validation or rendering
   code.
2. The login form behaves as before for valid input, and now shows an inline
   message next to each empty field instead of logging to the console.
3. `npm test` passes and covers every rule and every documented `validate`
   behavior.
4. `rules.js` and `validate.js` contain no DOM references.
