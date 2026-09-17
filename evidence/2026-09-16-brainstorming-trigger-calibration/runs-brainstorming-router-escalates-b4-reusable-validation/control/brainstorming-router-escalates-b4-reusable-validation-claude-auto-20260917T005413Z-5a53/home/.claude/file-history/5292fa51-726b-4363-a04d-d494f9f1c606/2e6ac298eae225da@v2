# Reusable Form Validation — Design

Date: 2026-09-16
Status: approved in brainstorming, pending implementation plan

## Problem

`app.js` contains a single `validateForm(formData)` that hardcodes knowledge of two
fields, `username` and `password`. It returns `{ valid, error }` — one message for the
whole form, stopping at the first problem — and the caller writes failures to
`console.error`, so nothing appears on the page. The form's submit handler reads each
input by `id` by hand.

Nothing here can serve a second form. Adding a signup form today means copying the
submit handler, copying the field reading, and writing a second bespoke validation
function whose error wording drifts from the first.

## Goal

A validation module that both the existing login form and a new signup form consume,
where adding a form is "declare a schema, call one function" rather than "copy the
plumbing".

## Global Constraints

These apply to every task in the implementation plan.

- **ES modules throughout.** The new modules use `export`/`import`. `index.html` loads
  its entry script with `<script type="module">`. No bundler and no build step is
  introduced.
- **The rule and engine layers are DOM-free.** `rules.js` and `validate.js` must not
  reference `document`, `window`, or any DOM type, so they are unit-testable in plain
  Node. Only `bind.js` touches the DOM.
- **Unit tests with `node:test`.** Node's built-in runner plus `node:assert`. A `test`
  script is added to `package.json`. Tests live in `test/`.
- **jsdom is the one permitted devDependency**, used solely so `bind.js` can be tested
  against a real DOM rather than a hand-rolled fake element.
- **No linter or formatter** is configured as part of this work (considered and
  declined).
- The existing CommonJS files `src/index.js` and `src/utils.js` are unrelated to the web
  page and are not touched.

## Architecture

Three new files under `src/validation/`, in dependency order:

### `src/validation/rules.js`

Exported rule factories. Each returns a plain descriptor:

```js
{ name: string, message: string, test(value, allValues) => boolean }
```

`test` returns `true` when the value is acceptable. Factories to provide:

| Factory | Rule |
|---|---|
| `required()` | Value is present and not whitespace-only |
| `minLength(n)` | Length is at least `n` |
| `maxLength(n)` | Length is at most `n` |
| `email()` | Value looks like an email address |
| `matches(otherField)` | Value equals `allValues[otherField]` |
| `pattern(re, message)` | Value matches `re` |
| `custom(fn, message)` | `fn(value, allValues)` returns truthy |

Each factory carries a sensible default message. The factories whose signature does not
already end in a message — `required`, `minLength`, `maxLength`, `email`, `matches` —
accept an optional trailing `message` argument overriding that default, so a form can
reword a rule without writing a new one. `pattern` and `custom` already take their
message as a required argument, since no useful default exists for them.

`test` receives `allValues` as well as `value` specifically so cross-field rules like
`matches` fit the same shape as every other rule. This signature is the hardest thing
here to change later — every rule would need rewriting — so it is fixed deliberately
rather than discovered.

### `src/validation/validate.js`

```js
validate(values, schema) => { valid: boolean, errors: { [field]: string } }
```

A schema maps a field name to an ordered array of rule descriptors. `validate` runs each
field's rules in order and records that field's **first** failing message, then continues
to the remaining fields. So a form reports at most one message per field but reports all
bad fields at once. `errors` is an empty object when `valid` is `true`.

The engine does not import `rules.js`. It only calls `test`, so a schema may freely mix
built-in factories with inline `custom` rules; the engine cannot tell them apart.

A field named in the schema but absent from `values` is validated as `undefined` — which
`required()` fails and most other rules pass — rather than being skipped or throwing.

### `src/validation/bind.js`

```js
bindForm(formElement, schema, onValid) => void
```

The only file that touches the DOM. It attaches a `submit` listener that:

1. calls `preventDefault()`,
2. builds a values object from `new FormData(formElement)`,
3. calls `validate(values, schema)`,
4. on failure, renders each message into that field's error element and returns,
5. on success, calls `onValid(values)`.

## DOM contract

`FormData` keys off the `name` attribute, and the current inputs have only `id`. So:

- Every validated input carries a `name` attribute, and **the schema keys on `name`**.
  For the login form the two strings coincide with the existing ids.
- Every validated field has a sibling error element declaring which field it serves:
  `<span class="error" data-error-for="username" role="alert"></span>`. `bindForm` finds
  it by `data-error-for` and sets `textContent`.

Error elements are declared in markup rather than injected by `bindForm`. A helper that
injects DOM dictates markup and styling to every consumer and is fiddly to test; a
declared element is visible in the HTML, stylable, and easy to assert against. The cost
is two lines of markup per field.

## Error handling

| Situation | Behavior |
|---|---|
| A field's error element is missing | Log a warning naming the field; continue validating. A markup omission must not break submission, nor fail silently. |
| Schema names a field with no matching input in the form | Throw from `bindForm` at bind time, not at submit time. This is a programmer error and belongs on page load. Distinct from the engine's missing-value case below: the input exists here or it does not, which `bindForm` can see by inspecting `formElement.elements` before any submit. |
| Schema field whose input exists but contributes no value at submit (e.g. an unchecked checkbox) | Not an error. `validate` receives `undefined` for it and applies the rules normally. |
| Stale messages | Every error element is cleared at the start of each submit, so corrected fields stop showing old messages. |
| Invalid input accessibility | Invalid inputs get `aria-invalid="true"`; it is removed when the field passes. Error elements carry `role="alert"`. |
| `onValid` throws | Not caught. Swallowing an application error inside the validation layer would hide real bugs. |

Validation runs on submit only. A user correcting a field sees the message persist until
the next submit. On-blur revalidation is a purely additive later change and is out of
scope.

## Changes to existing files

- **`index.html`** — add `name` attributes to the login inputs; add an error `<span>` per
  field; change `<script src="app.js">` to `<script type="module" src="app.js">`; add the
  signup form markup.
- **`app.js`** — delete `validateForm`. Import `bindForm` and the rules, declare the login
  schema `{ username: [required()], password: [required()] }`, and call
  `bindForm(loginForm, loginSchema, values => login(values.username, values.password))`.
  `login()` and `API_ENDPOINT` are unchanged.
- **`package.json`** — add a `test` script and a `devDependencies` entry for jsdom.

## Signup form

The signup form is built as part of this work, not deferred. Without a real second
consumer, "reusable" is an untested claim.

Fields and schema:

| Field | Rules |
|---|---|
| `username` | `required()`, `minLength(3)` |
| `email` | `required()`, `email()` |
| `password` | `required()`, `minLength(8)` |
| `confirmPassword` | `required()`, `matches('password')` |
| `terms` (checkbox) | `required()` |

Its submit handler is a stub in the same spirit as `login()`.

**The acceptance condition for the abstraction: adding the signup form requires no change
to `rules.js` or `validate.js`.** If either needs editing to accommodate it, the design is
wrong and should be revised rather than patched.

Note: `terms` is a checkbox, and `FormData` omits unchecked checkboxes entirely rather
than reporting them as `false`. This is exactly the "field absent from `values`" case the
engine handles by validating `undefined`, which `required()` fails — the intended
outcome. The implementation must confirm this rather than assume it.

## Testing

Runner: `node:test` + `node:assert`. The `rules.js` and `validate.js` suites need no
dependencies at all — the payoff for keeping those layers pure.

- **`rules.js`** — each factory's `test` in isolation, at the boundaries that bite:
  `required()` against `""`, `"   "`, and `undefined`; `minLength(n)` exactly at `n`;
  `email()` against strings that look valid but are not; `matches()` when the referenced
  field is absent from `allValues`; message overrides taking effect.
- **`validate.js`** — a field stopping at its first failing rule while other fields still
  report; the empty-`errors` shape when valid; a schema field missing from `values`; a
  schema mixing built-in and `custom` rules.
- **`bind.js`** (jsdom) — messages rendered into the right elements; stale messages
  cleared on resubmit; `onValid` called with the parsed values only when valid and not
  called when invalid; `preventDefault` applied; the missing-error-element warning path;
  the bind-time throw for an unknown schema field; `aria-invalid` set and removed.

## Out of scope

- On-blur or on-input live validation.
- Async or server-side validation.
- Real network submission — `login()` stays the existing stub.
- Any change to `src/index.js` or `src/utils.js`.
- Linting and formatting configuration.
