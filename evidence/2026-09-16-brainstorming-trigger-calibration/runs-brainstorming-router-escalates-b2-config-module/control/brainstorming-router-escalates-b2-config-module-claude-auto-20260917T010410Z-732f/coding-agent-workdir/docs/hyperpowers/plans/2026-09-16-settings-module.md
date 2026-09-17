# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-16-settings-module-design.md`

**Goal:** Move the hard-coded login API endpoint out of `app.js` into a new `settings.js` module that resolves the active environment from the hostname the page is served on.

**Architecture:** `settings.js` is a pure ES module exporting a `hostname → environment` map and a `resolveSettings(hostname)` function that returns the environment augmented with a derived `loginEndpoint`, throwing on an unmapped host. It never reads `window`, which keeps it unit-testable under Node; `app.js` supplies `window.location.hostname` at its single call site. Adopting ES modules at the repo root requires `"type": "module"` in `package.json`, so `src/package.json` pins the existing CommonJS tree back to `commonjs`.

**Tech Stack:** Plain browser JavaScript (ES modules, no build step), Node v26.8.2 with the built-in `node:test` runner. No dependencies.

## Global Constraints

- No new runtime or dev dependencies. `node:test` and `node:assert/strict` are built into Node.
- No build step, no bundler, no transpiler. The page is served as static files.
- Node floor: v26.8.2 (the verified local version). `node --test` discovers `test/**/*.test.js` with no config.
- `src/index.js` and `src/utils.js` keep their current source unchanged and must keep running under `node src/index.js`.
- Two-space indentation, double-quoted strings, template literals for interpolation, `camelCase` functions — matching the existing files.
- Commit messages: imperative mood, sentence case, no type prefix, matching existing history ("Add simple webapp fixture"). No `Co-Authored-By` line and no AI-attribution text anywhere.
- Placeholder hostnames must be marked with a source comment naming them as placeholders. Do not use the literal tokens `TODO` or `FIXME`.
- Do not commit anything under `docs/`. It is gitignored.

## Grounding

- **Naming and formatting:** `src/utils.js:1-5` — two-space indent, `camelCase` function name, template literal for interpolation, no docstring/JSDoc. Imitate this density; the repo has no comment-heavy style.
- **Module export shape (CommonJS, the tree being preserved):** `src/utils.js:5` — `module.exports = { greet };` at end of file. This file must keep working unchanged.
- **Consumer import shape (CommonJS):** `src/index.js:1` — `const { greet } = require('./utils');`. Note this file uses single quotes while `app.js` uses double; follow each file's own local style when editing it.
- **Error handling:** `none: no existing throw pattern.` The only error path in the repo is `app.js:10-15`, which *returns* a `{ valid: false, error: "..." }` result object rather than throwing. The spec deliberately chose a throw for the unknown-host case, so this task introduces the first `throw` in the codebase; do not restyle `validateForm` to match it.
- **Test shape:** `none: the repository contains no tests and no test runner.` Task 1 establishes both.
- **Browser script loading:** `index.html:13` — `<script src="app.js"></script>` as the last element in `<body>`.
- **Commit message style:** `git log --oneline` — "Add simple webapp fixture", "add entry point", "add utils module". Imperative, no conventional-commit prefix.

---

### Task 1: Settings module and test infrastructure

**Risk tier:** standard — introduces a new module, changes the repo's module system, and adds the first test runner; multi-file integration.

**Files:**
- Create: `settings.js`
- Create: `test/settings.test.js`
- Create: `src/package.json`
- Modify: `package.json:1-6`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `ENVIRONMENTS: Record<string, { name: string, apiBaseUrl: string }>` — named export from `settings.js`.
  - `resolveSettings(hostname: string) => { name: string, apiBaseUrl: string, loginEndpoint: string }` — named export from `settings.js`. Throws `Error` when `hostname` has no entry. Task 2 calls exactly this.
  - `npm test` → `node --test`.

**Mirror:** `src/utils.js:1-5` for formatting and naming density (two-space indent, template literal, no JSDoc).

- [ ] **Step 1: Add the module-system configuration**

The root `"type": "module"` is what lets `settings.js` use `export`. It would also reinterpret `src/*.js` as ES modules and break their `require` calls, so `src/package.json` scopes that directory back to CommonJS — Node picks a file's module system from the nearest parent `package.json`.

Replace `package.json` entirely with:

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

Create `src/package.json`:

```json
{
  "type": "commonjs"
}
```

- [ ] **Step 2: Verify the CommonJS tree still runs**

Run: `node src/index.js`
Expected: prints `Hello, world!`

If this fails with `require is not defined in ES module scope`, `src/package.json` is missing or malformed — fix it before continuing. This check is the whole reason that file exists.

- [ ] **Step 3: Write the failing test**

Create `test/settings.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { resolveSettings } from "../settings.js";

test("maps each known hostname to its environment and endpoint", () => {
  assert.deepEqual(resolveSettings("localhost"), {
    name: "local",
    apiBaseUrl: "http://localhost:3000",
    loginEndpoint: "http://localhost:3000/login",
  });

  assert.deepEqual(resolveSettings("127.0.0.1"), {
    name: "local",
    apiBaseUrl: "http://localhost:3000",
    loginEndpoint: "http://localhost:3000/login",
  });

  assert.deepEqual(resolveSettings("staging.example.com"), {
    name: "staging",
    apiBaseUrl: "https://api-staging.example.com",
    loginEndpoint: "https://api-staging.example.com/login",
  });
});

test("production resolves to the endpoint the app used before this refactor", () => {
  assert.equal(
    resolveSettings("www.example.com").loginEndpoint,
    "https://api.example.com/login",
  );
});

test("throws on an unmapped hostname, naming the host and the file to edit", () => {
  assert.throws(
    () => resolveSettings("preview-123.example.net"),
    (error) => {
      assert.match(error.message, /preview-123\.example\.net/);
      assert.match(error.message, /settings\.js/);
      return true;
    },
  );
});
```

The second test is a regression guard: it pins the production endpoint to the exact string `app.js` uses today, so the refactor cannot silently change where real traffic goes.

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `../settings.js`, because the module does not exist yet.

- [ ] **Step 5: Write the settings module**

Create `settings.js`:

```js
// Environment-specific settings, keyed by the hostname the app is served from.
// Adding an environment is one entry here.
//
// This module never reads `window` — the caller passes the hostname in — so it
// can be exercised under Node without a browser.
export const ENVIRONMENTS = {
  "localhost": { name: "local", apiBaseUrl: "http://localhost:3000" },
  "127.0.0.1": { name: "local", apiBaseUrl: "http://localhost:3000" },
  // Placeholder hostname: replace with the real staging host before deploying.
  "staging.example.com": {
    name: "staging",
    apiBaseUrl: "https://api-staging.example.com",
  },
  // Placeholder hostname: replace with the real production host before
  // deploying. The apiBaseUrl is real, carried over from app.js.
  "www.example.com": { name: "production", apiBaseUrl: "https://api.example.com" },
};

// Unmapped hosts throw rather than falling back: a silent default would let a
// mistyped development host post credentials to the production API.
export function resolveSettings(hostname) {
  const environment = ENVIRONMENTS[hostname];
  if (!environment) {
    throw new Error(
      `No environment configured for hostname "${hostname}". ` +
        "Add it to ENVIRONMENTS in settings.js.",
    );
  }

  return {
    ...environment,
    loginEndpoint: `${environment.apiBaseUrl}/login`,
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `tests 3`, `pass 3`, `fail 0`.

- [ ] **Step 7: Re-verify the CommonJS tree**

Run: `node src/index.js`
Expected: prints `Hello, world!`

- [ ] **Step 8: Commit**

```bash
git add settings.js test/settings.test.js src/package.json package.json
git commit -m "Add settings module resolving API endpoints per environment"
```

---

### Task 2: Wire the app to the settings module

**Risk tier:** standard — modifies the application entry point and how the page loads scripts; changes are browser-only and cannot be covered by the Node test suite.

**Files:**
- Modify: `app.js:1-8`
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `resolveSettings(hostname)` from `./settings.js` (Task 1) — returns `{ name, apiBaseUrl, loginEndpoint }`, throws on an unmapped hostname.
- Produces: nothing consumed by later tasks. This is the final task.

**Mirror:** `app.js:1-8` for local style — double-quoted strings, two-space indent, `// Stub:` comment convention inside `login`.

- [ ] **Step 1: Replace the hard-coded constant with a settings lookup**

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
import { resolveSettings } from "./settings.js";

const settings = resolveSettings(window.location.hostname);

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to settings.loginEndpoint in real app
  return { success: true, user: username };
}
```

Leave `validateForm` and the submit handler (`app.js:10-28`) untouched.

- [ ] **Step 2: Load app.js as a module**

In `index.html`, change line 13 from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Confirm no stale references remain**

Run: `grep -n "API_ENDPOINT" app.js index.html`
Expected: no output (exit status 1). The old constant name should appear nowhere.

- [ ] **Step 4: Verify in a browser**

Module scripts are blocked over `file://`, so the page must be served over HTTP.

Run: `python3 -m http.server 8000`

Then open `http://localhost:8000` and check the console:

1. No errors on load. The `localhost` entry resolves, so the throw path is not hit.
2. Submit the form with both fields filled → console logs `Logging in: <name>` then `Login result: { success: true, user: "<name>" }`.
3. Submit with a field empty → console logs `Validation error: Missing required fields`.

Stop the server when done.

- [ ] **Step 5: Verify the unknown-host failure is loud**

Visit `http://127.0.0.1:8000` — this hostname *is* mapped, so it should behave exactly as step 4 did. To exercise the throw, temporarily comment out the `"127.0.0.1"` entry in `settings.js`, reload `http://127.0.0.1:8000`, and confirm the console shows:

```
Uncaught Error: No environment configured for hostname "127.0.0.1". Add it to ENVIRONMENTS in settings.js.
```

Restore the entry afterward and reload to confirm the page works again. Run `git diff settings.js` and confirm it reports no changes before committing.

- [ ] **Step 6: Run the test suite once more**

Run: `npm test`
Expected: PASS — `tests 3`, `pass 3`, `fail 0`. Task 2 touches no tested code, so a failure here means step 5's temporary edit was not fully reverted.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "Read the login endpoint from the settings module"
```

---

## Notes for the implementer

- **`file://` no longer works.** After Task 2, opening `index.html` by double-clicking will fail with a CORS error on the module script. This is expected and was accepted in the spec; `python3 -m http.server` is the development workflow from here.
- **`login` and `validateForm` stop being globals.** Module scripts have their own scope. Nothing in the repo calls them from outside `app.js`, so nothing needs updating — but do not "fix" this by attaching them to `window`.
- **The placeholder hostnames are intentional.** `staging.example.com` and `www.example.com` are marked placeholders awaiting the real deploy hosts. Do not invent plausible-looking replacements.
