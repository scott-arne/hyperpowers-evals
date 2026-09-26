# Reusable Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-26-reusable-form-validation-design.md`

**Goal:** Extract form validation out of `app.js` into a `src/validation.js` module that any form in this app can use, and convert the login form to it.

**Architecture:** A single new file exposes three functions — `required`, `validate`, and `readFormValues` — behind a dual `module.exports` / `window.FormValidation` export, so the browser loads it as a plain `<script>` while Node imports it for unit tests. A rule is any `(value, allValues) => string | null`. The module reads values and checks rules; it never renders errors, so each form keeps its own display.

**Tech Stack:** Plain ES2015+ JavaScript, no bundler, no framework. Tests run on Node's built-in `node:test` (verified: this machine runs Node v26.9.0; `node --test` requires ≥18).

## Global Constraints

Every task's requirements implicitly include these, copied from the spec:

- **Zero runtime dependencies.** `package.json` declares none and this work adds none.
- **Test runner is `node:test`**, Node's built-in. The only `package.json` change is `"scripts": { "test": "node --test" }`. No test framework dependency.
- **`index.html` must remain openable as a `file://` URL.** No `type="module"` scripts, no dev server.
- **No linter or formatter** is introduced, and unrelated files are not reformatted.
- **Out of scope:** error display, submit interception inside the module, converting `src/utils.js` or `src/index.js`, and building any second form.

## Grounding

- **Function naming (camelCase) and module-level constants:** `app.js:1-8` — `const API_ENDPOINT = ...` at top, `function login(username, password)`. New code matches this.
- **Result-object convention:** `app.js:10-15` — `validateForm` returns `{ valid: false, error: ... }` / `{ valid: true }`. The new `validate` keeps the `valid` key and replaces the flat `error` string with an `errors` object.
- **Error handling in page code:** `app.js:25-27` — failures go to `console.error("Validation error:", ...)`. This is the only error-handling pattern in the repo; the rewritten listener keeps it (pluralized).
- **CommonJS export shape:** `src/utils.js:1-5` — `module.exports = { greet };` at end of file. The Node half of the dual export imitates this exactly.
- **Script tag placement:** `index.html:8-13` — form markup then `<script src="app.js"></script>` as the last body element. The new script tag goes immediately before it.
- **`package.json` has no `scripts` block:** `package.json:1-6` — only name, version, description, main.
- **Test shape: none.** There are no test files and no test runner in this repo (`find . -name "*test*"` returns nothing). Task 1 establishes the pattern; Task 2 follows it.

---

### Task 1: Validation core — `required` and `validate`

**Risk tier:** standard — new module plus the repo's first test infrastructure.

**Files:**
- Create: `src/validation.js`
- Create: `test/validation.test.js`
- Modify: `package.json:1-6` (add a `scripts` block)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `required(message?: string) => (value: any, allValues: object) => string | null`
  - `validate(values: object, schema: object) => { valid: boolean, errors: { [field: string]: string } }`
  - A schema is `{ [field: string]: Array<(value, allValues) => string | null> }`.
  - `module.exports` / `window.FormValidation` carries these. Task 2 adds `readFormValues` to the same export object.

**Mirror:** `src/utils.js:1-5` for the `module.exports = { ... };` end-of-file export shape.

- [ ] **Step 1: Write the failing test**

Create `test/validation.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { required, validate } = require("../src/validation");

test("required fails on undefined, empty, and whitespace-only values", () => {
  const rule = required();
  assert.equal(rule(undefined), "This field is required");
  assert.equal(rule(""), "This field is required");
  assert.equal(rule("   "), "This field is required");
});

test("required passes a non-empty value", () => {
  assert.equal(required()("a"), null);
});

test("required handles non-string values without throwing", () => {
  const rule = required();
  assert.equal(rule(null), "This field is required");
  assert.equal(rule(0), null);
  assert.equal(rule(false), null);
});

test("required uses a custom message when given one", () => {
  assert.equal(required("Username is required")(""), "Username is required");
});

test("validate returns valid with no errors when every rule passes", () => {
  const schema = { username: [required()], password: [required()] };
  const result = validate({ username: "ada", password: "hunter2" }, schema);
  assert.deepEqual(result, { valid: true, errors: {} });
});

test("validate reports every failing field, not just the first", () => {
  const schema = { username: [required()], password: [required()] };
  const result = validate({ username: "", password: "" }, schema);
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["password", "username"]);
});

test("validate keeps only the first failure per field", () => {
  const schema = {
    username: [required("first"), () => "second"],
  };
  const result = validate({ username: "" }, schema);
  assert.equal(result.errors.username, "first");
});

test("validate fails a schema field absent from values", () => {
  const result = validate({}, { username: [required()] });
  assert.equal(result.valid, false);
  assert.equal(result.errors.username, "This field is required");
});

test("validate honors a custom function rule and passes allValues to it", () => {
  const seen = [];
  const schema = {
    confirm: [
      (value, allValues) => {
        seen.push(allValues);
        return value === allValues.password ? null : "Passwords must match";
      },
    ],
  };

  const bad = validate({ password: "a", confirm: "b" }, schema);
  assert.equal(bad.errors.confirm, "Passwords must match");

  const good = validate({ password: "a", confirm: "a" }, schema);
  assert.equal(good.valid, true);
  assert.deepEqual(seen[0], { password: "a", confirm: "b" });
});

test("validate treats a field with an empty rule list as passing", () => {
  assert.deepEqual(validate({ a: "" }, { a: [] }), { valid: true, errors: {} });
});

test("validation does not mutate the values it is given", () => {
  const values = { username: "  ada  " };
  validate(values, { username: [required()] });
  assert.equal(values.username, "  ada  ");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/validation.test.js`

Expected: FAIL — `Cannot find module '../src/validation'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/validation.js`:

```js
// Reusable form validation. Loaded as a plain <script> in the browser and
// required() from Node in tests, so it carries a dual export at the bottom.

const DEFAULT_REQUIRED_MESSAGE = "This field is required";

// Trimming applies to the emptiness check only; validation never rewrites the
// caller's values, so a form still submits exactly what the user typed.
function isEmpty(value) {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

function required(message) {
  return function (value) {
    return isEmpty(value) ? message || DEFAULT_REQUIRED_MESSAGE : null;
  };
}

function validate(values, schema) {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field] || [];
    for (let i = 0; i < rules.length; i += 1) {
      const error = rules[i](values[field], values);
      if (error) {
        // First failure only, so one field never stacks messages.
        errors[field] = error;
        break;
      }
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { required, validate };
} else {
  window.FormValidation = { required, validate };
}
```

- [ ] **Step 4: Add the test script to `package.json`**

Replace the contents of `package.json` with:

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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS — 11 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add src/validation.js test/validation.test.js package.json
git commit -m "feat: add reusable validation rules and validate()"
```

---

### Task 2: `readFormValues`

**Risk tier:** standard — extends the module's public surface and the export object other code destructures.

**Files:**
- Modify: `src/validation.js` (add the function, extend both export branches)
- Modify: `test/validation.test.js` (append tests)

**Interfaces:**
- Consumes: `src/validation.js` from Task 1 — the `module.exports = { required, validate };` / `window.FormValidation = { required, validate };` pair at the end of the file, which this task extends to `{ required, validate, readFormValues }` in both branches.
- Produces: `readFormValues(formEl) => { [fieldName: string]: string }`. Task 3 calls it with a real `<form>` element.

**Mirror:** `src/validation.js` as written in Task 1 — same comment density, same `function` declarations at top level, same placement above the export block.

- [ ] **Step 1: Write the failing test**

Append to `test/validation.test.js`, and change the existing `require` line at the top of the file from `const { required, validate } = require("../src/validation");` to:

```js
const { required, validate, readFormValues } = require("../src/validation");
```

Then append:

```js
// readFormValues touches the DOM only through querySelectorAll, so a small fake
// keeps these tests dependency-free.
function fakeForm(controls) {
  return { querySelectorAll: () => controls };
}

test("readFormValues keys values by the control's name", () => {
  const form = fakeForm([
    { name: "username", id: "username", value: "ada" },
    { name: "password", id: "password", value: "hunter2" },
  ]);
  assert.deepEqual(readFormValues(form), { username: "ada", password: "hunter2" });
});

test("readFormValues prefers name over id when they differ", () => {
  const form = fakeForm([{ name: "user", id: "username-field", value: "ada" }]);
  assert.deepEqual(readFormValues(form), { user: "ada" });
});

test("readFormValues falls back to id when name is absent", () => {
  const form = fakeForm([{ id: "username", value: "ada" }]);
  assert.deepEqual(readFormValues(form), { username: "ada" });
});

test("readFormValues skips controls with neither name nor id", () => {
  const form = fakeForm([{ value: "ignored" }, { name: "kept", value: "yes" }]);
  assert.deepEqual(readFormValues(form), { kept: "yes" });
});

test("readFormValues returns an empty object for a form with no controls", () => {
  assert.deepEqual(readFormValues(fakeForm([])), {});
});

test("an empty form fails every required field", () => {
  const values = readFormValues(fakeForm([]));
  const result = validate(values, { username: [required()], password: [required()] });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["password", "username"]);
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test`

Expected: FAIL — `readFormValues is not a function` on the new tests. The eleven Task 1 tests still pass.

- [ ] **Step 3: Write the minimal implementation**

In `src/validation.js`, insert this function after `validate` and before the export block:

```js
// Keyed by `name`, falling back to `id` so markup predating this module keeps
// working. Controls with neither are skipped.
function readFormValues(formEl) {
  const values = {};
  const controls = formEl.querySelectorAll("input, select, textarea");

  Array.prototype.forEach.call(controls, (control) => {
    const key = control.name || control.id;
    if (key) {
      values[key] = control.value;
    }
  });

  return values;
}
```

`querySelectorAll` returns a `NodeList` rather than an array, which is why the
iteration goes through `Array.prototype.forEach.call`.

Then update **both** export branches at the end of the file:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { required, validate, readFormValues };
} else {
  window.FormValidation = { required, validate, readFormValues };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS — 17 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/validation.js test/validation.test.js
git commit -m "feat: add readFormValues to the validation module"
```

---

### Task 3: Convert the login form to the module

**Risk tier:** standard — multi-file integration across `app.js` and `index.html`; deletes the existing `validateForm`.

**Files:**
- Modify: `app.js:10-28` (delete `validateForm`, rewrite the submit listener)
- Modify: `index.html:8-13` (add `name` attributes and the module's script tag)

**Interfaces:**
- Consumes: `required`, `validate`, and `readFormValues` from `src/validation.js`. In the browser these are top-level function declarations in a classic script, so they are already globals by the time `app.js` runs — call them bare, exactly as written below. `window.FormValidation` holds the same three functions if a caller prefers the namespace.
- Produces: nothing other tasks depend on. This is the last task.

**Mirror:** `app.js:17-28` — keep the existing listener's shape: `addEventListener("submit", (e) => {...})`, `e.preventDefault()` first, `console.error` for failures and `console.log` for the result.

- [ ] **Step 1: Add `name` attributes and the script tag to `index.html`**

Replace the two input lines (`index.html:9-10`) so each carries a `name` matching its `id`:

```html
    <input type="text" id="username" name="username" placeholder="Username" />
    <input type="password" id="password" name="password" placeholder="Password" />
```

Then add the module's script immediately before the existing `app.js` tag (`index.html:13`), so the two lines read:

```html
  <script src="src/validation.js"></script>
  <script src="app.js"></script>
```

Order matters: `app.js` calls `required()` at parse time when it builds `loginSchema`, so `src/validation.js` must load first.

- [ ] **Step 2: Rewrite `app.js`**

Replace the whole file with:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

const loginSchema = {
  username: [required()],
  password: [required()],
};

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const values = readFormValues(e.currentTarget);
  const { valid, errors } = validate(values, loginSchema);

  if (!valid) {
    console.error("Validation errors:", errors);
    return;
  }

  const result = login(values.username, values.password);
  console.log("Login result:", result);
});
```

`validateForm` is deleted. Nothing else in the repo references it — `src/index.js` and `src/utils.js` do not.

- [ ] **Step 3: Confirm nothing still references the deleted function**

Run: `grep -rn "validateForm" --exclude-dir=.git --exclude-dir=docs .`

Expected: no matches. A match outside `docs/` means a caller was missed — stop and report it rather than patching around it.

- [ ] **Step 4: Verify the unit tests still pass**

Run: `npm test`

Expected: PASS — 15 tests pass, 0 fail. This task changes no module code, so a failure here means Task 2 regressed.

- [ ] **Step 5: Verify the page in a browser**

Open `index.html` directly as a `file://` URL (`open index.html` on macOS) and, with the developer console visible:

1. Submit the form with both fields empty. Expected: `Validation errors: { username: "This field is required", password: "This field is required" }` and **no** `Logging in:` line.
2. Type a space into Username, leave Password empty, submit. Expected: both fields still reported — the space does not satisfy `required`.
3. Fill both fields, submit. Expected: `Logging in: <username>` followed by `Login result: { success: true, user: "<username>" }`, and no error line.

If the console instead reports `required is not defined`, the script tags in Step 1 are in the wrong order.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "refactor: convert login form to the shared validation module"
```

---

## Notes for the reviewer

- The spec's behavior-change table is intentional and approved: per-field `errors` replaces the flat `error` string, whitespace-only values now fail `required`, and the console names the failing fields. A review finding that the behavior changed is expected; a finding that it changed in some *other* way is not.
- `app.js`'s listener has no unit test by design (spec, Testing section): once validation moves out it is DOM event glue with no logic. Task 3 Step 5 is its verification.
