# Reusable Form Validation — Design

Date: 2026-09-17
Status: approved (pending spec review)
Branch: `feature/webapp-enhancement`

## Problem

`app.js` validates the login form with a single hardcoded function:

```js
function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}
```

It knows the field names of exactly one form, reports one error string for the
whole form rather than per field, and is wired to a hand-written submit listener
that reads inputs by `id` and reports failures to `console.error`. Nothing is
visible to the user, and a second form would have to copy all of it.

The goal is a validation layer any form can use: declare what is valid, get
per-field errors rendered next to the fields, without rewriting the submit glue
each time.

## Decisions

Settled during brainstorming; each alternative listed was offered and declined.

| Decision | Choice | Declined |
|---|---|---|
| Rule coverage | Required + format rules (length, email, pattern, numeric range) | Required-only; cross-field rules; async/server rules |
| Module scope | Pure core **plus** a DOM binder | Core only; core + pluggable renderer |
| Loading | Native ES modules, no build step | Globals via script tags; a bundler |
| Tooling | Unit tests via `node:test` + `node:assert` | ESLint/Prettier; Playwright; no tooling |
| Schema model | Ordered arrays of rule **functions** | Declarative descriptor objects; HTML constraint attributes |
| Reuse proof | Add a second (signup) form | Login form only |

A Codex approach gate was attempted. Preflight returned `ok`, but the resolved
companion was a stub build (`0.0.0-stub`) and the one-shot call returned an empty
payload. Per the gate's incomplete-call rule it was noted once and not retried,
so no independent approaches were folded in and this design has no second-model
review behind it.

## Global Constraints

These apply to every task in the implementation plan.

- **Zero runtime and dev dependencies.** `package.json` has none today and keeps
  none. Tests use `node:test` / `node:assert` from the standard library.
- **Unit-test infrastructure is part of the deliverable**, not a follow-up:
  `test/` plus a `test` script, set up in the first task that adds testable code.
- **Do not modify `src/index.js` or `src/utils.js`.** They are unrelated
  CommonJS fixture files and must keep working unchanged.
- **No build step, no bundler, no transpiler.**
- Match the existing code's plain, comment-light style.

## Architecture

### Module layout

```
src/forms/package.json      { "type": "module" }  — scope marker, 1 line
src/forms/validation.js     pure core + rule library; no DOM references
src/forms/bind-form.js      DOM binder; imports the core
app.js                      login()/signup() stubs, schemas, two bindForm calls
index.html                  <script type="module">, name attributes, error styles
test/validation.test.mjs    node:test coverage of the core
package.json                + "scripts": { "test": "node --test" }
```

### Why the nested `package.json`

Root `package.json` has no `"type"` field, so Node parses every `.js` as
CommonJS — which `src/index.js` and `src/utils.js` depend on via `require()`.
Setting `"type": "module"` at the root would break both.

A one-line `src/forms/package.json` containing `{ "type": "module" }` scopes ESM
to that directory only. Node then treats `src/forms/*.js` as ES modules and
leaves the CommonJS files alone. Browsers ignore `package.json` entirely, so it
has no effect on page loading.

Test files use the `.mjs` extension instead, which is unambiguous to Node
regardless of directory, and they are never served to a browser so the extension
carries no MIME-type risk.

### Dependency direction

One-way, no cycles:

```
app.js  ->  bind-form.js  ->  validation.js
   \______________________________^
```

`validation.js` references no DOM API, which is precisely what lets `node:test`
exercise it in plain Node with no jsdom.

## Component: the validation core (`src/forms/validation.js`)

### Contract

```js
validate(values, schema) -> { valid: boolean, errors: { [field]: string } }
```

- `values` — an object of field name to raw value (strings, as read from inputs).
- `schema` — an object of field name to an ordered array of rules.
- A **rule** is `(value) => string | null`: an error message on failure, `null`
  on pass.
- `errors` contains an entry only for failing fields. `valid` is
  `Object.keys(errors).length === 0`.

### Semantics

1. **First failure per field wins.** Rules run in array order and evaluation for
   that field stops at the first message. `[required(), minLength(8)]` on an
   empty value reports "required", never "too short".
2. **Every rule except `required()` passes on an empty value.** This is what
   makes optional fields work: `age: [range(13, 120)]` must not complain when
   the field is blank. A field is mandatory only if `required()` is in its list.
   Empty means `undefined`, `null`, or a string that is empty after trimming.
3. **Fields in `values` with no schema entry are ignored** — not validated, not
   an error.
4. **Fields in the schema with no entry in `values`** are validated as empty,
   so `required()` fails for them. (The binder prevents this case from arising
   accidentally; see its bind-time check.)
5. `validate` does not mutate `values`.

### Rule library

Each factory takes an optional trailing custom message that replaces the
default.

| Factory | Fails when | Default message |
|---|---|---|
| `required(msg?)` | value is empty after trimming | `"This field is required"` |
| `minLength(n, msg?)` | trimmed length `< n` | `` `Must be at least ${n} characters` `` |
| `maxLength(n, msg?)` | trimmed length `> n` | `` `Must be at most ${n} characters` `` |
| `email(msg?)` | value does not match the email pattern | `"Enter a valid email address"` |
| `pattern(regex, msg?)` | `regex.test(value)` is false | `"Invalid format"` |
| `range(min, max, msg?)` | not numeric, or outside `[min, max]` | `` `Must be a number between ${min} and ${max}` `` |

Two judgment calls:

- `email()` uses a deliberately permissive pattern
  (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Strict RFC 5322 email regexes are a
  well-known rabbit hole that reject valid addresses; the server is the real
  authority on deliverability.
- `range()` coerces with `Number(value)` and reports the same failure message
  for `NaN` as for out-of-bounds, rather than silently passing a non-numeric
  value.

A one-off rule needs no library change — it is just a function:

```js
handle: [(v) => v.startsWith("@") ? null : "Must start with @"]
```

## Component: the binder (`src/forms/bind-form.js`)

### Contract

```js
bindForm(formEl, schema, onValid) -> void
```

### Collecting values

Walks `formEl.elements`, keying each control by its `name` attribute, falling
back to `id`. Controls with neither, and controls of type `submit`, `button`, or
`reset`, are skipped.

Values are collected for **all** controls, but only schema keys are validated.
`onValid(values)` therefore receives the complete form, including fields that
carry no rules.

### Bind-time schema check

Before wiring anything, `bindForm` verifies that every schema key matches a
control in the form, and throws an `Error` naming the missing key(s) if not.

This exists because the alternative failure mode is silent: a typo'd schema key
means that field is simply never validated, and nothing reports it. Failing
loudly at wiring time — on page load, every time — is strictly better than a
validation rule that quietly does nothing.

### Submit behaviour

1. `preventDefault()`.
2. Collect values, call `validate`.
3. **Invalid:** render each message, set `aria-invalid="true"` and
   `aria-describedby="<error span id>"` on each failing input, and focus the
   first failing field in document order.
4. **Valid:** clear every error message, remove `aria-invalid` and
   `aria-describedby` from all fields, then call `onValid(values)`.

Errors are recomputed from scratch on every submit, so a field that was invalid
and is now valid has its message removed.

### Error rendering

For each failing field, a `<span class="field-error" data-error-for="<field>">`
placed immediately after the input. Created on first need and reused thereafter;
emptied rather than removed when the field passes. Each span gets an `id` of
`<field>-error` so `aria-describedby` can point at it.

`index.html` currently has no stylesheet, so a minimal `<style>` block is
required or the messages render as invisible black body text:

```css
.field-error { color: #b00020; display: block; font-size: .875rem; }
```

### Value handling

`required()` trims before testing, so a whitespace-only field counts as empty.
The value passed to `onValid` is the raw input value, never trimmed or otherwise
mutated — trimming is a validation concern, not a data-transformation one.

## Consumers (`app.js`, `index.html`)

`app.js` keeps `API_ENDPOINT` and `login()` exactly as they are, gains a
`signup()` stub in the same shape, drops `validateForm` and the hand-written
submit listener, and becomes:

```js
import { bindForm } from "./src/forms/bind-form.js";
import { required, minLength, email, range } from "./src/forms/validation.js";

bindForm(
  document.getElementById("login-form"),
  { username: [required()], password: [required()] },
  (values) => console.log("Login result:", login(values.username, values.password)),
);

bindForm(
  document.getElementById("signup-form"),
  {
    email: [required(), email()],
    password: [required(), minLength(8)],
    age: [range(13, 120)],
  },
  (values) => console.log("Signup result:", signup(values)),
);
```

The login schema is `required()`-only on both fields, deliberately: that is
exactly the behaviour `validateForm` has today, and adding a length rule to
login would reject existing accounts.

The signup form is the reuse proof. It exercises what login does not — a format
rule (`email`), a length rule, and an optional field (`age`, which has rules but
no `required()`, so it validates only when filled). If the API is accidentally
shaped around the login form's assumptions, building signup is what surfaces it.

`index.html` changes: `name` attributes on the existing inputs, the new signup
form markup, `type="module"` on the script tag, and the error style block.

Because `type="module"` makes the browser apply CORS rules, opening
`index.html` from the filesystem stops working — the page must be served over
HTTP (`npx serve`, `python3 -m http.server`, any static server). One line goes
in the README recording this, since nothing else in the repo would explain the
change.

## Testing

`node --test` runs `test/validation.test.mjs`, wired as `npm test`.

Coverage of the core:

- Each rule factory: a passing value and a failing value, plus the custom
  message override.
- First-failure-wins ordering (empty value against `[required(), minLength(8)]`
  reports the required message).
- The empty-skips-non-required invariant, per non-required rule.
- `required()` against whitespace-only input.
- `range()` against a non-numeric value, and against both bounds inclusively.
- A multi-field schema where some fields pass and others fail.
- Values with no schema entry are ignored; an empty schema is always valid.
- A schema key missing from `values` fails `required()`.
- `validate` does not mutate its `values` argument.

### Known gap

`bind-form.js` has **no automated test**. Testing it requires a DOM, which means
jsdom (breaks the zero-dependency constraint) or Playwright (declined). It is
verified manually in a browser instead: submit each form empty, submit with
partial input, confirm messages appear next to the right fields, confirm focus
lands on the first invalid field, confirm messages clear on a successful submit,
and confirm a deliberately typo'd schema key throws at load.

That leaves roughly half the new code on manual verification. The cheapest
remedy if the gap starts to bite is jsdom as a single devDependency; that is a
deliberate deferral, not an oversight.

## Out of Scope

Deliberately excluded. Each is cheap to add later and none is needed now.

- Cross-field rules (password confirmation, date ranges) — would require rules
  to receive the whole value set, not a single value.
- Async / server-side rules (uniqueness checks) — would make `validate` return a
  promise, changing every call site.
- Revalidation on `input` or `blur` — validation runs on submit only.
- Message internationalisation.
- Pluggable renderers — the binder's error markup is fixed.
- Any change to `src/index.js` or `src/utils.js`.

## Risks

- **The binder is the untested half.** Its bugs surface in the browser, not in
  CI. Mitigated by keeping it thin, and by the bind-time schema check catching
  the most likely wiring mistake immediately.
- **`file://` stops working.** A real behaviour change for anyone who opens
  `index.html` directly. Mitigated by the README line; unavoidable given the ESM
  decision.
- **One consumer pair may not generalise.** Two forms is better evidence than
  one, but the third form is still where an over-fitted API would show. The rule
  library being plain functions limits the damage — an unanticipated rule needs
  no library change.
