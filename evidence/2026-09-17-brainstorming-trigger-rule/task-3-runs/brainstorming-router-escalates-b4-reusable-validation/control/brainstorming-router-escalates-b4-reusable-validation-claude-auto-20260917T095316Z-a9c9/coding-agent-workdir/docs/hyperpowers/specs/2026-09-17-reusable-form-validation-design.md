# Reusable Form Validation — Design

Date: 2026-09-17
Status: approved (pending final spec review)
Branch: `feature/webapp-enhancement`

## Problem

`app.js` contains a single hardcoded `validateForm(formData)` that checks
whether `username` and `password` are non-empty and returns
`{valid, error}` with one message for the whole form. It is wired directly
into a submit listener that reads two specific element ids and reports
failures with `console.error`.

Nothing about it can be reused. A second form would have to copy the submit
listener, the element reads, the validation branch, and the error reporting.
The request is to make validation reusable across multiple forms.

The human partner confirmed there are no named future consumers — "other
forms will need it later; it should work across the app." The design
therefore targets a general layer while resisting rules nobody has asked
for.

## Scope

In scope:

- A reusable validation layer: rule factories, a pure validator, and a
  DOM binder.
- Migration of the existing login form onto that layer.
- Unit test infrastructure and tests for the new layer.

Out of scope:

- `src/index.js` and `src/utils.js`. They are unrelated CommonJS Node
  scratch with no connection to the web page and are left untouched. The
  repository will hold both module styles after this change; that is
  accepted, not overlooked.
- Live/blur revalidation and dirty-field tracking. Explicitly not chosen.
- Any change to `login()` or `API_ENDPOINT`.
- Server-side validation. This layer is client-side only and is not a
  security control.

## Decisions

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Layer scope | Rules + DOM binding, as separate modules | Rules only (leaves per-form DOM code duplicated); rules + live feedback (speculative state handling) |
| Rule expression | Declarative schema of rule functions | Per-form validator functions over a predicate library; native HTML5 constraint validation |
| Module format | Native ES modules, no build step | Global script tags; a bundler |
| Field identity | `name` attribute | `id` (would require a per-form id map, defeating a generic binder) |
| Node module scope | `src/validation/package.json` with `{"type": "module"}` | Root `"type": "module"` (breaks the two CommonJS files); `.mjs` extensions (static-server MIME risk) |
| Test runner | `node --test` + jsdom (devDependency) | No DOM tests; Playwright end-to-end |

Native HTML5 constraint validation was the closest rejected alternative: it
needs the least code and applies to every form automatically. It was
rejected because cross-field rules have no native expression, validation
logic in markup cannot be unit-tested as pure functions, and default
messages vary by browser and locale.

## Architecture

Three ES modules under `src/validation/`, layered so each is usable and
testable without the one above it. Dependency direction is one-way:
`bind-form` imports `validate`; `validate` and `rules` import nothing. The
pure core never references the DOM.

### `src/validation/rules.js`

A rule is `(value, allValues) => string | null` — an error message, or
`null` when valid. The `allValues` argument is present from the start so
cross-field rules require no later redesign.

`value` is always a string: the binder harvests from control `.value`, and
`validate` substitutes `""` for a schema field missing from the input
object. Rules may therefore call string methods without guarding, and
non-string inputs are outside this layer's contract.

Exported factories: `required`, `minLength`, `maxLength`, `pattern`,
`email`, `matches`. Each accepts an optional custom message and falls back
to a sensible default.

```js
export const required = (message = "This field is required") =>
  (value) => (value.trim() === "" ? message : null);

export const matches = (otherField, message) =>
  (value, allValues) =>
    value === allValues[otherField] ? null : message ?? "Fields do not match";
```

This starting set is the floor for app-wide use. `email` and `matches` earn
inclusion because signup and password-reset are the most likely next
consumers and both need them. Further rules wait for a real form to ask.

### `src/validation/validate.js`

```js
export function validate(values, schema)
// → { valid: boolean, errors: { [field]: string } }
```

Pure, no DOM. Semantics:

- Each field's rules run in order; evaluation **stops at that field's first
  failure**, so the user sees one message per field.
- Fields present in `values` but absent from `schema` are ignored.
- Fields present in `schema` but absent from `values` are treated as the
  empty string, so a schema cannot be defeated by a missing input.
- Never throws. A validation failure is a normal return value.

### `src/validation/bind-form.js`

```js
export function bindForm(formEl, schema, onValid) // → unbind()
```

Attaches a `submit` listener and returns an `unbind()` function so a form
can be removed or re-rendered cleanly.

Submit flow:

1. `preventDefault()`
2. Harvest `{ name: value }` by iterating `formEl.elements`, keyed on each
   control's `name`. Controls without a `name`, disabled controls, and
   submit buttons are skipped.
3. `validate(values, schema)`
4. Clear all previous error state for this form.
5. If invalid: render each message, set ARIA state, focus the first invalid
   control.
6. If valid: call `onValid(values)`.

Validation failure is a normal outcome and never throws. `bindForm` *does*
throw at bind time — not submit time — when `formEl` is null or not a form
element, or when a schema value is not an array of functions. A mistyped
element id must fail loudly on page load rather than silently do nothing
until a user submits. Exceptions thrown by the caller's `onValid` handler
propagate; this layer is not a general error boundary.

## Markup convention

**Field identity.** Fields are keyed by the `name` attribute. `index.html`
gains `name="username"` and `name="password"`; existing `id` attributes stay
for the label/selector usage they already serve.

**Error elements.** For a field named `x`, the binder looks for
`[data-error-for="x"]` within the form. If absent, it creates
`<span class="field-error" data-error-for="x">` and inserts it immediately
after the control. Adopting the layer therefore requires no markup changes,
while a form that needs the message in a specific place can place the
element itself.

Messages are written with `textContent`, never `innerHTML`, so a message can
never become an injection vector even if one later interpolates user input.

**Accessibility.** The error element carries `role="alert"`; an invalid
control gets `aria-invalid="true"` and `aria-describedby` referencing its
error element. Both are cleared on a clean pass. This is a few lines in the
renderer and is expensive to retrofit later.

## Login form migration

`app.js` after the change:

```js
import { required, minLength } from "./src/validation/rules.js";
import { bindForm } from "./src/validation/bind-form.js";

const loginSchema = {
  username: [required("Username is required")],
  password: [required("Password is required"), minLength(8)],
};

bindForm(document.getElementById("login-form"), loginSchema, ({ username, password }) => {
  console.log("Login result:", login(username, password));
});
```

`validateForm` is deleted. `login()` and `API_ENDPOINT` are unchanged.
`index.html` gets `type="module"` on its script tag plus the two `name`
attributes.

**Behaviour change:** the password gains `minLength(8)`. Today any non-empty
password passes. This was surfaced and approved; it is the one
non-structural change in the migration.

**Serving requirement:** `type="module"` means the page must be served over
`http://`. Opening `index.html` from the filesystem will now fail CORS. A
one-line note goes in the README.

## Module scope and tooling

Node resolves CommonJS-vs-ESM from the nearest `package.json`. The root has
no `"type"` field, so `.js` there is CommonJS — which `src/index.js` and
`src/utils.js` depend on. Adding `"type": "module"` at the root would break
them.

Resolution: a two-line `src/validation/package.json` containing
`{"type": "module"}`. Node honours the nearest manifest, so the validation
folder is ESM while the root stays CommonJS. Browsers ignore it. No
unrelated file is touched.

Tooling added (approved):

- `node --test` wired to an `npm test` script. No runtime dependencies.
- `jsdom` as a **devDependency**, so `bindForm`'s DOM behaviour is covered.
  The shipped page remains dependency-free.

Linting/formatting and end-to-end tests were offered and declined.

## Test plan

`rules.test.js`
- Each factory: passing value, failing value, custom message, default
  message.
- `required` rejects whitespace-only input.
- `matches` reads the other field via `allValues`.

`validate.test.js`
- Clean values return `{valid: true, errors: {}}`.
- Multiple failing fields each report a message.
- First-failure-wins: a field with two failing rules reports only the first.
- A field in `values` but not in `schema` is ignored.
- A field in `schema` but not in `values` is validated as an empty string.
- An empty schema returns valid.

`bind-form.test.js` (jsdom)
- Invalid submit does not call `onValid` and renders a message per field.
- Valid submit calls `onValid` once with the harvested values.
- A pre-existing `[data-error-for]` element is reused rather than duplicated.
- Error state from a prior submit is cleared on the next submit.
- `aria-invalid` and `aria-describedby` are set on failure and cleared on
  success.
- The first invalid control receives focus.
- Messages are set as text, not parsed as HTML.
- Controls without `name`, disabled controls, and submit buttons are not
  harvested.
- `unbind()` detaches the listener.
- Bind-time validation throws on a null element, a non-form element, and a
  malformed schema.

## Risks and assumptions

- **The schema format is the expensive-to-change artifact.** Once several
  forms encode it, changing the shape means touching all of them. This is
  the accepted cost of approach A and the reason the rule signature includes
  `allValues` up front.
- *Assumption:* future forms will be standard HTML `<form>` elements with
  named controls, not custom web components or a framework's virtual DOM.
  Validate via the next form that adopts the layer; a component-based form
  would need a different binder over the same pure core, which the layering
  already permits.
- *Assumption:* `minLength(8)` is an acceptable password policy for this
  stub app. Validate with whoever owns the real auth requirements; it is a
  one-line schema edit.
- Client-side validation is a UX affordance, not a security boundary. Any
  real API must revalidate server-side.
