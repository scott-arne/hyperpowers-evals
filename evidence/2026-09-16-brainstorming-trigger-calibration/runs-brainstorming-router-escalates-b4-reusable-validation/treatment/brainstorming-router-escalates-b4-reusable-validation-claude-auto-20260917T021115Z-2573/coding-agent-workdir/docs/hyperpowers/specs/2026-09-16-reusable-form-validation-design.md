# Reusable Form Validation — Design

Date: 2026-09-16
Status: approved in brainstorming, pending user review of this document

## Problem

`app.js` contains a `validateForm(formData)` that hardcodes the login form's two
field names and returns a single all-or-nothing error string. Any second form
would have to copy it. The goal is a shared validation layer that a new form can
adopt without modifying it, with the login form migrated onto that layer as its
first consumer.

## Decisions Taken

These were settled during brainstorming and are inputs to the design, not open
questions.

| Decision | Choice | Why |
|---|---|---|
| Consumers in scope | Login only | No other form exists yet; generality is judged against one real consumer. |
| Module loading | ES modules | Real module boundary without a bundler; costs only that the page must be served over `http://`. |
| Module scope | Rules + form binding, no error rendering | Removes the repeated read-and-check glue; committing to one error-display style with a single consumer would be a guess. |
| Rule declaration | Predicate functions per field | Adding a rule type never requires editing the shared module. |
| Package module type | `"type": "module"` across the package | Lets Node's built-in test runner import the browser module directly. |
| Password `minLength` | Not applied to login | Keeps the migration behavior-identical apart from trimming. |

## Global Constraints

- Zero runtime and zero development dependencies. The test runner is Node's
  built-in `node --test`; no linter or formatter is being introduced by this
  work.
- Unit-test infrastructure is set up as part of this work (`test/`, a first
  passing test file, an `npm test` script). No end-to-end, fuzz, or mutation
  testing.
- Assumption: the developer environment has Node 18 or newer, which is what
  provides `node --test`. Validate via `node --version` before running tests.
- Assumption: the page will be served over `http://` during development, e.g.
  `python3 -m http.server`. Validate by loading the served page once after the
  change and confirming the module loads.

## Architecture

One new file, `validation.js`, at the repository root beside `app.js`. It has
two layers, and the split is the point: the rule layer knows nothing about the
DOM, and exactly one function knows how to read a form element.

```
validation.js
  rule layer      required(), minLength(), validate(values, rules)   <- no DOM
  binding layer   valuesFromForm(formEl), validateForm(formEl, rules) <- DOM
```

A rule is a function `(value, values) => string | null`, returning an error
message or `null`. The second parameter exists so a cross-field rule ("passwords
match") is expressible without any change to the core.

### Public API

```js
export function required(message = "This field is required")
export function minLength(n, message)
export function validate(values, rules)     // -> { valid, errors }
export function valuesFromForm(formEl)      // -> { [name]: trimmedValue }
export function validateForm(formEl, rules) // -> { valid, errors, values }
```

`rules` maps a field name to an array of rule functions. `errors` maps a field
name to the first failing message for that field; fields that pass are absent.
`valid` is true exactly when `errors` has no keys. A field with no entry in
`rules` is not validated.

Rules for a field that does not exist in the form receive `undefined`, so
`required` fails. That is intentional: a typo'd field name surfaces as a
validation failure rather than as a silently skipped check.

Trimming happens in two places on purpose, and they do not conflict.
`valuesFromForm` trims so that the values a caller receives are the trimmed
ones, and `required` trims its own input so the rule layer is correct when
called directly on an untrimmed object. Neither depends on the other having
run.

### Deliberate omissions

Not built, because nothing needs them yet and each is additive later:

- No `pattern`, `email`, or `matches` built-ins. A form that needs one passes
  its own inline function; that is the whole point of the rule shape.
- No async rules. Adding them later changes `validate`'s return type, so it
  should be driven by a real server-side-check requirement.
- No DOM error rendering and no submit-handler wiring.

## Data Flow

1. Submit handler calls `validateForm(formEl, RULES)`.
2. `valuesFromForm` walks `formEl.elements`, skipping elements without a `name`
   and skipping submit/button elements, and trims string values.
3. `validate` runs each field's rules in order, stopping at that field's first
   failure, and collects messages into `errors`.
4. The caller branches on `valid` and decides how to present `errors`.

## Login Migration

**`index.html`**

- Add `name="username"` and `name="password"` to the two inputs (keeping the
  existing `id` attributes, which the current DOM lookups and any styling use).
- Change `<script src="app.js">` to `<script type="module" src="app.js">`.

**`app.js`**

- Remove the local `validateForm`.
- `import { validateForm, required } from "./validation.js";`
- Declare rules as data near the top:

  ```js
  const LOGIN_RULES = {
    username: [required("Username is required")],
    password: [required("Password is required")],
  };
  ```

- The submit handler calls `validateForm(form, LOGIN_RULES)` and uses the
  returned `values` instead of two `getElementById(...).value` reads. On
  failure it logs `console.error("Validation errors:", errors)` — console-only,
  matching today's behavior.
- `login()` and `API_ENDPOINT` are untouched.

**`package.json`**

- Add `"type": "module"` and a `"scripts": { "test": "node --test" }` entry.

**`src/`**

- `src/utils.js`: `module.exports = { greet }` becomes `export function greet`.
- `src/index.js`: `require('./utils')` becomes `import { greet } from './utils.js'`.
- These two files are unrelated to form validation and are converted only
  because `"type": "module"` would otherwise break them. No other change to
  their behavior.

### Behavior changes

Both are intended, and both are visible to a user of the login form:

1. Per-field messages replace the single `"Missing required fields"` string.
2. Values are trimmed before checking, so a whitespace-only username now fails
   where it previously passed.

## Error Handling

User-input problems are returned as data in `errors`. Programming errors throw
immediately:

- `validate` throws `TypeError` if `rules` is not an object, or if any entry in
  a field's rule array is not a function.
- `valuesFromForm` and `validateForm` throw `TypeError` if the argument is not a
  form element (no `elements` collection).

Failing loudly is the right trade here: the alternative is silently skipping a
check that the author believes is running.

## Testing

`test/validation.test.js`, run with `npm test` (`node --test`). Coverage:

- `required` rejects empty string, whitespace-only, and missing field; accepts a
  non-empty value.
- `minLength` rejects a short value, accepts an exact-length value.
- `validate` collects errors per field, reports only the first failure for a
  field with two failing rules, ignores fields absent from `rules`, and returns
  `valid: true` with an empty `errors` for clean input.
- `validate` throws `TypeError` on a non-function rule entry.
- Cross-field rule: a rule reading the second `values` parameter works.
- `valuesFromForm` trims, skips unnamed elements, and skips the submit button.

The DOM-touching tests need a form element. Node's test runner has no DOM and
the project has no dependencies, so those two `valuesFromForm` cases use a
hand-built stub object exposing an `elements` array rather than a real DOM. This
is a real limit: the stub encodes our belief about how `form.elements` behaves,
so the browser path also gets one manual check.

Manual verification: serve the directory, load `index.html`, submit empty (two
per-field errors in the console), submit whitespace-only username (username
error), submit valid input (login result logged).

## Out of Scope

- Adding a second form.
- Rendering validation errors in the page.
- Any change to `login()`, `API_ENDPOINT`, or network behavior.
- Linting, formatting, or CI configuration.
