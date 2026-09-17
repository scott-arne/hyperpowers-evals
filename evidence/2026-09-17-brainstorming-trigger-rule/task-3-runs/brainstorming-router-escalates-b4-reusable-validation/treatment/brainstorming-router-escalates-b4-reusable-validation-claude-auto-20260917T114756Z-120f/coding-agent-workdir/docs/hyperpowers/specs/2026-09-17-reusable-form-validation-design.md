# Reusable Form Validation — Design

Date: 2026-09-17
Status: Approved (design), pending implementation plan

## Problem

`app.js` contains a single `validateForm(formData)` that hard-codes the login
form's two fields and returns one error message for the whole form. Any second
form in this app would have to copy it and edit the field names. There is no
shared validation module, and no form other than login exists yet.

The goal is that the next form reuses validation instead of copying it.

## Scope

In scope:

- A shared, dependency-free validation module.
- Migrating the existing login form onto it.
- Unit tests for the module.

Out of scope (explicitly not being built):

- Any form-binding / auto-wiring layer (`bindForm`).
- Error-display markup or a rendering contract.
- Linter or formatter configuration.
- Changes to `src/index.js` / `src/utils.js` (an unrelated CommonJS island).
- Any new validation rule for the login form itself.

## Global Constraints

- Zero third-party dependencies. The repo has none and keeps none.
- No bundler and no build step.
- ES modules, loaded natively by the browser.
- Unit tests via `node:test` (built into Node). No other test tooling.
- Existing CommonJS files (`src/index.js`, `src/utils.js`) must keep working
  untouched.

## Decisions

Each of these was chosen with the human partner during brainstorming.

1. **No second form is queued.** Design for the minimum plausible reuse case;
   do not build a rules framework for requirements that do not exist.
2. **Rules are predicate functions**, not a fixed declarative vocabulary. An
   unanticipated rule then lives in the form that needs it rather than forcing
   a change to shared code.
3. **ES modules** over a global namespace or a bundler. Accepted cost: the page
   must be served over http, not opened as `file://`.
4. **Unit tests only**; no linter or formatter this pass.
5. **Approach A — pure validator**, not `bindForm`. The pure core is the part
   that is genuinely shared and can be got right today; error presentation is
   the part we would be guessing at with no second form to check against.
   `bindForm` remains a strictly additive layer for later.

## Architecture

### New file: `src/validation.mjs`

An ES module with no imports.

**Rule contract.** A rule is a function `(value) => string | null`: an error
message, or `null` when the value passes. This is the entire extension point.

**Shipped rule helpers.** Only the two that today's code or a plausible next
form actually need. Both accept an optional custom message so call sites can
phrase their own errors.

- `required(message?)` — fails on `undefined`, `null`, and whitespace-only
  strings.
- `minLength(n, message?)` — fails when a present value is shorter than `n`.
  Treats an absent value as passing, so `required` owns absence and the two
  compose without reporting the same field twice.

**The validator.**

```js
validate(values, schema) -> { valid: boolean, errors: { [field]: string } }
```

`schema` maps a field name to an array of rules. Within a field, evaluation
stops at the first failing rule. Across fields, every field is checked, so
`errors` carries at most one message per failing field. `valid` is true exactly
when `errors` has no keys.

**Reader helper.**

```js
valuesFromForm(formEl) -> { [name]: string }
```

Reads `formEl.elements` by `name` attribute into a plain object. This is the
only DOM-aware function in the module and it is a pure read: no listeners, no
rendering, no mutation.

### Behavior changes from today

These are intentional, not incidental, and are the reason the migration is not
a pure code move:

1. **Whitespace-only input now fails `required`.** Today `!formData.username`
   treats `"   "` as valid. This is treated as a bug and fixed.
2. **Errors are per-field.** Today's shape is `{ valid, error }` with a single
   whole-form message ("Missing required fields"). The new shape is
   `{ valid, errors }` keyed by field. A form with many fields cannot say
   anything useful with one string, so this is what makes the module reusable.
   Changing it now, before anything depends on the old shape, is cheapest.
   Login's console output becomes correspondingly more specific.

### Module format

`package.json` has no `"type"` field, so `.js` files are CommonJS. Setting
`"type": "module"` would break `src/index.js` and `src/utils.js`, and renaming
them is out of scope. The new files therefore use the explicit `.mjs`
extension: `src/validation.mjs` and `test/validation.test.mjs`.

Serving `.mjs` was checked rather than assumed: the local Python 3.14
`http.server` maps `.mjs` to `text/javascript`, so browsers will accept it.

## Integration

### `index.html`

- Add `name="username"` and `name="password"` to the two inputs. They carry
  only `id` today, and `valuesFromForm` reads by `name`. Existing ids stay.
- Change `<script src="app.js">` to `<script type="module" src="app.js">`.

### `app.js`

- Import `validate`, `required`, and `valuesFromForm` from
  `./src/validation.mjs`.
- Declare the login schema:

  ```js
  const LOGIN_SCHEMA = {
    username: [required("Username is required")],
    password: [required("Password is required")],
  };
  ```

- In the submit handler: `valuesFromForm(e.target)`, then
  `validate(values, LOGIN_SCHEMA)`. On success call `login()` exactly as now;
  on failure log the per-field errors.
- Delete `validateForm`; the module replaces it.
- Leave `API_ENDPOINT` and `login()` untouched.

No `minLength` is added to the login password. It would be an invented
requirement, and tightening a login rule can lock out existing accounts — that
is a separate product decision, not a refactor freebie.

## Testing

`test/validation.test.mjs`, run by `node --test` via a new
`"scripts": { "test": "node --test" }` in `package.json`. Still zero
dependencies.

Cases:

- `required` — rejects empty string, `undefined`, and whitespace-only; accepts
  a real value. This pins behavior change 1.
- `minLength` — rejects a short present value; passes an absent value, so it
  composes with `required` without double-reporting.
- `validate` — reports every failing field rather than only the first; stops at
  the first failing rule within a single field; returns `valid: true` with an
  empty `errors` object when all fields pass.
- `valuesFromForm` — driven with a small fake `{ elements: [...] }` object
  rather than a DOM shim, keeping the suite dependency-free.

Manual verification: serve the directory over http and confirm the login form
still logs a result on valid input, and logs a per-field message on empty
input.

## Risks and Assumptions

- Assumption: the next form's error presentation is unknown, so no rendering
  contract is committed to. Validate via the first real second form — if its
  error UI matches login's, add `bindForm` then.
- The `file://` workflow stops working for `index.html` once the script is a
  module. Accepted explicitly during brainstorming.
- `valuesFromForm` returns raw strings only; it does not coerce types or handle
  checkboxes, radios, or multi-selects. The current form has neither. If a
  later form needs them, that is a scoped extension to one function.
