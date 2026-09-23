# Reusable Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-reusable-form-validation-design.md`

**Goal:** Replace the login form's hardcoded two-field presence check with a shared, DOM-free validation module any form can use.

**Architecture:** A new ES module `validation.mjs` at the repo root exports three rule makers and a `validate(values, rules)` driver. A rule is any `(value) => string | null` function, so a form with a one-off requirement writes an inline arrow function instead of growing the shared module. `app.js` imports it and drops its local `validateForm`; `index.html` gains `type="module"`.

**Tech Stack:** Plain ES modules, no dependencies. Node's built-in `node:test` runner and `node:assert/strict`.

## Global Constraints

Copied from the spec's Global Constraints. Every task's requirements include these.

- **ES modules.** Not a `window` global, not CommonJS-plus-bundler. `index.html` gains `<script type="module">` and the page will no longer open from `file://` — this cost was raised and accepted during design.
- **Zero runtime and dev dependencies.** No `npm install`, no `node_modules`, no lockfile, no bundler, no linter. Tests use Node's built-in runner only.
- **Rules only.** The validation module is pure: values in, result out. No DOM access, no I/O, no imports from `app.js`.
- **Nothing outside the webapp files changes** beyond adding a `test` script to `package.json`. Specifically: `src/index.js` and `src/utils.js` are NOT modified, moved, renamed, or converted.
- **No `"type"` field is added to `package.json`.** The `.mjs` extension is what makes the module loadable by Node; adding `"type": "module"` would break `src/index.js`'s `require()`.
- Do not add attribution, co-author, or AI-generated lines to any commit message.

## Grounding

- **Naming and style (webapp files):** `app.js:1-28` — camelCase functions, double-quoted strings, semicolons, 2-space indent, `const` at module scope. Mirror this, not `src/utils.js:1-5`, which uses single quotes and CommonJS.
- **Current validation to be replaced:** `app.js:10-15` — `validateForm(formData)` returning `{ valid: false, error: "Missing required fields" }` or `{ valid: true }`.
- **Current call site:** `app.js:17-28` — the `#login-form` submit handler reading `.value` off two inputs and logging failures with `console.error`.
- **Script tag to change:** `index.html:13` — `<script src="app.js"></script>`.
- **Package manifest:** `package.json:1-6` — no `scripts`, no `dependencies`, no `"type"` field.
- **Commit message style:** `git log` reads `Add simple webapp fixture`, `add entry point`, `add utils module`. Plain imperative, no Conventional Commits prefix. Do NOT write `feat:` or `fix:`.
- **Error handling convention:** `none: no existing pattern` — the repo has no try/catch, no thrown errors, and no error class anywhere. The module returns error messages as data and throws nothing.
- **Test shape:** `none: no existing test file, no test runner, no test directory`. Task 1 establishes the pattern every later test follows.

---

### Task 1: Validation module core — `validate` and `required`

**Risk tier:** standard — new module plus the repo's first test infrastructure; establishes interfaces every later task consumes.

**Files:**
- Create: `validation.mjs`
- Create: `validation.test.mjs`
- Modify: `package.json:1-6` (add a `scripts` block)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `required(message?: string) => (value: unknown) => string | null` — default message `"This field is required"`.
  - `validate(values: object, rules: { [field: string]: Array<(value: unknown) => string | null> }) => { valid: boolean, errors: { [field: string]: string } }`.
  - A module-private `toText(value)` helper, not exported.
  - `npm test` runs `node --test`.

**Mirror:** `app.js:1-28` for style only — double quotes, semicolons, 2-space indent, camelCase.

- [ ] **Step 1: Write the failing test**

Create `validation.test.mjs` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { required, validate } from "./validation.mjs";

test("required rejects undefined, null, empty, and whitespace-only", () => {
  const rule = required();
  assert.equal(rule(undefined), "This field is required");
  assert.equal(rule(null), "This field is required");
  assert.equal(rule(""), "This field is required");
  assert.equal(rule("   "), "This field is required");
});

test("required accepts a non-empty string", () => {
  assert.equal(required()("alice"), null);
});

test("required uses a caller-supplied message", () => {
  assert.equal(required("Username is required")(""), "Username is required");
});

test("validate returns valid with empty errors when every field passes", () => {
  const result = validate(
    { username: "alice", password: "hunter2" },
    { username: [required()], password: [required()] },
  );
  assert.deepEqual(result, { valid: true, errors: {} });
});

test("validate reports one failing field", () => {
  const result = validate(
    { username: "alice", password: "" },
    { username: [required()], password: [required()] },
  );
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, { password: "This field is required" });
});

test("validate reports every failing field, not just the first", () => {
  const result = validate(
    { username: "", password: "" },
    { username: [required()], password: [required()] },
  );
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    username: "This field is required",
    password: "This field is required",
  });
});

test("validate stops at the first failing rule within a field", () => {
  const never = () => "second rule ran";
  const result = validate({ name: "" }, { name: [required(), never] });
  assert.deepEqual(result.errors, { name: "This field is required" });
});

test("validate ignores keys in values that have no rules", () => {
  const result = validate(
    { username: "alice", csrfToken: "" },
    { username: [required()] },
  );
  assert.deepEqual(result, { valid: true, errors: {} });
});

test("validate treats a key missing from values as undefined", () => {
  const result = validate({}, { username: [required()] });
  assert.deepEqual(result.errors, { username: "This field is required" });
});

test("validate with no rules returns valid", () => {
  assert.deepEqual(validate({ anything: "x" }, {}), {
    valid: true,
    errors: {},
  });
});
```

- [ ] **Step 2: Add the test script to `package.json`**

Add a `scripts` block. The whole file becomes:

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

Do NOT add a `"type"` field. Do NOT add `dependencies` or `devDependencies`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. Every test errors while loading the module — `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `./validation.mjs`, because the file does not exist yet.

- [ ] **Step 4: Write the minimal implementation**

Create `validation.mjs` with exactly this content:

```js
// Reusable form validation. A rule is (value) => string | null: the message
// when the value is rejected, null when it passes. Rules are plain functions
// rather than entries in a rule table so a form with a one-off requirement can
// pass an inline arrow function instead of growing this module.

// Nullish values become "" rather than the strings "undefined" or "null", so a
// length or pattern rule rejects a missing field instead of measuring its
// coercion. Without this, minLength(8) would pass on undefined.
function toText(value) {
  return value === undefined || value === null ? "" : String(value);
}

export function required(message = "This field is required") {
  return (value) => (toText(value).trim() === "" ? message : null);
}

export function validate(values, rules) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const message = rule(values[field]);
      if (message !== null) {
        errors[field] = message;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS, 10 tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add validation.mjs validation.test.mjs package.json
git commit -m "add reusable form validation module"
```

---

### Task 2: `minLength` and `matches` rule makers

**Risk tier:** standard — extends the interface other forms will consume; the `matches` implementation has a regex-statefulness trap that a reviewer should check.

**Files:**
- Modify: `validation.mjs` (append two exports after `required`)
- Modify: `validation.test.mjs` (append tests)

**Interfaces:**
- Consumes: `toText(value)` (module-private, from Task 1); the `(value) => string | null` rule contract.
- Produces:
  - `minLength(n: number, message?: string) => (value: unknown) => string | null` — default message `` `Must be at least ${n} characters` ``.
  - `matches(regexp: RegExp, message?: string) => (value: unknown) => string | null` — default message `"Invalid format"`.

**Mirror:** the `required` function written in Task 1 in `validation.mjs` — same shape: a maker taking an optional `message` with a default, returning an arrow that runs `toText(value)` and returns the message or `null`.

- [ ] **Step 1: Write the failing tests**

Append to `validation.test.mjs`. Also update the existing import line at the top of the file from `import { required, validate } from "./validation.mjs";` to:

```js
import { matches, minLength, required, validate } from "./validation.mjs";
```

Then append these tests at the end of the file:

```js
test("minLength rejects a value shorter than n", () => {
  assert.equal(minLength(8)("short"), "Must be at least 8 characters");
});

test("minLength accepts a value of exactly n", () => {
  assert.equal(minLength(5)("exact"), null);
});

test("minLength rejects undefined rather than measuring \"undefined\"", () => {
  assert.equal(minLength(8)(undefined), "Must be at least 8 characters");
});

test("minLength uses a caller-supplied message", () => {
  assert.equal(minLength(8, "Too short")("x"), "Too short");
});

test("matches accepts a value the pattern matches", () => {
  assert.equal(matches(/^[a-z]+$/)("alice"), null);
});

test("matches rejects a value the pattern does not match", () => {
  assert.equal(matches(/^[a-z]+$/)("Alice1"), "Invalid format");
});

test("matches rejects undefined rather than testing \"undefined\"", () => {
  assert.equal(matches(/^[a-z]+$/)(undefined), "Invalid format");
});

test("matches uses a caller-supplied message", () => {
  assert.equal(matches(/@/, "Must contain @")("nope"), "Must contain @");
});

test("matches is not stateful across calls with a global regex", () => {
  const rule = matches(/a/g);
  assert.equal(rule("a"), null);
  assert.equal(rule("a"), null);
});

test("minLength and matches compose in one field, first failure wins", () => {
  const result = validate(
    { code: "ab" },
    { code: [minLength(4, "too short"), matches(/^\d+$/, "digits only")] },
  );
  assert.deepEqual(result.errors, { code: "too short" });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. The import of `minLength` and `matches` resolves to `undefined`, so the new tests throw `TypeError: minLength is not a function`. The 10 tests from Task 1 still pass.

- [ ] **Step 3: Write the minimal implementation**

In `validation.mjs`, insert these two exports between `required` and `validate`:

```js
export function minLength(n, message = `Must be at least ${n} characters`) {
  return (value) => (toText(value).length < n ? message : null);
}

export function matches(regexp, message = "Invalid format") {
  // String#match ignores lastIndex, so a caller's /g regex cannot go stateful
  // across calls the way regexp.test() would — the same rule object is reused
  // for every submit, so that would fail on every other attempt.
  return (value) => (toText(value).match(regexp) === null ? message : null);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS, 20 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add validation.mjs validation.test.mjs
git commit -m "add minLength and matches validation rules"
```

---

### Task 3: Use the shared module in the login form

**Risk tier:** standard — multi-file integration, and it changes how `index.html` loads its script.

**Files:**
- Modify: `app.js:1-28` (replace the whole file)
- Modify: `index.html:13` (one line)

**Interfaces:**
- Consumes: `validate(values, rules)` and `required(message?)` from Task 1, imported from `./validation.mjs`.
- Produces: nothing other tasks depend on — this is the last task.

**Mirror:** none — this replaces `app.js:10-15` and rewrites the handler at `app.js:17-28` rather than imitating an analogue.

- [ ] **Step 1: Replace the script tag in `index.html`**

Change line 13 from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

Change nothing else in `index.html`.

- [ ] **Step 2: Rewrite `app.js` to use the module**

Replace the entire contents of `app.js` with:

```js
// Simple webapp with login form handling
import { required, validate } from "./validation.mjs";

const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

const loginRules = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const { valid, errors } = validate({ username, password }, loginRules);
  if (valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation errors:", errors);
  }
});
```

The local `validateForm` function is deleted — the shared module replaces it. `login()` and `API_ENDPOINT` keep their existing bodies unchanged. Do NOT add DOM error rendering; displaying messages on the page is out of scope per the spec.

- [ ] **Step 3: Verify the module tests still pass**

Run: `npm test`

Expected: PASS, 20 tests passing. `app.js` is not loaded by Node and has no test of its own; this step confirms Task 3 did not disturb the module.

- [ ] **Step 4: Verify no stale reference to the deleted function remains**

Run: `grep -rn "validateForm" . --exclude-dir=.git --exclude-dir=docs`

Expected: no output, exit status 1. Any hit means a caller was missed.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "use shared validation module in login form"
```

---

## Manual verification (not automated)

The page change is not covered by any test in this plan — there is no DOM test runner and adding one would breach the zero-dependency constraint. Anyone wanting browser confirmation must do it by hand:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and check: submitting with both fields filled logs `Login result: {...}`; submitting with either field blank logs `Validation errors: { username: "Username is required" }` (or the password equivalent, or both); the console shows no module-loading error.

Opening `index.html` directly from disk will NOT work any more — `file://` cannot load ES modules. That is the accepted cost recorded in the spec.

Until someone runs the above, report the page as verified by reading only. Do not claim the form works in a browser.
