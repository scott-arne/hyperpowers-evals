# Reusable Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md`

**Goal:** Replace the login form's hard-coded `validateForm` with a shared, dependency-free validation module that any future form can reuse.

**Architecture:** A single ES module `src/validation.mjs` exports predicate-function rule helpers (`required`, `minLength`), a pure `validate(values, schema)` returning per-field errors, and a DOM-read-only `valuesFromForm(formEl)`. `app.js` becomes a module that imports them and declares a login schema. No form-binding or error-rendering layer is built.

**Tech Stack:** Vanilla JavaScript, native browser ES modules, `node:test` (built into Node v26). Zero third-party dependencies.

## Global Constraints

Copied verbatim from the spec's Global Constraints:

- Zero third-party dependencies. The repo has none and keeps none.
- No bundler and no build step.
- ES modules, loaded natively by the browser.
- Unit tests via `node:test` (built into Node). No other test tooling.
- Existing CommonJS files (`src/index.js`, `src/utils.js`) must keep working untouched.

Additional constraints carried from the spec body:

- New files use the explicit `.mjs` extension. Do NOT add `"type": "module"` to `package.json` — it would break the CommonJS files above.
- Do not add a `minLength` rule to the login form. Login keeps `required` only.
- Do not create error-display markup, a `bindForm` helper, or any linter/formatter config.

## Grounding

- **Existing validation being replaced:** `app.js:10-15` — the `validateForm(formData)` function, returning `{ valid, error }` with a single whole-form message.
- **Existing form wiring to preserve in shape:** `app.js:17-28` — submit listener, `e.preventDefault()`, validate-then-branch, `console.log` on success / `console.error` on failure.
- **Module export style:** `none: no existing ES module pattern.` `src/utils.js:5` uses CommonJS `module.exports = { greet }`. The new `.mjs` files use `export function` / `export const`; do not imitate `src/utils.js`'s CommonJS form.
- **Naming:** `app.js:2,4,10` — `SCREAMING_SNAKE_CASE` for module-level constants (`API_ENDPOINT`), `camelCase` for functions (`login`, `validateForm`).
- **Error handling:** `app.js:11-13` — return a result object describing the failure; do not throw. The new `validate` keeps this non-throwing convention.
- **Formatting:** `app.js` uses 2-space indent and double-quoted strings; `src/` uses single quotes. New files under `src/` that are part of this feature follow `app.js`: 2-space indent, double quotes, semicolons.
- **Test shape:** `none: the repo has no test directory, no test runner, and no existing test file.` Task 1 establishes the pattern using `node:test` + `node:assert/strict`.

---

### Task 1: Rule helpers and their tests

**Risk tier:** standard — creates the module and the repo's first test infrastructure; a reviewer could reject the rule semantics independently of the validator built on them.

**Files:**
- Create: `src/validation.mjs`
- Create: `test/validation.test.mjs`
- Modify: `package.json` (add a `scripts.test` entry)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `required(message?: string) => (value: unknown) => string | null`
  - `minLength(n: number, message?: string) => (value: unknown) => string | null`
  - Rule contract: a rule is a function taking one value and returning an error message string, or `null` when the value passes.

**Mirror:** `app.js:10-15` for the non-throwing, return-a-result error convention and the 2-space/double-quote formatting. Do not mirror its `{ valid, error }` shape — rules return a string or `null`.

- [ ] **Step 1: Write the failing test**

Create `test/validation.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { required, minLength } from "../src/validation.mjs";

test("required rejects absent and blank values", () => {
  const rule = required();
  assert.equal(typeof rule(""), "string");
  assert.equal(typeof rule(undefined), "string");
  assert.equal(typeof rule(null), "string");
  assert.equal(typeof rule("   "), "string");
});

test("required accepts a real value", () => {
  assert.equal(required()("alice"), null);
});

test("required uses a custom message when given one", () => {
  assert.equal(required("Username is required")(""), "Username is required");
});

test("minLength rejects a present value that is too short", () => {
  assert.equal(typeof minLength(8)("short"), "string");
});

test("minLength accepts a long enough value", () => {
  assert.equal(minLength(8)("longenough"), null);
});

test("minLength passes absent values so required owns absence", () => {
  assert.equal(minLength(8)(""), null);
  assert.equal(minLength(8)(undefined), null);
  assert.equal(minLength(8)(null), null);
});

test("minLength uses a custom message when given one", () => {
  assert.equal(minLength(8, "Too short")("abc"), "Too short");
});
```

- [ ] **Step 2: Add the test script to `package.json`**

Add a `scripts` block. The full file after the edit:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js",
  "scripts": {
    "test": "node --test"
  }
}
```

Do NOT add a `"type"` field.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/validation.mjs` (the file does not exist yet).

- [ ] **Step 4: Write the minimal implementation**

Create `src/validation.mjs`:

```js
// Shared form validation. A rule is (value) => error message | null.

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function required(message = "This field is required") {
  return (value) => (isBlank(value) ? message : null);
}

export function minLength(n, message = `Must be at least ${n} characters`) {
  // Absent values pass so that `required` owns absence and a blank field
  // does not report two errors for the same problem.
  return (value) => (isBlank(value) || String(value).length >= n ? null : message);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 7 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/validation.mjs test/validation.test.mjs package.json
git commit -m "feat: add reusable validation rule helpers"
```

---

### Task 2: The validate() function

**Risk tier:** standard — defines the per-field result shape every future form depends on; reviewable independently of the rule helpers.

**Files:**
- Modify: `src/validation.mjs` (append the new export)
- Modify: `test/validation.test.mjs` (append new tests)

**Interfaces:**
- Consumes: `required`, `minLength` from Task 1 (same file).
- Produces:
  - `validate(values: object, schema: object) => { valid: boolean, errors: { [field: string]: string } }`
  - `schema` maps a field name to an array of rules.
  - Within one field, evaluation stops at the first failing rule. Across fields, every field is checked, so `errors` holds at most one message per failing field.
  - `valid` is `true` exactly when `errors` has no keys.

**Mirror:** `app.js:10-15` — return a result object, never throw.

- [ ] **Step 1: Write the failing tests**

Append to `test/validation.test.mjs` (and extend the existing import line at the top of the file to `import { required, minLength, validate } from "../src/validation.mjs";`):

```js
test("validate returns valid with no errors when every field passes", () => {
  const result = validate(
    { username: "alice", password: "secret" },
    { username: [required()], password: [required()] },
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("validate reports every failing field, not just the first", () => {
  const result = validate(
    { username: "", password: "" },
    {
      username: [required("Username is required")],
      password: [required("Password is required")],
    },
  );
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    username: "Username is required",
    password: "Password is required",
  });
});

test("validate stops at the first failing rule within a field", () => {
  const result = validate(
    { password: "" },
    { password: [required("Password is required"), minLength(8, "Too short")] },
  );
  assert.deepEqual(result.errors, { password: "Password is required" });
});

test("validate reports a later rule when earlier rules pass", () => {
  const result = validate(
    { password: "abc" },
    { password: [required("Password is required"), minLength(8, "Too short")] },
  );
  assert.deepEqual(result.errors, { password: "Too short" });
});

test("validate ignores values with no schema entry", () => {
  const result = validate({ extra: "" }, { username: [required()] });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors), ["username"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `validate is not a function` (or an import error for the missing export).

- [ ] **Step 3: Write the minimal implementation**

Append to `src/validation.mjs`:

```js
export function validate(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule(values[field]);
      if (error !== null) {
        errors[field] = error;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 12 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/validation.mjs test/validation.test.mjs
git commit -m "feat: add validate() with per-field errors"
```

---

### Task 3: valuesFromForm() reader

**Risk tier:** standard — the module's only DOM-aware function; its contract determines the `name` attributes Task 4 must add to the markup.

**Files:**
- Modify: `src/validation.mjs` (append the new export)
- Modify: `test/validation.test.mjs` (append new tests)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `valuesFromForm(formEl) => { [name: string]: string }` — reads `formEl.elements`, keeping only elements with a non-empty `name`, and maps each `name` to its `value` as a raw string.

**Mirror:** `app.js:19-20` for what it replaces — reading `.value` off form controls.

- [ ] **Step 1: Write the failing tests**

Append to `test/validation.test.mjs` (and extend the import line to include `valuesFromForm`):

```js
// A minimal stand-in for an HTMLFormElement. The real `elements` collection is
// iterable, which is all this function needs, so the suite stays DOM-free.
function fakeForm(elements) {
  return { elements };
}

test("valuesFromForm reads named controls into a plain object", () => {
  const form = fakeForm([
    { name: "username", value: "alice" },
    { name: "password", value: "secret" },
  ]);
  assert.deepEqual(valuesFromForm(form), {
    username: "alice",
    password: "secret",
  });
});

test("valuesFromForm skips controls without a name", () => {
  const form = fakeForm([
    { name: "username", value: "alice" },
    { name: "", value: "ignored" },
    { value: "also ignored" },
  ]);
  assert.deepEqual(valuesFromForm(form), { username: "alice" });
});

test("valuesFromForm returns an empty object for a form with no controls", () => {
  assert.deepEqual(valuesFromForm(fakeForm([])), {});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `valuesFromForm is not a function` (or an import error for the missing export).

- [ ] **Step 3: Write the minimal implementation**

Append to `src/validation.mjs`:

```js
export function valuesFromForm(formEl) {
  const values = {};
  for (const element of formEl.elements) {
    if (element.name) {
      values[element.name] = element.value;
    }
  }
  return values;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 15 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/validation.mjs test/validation.test.mjs
git commit -m "feat: add valuesFromForm reader"
```

---

### Task 4: Migrate the login form onto the module

**Risk tier:** standard — multi-file integration across `app.js` and `index.html`, and it deletes working code (`validateForm`).

**Files:**
- Modify: `app.js:10-28` (delete `validateForm`, rewrite the submit handler, add the import)
- Modify: `index.html:9-13` (add `name` attributes, make the script a module)

**Interfaces:**
- Consumes: `validate`, `required`, `valuesFromForm` from `src/validation.mjs` (Tasks 1-3).
- Produces: nothing later tasks depend on — this is the last task.

**Mirror:** `app.js:17-28` — keep the existing handler's shape exactly: `e.preventDefault()` first, validate, then `login()` + `console.log("Login result:", result)` on success, `console.error` on failure. Only the validation call and the error logging change.

- [ ] **Step 1: Add `name` attributes and the module script type**

Rewrite `index.html` as:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" name="username" placeholder="Username" />
    <input type="password" id="password" name="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script type="module" src="app.js"></script>
</body>
</html>
```

The `id` attributes stay — only `name` is added, plus `type="module"` on the script tag.

- [ ] **Step 2: Rewrite `app.js` to use the module**

Full file after the edit:

```js
// Simple webapp with login form handling
import { validate, required, valuesFromForm } from "./src/validation.mjs";

const API_ENDPOINT = "https://api.example.com/login";

const LOGIN_SCHEMA = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const values = valuesFromForm(e.target);
  const validation = validate(values, LOGIN_SCHEMA);
  if (validation.valid) {
    const result = login(values.username, values.password);
    console.log("Login result:", result);
  } else {
    console.error("Validation errors:", validation.errors);
  }
});
```

`validateForm` is gone; `API_ENDPOINT` and `login()` are unchanged.

- [ ] **Step 3: Verify the unit tests still pass**

Run: `npm test`
Expected: PASS — 15 tests passing. Nothing in this task changes the module, so a failure here means an accidental edit to `src/validation.mjs`.

- [ ] **Step 4: Verify the page still works in a browser**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/` (not `file://` — module scripts require http). Then:
1. Submit the form with both fields empty. Expected in the console: `Validation errors: { username: "Username is required", password: "Password is required" }`.
2. Submit with a username but no password. Expected: an errors object containing only `password`.
3. Submit with both filled. Expected: `Logging in: <username>` followed by `Login result: { success: true, user: "<username>" }`.

Confirm no 404 or MIME error for `src/validation.mjs` in the console. Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "refactor: migrate login form to shared validation module"
```

---

## Self-Review

**1. Spec coverage.** Every spec section maps to a task: rule contract and both helpers (Task 1); `validate` and the per-field error shape (Task 2); `valuesFromForm` (Task 3); both `index.html` edits, the `app.js` rewrite, and the `validateForm` deletion (Task 4); `.mjs` format decision (Global Constraints + Task 1 Step 2); test script and all listed test cases (Tasks 1-3); manual http verification (Task 4 Step 4). Both intentional behavior changes are pinned by tests — whitespace rejection in Task 1, per-field errors in Task 2. Every spec "out of scope" item is restated in Global Constraints as a prohibition.

**2. Placeholder scan.** No TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries complete literal content.

**3. Type consistency.** `required` / `minLength` / `validate` / `valuesFromForm` are spelled identically in the interfaces, tests, implementations, and Task 4's import. The `{ valid, errors }` shape is consistent between Task 2's definition and Task 4's use (`validation.valid`, `validation.errors`). Task 3's `{ [name]: value }` output feeds Task 4's `values.username` / `values.password`, which matches the `name` attributes added in Task 4 Step 1.

**4. Grounding is real.** All citations were read from the working tree: `app.js:10-15` (`validateForm`), `app.js:17-28` (submit handler), `app.js:2,4,10` (naming), `app.js:19-20` (`.value` reads), `src/utils.js:5` (`module.exports`). The two conventions with no existing analogue — ES module exports and test shape — are recorded as explicit `none` entries rather than invented.
