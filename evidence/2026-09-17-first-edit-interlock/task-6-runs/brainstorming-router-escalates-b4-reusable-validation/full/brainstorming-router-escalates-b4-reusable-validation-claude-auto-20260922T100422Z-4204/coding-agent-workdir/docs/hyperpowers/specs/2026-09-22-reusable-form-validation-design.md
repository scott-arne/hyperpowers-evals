# Reusable Form Validation

Date: 2026-09-22
Status: approved, not yet implemented

## Problem

`app.js` holds a `validateForm(formData)` that hardcodes a presence check over
exactly two fields, `username` and `password`, and returns a single error
string for the whole form. It is a local function in the same file as the
login form's submit handler, so no other form can use it. Any second form
would copy it and edit the field names.

The request is to make the validation reusable across multiple forms.

## Scope

In scope:

- A shared validation module that any form can use.
- Converting the login form to consume it.
- Unit tests for the module.

Out of scope, each decided explicitly during design:

- **Rendering errors into the DOM.** The module stays free of DOM knowledge.
  Each form keeps its own submit handler and decides how to present failures.
  The login form continues to log to the console.
- **Form binding.** No attach-to-a-`<form>`-element helper, no `onValid`
  callback plumbing.
- **Building a second form.** None exists and none is planned; the module is
  general so a future form can adopt it, but this change adds no new form.
- **`src/index.js` and `src/utils.js`.** This CommonJS pair is unrelated to the
  webapp, is not loaded by `index.html`, and is not converted or moved.
- **Lint and format tooling.** Offered and declined; the repo stays
  dependency-free.

## Global Constraints

- **ES modules.** Chosen over a `window` global and over CommonJS-plus-bundler.
  Accepted cost, stated and accepted during design: `index.html` gains
  `<script type="module">`, so the page must be served over HTTP and will no
  longer open from `file://`.
- **Zero runtime and dev dependencies.** The repo has no `node_modules`, no
  lockfile, and no bundler. Nothing here adds one. Tests use Node's built-in
  runner.
- **Rules only.** The module is pure: values in, result out, no DOM, no I/O.
- **Nothing outside the webapp files changes** beyond adding a `test` script to
  `package.json`.

## Design

### File layout

Two new files at the repository root, alongside `index.html` and `app.js`:

- `validation.mjs` — the module
- `validation.test.mjs` — its tests

The webapp lives at the root, so the module belongs there rather than in
`src/`.

The `.mjs` extension is load-bearing. `package.json` has no `"type"` field, so
Node treats a plain `.js` file as CommonJS and would refuse to import an ESM
`validation.js` from the test file. The alternatives were rejected: adding
`"type": "module"` breaks `src/index.js`'s `require()` call, and renaming those
files to `.cjs` pulls unrelated code into this change. `.mjs` buys Node-side
testability while leaving everything else alone. Browsers ignore the extension
and load the file by path.

### Module interface

A **rule** is any function `(value) => string | null` — the error message on
failure, `null` on pass. Custom rules are therefore ordinary inline functions
and require no change to the shared module. This is the property that keeps a
shared validator from accumulating every individual form's special cases.

Four exports:

```js
export function required(message = "This field is required")
export function minLength(n, message)
export function matches(regexp, message)
export function validate(values, rules)
```

`required`, `minLength`, and `matches` are rule *makers*: each returns a rule.
Each takes an optional `message` that overrides a sensible default, so a form
can phrase its own errors without a new rule kind.

`validate(values, rules)` takes a plain object of field values and a rules map
of the form `{ fieldName: [rule, rule, ...] }`. It returns:

```js
{ valid: boolean, errors: { [fieldName]: message } }
```

`valid` is true exactly when `errors` has no keys.

### Semantics

These three could each reasonably go the other way, so they are fixed here:

1. **A field named in `rules` but absent from `values`** receives `undefined`.
   `required()` rejects it. There is no separate "missing key" concept and no
   distinction between absent and empty.
2. **A field present in `values` but not named in `rules`** is ignored, not an
   error. A form may pass its entire value bag and validate a subset.
3. **First failure per field wins.** Within a field, rules run in array order
   and evaluation stops at the first failure. Other fields are still
   validated. The result is at most one message per failing field, and a form
   with three bad fields reports all three.

`required` rejects `undefined`, `null`, and any string that is empty or only
whitespace.

`minLength` and `matches` operate on the value as a string, treating
`undefined` and `null` as `""`. Naive coercion would be a trap: `String(undefined)`
is the 9-character `"undefined"`, so a field carrying `minLength(8)` without a
preceding `required()` would pass while empty. With the rule above it fails
instead, which is the safer default for a rule set assembled per form.

### Call site

`app.js` deletes its local `validateForm` and imports the module:

```js
import { validate, required } from "./validation.mjs";

const loginRules = { username: [required()], password: [required()] };
const { valid, errors } = validate({ username, password }, loginRules);
```

On failure the handler logs `errors` via `console.error`, as it does today. On
success it calls `login()` unchanged. `API_ENDPOINT` and `login()` are not
touched.

`index.html` changes `<script src="app.js">` to
`<script type="module" src="app.js">`. `app.js` keeps its `.js` extension;
only Node cares about the extension, and Node never loads `app.js`.

### Behavior change

The login form currently reports one message, `"Missing required fields"`, when
either field is blank. Afterward it reports a per-field message for each blank
field. The accept/reject decision for every input is identical; only the shape
and wording of the console output differ. `validateForm`'s `{ valid, error }`
return shape is replaced by `{ valid, errors }`; its only caller is the submit
handler in `app.js`, updated in the same change.

## Testing

`validation.test.mjs` runs under `node --test`, added to `package.json` as
`"scripts": { "test": "node --test" }`.

Cases:

- Each rule maker in isolation, passing and failing, with the default message
  and with an overriding message.
- `required` against `undefined`, `null`, `""`, `"   "`, and a valid string.
- `validate` with every field valid, returning `valid: true` and empty
  `errors`.
- `validate` with one failing field, and with several failing fields.
- First-rule-wins ordering within a field.
- A key in `values` with no entry in `rules` is ignored.
- A key in `rules` with no entry in `values` is treated as `undefined`.
- An empty rules object returns `valid: true`.

## Verification

`npm test` covers the module. The page change — `type="module"` plus the import
— is not covered by an automated test. It will be reported as verified by
reading only, unless a browser check is requested; any claim that the page
works in a browser requires actually serving and loading it.

## Risks

- Serving over HTTP is now mandatory for the page. Anyone opening
  `index.html` directly from disk will see a silent module-load failure in the
  console. This cost was raised during design and accepted.
- The module is general but has exactly one consumer, so its interface is
  validated against a single presence-checking form. The first genuinely
  different form is the real test of the design.
