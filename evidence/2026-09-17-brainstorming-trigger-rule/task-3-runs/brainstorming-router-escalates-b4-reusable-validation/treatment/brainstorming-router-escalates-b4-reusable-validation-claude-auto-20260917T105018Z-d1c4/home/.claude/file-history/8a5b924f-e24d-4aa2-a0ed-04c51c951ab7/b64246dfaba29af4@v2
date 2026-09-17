# Reusable Form Validation — Design

Date: 2026-09-17
Status: approved in brainstorming; pending user review of this document
Branch: `feature/webapp-enhancement`

## Problem

`app.js` contains a `validateForm` hardcoded to the field names `username`
and `password`:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

Three things make it unusable by a second form:

1. The field names are baked into the function body.
2. The result reports a single error string and never says which field failed.
3. The surrounding submit handler hand-reads each input by `getElementById`
   and reports failures only to `console.error`, so nothing is shown to the
   user. Any second form would copy all of that.

The goal is a validation layer that a new form can adopt by declaring a
schema, without copying wiring or error-display code.

## Scope

In scope:

- A shared validation module used by the existing login form.
- Proof of reuse against a second, different field set **in tests only**.

Out of scope:

- Adding a real second form to the application UI. No new user-facing form is
  invented as part of this work.
- Server-side validation. `login()` remains the existing stub.
- A linter, formatter, or end-to-end test infrastructure (explicitly declined;
  see Global Constraints).

## Decisions Taken During Brainstorming

| Question | Decision |
|---|---|
| Scope of "multiple forms" | Extract the module, rewire login, prove reuse with a second field set in tests |
| Rule expressiveness | Fixed built-ins: `required`, `minLength`, `maxLength`, `pattern`, `email`. Rules are plain data; no custom validator functions |
| Module loading | Dual export in one file, no build step; page keeps loading via plain `<script src>` |
| Architecture | Layered: a pure `validate()` core plus a thin `bind()` DOM layer |
| Binder testing | jsdom as a devDependency |
| Tooling to set up | Unit tests only |

Two alternatives were considered and rejected. A **pure validator with no
binder** was rejected because it leaves each new form copying the value
collection and error-rendering plumbing, which is the duplication that
actually costs. **HTML-declarative rules** (`data-rules="required
minLength:8"`) were rejected because rules become parsed strings, `pattern`
regexes are painful to escape inside an attribute, and nothing is testable
without a DOM — which conflicts with proving reuse in tests.

## Global Constraints

- No build step. The page loads plain `<script src>` tags.
- No runtime dependencies. jsdom is a **devDependency** and never reaches the
  browser.
- Test runner is `node:test` + `node:assert` (built in). `package.json` gains
  `"scripts": { "test": "node --test" }`.
- No linter, formatter, or e2e infrastructure is added.
- The existing login flow must still work after the rewire.
- `login()` and `API_ENDPOINT` in `app.js` are not modified.

## Architecture

Two layers in one file, `validation.js`, at the repository root beside
`app.js`. It is not placed under `src/`: that tree is Node-only CommonJS and
is never loaded by `index.html`.

```
validation.js
  ├── validate(values, schema) -> { valid, errors }   pure; no DOM
  └── bind(formEl, schema, onValid)                   DOM wiring; calls validate()
```

The split exists so the rule semantics — the part worth pinning down — are
testable as plain data, and the DOM layer stays thin enough to read in one
sitting.

Export tail:

```js
if (typeof module !== "undefined" && module.exports) module.exports = FormValidation;
if (typeof window !== "undefined") window.FormValidation = FormValidation;
```

## Component 1: `validate(values, schema)`

### Schema shape

Plain data. One object per field, mapping rule name to its parameter:

```js
const LOGIN_SCHEMA = {
  username: { label: "Username", required: true, minLength: 3 },
  password: { label: "Password", required: true, minLength: 8 },
};
```

`label` is optional and used only to build messages; it defaults to the field
key.

### Rule semantics

- Rules evaluate in fixed precedence — `required`, `minLength`, `maxLength`,
  `pattern`, `email` — regardless of key order in the schema object, so
  results are deterministic.
- **First failing rule per field wins.** At most one message per field.
- **All failing fields are reported** in the same call.
- `required` trims before testing: a whitespace-only value is empty.
- A field that is **empty and not required passes**, and its remaining rules
  are skipped. Without this an optional email field would fail merely for
  being blank.
- `email` is a deliberately loose check: a non-empty local part, an `@`, and
  a dot in the domain. Strict RFC-compliant email regexes reject valid
  addresses and are not worth the defect surface here.
- `pattern` takes a `RegExp` value, not a string.
- An unrecognized rule key **throws** a descriptive `Error` at validate time.
  A silent no-op on a typo such as `minlength` is the exact failure mode a
  validation library must not have.
- A schema field absent from `values` is treated as the empty string.
- A key in `values` with no schema entry is ignored.

### Result shape

```js
{ valid: false, errors: { password: "Password must be at least 8 characters" } }
{ valid: true,  errors: {} }
```

This replaces the current `{ valid, error }` single-string result. `app.js`
is the only caller, so the change is contained.

### Deliberate omission

No per-rule custom message override. Messages are generated from the rule and
the field's `label`. Adding a `message` option later is backward compatible
with every schema written against this design.

## Component 2: `bind(formEl, schema, onValid)`

### Field lookup

Values are read through `formEl.elements[name]`, so inputs need `name`
attributes. The existing inputs carry only `id`, so `index.html` gains
`name="username"` and `name="password"`.

If a schema field has no matching form element, **`bind` throws immediately**
rather than silently validating a field that is not present.

### Submit flow

1. `preventDefault()`
2. Collect values from the form's own elements, keyed by schema field name.
3. Call `validate()`.
4. Render error messages (below).
5. Call `onValid(values)` **only** when `valid` is true.

Because `onValid` cannot fire on invalid input, a form's handler never
re-checks.

### Error rendering

For each failing field the binder writes the message into an element matching
`[data-error-for="<name>"]`.

- If such an element exists in the markup, it is used where the author placed
  it.
- If it does not exist, the binder **creates a `<span class="field-error">`
  and inserts it immediately after the input**.

The fallback is what makes a second form cheap: it needs `name` attributes and
nothing else. Explicit placement stays available when a layout requires it.

Each rendered error also sets `aria-invalid="true"` on the input and points
its `aria-describedby` at the message element's id (generated if the element
was created). Both are removed when the field's error clears.

### Clearing

- All messages clear at the start of every submit.
- Once a field has displayed an error, an `input` event on that field clears
  **that field's** message. It does not re-validate — re-validating per
  keystroke tells someone their password is too short while they are still
  typing it.

### Styling

`index.html` gains a small `<style>` block for `.field-error` (red, smaller
text). The page has no CSS at all today, so without it the messages render as
unstyled black text indistinguishable from the form.

## Data Flow

```
submit event
  -> bind() handler: preventDefault
  -> collect { username, password } from formEl.elements
  -> validate(values, LOGIN_SCHEMA)
       -> per field, rules in precedence order, first failure wins
       -> { valid, errors }
  -> valid?
       no  -> render messages, set aria-invalid / aria-describedby; stop
       yes -> clear all messages -> onValid(values) -> login(username, password)
```

## Resulting `app.js`

```js
const LOGIN_SCHEMA = {
  username: { label: "Username", required: true, minLength: 3 },
  password: { label: "Password", required: true, minLength: 8 },
};

FormValidation.bind(document.getElementById("login-form"), LOGIN_SCHEMA, ({ username, password }) => {
  console.log("Login result:", login(username, password));
});
```

`validateForm`, the hand-written `getElementById` reads, and the inline
`submit` listener are deleted. `login()` and `API_ENDPOINT` are untouched.
`index.html` loads `validation.js` in a `<script src>` before `app.js`.

## Behavior Change (accepted)

The login form currently enforces presence only. The new schema adds
`minLength: 3` on username and `minLength: 8` on password. A short password
that is accepted today will be rejected after this change. This was raised
during brainstorming and accepted.

## Error Handling

Two failure classes, handled differently on purpose:

- **Programmer error** — an unknown rule key, or a schema field with no
  matching input — throws immediately and loudly. These are typos, and they
  should fail at development time rather than degrade silently in production.
- **User input error** — a rule that a value fails — never throws. It is
  collected into `errors` and rendered.

## Testing

Runner: `node --test`. Two files.

### `test/validation.test.js` — core, pure data

Covers the Section "Rule semantics" decisions:

- `required`: empty string, whitespace-only, and present values
- optional-and-empty skips remaining rules
- `minLength` / `maxLength` at their boundaries
- `pattern` match and mismatch
- `email` loose accept and reject
- precedence: a field failing both `required` and `minLength` reports
  `required`
- multiple failing fields all reported in one call
- unknown rule key throws
- schema field missing from `values` treated as empty; extra `values` keys
  ignored

**Reuse proof.** The same `validate()` is exercised with a second schema over
a different field set, for example:

```js
const PROFILE_SCHEMA = {
  email: { label: "Email", required: true, email: true },
  bio:   { label: "Bio", maxLength: 200 },
  zip:   { label: "ZIP", pattern: /^\d{5}$/ },
};
```

`bio` (optional, length-bounded) and `zip` (optional but patterned) exercise
paths the login schema never touches. If the interface is wrong, this is where
it surfaces.

### `test/binder.test.js` — DOM, under jsdom

- values collected by `name`
- `onValid` not called when invalid; called with the values when valid
- message written into an existing `[data-error-for]` element when present
- `<span class="field-error">` created and inserted after the input when
  absent
- `aria-invalid` and `aria-describedby` set on failure and removed on clear
- messages cleared at the start of the next submit
- typing in an errored field clears that field's message and nothing else
- `bind` throws when a schema field has no matching input

## Files Touched

| File | Change |
|---|---|
| `validation.js` | new — `validate` + `bind`, dual export |
| `app.js` | delete `validateForm` and the inline submit wiring; declare `LOGIN_SCHEMA`; call `bind` |
| `index.html` | add `name` attributes, `<script src="validation.js">`, `.field-error` style block |
| `package.json` | add `scripts.test`, `devDependencies.jsdom` |
| `test/validation.test.js` | new |
| `test/binder.test.js` | new |

`src/index.js` and `src/utils.js` are not touched.

## Open Assumptions

- Assumption: the project runs on a Node version with a stable `node:test`
  runner (18+). Validate by running `node --version` before adding the test
  script.
