# Reusable Form Validation — Design

Date: 2026-09-16
Status: Approved (design sections 1 and 2 approved in brainstorming)

## Problem

`app.js` contains a `validateForm(formData)` function hard-wired to the login
form: it checks two named fields, `username` and `password`, and returns a
single whole-form message. A second form cannot reuse any of it. Adding one
today means copying both the rule checks and the surrounding
collect-errors-and-branch logic.

The goal is to extract validation into a shared module that any form can use.
This work is preparatory: no second form exists yet, so the design minimizes
speculative machinery.

## Scope

**In scope:** a pure, DOM-free validation module; migration of the existing
login form onto it; unit tests for the module.

**Out of scope, decided explicitly during brainstorming:**

- A form binder that attaches to a `<form>` element, reads field values, and
  runs rules. Its design depends on details only a real second form can
  settle: how fields are identified and when validation fires.
- Error rendering into the DOM. This would impose markup and styling
  conventions that have not been chosen.
- Any change to `login()`, `API_ENDPOINT`, `src/index.js`, or `src/utils.js`.
- Linting and formatting infrastructure. Offered and declined; the project
  stays dependency-free.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Module system | ES modules | The only option giving browser and Node the same file with no build step. |
| Module scope | Pure validation only | No second form exists to justify DOM assumptions. |
| Rule model | Field-to-rule-functions map | Custom and cross-field rules need no registry; declaring a form is data. |
| Result shape | Per-field error map | A whole-form string cannot tell a user which field failed. |
| Test tooling | `node --test` + `node:assert` | Built in; keeps the project dependency-free. |

### Rejected alternatives

- **Shared predicates with no engine.** Smallest possible change, but each
  form still hand-writes the iterate-and-collect loop — the duplication the
  request is actually about.
- **Serializable descriptor schema with a rule registry.** Rules as JSON data
  would allow sharing schemas with a backend, but nothing in this project
  consumes that. It costs a registry, a descriptor validator, and message
  templating.
- **CommonJS module** matching `src/`: browsers cannot `require`, so it needs
  a bundler or a duplicated global shim.
- **Global namespace object** (`window.Validation`): not importable by Node,
  making the module awkward to test.

## Architecture

One new module, `src/validation.mjs`, with no imports and no DOM references.

### File placement and extension

The module uses the `.mjs` extension. `package.json` declares no `"type"`
field, so Node treats `.js` as CommonJS and would reject `export` syntax.
`.mjs` lets the browser and Node's test runner load the identical file
without adding `"type": "module"`, which would break the existing CommonJS
`src/index.js` and `src/utils.js`.

Assumption: the static file server used for local development serves `.mjs`
with a JavaScript MIME type. Validate by loading the page once after the
change and confirming no module-type console error. If it fails, the fallback
is converting the project to `"type": "module"` and migrating those two `src/`
files — a scope increase that must be raised before being taken.

### The rule contract

A rule is a function:

```js
(value, allData) => string | null
```

It returns an error message when the value fails, or `null` when it passes.
The second argument is the whole submitted data object, which is what makes
cross-field rules possible without a dedicated built-in: a confirm-password
check is an inline arrow function in the schema.

### Public interface

```js
export function required(message)
export function minLength(n, message)
export function pattern(re, message)
export function validate(data, schema)
```

The three rule factories return rules conforming to the contract above. Each
accepts an optional custom message and falls back to a sensible default.

`validate(data, schema)` walks each field in `schema`, runs that field's rules
in declaration order, and records the **first** failing message for the field.
Remaining rules for an already-failed field are not run.

### Result shape

```js
{ valid: boolean, errors: { [field: string]: string } }
```

`errors` is always an object, `{}` when valid, so callers never branch on
`undefined`. `valid` is true exactly when `errors` has no keys.

This replaces the current `{ valid, error }` single-string shape. Every future
form inherits this contract, which is why it is fixed now rather than later.

### Schema shape

```js
{ [field: string]: Rule[] }
```

The login form's schema:

```js
const loginSchema = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};
```

### Built-in rule set

`required`, `minLength`, `pattern`. Login needs only `required` today; the
other two are the primitives most forms reach for and cost roughly three lines
each. Anything beyond them is written inline as a plain function, requiring no
change to the module.

## Data flow

1. The submit handler reads field values from the DOM, as it does today.
2. It builds a plain data object and calls `validate(data, schema)`.
3. On `valid: true` it proceeds to `login()`.
4. On `valid: false` it reports `errors`. Each form owns its own reporting;
   the module never touches the DOM.

## Migration

### `app.js`

1. Add `import { validate, required } from "./src/validation.mjs";`
2. Delete the local `validateForm` function.
3. Declare `loginSchema` as above.
4. In the submit listener, call `validate({ username, password }, loginSchema)`
   and change the failure branch to report the `errors` object rather than a
   single string. Reporting stays `console.error`, matching the current code;
   rendering errors in the page is out of scope.

`login()` and `API_ENDPOINT` are unchanged.

### `index.html`

Change `<script src="app.js">` to `<script type="module" src="app.js">`.

Consequence: the page must be served over a local HTTP server; opening it via
`file://` will fail CORS checks for module scripts. This was accepted when the
ES-module decision was made.

### `package.json`

Add `"scripts": { "test": "node --test" }`. No dependencies are added.

## Error handling

- A field present in the schema but absent from `data` is treated as having an
  `undefined` value and is validated normally; `required` therefore fails it.
- `minLength` and `pattern` coerce `undefined` and `null` to `""` before
  checking, so a missing value fails them rather than throwing on a property
  access. A field is made optional by omitting it from the schema, not by
  omitting `required` from its rule list.
- A field present in `data` but absent from the schema is ignored. Forms may
  submit data the schema does not constrain.
- Rules are trusted to return a string or `null`. The module does not defend
  against malformed rules; this is internal code, not a public API, and
  defensive checks would be untested weight.

## Testing

`test/validation.test.mjs`, run with `npm test` (`node --test`):

1. Each rule factory: a passing value returns `null`; a failing value returns
   the message.
2. Custom messages override the defaults.
3. `validate` returns `{ valid: true, errors: {} }` when every rule passes.
4. First-error-wins: a field with two failing rules reports only the first.
5. Fields absent from `data` fail `required`, and fail `minLength`/`pattern`
   without throwing.
6. Fields absent from the schema are ignored.
7. A cross-field inline rule reads the second `allData` argument correctly.
8. Regression: the login schema rejects empty input and accepts filled input,
   pinning the behavior the original `validateForm` had.

Item 8 is the test that proves the extraction preserved existing behavior.

## Success criteria

- `src/validation.mjs` has no DOM references and no imports.
- The login form behaves as before: empty input is rejected, filled input
  proceeds to `login()`.
- Adding a second form's validation requires only a schema declaration and a
  `validate` call — no new engine code.
- `npm test` passes.
