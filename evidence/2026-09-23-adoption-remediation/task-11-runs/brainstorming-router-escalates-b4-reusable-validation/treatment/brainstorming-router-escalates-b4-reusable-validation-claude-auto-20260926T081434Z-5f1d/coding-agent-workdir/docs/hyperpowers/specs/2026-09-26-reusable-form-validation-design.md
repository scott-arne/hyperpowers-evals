# Reusable Form Validation — Design

Date: 2026-09-26
Status: Approved (design); not yet planned
Branch: `feature/webapp-enhancement`

## Problem

`app.js` contains a `validateForm` function hardcoded to the login form's two
fields, returning a single aggregate error string that is reported only via
`console.error`. A second form cannot reuse any of it. Beyond the rule logic,
the submit handler itself (`app.js:17-28`) is boilerplate every new form would
copy: read each input by id, call validate, branch, report.

Additional forms are anticipated but not yet specified, so the mechanism must
be general rather than fitted to two known forms.

## Goals

- A shared validation mechanism usable by any form in the app.
- A rule vocabulary covering the common cases, with an escape hatch so an
  unanticipated rule is never blocked.
- Per-field error messages rendered to the user, replacing console-only output.
- The validation core independently usable and testable without a DOM.

## Non-Goals

- Async / server-side rules (username availability). Explicitly deferred; they
  introduce pending state, debouncing, and race handling, and would change the
  module's shape. Addable later as a separate concern over the same core.
- Live revalidation on blur/input, touched-state tracking, submit-button
  disabling. A form controller can be layered on the same core if wanted.
- Numeric range rules. Expressible via the custom escape hatch until a real
  case appears.
- Linting, formatting, and end-to-end test infrastructure.

## Global Constraints

- **Module convention:** ES modules throughout. `package.json` gains
  `"type": "module"`; `src/index.js` and `src/utils.js` convert from CommonJS.
- **Dependencies:** `jsdom` as the single devDependency, for binder tests.
  No runtime dependencies.
- **Test infrastructure:** Node's built-in `node:test` / `node:assert`.
  `npm test` runs `node --test`. Unit tests only.
- **No build step.** Plain static files; the browser loads ES modules directly.

## Architecture

Four files under `src/validation/`. The dependency arrow runs one way —
`bind → validate → rules` — and nothing points back.

### `rules.js`

Rule factories. Each returns `{ test(value, allValues), message }`.

| Factory | Fails when |
|---|---|
| `required()` | value is empty or whitespace-only |
| `minLength(n)` | value shorter than `n` |
| `maxLength(n)` | value longer than `n` |
| `email()` | value lacks a non-empty local part, exactly one `@`, or a domain containing a dot |
| `pattern(re, message)` | value does not match `re` |
| `matches(otherField)` | value differs from `allValues[otherField]` |

Every factory accepts an optional trailing message override so a form can
supply field-specific wording.

`email()` deliberately does not attempt RFC 5322 conformance. The check exists
to catch typos before a submit, not to prove deliverability, which only sending
mail can establish.

This file imports nothing and knows nothing about forms or the DOM.

**Escape hatch:** a custom rule is any object with `test` and `message`. No
registration API exists or is needed:

```js
[required(), { test: v => v !== 'admin', message: 'Reserved name' }]
```

### `validate.js`

```js
validate(data, schema) -> { valid: boolean, errors: { [field]: string } }
```

A pure function over plain objects. `schema` maps a field name to an array of
rules. For each field, rules run in order and the **first failure wins** — one
message per field. A field missing from `data` is treated as the empty string
so `required()` catches it. Fields present in `data` but absent from `schema`
are ignored.

Rule order is therefore meaningful; `required()` goes first by convention.

Rationale for first-failure-wins: showing "Required" and "Must be at least 8
characters" together is noise, and the second is a consequence of the first.

### `bind.js`

```js
attachValidation(formEl, schema, onValid) -> void
```

The only file that touches the DOM. Registers a `submit` listener that:

1. Calls `preventDefault()`.
2. Clears all existing error state from a prior submit.
3. Collects values with `new FormData(formEl)`, keyed by input `name`.
4. Calls `validate(data, schema)`.
5. Valid → calls `onValid(data)`. Invalid → renders errors and stops.

**Error rendering.** For each field with an error, insert (or reuse) a
`<span class="field-error" data-error-for="<name>">` immediately after the
input, set its `textContent`, and set `aria-invalid="true"` plus
`aria-describedby` on the input. Reusing by `data-error-for` keeps repeated
submits from stacking duplicate spans.

Accessibility lives here deliberately: wiring it once in the binder means every
form inherits it, which is a large part of the justification for having a
binder at all.

### `index.js`

Re-exports the public surface (`validate`, `attachValidation`, and the rule
factories) so callers write a single import.

## Error Handling

| Situation | Behavior | Why |
|---|---|---|
| Schema names a field the form lacks | `attachValidation` throws an `Error` naming the field, at attach time | A typo'd field name is a wiring bug. Failing on page load beats a rule that silently never runs while the form silently accepts bad input. |
| Form input absent from schema | Allowed, ignored | Submit buttons and hidden fields exist; demanding a rule per input would be hostile. |
| `matches('x')` where `x` is absent | Rule fails with its message | `test` receives `allValues` and cannot assume the key exists. Throwing here would be disproportionate. |
| Repeated field names (checkbox groups, multi-select) | First value kept; values treated as strings | Documented limitation for v1 rather than half-handled. |

## Migrating the Login Form

- `index.html`: add `name="username"` / `name="password"` to the inputs
  (existing `id`s retained); `<script src="app.js">` becomes
  `<script type="module" src="app.js">`.
- `app.js`: delete `validateForm`; replace the submit handler with a schema
  plus `attachValidation(form, loginSchema, ({ username, password }) =>
  login(username, password))`. `login` and `API_ENDPOINT` are unchanged.
- `package.json`: add `"type": "module"`, a `test` script, and the `jsdom`
  devDependency.
- `src/index.js`, `src/utils.js`: convert `require`/`module.exports` to
  `import`/`export`. Otherwise untouched — they are unrelated to this feature
  and change only to satisfy the single module convention.

**User-visible behavior change, intended:** login validation errors currently
reach only the console, so a user gets no feedback. After this change they
appear next to the offending field.

## Testing Strategy

Unit tests with `node:test` / `node:assert`.

- **`rules`** — each factory: passing value, failing value, message override.
  Boundary values for `minLength` / `maxLength`. Whitespace-only for
  `required()`.
- **`validate`** — first-failure-wins ordering; multiple fields each with their
  own error; missing key treated as empty; extra data keys ignored; the
  `valid: true` path returns an empty `errors` object; cross-field `matches`
  via `allValues`; a custom `{test, message}` object works with no special
  handling.
- **`bind`** (jsdom) — valid submit calls `onValid` with the collected data and
  renders no errors; invalid submit does not call `onValid`; error spans are
  inserted with correct text and `data-error-for`; `aria-invalid` and
  `aria-describedby` are set and later cleared; a second submit replaces rather
  than duplicates spans; a schema naming an absent field throws at attach time.

## Open Assumptions

- Assumption: the anticipated future forms need no async or numeric-range
  rules at introduction; validate by revisiting this spec when the second form
  is specified. The custom escape hatch covers numeric ranges in the interim.
- Assumption: no framework adoption is planned that would supply its own form
  layer; validate by confirming before the binder grows further. The pure core
  survives such a change regardless — only `bind.js` would be displaced.
