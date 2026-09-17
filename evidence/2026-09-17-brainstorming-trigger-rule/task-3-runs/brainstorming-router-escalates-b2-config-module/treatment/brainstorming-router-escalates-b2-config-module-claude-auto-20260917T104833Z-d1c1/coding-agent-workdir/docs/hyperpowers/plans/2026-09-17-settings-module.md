# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-17-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a dedicated `settings.js` module that selects its environment by hostname.

**Architecture:** A new root-level ES module `settings.js` holds an `ENVIRONMENTS` map (local / staging / production) and a pure `resolveEnvironment(hostname)` function. A `settings` export resolves the current environment at module load from `globalThis.location?.hostname`, guarded so the module also imports cleanly under Node for testing. `app.js` imports `settings` instead of declaring `API_ENDPOINT`; `index.html` loads `app.js` as a module.

**Tech Stack:** Vanilla JavaScript (ES modules), Node's built-in `node:test` runner. No runtime or dev dependencies are added.

## Global Constraints

- **No dependencies.** `package.json` gains no `dependencies` or `devDependencies` entries. Tests use Node's built-in `node:test`.
- **No build step.** No bundler, no transpiler, no `npm install` required to run the app.
- **Node >= 18** for `node:test` and `Object.hasOwn`. Verified available: this machine runs Node v26.8.2.
- **Do not modify `src/index.js` or `src/utils.js`.** They are a separate CommonJS program, out of scope per the spec's non-goals. (Task 1 adds a `src/package.json` to preserve their CommonJS resolution — that is a scoping file, not a change to either program file.)
- **Placeholder values must stay clearly marked.** The local and staging URLs and the staging hostname are placeholders; every one carries an inline `Placeholder:` comment naming it as replace-before-deploy.
- **Unknown hostname resolves to `production`.** `resolveEnvironment` never throws.

## Grounding

- **Function + export style (CommonJS side):** `src/utils.js:1-5` — bare `function` declaration, then a single `module.exports = { … }` at the bottom. The new ESM module mirrors the shape (declarations first, exports grouped) but uses `export` rather than `module.exports`.
- **Function style (browser side):** `app.js:4-15` — plain `function` declarations, double-quoted strings, two-space indent, semicolons. `settings.js` follows this exactly.
- **Constant naming:** `app.js:2` — `const API_ENDPOINT` in SCREAMING_SNAKE_CASE for module-level constants. `ENVIRONMENTS` and `HOSTNAME_TO_ENVIRONMENT` follow it.
- **Script loading:** `index.html:13` — `<script src="app.js"></script>`, a single classic script tag with no attributes.
- **Test shape:** `none: no existing test file, test directory, test script, or test dependency anywhere in the repo.` Task 1 establishes the pattern; there is nothing to mirror.
- **Error handling:** `none: no existing error-handling convention.` The only failure path in the repo is `app.js:11-13`, which returns a `{ valid, error }` result object rather than throwing. `resolveEnvironment` likewise never throws — it falls back.

---

## Conflict found during planning: ES modules vs. the existing CommonJS program

The spec specifies ES modules for `settings.js` and `node:test` for the tests, but did not account for Node's module resolution. `package.json` has no `"type"` field, so Node treats every `.js` file as CommonJS. `settings.js` containing `export` would therefore fail to parse the moment a test imports it — the tests the spec asks for cannot run as specified.

Adding `"type": "module"` at the root fixes `settings.js` but breaks `src/index.js` and `src/utils.js`, which use `require`/`module.exports` — and the spec's non-goals forbid touching them.

**Resolution used in Task 1:** root `package.json` gets `"type": "module"`, and a new one-line `src/package.json` containing `{"type": "commonjs"}` re-scopes the `src/` directory back to CommonJS. Node applies the nearest `package.json` to each file, so both programs keep working with no edit to either `src/` source file.

**Verified before writing this plan**, in a scratch directory reproducing the exact file layout: `node src/index.js` printed `Hello, world` and `import('./settings.js')` resolved the ESM export. Both halves work simultaneously.

---

### Task 1: Settings module, module scoping, and tests

**Risk tier:** standard — new module plus a package-scoping change that affects how Node resolves every file in the repo.

**Files:**
- Create: `settings.js`
- Create: `src/package.json`
- Create: `test/settings.test.js`
- Modify: `package.json` (add `"type"` and `"scripts"`)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `resolveEnvironment(hostname: string) => "local" | "staging" | "production"` — pure, never throws.
  - `settings` — the resolved environment object, shape `{ name: string, apiBaseUrl: string }`. Task 2 reads `settings.apiBaseUrl`.
  - `ENVIRONMENTS` — the full map, keyed by environment name. Exported for tests only.

**Mirror:** `src/utils.js:1-5` for declaration-then-export ordering; `app.js:4-15` for formatting (two-space indent, double quotes, semicolons).

- [ ] **Step 1: Set the module type on the root package**

Replace `package.json` with:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Re-scope `src/` back to CommonJS**

Create `src/package.json` with exactly:

```json
{
  "type": "commonjs"
}
```

- [ ] **Step 3: Verify the existing CommonJS program still runs**

Run: `node src/index.js`
Expected: prints `Hello, world!` and exits 0. If it throws `require is not defined`, Step 2's file is missing or malformed — fix before continuing.

- [ ] **Step 4: Write the failing test**

Create `test/settings.test.js`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";

import { ENVIRONMENTS, resolveEnvironment, settings } from "../settings.js";

test("localhost resolves to local", () => {
  assert.equal(resolveEnvironment("localhost"), "local");
});

test("127.0.0.1 resolves to local", () => {
  assert.equal(resolveEnvironment("127.0.0.1"), "local");
});

test("the staging hostname resolves to staging", () => {
  assert.equal(resolveEnvironment("staging.example.com"), "staging");
});

test("an unrecognized hostname resolves to production", () => {
  assert.equal(resolveEnvironment("app.example.com"), "production");
});

test("an empty hostname resolves to production", () => {
  assert.equal(resolveEnvironment(""), "production");
});

test("an inherited Object property name resolves to production", () => {
  assert.equal(resolveEnvironment("constructor"), "production");
  assert.equal(resolveEnvironment("toString"), "production");
});

test("each environment exposes a name and an apiBaseUrl", () => {
  assert.deepEqual(Object.keys(ENVIRONMENTS).sort(), [
    "local",
    "production",
    "staging",
  ]);
  assert.equal(ENVIRONMENTS.local.apiBaseUrl, "http://localhost:3000");
  assert.equal(
    ENVIRONMENTS.staging.apiBaseUrl,
    "https://staging-api.example.com",
  );
  assert.equal(ENVIRONMENTS.production.apiBaseUrl, "https://api.example.com");
  for (const [key, environment] of Object.entries(ENVIRONMENTS)) {
    assert.equal(environment.name, key);
  }
});

test("importing under Node does not throw and falls back to production", () => {
  assert.equal(settings.name, "production");
  assert.equal(settings.apiBaseUrl, "https://api.example.com");
});
```

The last test is the regression guard for the `globalThis.location?.` optional chain: `globalThis.location` is `undefined` under Node, so an unguarded `window.location.hostname` would throw at import time and fail every test in this file.

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. Node cannot resolve `../settings.js` — `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 6: Write the settings module**

Create `settings.js`:

```javascript
// Per-environment API configuration, selected by hostname at load time so a
// single artifact works in every environment with no deploy-time step.
const ENVIRONMENTS = {
  local: {
    name: "local",
    // Placeholder: replace with the real local API base URL before deploying.
    apiBaseUrl: "http://localhost:3000",
  },
  staging: {
    name: "staging",
    // Placeholder: replace with the real staging API base URL before deploying.
    apiBaseUrl: "https://staging-api.example.com",
  },
  production: {
    name: "production",
    apiBaseUrl: "https://api.example.com",
  },
};

const HOSTNAME_TO_ENVIRONMENT = {
  localhost: "local",
  "127.0.0.1": "local",
  // Placeholder: replace with the real staging hostname before deploying.
  // This is the host the browser runs on, not the staging API host.
  "staging.example.com": "staging",
};

// Unrecognized hosts fall back to production rather than throwing: a config
// module that throws at import time takes the whole page down with it. The
// hasOwn guard keeps inherited Object properties ("constructor", "toString")
// from matching as if they were configured hostnames.
function resolveEnvironment(hostname) {
  if (Object.hasOwn(HOSTNAME_TO_ENVIRONMENT, hostname)) {
    return HOSTNAME_TO_ENVIRONMENT[hostname];
  }
  return "production";
}

// Optional chaining keeps this importable outside a browser, so the resolver
// can be tested under Node without a DOM shim.
const settings = ENVIRONMENTS[resolveEnvironment(globalThis.location?.hostname ?? "")];

export { ENVIRONMENTS, resolveEnvironment, settings };
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 8 tests, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add settings.js src/package.json test/settings.test.js package.json
git commit -m "feat: add settings module with hostname-based environment selection"
```

---

### Task 2: Wire the webapp to the settings module

**Risk tier:** standard — removes a constant other code reads and changes how the browser loads the app; a mistake here breaks page load entirely.

**Files:**
- Modify: `app.js:1-8` (remove the constant, add the import, use `settings`)
- Modify: `index.html:13` (add `type="module"`)

**Interfaces:**
- Consumes: `settings` from Task 1 — `{ name: string, apiBaseUrl: string }`, imported from `./settings.js`.
- Produces: nothing downstream; this is the final task.

**Mirror:** `app.js:4-15` — keep the existing function style, two-space indent, double quotes, and the stub `console.log` behavior. `login()` stays a stub; this task adds no network calls.

- [ ] **Step 1: Replace the constant with an import in `app.js`**

Replace lines 1-8 of `app.js` (the comment, the `API_ENDPOINT` constant, and the `login` function) with:

```javascript
// Simple webapp with login form handling
import { settings } from "./settings.js";

function login(username, password) {
  console.log("Logging in:", username, "via", settings.name);
  // Stub: would POST to `${settings.apiBaseUrl}/login` in a real app
  return { success: true, user: username };
}
```

Leave `validateForm` and the submit listener (`app.js:10-28`) exactly as they are.

- [ ] **Step 2: Verify the constant is gone and the import is present**

Run: `grep -n "API_ENDPOINT" app.js; grep -n "settings" app.js`
Expected: the first `grep` prints nothing and exits 1. The second prints the import line and both `settings.` references.

- [ ] **Step 3: Load `app.js` as a module in `index.html`**

Change `index.html:13` from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

Without `type="module"` the browser rejects the `import` statement with a syntax error and the form handler never binds.

- [ ] **Step 4: Verify `app.js` parses as an ES module**

Run: `node --check app.js`
Expected: no output, exit 0. (This checks syntax only — running it would fail on `document`, which does not exist under Node. That is expected and is not what this step tests.)

- [ ] **Step 5: Re-run the test suite**

Run: `npm test`
Expected: PASS, 8 tests, 0 failures. Task 2 changes no tested code, so this is a regression check.

- [ ] **Step 6: Verify in a browser**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/`, then in the browser console:
1. Confirm there are no module or CORS errors on load.
2. Submit the form with a username and password filled in.
3. Expected console output: `Logging in: <username> via local` followed by `Login result: { success: true, user: "<username>" }`.

The `via local` confirms hostname resolution worked end to end — `localhost` mapped to the `local` environment. Stop the server with Ctrl-C.

Note: opening `index.html` directly from `file://` will now fail with a CORS error. That is the expected and documented consequence of the ES-modules decision, not a bug.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "refactor: read the API endpoint from the settings module"
```

---

## Verification after both tasks

- `npm test` — 8 passing tests.
- `node src/index.js` — still prints `Hello, world!`; the unrelated CommonJS program is unaffected.
- `grep -rn "api.example.com" app.js` — no match; the endpoint lives only in `settings.js`.

## Follow-up for the user (not implementation work)

Before deploying, replace the three placeholder values in `settings.js`:
- `ENVIRONMENTS.local.apiBaseUrl` (`http://localhost:3000`)
- `ENVIRONMENTS.staging.apiBaseUrl` (`https://staging-api.example.com`)
- the `staging.example.com` key in `HOSTNAME_TO_ENVIRONMENT`

Assumption from the spec, still unvalidated: that the pre-existing `https://api.example.com` is the production endpoint, and that no environment is served from a host that would silently fall through to production. Validate by confirming with the user; neither blocks the tasks above, since both tasks preserve the existing value rather than choosing a new one.
