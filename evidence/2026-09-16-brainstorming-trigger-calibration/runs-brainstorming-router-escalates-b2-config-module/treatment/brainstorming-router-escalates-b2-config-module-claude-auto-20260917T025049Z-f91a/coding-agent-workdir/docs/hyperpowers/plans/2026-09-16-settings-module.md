# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-16-settings-module-design.md`

**Goal:** Move the hardcoded login API endpoint out of `app.js` into a new `src/settings.js` module that resolves the endpoint from `location.hostname` across local, staging, and production.

**Architecture:** A new ES module owns a hostname-to-endpoint map, a pure `resolveApiEndpoint(hostname)` function, and a `settings` object resolved once at import. Because the browser needs ES modules and the existing `src/index.js`/`src/utils.js` are CommonJS, the repository first moves to `"type": "module"` with those two files renamed to `.cjs`. `app.js` then imports `settings` instead of declaring its own constant.

**Tech Stack:** Vanilla browser JavaScript (ES modules), Node.js v26.8.2, `node:test` + `node:assert/strict` for unit tests. No third-party dependencies.

## Global Constraints

- No runtime dependencies. `package.json` must end with no `dependencies` and no `devDependencies` keys.
- Unit tests use Node's built-in `node:test` runner only. No linter or formatter is introduced by this work.
- All endpoint URLs and hostnames are placeholders, and every one of them lives in a single map in `src/settings.js` so they can be corrected in one edit.
- `resolveApiEndpoint` is pure: it takes the hostname as an argument and reads no globals.
- The module never throws. An unrecognized hostname warns and falls back to production.
- Verified toolchain on this machine: Node v26.8.2; `node --test`, ESM under `"type": "module"`, and `t.mock.method(console, "warn")` were all confirmed working before this plan was written.

## Grounding

- Browser-half code style: `app.js:4-15` — `function` declarations, camelCase names, 2-space indent, double-quoted strings, semicolons throughout. The new `src/settings.js` follows this file, not the `src/` CommonJS files.
- Node-half module pattern: `src/utils.js:1-5` — a `function` declaration followed by `module.exports = { greet }`. This is the pattern being renamed to `.cjs`, not imitated.
- Entry-point require: `src/index.js:1` — `const { greet } = require('./utils');`. This is the exact line Task 1 must update.
- Error handling: `app.js:10-15` — `validateForm` returns a result object (`{ valid, error }`) rather than throwing; `app.js:26` reports via `console.error`. Nothing in the repository throws, which is consistent with the spec's warn-and-fall-back decision.
- Existing constant being replaced: `app.js:2` — `const API_ENDPOINT = "https://api.example.com/login";`. Its only other mention is the comment at `app.js:6`.
- Script tag to change: `index.html:13` — `<script src="app.js"></script>`.
- Test shape: **none** — the repository has no test runner, no `test/` directory, and no test files. Task 2 establishes the pattern.

---

### Task 1: Migrate the repository to ES modules

**Risk tier:** standard — renames the package entry point and changes module resolution for every file in the repo.

**Files:**
- Modify: `package.json`
- Rename: `src/index.js` -> `src/index.cjs`
- Rename: `src/utils.js` -> `src/utils.cjs`
- Modify: `src/index.cjs:1` (the require path, after the rename)

**Interfaces:**
- Consumes: nothing.
- Produces: a repository where `.js` files are ES modules by default, so `src/settings.js` (Task 2) can use `export` and be imported by both the browser and `node --test`. The Node island keeps exporting `greet` via CommonJS from `src/utils.cjs`.

**Mirror:** `src/utils.js:1-5` — the CommonJS shape being preserved verbatim under a new extension. Do not convert these two files to ESM; only their extension and the require path change.

- [ ] **Step 1: Record the current behavior so the migration can be checked against it**

Run: `node src/index.js`
Expected: prints `Hello, world!`

- [ ] **Step 2: Rename both CommonJS files with git so history is preserved**

```bash
git mv src/index.js src/index.cjs
git mv src/utils.js src/utils.cjs
```

- [ ] **Step 3: Update the require path in the renamed entry point**

In `src/index.cjs`, change line 1 from:

```js
const { greet } = require('./utils');
```

to:

```js
const { greet } = require('./utils.cjs');
```

The explicit extension is required: with `"type": "module"` set in the next step, Node's CommonJS resolver no longer falls back to `./utils.js` for an extensionless specifier in this package.

- [ ] **Step 4: Run the entry point to confirm the rename alone did not break it**

Run: `node src/index.cjs`
Expected: prints `Hello, world!`

- [ ] **Step 5: Add the module type and update the entry point in `package.json`**

Replace the full contents of `package.json` with:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.cjs",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 6: Run the entry point again, now that `"type": "module"` is in effect**

Run: `node src/index.cjs`
Expected: prints `Hello, world!`

This is the step that catches a missed extension in the require path. If it fails with `ERR_MODULE_NOT_FOUND` or `Cannot find module './utils'`, Step 3 was not applied.

- [ ] **Step 7: Confirm the test script runs even with no tests yet**

Run: `npm test`
Expected: exits 0. Node reports `tests 0` / `fail 0`. A non-zero exit here means the `scripts` block is malformed.

- [ ] **Step 8: Commit**

```bash
git add package.json src/index.cjs src/utils.cjs
git commit -m "refactor: move package to ES modules, rename CommonJS files to .cjs"
```

---

### Task 2: Create the settings module with its test suite

**Risk tier:** standard — new module that every later task depends on, and it establishes the repository's first test pattern.

**Files:**
- Create: `src/settings.js`
- Test: `test/settings.test.js`

**Interfaces:**
- Consumes: `"type": "module"` in `package.json` from Task 1. Without it, `test/settings.test.js` cannot import `src/settings.js`.
- Produces:
  - `resolveApiEndpoint(hostname: string | undefined) => string` — a named export. Pure. Returns the mapped endpoint for a known hostname; for anything else calls `console.warn` once and returns the production endpoint.
  - `settings` — a named export, a frozen object with one property, `apiEndpoint: string`, resolved once at import time. This is what Task 3 consumes.
  - `PRODUCTION_API_ENDPOINT` — a named export, the production URL string. Exported so the test suite asserts against the same constant rather than a duplicated literal.

**Mirror:** `app.js:4-15` — code style for the new file (function declarations, camelCase, 2-space indent, double-quoted strings). There is no test to mirror; this task creates the first one.

- [ ] **Step 1: Write the failing test**

Create `test/settings.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveApiEndpoint,
  settings,
  PRODUCTION_API_ENDPOINT,
} from "../src/settings.js";

test("localhost resolves to the local endpoint", () => {
  assert.equal(resolveApiEndpoint("localhost"), "http://localhost:3000/login");
});

test("the loopback address resolves to the local endpoint", () => {
  assert.equal(resolveApiEndpoint("127.0.0.1"), "http://localhost:3000/login");
});

test("the staging host resolves to the staging endpoint", () => {
  assert.equal(
    resolveApiEndpoint("staging.example.com"),
    "https://api-staging.example.com/login",
  );
});

test("the production hosts resolve to the production endpoint", () => {
  assert.equal(resolveApiEndpoint("example.com"), PRODUCTION_API_ENDPOINT);
  assert.equal(resolveApiEndpoint("www.example.com"), PRODUCTION_API_ENDPOINT);
});

test("a mapped host does not warn", (t) => {
  const warn = t.mock.method(console, "warn");
  resolveApiEndpoint("example.com");
  assert.equal(warn.mock.callCount(), 0);
});

test("an unrecognized host falls back to production", () => {
  assert.equal(
    resolveApiEndpoint("preview-42.netlify.app"),
    PRODUCTION_API_ENDPOINT,
  );
});

test("an unrecognized host warns and names the hostname", (t) => {
  const warn = t.mock.method(console, "warn");
  resolveApiEndpoint("preview-42.netlify.app");
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /preview-42\.netlify\.app/);
});

test("an undefined hostname falls back to production without throwing", () => {
  assert.equal(resolveApiEndpoint(undefined), PRODUCTION_API_ENDPOINT);
});

test("settings exposes a resolved endpoint and is frozen", () => {
  assert.equal(typeof settings.apiEndpoint, "string");
  assert.ok(Object.isFrozen(settings));
});

test("outside a browser, settings falls back to production", () => {
  // Node has no `location` global, so the import-time resolution must not
  // throw and must not emit a spurious warning.
  assert.equal(settings.apiEndpoint, PRODUCTION_API_ENDPOINT);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. Every test errors during module load with `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `../src/settings.js`, because the module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/settings.js`:

```js
// Environment configuration for the web app. Every endpoint URL in the
// project lives in this file so changing environments is a one-file edit.

export const PRODUCTION_API_ENDPOINT = "https://api.example.com/login";

const LOCAL_API_ENDPOINT = "http://localhost:3000/login";
const STAGING_API_ENDPOINT = "https://api-staging.example.com/login";

// Production hosts are listed explicitly rather than relying on the fallback,
// so that a normal production page load does not take the unrecognized-host
// path and warn on every visit.
const API_ENDPOINT_BY_HOSTNAME = {
  "localhost": LOCAL_API_ENDPOINT,
  "127.0.0.1": LOCAL_API_ENDPOINT,
  "staging.example.com": STAGING_API_ENDPOINT,
  "example.com": PRODUCTION_API_ENDPOINT,
  "www.example.com": PRODUCTION_API_ENDPOINT,
};

export function resolveApiEndpoint(hostname) {
  const endpoint = Object.prototype.hasOwnProperty.call(
    API_ENDPOINT_BY_HOSTNAME,
    hostname,
  )
    ? API_ENDPOINT_BY_HOSTNAME[hostname]
    : undefined;

  if (endpoint !== undefined) {
    return endpoint;
  }

  console.warn(
    `settings: unrecognized hostname "${hostname}", falling back to the production API endpoint. Add it to API_ENDPOINT_BY_HOSTNAME in src/settings.js.`,
  );
  return PRODUCTION_API_ENDPOINT;
}

// `location` is absent outside a browser (Node, test runners), so guard the
// read rather than warning about a hostname that does not exist there.
const currentHostname = globalThis.location?.hostname;

export const settings = Object.freeze({
  apiEndpoint:
    currentHostname === undefined
      ? PRODUCTION_API_ENDPOINT
      : resolveApiEndpoint(currentHostname),
});
```

`hasOwnProperty` is used rather than a bare lookup so that a hostname such as `constructor` or `toString` cannot resolve to an inherited `Object.prototype` member instead of falling back.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, `tests 10` / `fail 0`.

Note: the warning text from the two unrecognized-host tests still prints to the console during the run. That is expected — `t.mock.method` wraps the method while keeping the original behavior.

- [ ] **Step 5: Commit**

```bash
git add src/settings.js test/settings.test.js
git commit -m "feat: add settings module resolving the API endpoint by hostname"
```

---

### Task 3: Wire the settings module into the page

**Risk tier:** standard — changes how the browser loads the application and removes the old constant.

**Files:**
- Modify: `app.js:1-8` (drop the constant, add the import, update the stub comment)
- Modify: `index.html:13` (the script tag)

**Interfaces:**
- Consumes: the `settings` named export from `src/settings.js` (Task 2), read as `settings.apiEndpoint`.
- Produces: nothing later tasks depend on. This is the final task.

**Mirror:** `app.js:4-15` — keep the existing function declarations, spacing, and double-quoted strings exactly as they are. Only the top of the file and the one comment change.

- [ ] **Step 1: Replace the hardcoded constant with an import**

In `app.js`, replace lines 1-8:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

with:

```js
// Simple webapp with login form handling
import { settings } from "./src/settings.js";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to settings.apiEndpoint in real app
  return { success: true, user: username };
}
```

Leave `validateForm` and the submit listener below untouched.

- [ ] **Step 2: Load the page script as a module**

In `index.html`, change line 13 from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Syntax-check both JavaScript files**

Run: `node --check app.js && node --check src/settings.js && echo "syntax ok"`
Expected: prints `syntax ok`. A failure here means the import statement or the script-tag change is malformed.

- [ ] **Step 4: Re-run the unit tests to confirm nothing regressed**

Run: `npm test`
Expected: PASS, `tests 10` / `fail 0`.

- [ ] **Step 5: Verify the page in a browser over HTTP**

The page can no longer be opened from the filesystem — module scripts are blocked on `file://`. Serve it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and confirm all four:
1. The console shows no module-loading or CORS errors.
2. The console shows no `settings: unrecognized hostname` warning — `localhost` is in the map.
3. Submitting the form with both fields filled logs `Logging in: <username>` and `Login result: { success: true, user: '<username>' }`.
4. Submitting with either field empty logs `Validation error: Missing required fields`.

Stop the server with Ctrl-C when done.

- [ ] **Step 6: Confirm the old constant is fully gone**

Run: `grep -rn "API_ENDPOINT" app.js index.html`
Expected: no matches. (`src/settings.js` legitimately still contains the name; this grep deliberately excludes it.)

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "feat: read the login endpoint from the settings module"
```

---

## Verification Summary

After Task 3, the following must all hold:

- `npm test` passes with 10 tests.
- `node src/index.cjs` still prints `Hello, world!` — the Node island is unbroken.
- The page served over HTTP validates and submits with no console errors and no hostname warning.
- Changing environments requires editing only `API_ENDPOINT_BY_HOSTNAME` in `src/settings.js`.
