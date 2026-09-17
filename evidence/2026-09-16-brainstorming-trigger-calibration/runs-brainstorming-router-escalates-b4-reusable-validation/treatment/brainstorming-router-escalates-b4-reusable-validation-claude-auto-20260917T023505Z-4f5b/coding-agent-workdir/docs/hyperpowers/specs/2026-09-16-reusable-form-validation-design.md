# Reusable Form Validation — Design

Date: 2026-09-16
Status: approved design, not yet implemented

## Problem

Validation for the login form is hardcoded inside `app.js`:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

The field names are baked into the function body, and the result carries a single
message for the whole form. Any second form would have to copy this function and edit
it. There is no shared place for validation to live.

## Goal

A validation module that any form in this project can use: the form declares which
rules apply to which of its fields, and the module reports which fields failed and why.

## Non-goals

- Cross-field rules (password vs confirm-password, date ranges).
- Asynchronous or network-backed rules (username availability).
- Rendering error messages into the page. Call sites decide presentation.
- Adding a second form. Reuse is demonstrated through tests, not new UI.
- Changing the module system used by `src/index.js` or `src/utils.js`.

## Global constraints

- No build step, no bundler, no framework.
- No runtime or development dependencies. Tests use Node's built-in runner.
- Existing files stay on their current module systems.
- Unit tests are part of this change; linting and formatting are not being set up.

## Architecture

One new file, `src/validation.js`, containing two layers.

### Rule factories

Each factory returns a predicate of one argument that yields `null` when the value is
acceptable and a message string when it is not.

| Factory | Fails when |
|---|---|
| `required(message?)` | value is empty after trimming |
| `minLength(n, message?)` | value is shorter than `n` characters |
| `maxLength(n, message?)` | value is longer than `n` characters |
| `email(message?)` | value is not shaped like an address |
| `pattern(regex, message?)` | value does not match `regex` |

Every factory takes an optional message that overrides its default, so a form can
phrase an error in its own words without a new rule type.

Because a rule is just `(value) => null | string`, a form can pass its own function
where a factory would go. Adding a rule the module never anticipated requires no change
to the module.

### The entry point

```js
validate(values, rules) -> { valid: boolean, errors: { [field]: message } }
```

- Iterates the fields named in `rules`, not the keys of `values`. Keys present in
  `values` with no declared rules are ignored.
- Runs a field's rules in declaration order and records only the **first** failing
  message for that field, then moves to the next field. One message per input.
- A field named in `rules` but absent from `values` is treated as the empty string.
- A rule entry may be a single function instead of an array.
- `valid` is `true` exactly when `errors` has no keys.
- Total function: no input shape causes it to throw.

### Empty-value semantics

`required` is the only rule that objects to an empty value. Every other rule returns
`null` for `""`, so an optional field declared as `[minLength(3)]` reports nothing while
it is blank, and reports only once the user types something too short.

This is the decision that keeps call sites simple. The alternative — every rule failing
on empty — forces each optional field to be wired conditionally at the point of use.

`required` trims the value before testing it, so a whitespace-only entry counts as
empty. No rule mutates the value that other rules or the caller see.

### Loading

`src/validation.js` is a classic script. It ends with a dual-export footer: it assigns
its public surface to `globalThis.FormValidation` for the page, and to `module.exports`
when `module` is defined so Node can `require()` it.

This matches the two conventions already in the repository — browser globals in
`app.js`, CommonJS in `src/` — rather than introducing a third. Converting to ES modules
later is a contained change if the project ever gains a build step.

## Changes to existing files

### `index.html`

Add `<script src="src/validation.js"></script>` immediately before the existing
`<script src="app.js"></script>`, so the global exists when `app.js` runs.

### `app.js`

Remove the inline `validateForm`. Declare the login form's rules once, near the handler:

```js
const loginRules = {
  username: [FormValidation.required("Username is required")],
  password: [FormValidation.required("Password is required")],
};
```

The submit handler collects the field values as it does today and calls
`FormValidation.validate(values, loginRules)`.

Login keeps required-only rules. No length or format rule is added to the password
field, so no credential that logs in today stops working.

The one behavioral difference: a failed submit logs one message per offending field
instead of the single `"Missing required fields"` string. Errors remain console-only.

## Testing

`test/validation.test.js`, run by Node's built-in runner via `"test": "node --test"` in
`package.json`. No dependencies added.

Coverage:

- Each factory: a passing value and a failing value, plus the custom-message override.
- Empty-value semantics: `[minLength(3)]` passes on `""`; `[required(), minLength(3)]`
  reports the `required` message on `""`.
- First-failure-wins: a field with two rules that both fail reports only the first.
- `validate` shape: `{valid: true, errors: {}}` for a clean submit; the field-to-message
  map for a dirty one.
- Missing field in `values` is treated as empty.
- Keys in `values` with no declared rules are ignored.
- A bare function accepted in place of a rule array.
- **Reuse:** two different rule sets — the login set and a hypothetical signup set using
  `email`, `minLength`, and `pattern` — validated through the same `validate` call with
  no module changes. This is the test that demonstrates the stated goal.

## Risks

- `email` validation by regex is approximate. The rule checks for a plausible shape
  (non-empty local part, `@`, a dotted domain) rather than attempting RFC compliance;
  definitive validation is delivery, not syntax.
- A global named `FormValidation` could collide in a larger page. Acceptable at this
  size, and the footer makes the CommonJS path collision-free.
