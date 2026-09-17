# Reusable Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md`

**Goal:** Extract the login form's inline validation into a shared ES module that any future form can reuse by declaring its own rule table.

**Architecture:** A pure module `src/validation.mjs` exports `validate(values, rules)` plus a `required(message)` validator factory. Validators are functions of shape `(value) => string | null`; a form declares `{ field: [validator, ...] }` and receives `{ valid, errors }` back. The module never touches the DOM — each form reads its own inputs and passes a plain object in.

**Tech Stack:** Vanilla JavaScript, native ES modules (no bundler, no build step), `node:test` + `node:assert` for tests (zero dependencies), Node v26.8.2.

## Global Constraints

Copied from the spec; every task's requirements implicitly include these.

- ES modules via native `import`/`export`. No build step, no bundler.
- Zero runtime dependencies and zero dev dependencies. Tests use built-in `node:test` and `node:assert` only.
- Result shape is exactly `{ valid: boolean, errors: { [field]: string } }`. `errors` is always present — `{}` when valid — so consumers never guard before reading it.
- Validator contract is `(value) => string | null`: the message on failure, `null` on success.
- `src/validation.mjs` never touches the DOM.
- Only `required` ships. No `email`, `minLength`, `pattern`, or any other validator.
- First error per field wins; all failing fields are collected.
- `src/index.js` and `src/utils.js` stay CommonJS and are not modified. Do not add a `"type"` field to `package.json` — the `.mjs` extension carries the module type.
- Non-goals, do not implement: error display UI in the page, a second form, a DOM binding helper, linting/formatting tooling.
- Commit messages: plain imperative sentence, no `feat:`/`fix:` prefix, no AI attribution or `Co-Authored-By` line.

## Grounding

- **Naming:** `app.js:4,10` — top-level functions are lowerCamelCase (`login`, `validateForm`); constants are SCREAMING_SNAKE (`API_ENDPOINT`, `app.js:2`).
- **Error handling:** `app.js:26` — failures are reported with `console.error("<label>:", value)`, a label string followed by the value. There is no thrown-error or error-UI pattern anywhere in the repo.
- **Module exports:** `src/utils.js:5` — the only existing export convention is CommonJS `module.exports = { greet }`. `none: no existing ES module in the repo` — `src/validation.mjs` introduces the first `export` statements, so there is no in-repo ESM example to mirror.
- **Test shape:** `none: no test file, no test directory, and no test runner exist in the repo.` `package.json` has no `scripts` key. Task 1 creates the first test and the first `npm test` script.
- **Commit message style:** `git log` — `Add simple webapp fixture`, `add entry point`, `add utils module`. Plain imperative, no conventional-commit prefix. Capitalization is inconsistent; prefer the capitalized form.
- **Script loading:** `index.html:13` — `<script src="app.js"></script>`, a single classic script tag with no attributes.

---

### Task 1: The shared validation module

**Risk tier:** standard — creates a new module plus the repo's first test infrastructure across three files; not single-file mechanical, and no approval-authority or concurrency surface.

**Files:**
- Create: `src/validation.mjs`
- Create: `test/validation.test.mjs`
- Modify: `package.json` (add the `scripts` key; the file currently has none)

**Interfaces:**
- Consumes: nothing — this is the first task.
- Produces, relied on by Task 2:
  - `required(message: string) => (value: unknown) => string | null`
  - `validate(values: object, rules: { [field: string]: Array<(value: unknown) => string | null> }) => { valid: boolean, errors: { [field: string]: string } }`
  - Both are named exports of `src/validation.mjs`. From the repo root, `app.js` imports them as `from "./src/validation.mjs"`.

**Mirror:** none — `src/utils.js:1-5` is the nearest analogue for "a small module with a pure function", but it is CommonJS and this file is ESM, so imitate only its size and single-responsibility shape, not its export syntax.

- [ ] **Step 1: Add the test script to `package.json`**

The file currently has no `scripts` key. Add one so `npm test` resolves. Do not add a `"type"` field — that would break the CommonJS files in `src/`.

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

- [ ] **Step 2: Write the failing test**

Create `test/validation.test.mjs` with exactly this content. These eight cases are the module's contract as specified.

```js
import test from "node:test";
import assert from "node:assert/strict";

import { validate, required } from "../src/validation.mjs";

const loginRules = {
  username: [required("Username is required")],
  password: [required("Password is required")],
};

test("reports every empty field", () => {
  const result = validate({ username: "", password: "" }, loginRules);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    username: "Username is required",
    password: "Password is required",
  });
});

test("reports only the field that is empty", () => {
  const result = validate({ username: "ada", password: "" }, loginRules);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, { password: "Password is required" });
});

test("treats a whitespace-only value as empty", () => {
  const result = validate({ username: "   ", password: "hunter2" }, loginRules);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, { username: "Username is required" });
});

test("passes when every field has a value", () => {
  const result = validate({ username: "ada", password: "hunter2" }, loginRules);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("ignores values not named in the rules", () => {
  const values = { username: "ada", password: "hunter2", csrf: "" };
  const result = validate(values, loginRules);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("treats a field missing from values as empty", () => {
  const result = validate({ username: "ada" }, loginRules);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, { password: "Password is required" });
});

test("passes an empty rule set", () => {
  const result = validate({ username: "ada" }, {});
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("records only the first failing validator for a field", () => {
  const rules = { username: [required("first"), required("second")] };
  const result = validate({ username: "" }, rules);
  assert.deepEqual(result.errors, { username: "first" });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. Every test errors with `ERR_MODULE_NOT_FOUND` — `Cannot find module '.../src/validation.mjs'` — because the module does not exist yet.

- [ ] **Step 4: Write the module**

Create `src/validation.mjs` with exactly this content.

```js
/**
 * Form validation shared across forms.
 *
 * A validator is `(value) => string | null`: the error message on failure,
 * null on success. A form declares a rule table — `{ field: [validator] }` —
 * and passes its values in as a plain object. Nothing here touches the DOM,
 * so the same rules work for any form and can be unit-tested in Node.
 */

export function required(message) {
  return (value) =>
    value == null || String(value).trim() === "" ? message : null;
}

export function validate(values, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const check of validators) {
      const message = check(values[field]);
      if (message) {
        // One message per field: a field shows a single error at a time.
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

Expected: PASS — `# pass 8`, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add package.json src/validation.mjs test/validation.test.mjs
git commit -m "Add shared form validation module"
```

---

### Task 2: Wire the login form to the shared module

**Risk tier:** standard — multi-file integration across the page's script loading, the submit handler, and docs; changes how the app loads in the browser.

**Files:**
- Modify: `app.js:10-28` (delete the inline `validateForm`, import the module, update the submit handler)
- Modify: `index.html:13` (script tag becomes a module)
- Modify: `README.md` (one line on serving the app)

**Interfaces:**
- Consumes, from Task 1: `validate(values, rules)` and `required(message)`, named exports of `src/validation.mjs`, imported from `app.js` as `import { validate, required } from "./src/validation.mjs";`. `validate` returns `{ valid, errors }` with `errors` always an object.
- Produces: nothing — no later task depends on this one.

**Mirror:** `app.js:17-28`, the existing submit handler — keep its structure (`preventDefault`, read both inputs by id, branch on validity) and its `console.error("<label>:", value)` reporting style from `app.js:26`.

- [ ] **Step 1: Rewrite `app.js`**

Replace the whole file with exactly this content. The inline `validateForm` is deleted; `login` and `API_ENDPOINT` are unchanged.

```js
// Simple webapp with login form handling
import { validate, required } from "./src/validation.mjs";

const API_ENDPOINT = "https://api.example.com/login";

const loginRules = {
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
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validate({ username, password }, loginRules);
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    for (const [field, message] of Object.entries(validation.errors)) {
      console.error("Validation error:", `${field}: ${message}`);
    }
  }
});
```

- [ ] **Step 2: Check the new syntax parses**

Run: `node --check app.js`

Expected: exit 0, no output. (Node detects the ESM syntax in a `.js` file; verified on Node v26.8.2.) This catches a typo before touching the HTML.

- [ ] **Step 3: Make the script tag a module**

In `index.html:13`, change:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

Without `type="module"` the `import` on line 2 of `app.js` is a syntax error in the browser.

- [ ] **Step 4: Note the serving requirement in `README.md`**

Module scripts are blocked over `file://`, so opening `index.html` by double-clicking no longer works. Append to `README.md`:

```markdown

## Running

The page loads `app.js` as an ES module, which browsers block over `file://`.
Serve the directory instead of opening the file directly:

    npx serve .
```

- [ ] **Step 5: Verify the module tests still pass**

Run: `npm test`

Expected: PASS — `# pass 8`, `# fail 0`. Nothing in Task 2 touches `src/validation.mjs`, so a failure here means something was edited that should not have been.

- [ ] **Step 6: Verify in the browser**

Run: `npx serve .` and open the served URL.

Expected, in the browser console:
- Submitting the form empty logs two lines: `Validation error: username: Username is required` and `Validation error: password: Password is required`.
- Submitting with only a username logs one line naming `password`.
- Submitting with a username of a single space logs the `username` error — this is the intentional whitespace behavior change.
- Submitting both fields filled logs `Logging in: <username>` then `Login result: {…}`.
- No `Failed to load module script` or CORS error appears.

If `npx serve` is unavailable offline, any static server works (`python3 -m http.server`). If no server can be run in this environment, say so in the task report rather than marking this step done — do not claim browser verification that did not happen.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html README.md
git commit -m "Use shared validation module in the login form"
```

---

## Self-Review

**1. Spec coverage.** Spec sections mapped to tasks: Problem/Goal → both tasks. The module (`required`, `validate`, contracts, four behavior decisions) → Task 1 Step 4. Testing (all eight table rows, `scripts.test`, no `"type"` field) → Task 1 Steps 1-2. Call site changes (`app.js`, `index.html`, `README.md`) → Task 2 Steps 1-4. Files-touched table → Tasks 1 and 2 (`.gitignore` already created during brainstorming, so no task needed). Non-goals → Global Constraints. Risks: the `file://` regression is Task 2 Step 4; the whitespace change is tested in Task 1 and verified in Task 2 Step 6; the API-shape assumption needs no task — it resolves against a future form, not this plan. No gaps found.

**2. Placeholder scan.** No TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries complete content. No sanctioned `Unknown:`/`Assumption:` entries are needed — the spec's one assumption is validated by a future form, outside this plan's scope.

**3. Type consistency.** `validate(values, rules)` and `required(message)` are spelled identically in Task 1's Interfaces, Task 1 Step 2's test, Task 1 Step 4's implementation, Task 2's Interfaces, and Task 2 Step 1's import. The result shape `{ valid, errors }` is consistent across all five. The rule table is `{ field: [validator] }` everywhere. `loginRules` is defined independently in the test and in `app.js` — intentional, not a shared export.

**4. Grounding is real.** Every citation was read from the files during planning: `app.js:2,4,10,17-28`, `src/utils.js:1-5`, `index.html:13`, and `git log`. The two `none:` entries (no existing ESM, no existing tests) are explicit rather than invented. `node --check app.js` on ESM syntax was empirically verified on Node v26.8.2 before being written into Task 2 Step 2.
