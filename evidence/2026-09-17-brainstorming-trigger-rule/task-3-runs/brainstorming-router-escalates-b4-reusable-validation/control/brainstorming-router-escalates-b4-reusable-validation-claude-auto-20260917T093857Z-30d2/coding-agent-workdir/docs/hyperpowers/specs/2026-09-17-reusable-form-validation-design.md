# Reusable Form Validation — Design

Date: 2026-09-17
Status: Approved (design); implementation plan pending

## Problem

`app.js` contains a `validateForm` function hardcoded to the login form's two
fields:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

Signup and profile-edit forms are coming. Each needs required-field checks
plus a couple of format rules (email, minimum length). Copying this function
per form would duplicate the logic and produce three divergent error
contracts. There is no shared place to put validation today: `app.js` is a
classic browser script with implicit globals, and `src/` is unrelated
CommonJS Node code.

The single `error` string is a second problem. It reports one message for the
whole form, which is adequate for two fields and useless for a signup form
that needs to say which field failed.

## Goals

- One shared validation module usable by every current and future form.
- Per-field error reporting.
- Rules that are readable at the call site and extensible without editing the
  shared module.
- Test coverage for the module, in a repo that currently has none.

## Non-goals

- Building the signup or profile-edit forms. They motivate the work; they are
  not in scope. The deliverable is the module plus the login form migrated
  onto it.
- DOM handling of any kind: reading inputs, intercepting submit, rendering
  errors. Each form keeps its own submit handler.
- Async or server-side validation.
- Changing `src/index.js` or `src/utils.js`.

## Decisions

Four decisions were made with the human partner during brainstorming, in
order:

1. **Scope: validation only.** The module is a pure function — rules and data
   in, errors out. No DOM. Rejected alternatives: a form-binding helper that
   owns submit interception and error rendering (DOM-coupled, untestable
   without a DOM, and bakes an error-display convention into every form), and
   a middle option adding only a shared error renderer. Binding can be layered
   on later once real duplication is visible.

2. **Loading: ES modules.** `index.html` switches to
   `<script type="module" src="app.js">`. Rejected alternatives: a plain
   script exposing a global (matches the current setup but is not testable in
   Node), and CommonJS plus a bundler (consistent with `src/` but adds a build
   step and a dependency to a repo with neither).

3. **Rule format: composable predicates.** Rules are functions, not data.
   Rejected alternatives: a declarative rule schema keyed by rule name (more
   readable and serializable, but requires a dispatch registry inside the
   module that exists only to turn strings back into these same functions),
   and shared predicate helpers with a hand-written validator per form (most
   flexible, but leaves the per-form boilerplate that motivated the work).

   Also considered and discarded: driving validation from HTML attributes
   (`required`, `type="email"`) through the browser's Constraint Validation
   API. It needs the form element, contradicting decision 1, and cannot
   express cross-field rules.

4. **Tooling: unit tests only.** Node's built-in `node:test` runner, no
   dependencies. A linter and formatter were offered and declined.

## Architecture

### `validation.js` (new, repo root)

Placed at the root beside `app.js` rather than in `src/`, because `src/` is
CommonJS Node code and this is browser ES-module code. Mixing the two module
systems in one directory is the confusion this avoids.

**Rule builders.** Each returns a predicate with the signature
`(value, data) => string | null`, where `null` means valid and a string is the
error message.

| Builder | Fails when |
|---|---|
| `required(message?)` | value is `undefined`, `null`, or a string that is empty or whitespace-only |
| `minLength(n, message?)` | value's length is below `n` |
| `email(message?)` | value does not match a single-`@`, dot-in-domain shape |
| `matches(otherField, message?)` | value is not strictly equal to `data[otherField]` |

Every builder takes an optional message so a form can override the default
wording without needing a new rule type.

`minLength` and `email` apply only to non-empty values; an empty value is
`required`'s business. This keeps a blank optional field from reporting a
format error, and it means a field that is both required and format-checked
reports "is required" rather than "is not a valid email" when left blank.

**The validator.**

```js
validate(rules, data) // -> { valid: boolean, errors: { [field]: string } }
```

- `rules` maps a field name to an array of predicates.
- Each field's predicates run in declaration order; the field stops at its
  first failure, so a field yields at most one message.
- All fields are evaluated — one failing field does not short-circuit the
  others.
- `errors` is `{}` when valid; `valid` is `errors` being empty.
- Fields present in `data` but absent from `rules` are ignored.
- Fields present in `rules` but absent from `data` are validated as
  `undefined`, so `required()` catches them.
- Predicates receive `data` as a second argument. This is what makes
  `matches` work without a separate cross-field mechanism.

### Call-site shape

```js
import { validate, required, minLength, email } from "./validation.js";

const signupRules = {
  email:    [required(), email()],
  password: [required(), minLength(8)],
};

const { valid, errors } = validate(signupRules, formData);
```

## Changes to existing files

### `app.js`

- Delete `validateForm`.
- Add the `validation.js` import and a module-level `loginRules` constant:
  `username: [required("Username is required")]`,
  `password: [required("Password is required")]`.
- The submit handler calls `validate(loginRules, { username, password })`. On
  failure it logs the per-field errors via `console.error`, preserving today's
  console-only behavior at the new granularity.
- `login` and `API_ENDPOINT` are unchanged.

A valid login's behavior is unchanged. The observable difference is the shape
of the console output on an invalid submit.

### `index.html`

One line: `<script src="app.js">` becomes
`<script type="module" src="app.js">`.

**Known consequence:** module scripts are subject to CORS, so opening
`index.html` directly from the filesystem (`file://`) will no longer execute
`app.js`. Local development requires a static server, e.g.
`python3 -m http.server`. This is the accepted cost of decision 2 and should
be noted in `README.md`.

### `package.json`

Add `"scripts": { "test": "node --test" }`. No dependencies.

### `.gitignore`

Add `docs/superpowers` and `docs/hyperpowers` so spec and planning documents
are not committed.

## Testing

`test/validation.test.js`, using `node:test` and `node:assert`. Written
test-first, per the repository's TDD workflow.

Coverage:

- **Each rule builder** — a passing value, a failing value, and the custom
  message override.
- **`required`** — rejects `undefined`, `null`, `""`, and `"   "`; accepts
  `"0"` and other falsy-looking but present strings.
- **`minLength`** — boundary at exactly `n`; skipped for empty values.
- **`email`** — accepts a normal address; rejects a missing `@` and a missing
  domain dot; skipped for empty values.
- **`matches`** — equal and unequal against another field in `data`.
- **`validate`** — empty `errors` and `valid: true` on a clean pass; first
  failure per field wins when a field has several failing rules; multiple
  failing fields all report; fields in `data` without rules are ignored;
  fields in `rules` missing from `data` fail `required`; an empty `rules`
  object is valid.

`app.js` is not unit tested — it is DOM glue, and testing it would require the
DOM dependency decision 1 exists to avoid. It is verified manually by loading
the page from a local server and submitting the login form empty and filled.

## Risks and open items

- **`file://` regression.** The most likely way this change surprises someone.
  Mitigated by a `README.md` note; accepted as the cost of ES modules.
- **The abstraction has one consumer.** A reuse claim validated by a single
  caller is weak. The rule set was chosen against the stated signup and
  profile-edit needs, but the design is not proven until a second form uses
  it. Building one was offered and deferred; if the partner wants the proof,
  the signup form is the cheapest way to get it.
- **Email validation by regex is approximate.** The rule catches typos, not
  invalid addresses. Real verification is a server concern.
