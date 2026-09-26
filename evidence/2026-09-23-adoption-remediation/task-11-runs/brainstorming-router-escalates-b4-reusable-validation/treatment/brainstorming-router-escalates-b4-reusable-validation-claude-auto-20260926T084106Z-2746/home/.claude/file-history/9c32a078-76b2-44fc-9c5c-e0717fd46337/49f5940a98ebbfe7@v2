# Reusable Form Validation — Design

**Date:** 2026-09-26
**Status:** Approved design, pending implementation plan

## Problem

Validation lives inline in `app.js` as a single `validateForm` function that
hardcodes the login form's two fields and returns one error string. A signup
form is coming, and further forms after it. Three things would be copied into
each new form: the rule logic, the per-field `getElementById` reading, and the
error reporting — which today goes only to `console.error`, so validation
failures are invisible to the user.

## Goals

- One shared validation module usable by any form in the app.
- Rules composable enough to cover signup (email format, password length,
  confirm-password matching) without reworking the interface.
- Validation errors displayed on the page rather than logged to the console.
- Validation logic unit-tested.

## Non-Goals

- Building the signup form. It is the motivating second consumer, but this work
  delivers the module and converts login only; signup is built later against a
  proven interface.
- Async or server-side validation (uniqueness checks, etc.).
- A linter or formatter for the repo.
- Automated DOM tests. `bindForm` is verified manually in a browser.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Module system | ES modules | Only option where a new page imports the validator without re-learning a script load-order convention; also makes plain Node unit tests possible with no DOM harness. |
| Rule declaration | Arrays of rule functions per field | Least machinery; a custom rule is just a function, needing no framework buy-in. Cross-field rules fall out naturally. |
| Module scope | `validate()` + rules + a thin `bindForm` | Rules alone solve only a third of what is duplicated across forms; input reading and error display are the rest. |
| Error collection | First failing rule per field | Only one message per field is displayed; "required" plus "too short" on one blank field is noise. |
| Test runner | `node:test` | Built in, ESM-native, adds no dependencies to a dependency-free repo. |

## Architecture

New directory `src/validation/`, split along one boundary — pure logic versus
DOM access:

| File | Responsibility | Depends on |
|---|---|---|
| `rules.js` | Rule factories: `required`, `minLength`, `pattern`, `email`, `matches` | nothing |
| `validate.js` | `validate(values, schema)` | nothing |
| `bind-form.js` | `bindForm(formEl, schema, onValid, options)` | DOM, `validate.js` |
| `index.js` | Public surface re-export | the other three |

`bind-form.js` is the only file that touches the document. That is what lets
`rules.js` and `validate.js` be tested in plain Node with no browser harness,
and it is the reason for the split.

Consumers import from `src/validation/index.js` and do not reach into the
individual files, so rule implementations remain free to change.

## API

### Rule contract

A rule is `(value, allValues) => string | null` — an error message, or `null`
if it passes. Rule factories produce rules, so a schema reads as data:

```js
const loginSchema = {
  username: [required()],
  password: [required(), minLength(8)],
};
```

The `allValues` argument is what makes cross-field rules ordinary:

```js
confirmPassword: [required(), matches('password', 'Passwords must match')],
```

Every factory takes an optional custom message as its last argument and
defaults to a sensible one.

**Empty-value convention:** every rule except `required` passes on an empty
value. Without this, one blank required field produces both a `required` and a
`minLength` error for a single mistake. It also makes "optional, but must be
valid if present" expressible as a schema that simply omits `required()`.

### `validate(values, schema)`

Returns `{ valid: boolean, errors: Record<string, string> }`, where `errors`
maps a field name to the message of its *first* failing rule. Rule order within
an array is therefore meaningful: most fundamental first.

`valid` is `true` exactly when `errors` is empty.

### `bindForm(formEl, schema, onValid, options)`

On submit: prevents the default, reads values from the form's inputs,
validates, and either renders errors or clears them and calls
`onValid(values)`.

- **Reads inputs by `name`.** The existing inputs carry only `id`, so `name`
  attributes are added.
- **Validation timing:** on submit; and after the first *failed* submit, a
  field re-validates on input so its error clears as the user corrects it. No
  errors are shown before the first submit.
- **Default rendering:** for field `x`, sets the text of `[data-error-for="x"]`
  within the form, and sets `aria-invalid` and `aria-describedby` on the input.
  Form-level errors go to `[data-error-for="_form"]`.
- **`options.renderErrors`** replaces the display strategy entirely.

`validate()` stays usable standalone, so a form wanting none of `bindForm`'s
opinions can call it directly.

## Error Handling

Wiring mistakes fail loudly at bind time; user mistakes render as messages.

- A missing form element, or a schema field with no matching input, throws at
  bind time. A typo'd field name that silently validates nothing is the
  dangerous failure — a hard error on page load beats a signup form that
  accepts anything.
- A missing `[data-error-for]` container throws at bind time when the default
  renderer is in use, since otherwise errors are computed and displayed
  nowhere. Passing `options.renderErrors` opts out of this check.
- If `onValid` throws or returns a rejected promise, `bindForm` catches it and
  renders the message as the form-level error. This gives a failed login
  somewhere to surface.

## Changes to Existing Code

- **`app.js`** — `validateForm` is deleted; the login schema plus a `bindForm`
  call replace it and the hand-written submit handler. `login()` is unchanged
  and is called from the `onValid` callback. Deleting `validateForm` is
  observationally safe: its only caller is the handler being replaced.
- **`index.html`** — `<script type="module" src="app.js">`; `name` attributes
  on the inputs; a `[data-error-for]` container per field plus one for
  `_form`.
- **`src/index.js`, `src/utils.js`** — converted from CommonJS to ESM so the
  repo has one module system.
- **`package.json`** — add `"type": "module"` and a `test` script running
  `node --test`.
- **`README.md`** — document that the page must be served over HTTP (ES modules
  do not load from `file://`), with the command to do it.

`"type": "module"` is repo-wide: every future `.js` file in this repo is an ES
module by default.

## Testing

Unit tests with `node:test`, covering the pure modules:

- Each rule factory: passing and failing cases, and the custom-message path.
- The empty-value convention: non-`required` rules pass on empty input.
- `matches` resolving against another field's value.
- First-error-wins ordering within a field's rule array.
- `validate` over a whole schema, valid and invalid.

`bind-form.js` is verified manually in a browser: submit empty, submit
partially filled, correct a field and confirm its error clears, and a
successful submit reaching `onValid`.

## Risks and Assumptions

- Assumption: signup's rules are covered by `required`, `email`, `minLength`,
  and `matches`. Validate when signup is actually built; the rule contract
  accepts new factories without interface change if not.
- Serving over HTTP is a workflow change for anyone who opened `index.html`
  directly. Mitigated by the README note.
- `bindForm`'s lack of automated coverage means its submit and render behavior
  is only as verified as the manual pass. Adding jsdom later is a contained
  change, as `bind-form.js` is the sole DOM-touching file.
