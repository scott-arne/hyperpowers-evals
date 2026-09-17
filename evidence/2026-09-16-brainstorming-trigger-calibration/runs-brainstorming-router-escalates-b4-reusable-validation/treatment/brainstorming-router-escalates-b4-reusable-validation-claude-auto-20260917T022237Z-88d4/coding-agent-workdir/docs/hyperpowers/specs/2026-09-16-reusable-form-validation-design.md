# Reusable Form Validation — Design

Date: 2026-09-16
Status: Approved (pending spec review)

## Problem

`app.js` contains a single `validateForm()` hardcoded to the login form's
`username` and `password` fields. It returns one error string for the whole
form and is called from a submit handler that also reads the DOM and reports
failures to `console.error`. More forms are planned, with field sets that are
not known yet. As written, each new form would duplicate all three jobs:
reading values out of the DOM, checking them, and displaying the results.

## Goals

- A validation core that any form can use, independent of the DOM.
- A rule vocabulary extensible without modifying shared code, since the
  rules future forms need cannot be enumerated today.
- Removal of the per-form submit-handler boilerplate that exists in `app.js`.
- Unit tests covering the core.

## Non-Goals

- Async or server-side validation. No current form needs it.
- Live validation on `blur` or `input`. Submit-time only.
- A form-state or data-binding library.
- Changes to `login()` or `API_ENDPOINT`. The login stub is out of scope.
- End-to-end browser tests. Disproportionate at this size.

## Global Constraints

- **Module system:** ES modules throughout. `package.json` gains
  `"type": "module"`.
- **Dependencies:** none. The repo is dependency-free and stays that way.
- **Tests:** Node's built-in `node:test` runner, via an `npm test` script.
- **Lint/format:** not configured in this change (explicitly declined).

## Architecture

Two layers. The core is pure and knows nothing about the DOM; the binder is a
thin adapter over it.

```
validation/
  validators.js   built-in rule factories
  validate.js     core: data + rules -> errors
  bindForm.js     DOM adapter
  index.js        public surface (re-exports)
```

Consumers import from `validation/index.js` only. The individual modules are
internal structure, not the interface.

### Validator contract

```js
(value, data) => string | null
```

Returns an error message, or `null` when the value passes. This signature is
the extension point: a custom rule is an ordinary local function, requiring no
change to shared code. The second argument is the full form data object, which
is what makes cross-field rules (confirm-password, end-after-start) possible
without a dedicated mechanism.

### Core

```js
validate(data, rules) -> { valid: boolean, errors: { [field]: string } }
```

- `data` — `{ [field]: value }`.
- `rules` — `{ [field]: validator[] }`.
- Within a field, validators run in order and the **first failure wins**;
  remaining validators for that field are skipped.
- Across fields, **every** field is evaluated, so one submit surfaces all of
  the user's problems.
- `errors` holds at most one message per field. This matches how a form
  renders — one error line per input — and spares callers the choice of which
  of several messages to show.
- `valid` is `true` exactly when `errors` has no keys.
- A field present in `rules` but absent from `data` is validated with
  `undefined` as its value, so `required()` reports it rather than silently
  passing.
- A field present in `data` but absent from `rules` is ignored, not an error.
  Forms may carry values that need no validation.

### Built-in validators

Each is a factory returning a validator. Each accepts an optional trailing
custom message that replaces the default.

| Factory | Fails when |
|---|---|
| `required(message?)` | value is `undefined`, `null`, or a string that is empty after trimming |
| `minLength(n, message?)` | string length is below `n` |
| `maxLength(n, message?)` | string length exceeds `n` |
| `pattern(regex, message?)` | `regex.test(value)` is false |

`minLength`, `maxLength`, and `pattern` treat an empty value as passing, so
that an optional field is only constrained when filled in. Requiredness is
`required()`'s job alone; composing `[required(), minLength(3)]` then yields
the "missing" message rather than the "too short" one for an empty input.

No `email()` validator ships. `pattern` expresses it in one line at the call
site, and a shared approximate email regex is worse than no shared one. Add it
when a real form needs it.

### Binder

```js
bindForm(formEl, rules, onValid) -> () => void
```

Attaches a `submit` listener and returns an unbind function. On submit it:

1. Calls `preventDefault()`.
2. Builds `data` from the form's named inputs.
3. Clears all previously rendered errors.
4. Runs `validate(data, rules)`.
5. On success calls `onValid(data)`; on failure renders the errors.

DOM conventions:

- **Field names** come from each input's `name` attribute. Inputs without one
  are skipped.
- **Error display** targets an element with `data-error-for="<field>"`. The
  binder sets its `textContent` and toggles `aria-invalid` on the matching
  input. A field with no such element is skipped rather than throwing — a
  missing error slot must not break submission.

To keep the binder's logic testable without a DOM, field extraction and error
application are written as separate exported functions that operate on plain
inputs, with `bindForm` as the wiring over them.

## Integration

**`app.js`** — delete `validateForm()` and the hand-written submit handler.
Add a rules object for the login form and a single `bindForm` call whose
`onValid` callback invokes the existing `login()`. `login()` and
`API_ENDPOINT` are unchanged.

**`index.html`** — `<script src="app.js">` becomes
`<script type="module" src="app.js">`. Add `name="username"` and
`name="password"` to the inputs, and a `data-error-for` element per field.

**`package.json`** — add `"type": "module"` and a `test` script.

**`src/index.js`, `src/utils.js`** — convert `require`/`module.exports` to
`import`/`export` (5 lines total). These files are unrelated to the feature,
but `"type": "module"` would otherwise break them.

## Error Handling

- Invalid arguments to `validate` (non-object `data` or `rules`) throw a
  `TypeError` immediately. This is a programming error, not a user error, and
  should fail loudly at development time.
- A validator that throws is not caught. A broken rule must surface rather
  than silently pass a field.
- `bindForm` throws if `formEl` is not an element or `onValid` is not a
  function; both are wiring mistakes visible on first load.
- Missing error-slot elements are tolerated silently, as above.

## Testing

Unit tests under `test/`, run by `node:test`:

- **Each built-in validator** — passing and failing values, the empty-value
  exemption for the length and pattern rules, and custom message override.
- **`validate`** — first-failure-wins within a field; all fields evaluated;
  `valid` true only when no errors; missing-field-in-`data` handling;
  unvalidated-field-in-`data` ignored; cross-field access via the second
  argument.
- **Binder helpers** — field extraction from a plain input list, and error
  application including the missing-slot case.

`bindForm`'s event wiring itself is not unit tested; it is verified manually
in the browser.

## Risks and Assumptions

- *Assumption:* the page is served over HTTP in development. ES modules do not
  load from `file://`. Validate by opening the served page once after the
  change; if direct file access turns out to be required, the fallback is a
  global-namespace build, which would change the module layout.
- Adding `"type": "module"` touches `src/`, which is outside the feature.
  Scope is 5 lines and covered by the existing entry point running.
- One-message-per-field is a deliberate constraint. A form later needing every
  failure listed per field would require a change to the `errors` shape.
