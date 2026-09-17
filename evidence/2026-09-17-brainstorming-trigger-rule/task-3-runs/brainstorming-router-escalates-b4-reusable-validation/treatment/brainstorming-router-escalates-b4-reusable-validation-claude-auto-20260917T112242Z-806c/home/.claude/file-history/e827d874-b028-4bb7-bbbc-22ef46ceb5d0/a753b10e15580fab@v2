# Reusable Form Validation — Design

Date: 2026-09-17
Status: Approved (design); not yet planned or implemented

## Problem

`app.js` contains the whole webapp in 28 lines, and its form handling tangles three
responsibilities in a single submit listener:

1. Reading values out of the DOM by hardcoded element id (`getElementById("username")`).
2. Deciding whether those values are valid (`validateForm`, presence-only, hardcoded to the
   field names `username` and `password`).
3. Reporting the outcome (`console.error` with a single error string).

Nothing here is reusable. A second form would copy the listener, copy the value-reading, and
copy a near-identical `validateForm`. The duplication that matters is the wiring, not the
`if` statements.

## Goal

Extract validation into a shared ES module that owns both the rules and the form wiring, so
that adding a form costs a rules object and a callback.

## Non-goals

Explicitly out of scope, to be revisited only when a real form demands them:

- Rendering error messages into the page. Committing to an error markup and styling
  convention with zero real forms to validate it against is the likeliest thing to be
  regretted.
- Async validators (server-side uniqueness checks and similar).
- Lint and formatting tooling; end-to-end tests; fuzz or mutation testing.
- Any change to `src/index.js` or `src/utils.js`. That is unrelated CommonJS demo code.
- Changing `login()` or `API_ENDPOINT` in `app.js`.

## Global Constraints

These were chosen explicitly during brainstorming and bind every task in the plan:

- **Zero new runtime or dev dependencies.** The repo has none today; it keeps none.
- **Unit tests via built-in `node:test` + `node:assert` only.** No ESLint, no Prettier, no
  Playwright, no jsdom.
- **ES modules**, via the `.mjs` extension (see "Module format" below).
- **YAGNI is the governing constraint.** There is no second form yet. The owner asked for
  the narrowest seam that makes the next form cheap, not a validation framework.

## Decisions and their rationale

### Boundary: rules plus form binding, but not rendering

The module owns validators, validation, and the submit/read-values wiring. It does not own
error display. Pure-rules-only was rejected because it leaves the per-form listener and
value-reading boilerplate duplicated, which is the bulk of what a new form copies.

### Module format: ESM via `.mjs`

`package.json` has no `"type"` field, so Node treats `.js` as CommonJS. Setting
`"type": "module"` would make Node parse `src/utils.js` and `src/index.js` as ESM and break
that unrelated, currently-working code. Using the `.mjs` extension avoids this entirely:
Node always treats `.mjs` as ESM regardless of `package.json`, and browsers never consult
`package.json`.

Accepted cost: `index.html` must be served over HTTP (`npx serve`, or any static server)
rather than opened via `file://`, because browsers block ES module loads from `file://` under
CORS.

Browser globals were rejected for script load-order coupling and for being awkward to
unit-test in Node. CommonJS was rejected because it cannot load in a browser without adding a
bundler to a zero-dependency repo.

### Rules data model: composable validator functions

A validator is a function `(value, allValues) => string | null` — an error message, or `null`
when the value passes. A form's rules are arrays of validators keyed by field name:

```js
const loginRules = {
  username: [required(), minLength(3)],
  password: [required(), minLength(8)],
};
```

Chosen over a plain-data schema (`{ required: true, minLength: 3 }`) and over a single
per-form `validate` function. The plain-data schema's one real advantage is serializability,
which buys nothing in a repo with no backend and no server-driven forms, while costing a
larger interpreting engine plus a `custom: fn` escape hatch that reintroduces functions and
leaves two ways to express a rule. The per-form function approach ships the least framework
but makes every form re-write the per-field loop, which is the duplication being removed.

The function model keeps the engine at roughly 15 lines, makes a one-off rule an inline arrow
function that needs no engine support, and supports cross-field rules (confirm-password, date
ordering) through the `allValues` argument without redesign.

Accepted cost: rules contain functions, so they are not JSON-serializable.

### Result contract

```js
{ valid: boolean, errors: { fieldName: "message" } }
```

**First error per field wins** — validators for a field run in order and the first non-null
message is recorded, because a form shows one message per input. This shape is the most
expensive thing here to change later, since every form and every test encodes against it.

Note this replaces the current single-string `{ valid, error }` shape with per-field errors.

## Architecture

### Files

| File | Change | Purpose |
|---|---|---|
| `validation.mjs` | new, repo root | The reusable module |
| `validation.test.mjs` | new, repo root | `node:test` unit tests |
| `app.js` | edit | Drops local `validateForm`; imports and calls `bindForm` |
| `index.html` | edit | Inputs gain `name`; script tag gains `type="module"` |
| `package.json` | edit | Adds `"scripts": { "test": "node --test" }` |

`validation.mjs` lives at the repo root beside `app.js` rather than in `src/`, because `src/`
holds CommonJS Node demo code and mixing module systems in one directory invites confusion.

`app.js` keeps its `.js` extension. Browsers honor `type="module"` on the script tag
regardless of extension, and nothing in Node ever loads `app.js`. Renaming it to `app.mjs`
was offered and declined in favor of a smaller diff.

### Public interface

```js
// validation.mjs

// Validator factories. Each returns (value, allValues) => string | null.
export function required(message = "This field is required")
export function minLength(n, message = `Must be at least ${n} characters`)

// Pure validation. Never throws.
export function validate(values, rules)  // => { valid, errors }

// DOM binding. Thin glue over validate().
export function bindForm(formEl, { rules, onValid, onInvalid })
```

Shipping exactly two validators is deliberate. Two is enough to exercise the composition
seam; `email`, `pattern`, and others get added when a form needs them. Because a validator is
an ordinary function, a one-off rule requires no module change.

`bindForm` takes an options object rather than positional arguments so that later additions
(validate-on-blur, an error renderer) do not break existing call sites.

### Data flow

```
submit event
  -> bindForm: preventDefault()
  -> new FormData(formEl) -> Object.fromEntries -> values
  -> validate(values, rules) -> { valid, errors }
  -> valid ? onValid(values) : onInvalid(errors)
```

Reading values through `FormData` is why inputs need `name` attributes. It is also what lets
`bindForm` stay generic: it never hardcodes a field name and never calls `getElementById`,
which is precisely what made the existing code single-purpose.

### Error handling

- `validate` never throws. Invalid user input is data, not an exception.
- A field named in `rules` with no corresponding input yields `undefined`, which `required`
  correctly reports as missing.
- `bindForm` throws immediately with an explicit message when `formEl` is null. This improves
  on current behavior, where a missing `#login-form` produces an opaque
  "addEventListener of null".
- `onInvalid` defaults to logging via `console.error`, preserving the current app's observable
  behavior.

## Testing

`validation.test.mjs`, run with `npm test` (`node --test`), covers:

- Each validator in isolation, including custom-message overrides.
- `validate` aggregation across multiple fields, and the `valid` flag.
- First-error-per-field precedence when several validators fail on one field.
- Cross-field access through the `allValues` argument.
- Missing-field handling (a rule for a field absent from `values`).

**Known coverage gap.** `bindForm` touches the DOM, and testing it would require jsdom, which
the zero-dependency constraint rules out. The design mitigates this by pushing all logic into
`validate` and keeping `bindForm` to roughly six lines of glue. That glue will be verified
manually in a browser and will have no automated coverage. Adding jsdom as a devDependency
was offered and declined; it remains the fix if the gap proves painful.

Manual verification steps:

1. Serve the repo over HTTP and load `index.html`.
2. Submit the empty form; confirm per-field errors are logged.
3. Submit with valid values; confirm the login result is logged as before.

## Risks

- **Over-building.** There is no second form, so the reuse payoff is unproven. Mitigated by
  the two-validator YAGNI line and the excluded rendering layer.
- **`file://` regression.** Anyone developing by double-clicking `index.html` must switch to a
  local server. Accepted knowingly.
- **Untested DOM glue.** See the coverage gap above.

## Open assumptions

- Assumption: future forms will be plain HTML forms in this same page-per-form style, not
  rendered by a framework. Validate via the shape of the next real form; a framework would
  make `bindForm` the wrong seam, though `validate` would survive unchanged.
