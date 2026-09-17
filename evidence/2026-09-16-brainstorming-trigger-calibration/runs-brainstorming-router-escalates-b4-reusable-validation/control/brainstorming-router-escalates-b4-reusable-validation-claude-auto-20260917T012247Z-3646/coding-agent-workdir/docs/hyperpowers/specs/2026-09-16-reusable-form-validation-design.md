# Reusable Form Validation — Design

Date: 2026-09-16
Status: approved (in-chat design approved; spec pending user review)
Branch: `feature/webapp-enhancement`

## Problem

`app.js` defines `validateForm(formData)` inline. It hardcodes the login form's
two fields and returns a single error string:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

Nothing about it can be reused by another form: the field names are baked in,
it lives in the same file as the login submit handler, and it cannot report
which field failed. A second form would copy it and edit the field names.

## Goal

Extract validation into a shared module that an arbitrary future form can reuse
by declaring its own rules, without copying logic.

## Non-goals

These are deliberately excluded and should not be added while implementing:

- Error display UI in the page. `index.html` has no element for messages;
  failures continue to go to `console.error`. Adding error UI is a separate
  task.
- A second form. None exists or is planned.
- Validators beyond `required` (no `email`, `minLength`, `pattern`, etc.).
- A DOM binding layer that reads values off a form element automatically.
- Converting `src/index.js` and `src/utils.js` from CommonJS to ES modules.
- Linting or formatting tooling.

## Context and constraints

The repository is a six-file webapp. Relevant facts:

- `app.js` is loaded by `index.html` as a plain `<script>` — no module system.
- `src/utils.js` and `src/index.js` are CommonJS, run by Node, never loaded by
  the browser.
- `package.json` has no `scripts`, no dependencies, and no `"type"` field.
  There is no test runner, linter, formatter, build step, or CI.
- `index.html` contains exactly one form (`login-form`) with inputs carrying
  `id` attributes and no `name` attributes.

Decisions made with the user during brainstorming:

1. **No specific second form exists.** The work is general future-proofing, so
   speculative generality is treated as a cost, not a benefit.
2. **ES modules**, native `import`/`export`, no build step. Accepted
   consequence: `index.html` can no longer be opened over `file://` and must be
   served (e.g. `npx serve .`).
3. **Per-field error map** as the result shape, collecting every failing field
   rather than stopping at the first.
4. **Rule table** as the composition strategy, rather than a DOM binding helper
   or bare primitives.

## Architecture

Three units with one responsibility each:

| Unit | Responsibility | Depends on |
|---|---|---|
| `src/validation.mjs` | Evaluate values against rules; return a result. Pure; no DOM. | nothing |
| `app.js` | Read login inputs from the DOM, declare login's rules, report failures. | `src/validation.mjs` |
| `test/validation.test.mjs` | Verify the module's contract. | `src/validation.mjs`, `node:test` |

The boundary that matters: `src/validation.mjs` never touches the DOM. Each
form reads its own inputs and hands over a plain object. This is what lets the
module be unit-tested in Node and reused by a form whose markup does not exist
yet.

## The module

`src/validation.mjs` exports two things.

**`required(message)`** returns a validator:

```js
export function required(message) {
  return (value) =>
    value == null || String(value).trim() === "" ? message : null;
}
```

**`validate(values, rules)`** walks the rules and builds the error map:

```js
export function validate(values, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const check of validators) {
      const message = check(values[field]);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
```

### Contracts

- **Validator:** `(value) => string | null`. Returns the error message on
  failure, `null` on success. This is the extension point — any function of
  this shape composes, so new validators need no change to `validate`.
- **`rules`:** `{ [field]: Validator[] }`. Field order in the object determines
  iteration order; validators within a field run in array order.
- **`values`:** a plain object. Keys not named in `rules` are ignored.
- **Result:** `{ valid: boolean, errors: { [field]: string } }`. `errors` is
  always present — `{}` when valid — so consumers never guard before reading
  it.

### Behavior decisions

- **First error per field wins; all fields are collected.** A field displays
  one message at a time, so evaluating further validators for a field that has
  already failed adds nothing. Collecting across fields is the point of the
  error map.
- **`required` trims whitespace.** This is an intentional behavior change:
  today `" "` passes validation because the current code uses a falsy check.
  After this change it fails. Call it out in the implementation summary.
- **A field named in `rules` but absent from `values`** yields `undefined`,
  which `required` rejects. This is correct: a missing field is a missing
  value.
- **An empty `rules` object** produces `{ valid: true, errors: {} }`.
- **No error handling inside `validate`.** Validators are plain functions; a
  custom validator that throws propagates to the caller. Wrapping every call in
  `try`/`catch` would hide bugs in validators for no present benefit.

## Call site changes

`app.js` becomes an ES module:

```js
import { validate, required } from "./src/validation.mjs";

const loginRules = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};
```

The submit handler reads the two inputs as it does today, calls
`validate({ username, password }, loginRules)`, and on failure logs one line
per entry in `errors` via `console.error`. `login()` and `API_ENDPOINT` are
unchanged. The old inline `validateForm` is deleted.

`index.html` changes one line:

```html
<script type="module" src="app.js"></script>
```

`README.md` gains one line noting the app must now be served (`npx serve .`)
rather than opened directly, because module scripts are blocked over `file://`.

## Testing

`package.json` gains `"scripts": { "test": "node --test" }`. No dependencies —
`node:test` and `node:assert` are built in. The `.mjs` extension carries the
module type, so no `"type"` field is added and the CommonJS files keep working.

`test/validation.test.mjs` covers the contract:

| Case | Expected |
|---|---|
| Both fields empty | `valid: false`, both fields in `errors` |
| One field empty | `valid: false`, only that field in `errors` |
| Whitespace-only value | `valid: false` — the trim behavior |
| All fields present | `valid: true`, `errors` is `{}` |
| Key in `values` not named in `rules` | Ignored; does not affect the result |
| Field in `rules` missing from `values` | Treated as empty; error reported |
| Empty `rules` object | `valid: true`, `errors` is `{}` |
| Field with multiple validators, first fails | Only the first message recorded |

Manual verification: serve the directory, submit the login form empty, and
confirm two console errors naming both fields; submit it filled and confirm the
login result logs.

## Files touched

| File | Change |
|---|---|
| `src/validation.mjs` | New — the shared module |
| `test/validation.test.mjs` | New — unit tests |
| `app.js` | Import the module, declare `loginRules`, delete inline `validateForm`, per-field error logging |
| `index.html` | `type="module"` on the script tag |
| `package.json` | Add `scripts.test` |
| `README.md` | One line: serve rather than open directly |
| `.gitignore` | New — ignores `docs/hyperpowers`, `docs/superpowers`, `node_modules/` |

## Risks

- **Assumption: the rule-table shape fits the forms that eventually arrive.**
  No second form exists to check it against, so the API is an educated guess.
  Validate via the first real second form: if its needs do not fit, adjust the
  module then rather than widening it now. The module is small enough
  (~25 lines) that this is cheap.
- **`file://` regression.** Anyone opening `index.html` directly will get a
  blank page and a CORS error in the console. Mitigated only by the README
  line; accepted when ES modules were chosen.
- **The whitespace behavior change** could surprise anyone relying on the
  current falsy check. Judged a bug fix, but it is a behavior change and is
  reported as one.

## Future extension (not now)

If several forms later prove they all read inputs the same way, a
`validateFormElement(formEl, rules)` binding helper can be added on top of
`validate` without changing the existing API. Deferred because it would require
inventing a markup convention — the current inputs have `id` but no `name` —
against forms that do not exist.
