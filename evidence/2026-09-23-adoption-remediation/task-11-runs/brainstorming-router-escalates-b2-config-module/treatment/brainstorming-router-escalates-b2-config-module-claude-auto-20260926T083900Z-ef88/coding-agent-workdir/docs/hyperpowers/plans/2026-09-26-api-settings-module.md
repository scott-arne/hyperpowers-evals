# API Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-26-api-settings-module-design.md`

**Goal:** Move the hard-coded login API endpoint out of `app.js` into a `settings.js` module that resolves the API base URL from the page's hostname, so switching environments needs no source edit.

**Architecture:** `settings.js` is a pure ES module holding two lookup tables — hostname to environment name, environment name to settings — and exporting three pure functions over them. It reads no browser globals, which keeps it importable under `node --test`. `app.js` performs the single `window.location.hostname` read and passes the value in. `index.html` switches to `<script type="module">`.

**Tech Stack:** Vanilla JavaScript (ES modules), Node's built-in `node:test` runner and `node:assert/strict`. No dependencies, no bundler, no build step.

## Global Constraints

Copied verbatim from the spec's decisions and Out of Scope sections. Every task's requirements implicitly include these.

- Zero runtime dependencies and zero dev dependencies. Only Node built-ins (`node:test`, `node:assert/strict`). No `npm install` step exists in this project.
- No bundler and no build step. Files are served as-is.
- ES modules on the browser side: `export` / `import`, `<script type="module">`.
- Unrecognized hostnames resolve to `production`.
- `src/index.js` and `src/utils.js` must not be edited. They stay CommonJS and must keep working.
- No linter, formatter, or end-to-end test tooling is added.
- `login()` stays a stub that performs no network request. Its signature and return shape do not change. `validateForm()` does not change.
- The settings tables store `apiBaseUrl`, not fully-formed endpoint URLs. Endpoints are derived.
- Style to match (see Grounding): 2-space indent, double quotes, semicolons, `function` declarations, camelCase locals, `SCREAMING_SNAKE_CASE` module constants.

**Environment values** — the production URL is taken from the existing code; the other three were presented to your human partner twice, flagged as guesses, and accepted both times. They are one-line table corrections if wrong:

- `local` API base URL: `http://localhost:3000`
- `staging` API base URL: `https://staging-api.example.com`
- `staging` frontend hostname: `staging.example.com`
- `production` API base URL: `https://api.example.com`

Assumption: the staging frontend hostname is `staging.example.com`, validate via confirmation from your human partner, before Task 2. A wrong value here fails silently — staging resolves to production with no error — so it is the one worth re-asking about.

## Grounding

- Naming and formatting: `app.js:1-15` — 2-space indent, double quotes, semicolons, `function` declarations, camelCase parameters, `SCREAMING_SNAKE_CASE` for the module-level constant (`API_ENDPOINT`, line 2).
- Error handling: `app.js:10-15` — returns a plain result object (`{ valid: false, error: "..." }`) rather than throwing; `app.js:26` uses `console.error` for the caller-side report. No exceptions are thrown anywhere in this codebase.
- CommonJS export shape (Node side only, must keep working untouched): `src/utils.js:1-5` — `function` declaration plus `module.exports = { greet };`.
- Browser-side module exports: none — `app.js` currently has no exports of any kind; there is no existing ES-module example in this repo to imitate.
- Test shape: none — no test files, no test runner, no test script, and no `node_modules` exist in this repo. Task 2 establishes the pattern.
- Script loading: `index.html:13` — `<script src="app.js"></script>`, last element before `</body>`.

---

### Task 1: Enable ES modules without breaking the CommonJS Node entry point

**Risk tier:** standard — flips module resolution for every `.js` file under the package root, which breaks `src/index.js` and `src/utils.js` unless the nested manifest lands in the same change.

**Files:**
- Modify: `package.json:1-6`
- Create: `src/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: an `npm test` script that runs `node --test`, and a package root where `.js` files are parsed as ES modules while everything under `src/` is still parsed as CommonJS. Tasks 2 and 3 depend on both halves.

**Mirror:** `package.json:1-6`, imitate the two-space indentation and the trailing-newline-only formatting of the existing manifest.

Background for the implementer: Node decides whether a `.js` file is an ES module or CommonJS by walking up from the file to the nearest `package.json` and reading its `"type"` field. Adding `"type": "module"` to the root manifest therefore reaches `src/index.js` and `src/utils.js` too, and they use `require`/`module.exports`, which is illegal in an ES module. A `package.json` inside `src/` is closer to those files, so it wins for that subtree. This is the standard way to mix the two formats in one package, and it needs no edits to the `src/*.js` files themselves.

- [ ] **Step 1: Confirm the existing Node entry point works before any change**

Run: `node src/index.js`
Expected: prints `Hello, world!` and exits 0. This is the baseline the task must preserve. If it does not pass here, stop and report — the breakage predates this plan.

- [ ] **Step 2: Add the nested CommonJS manifest**

Create `src/package.json` with exactly this content:

```json
{
  "type": "commonjs"
}
```

- [ ] **Step 3: Add `"type": "module"` and the test script to the root manifest**

Rewrite `package.json` to exactly this content:

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

- [ ] **Step 4: Verify the CommonJS entry point still works**

Run: `node src/index.js`
Expected: prints `Hello, world!` and exits 0 — identical to Step 1. If it instead fails with `ReferenceError: require is not defined in ES module scope`, then `src/package.json` was not created or has a typo; fix that rather than editing `src/index.js`.

- [ ] **Step 5: Verify the test runner is wired up**

Run: `npm test`
Expected: exits 0. With no test files present yet, `node --test` reports zero tests (`# pass 0`, `# fail 0`). A non-zero exit here means the script is wrong, not that tests failed.

- [ ] **Step 6: Commit**

```bash
git add package.json src/package.json
git commit -m "chore: enable ES modules and the node:test runner"
```

---

### Task 2: Add the settings module with its unit tests

**Risk tier:** standard — new module carrying the environment-resolution logic that every later consumer depends on; the production-fallback branch is the behavior most likely to be got wrong.

**Files:**
- Create: `settings.js`
- Test: `settings.test.js`

**Interfaces:**
- Consumes: from Task 1, the root `"type": "module"` field (so `settings.js` parses as an ES module) and the `npm test` script.
- Produces, all pure and all taking the hostname as their only argument:
  - `environmentForHostname(hostname: string) => "local" | "staging" | "production"`
  - `settingsForHostname(hostname: string) => { apiBaseUrl: string }`
  - `loginEndpoint(hostname: string) => string`

  Task 3 imports `loginEndpoint` only. All three are exported because the tests exercise each layer.

**Mirror:** `app.js:1-15`, imitate the formatting and naming (2-space indent, double quotes, semicolons, `function` declarations, `SCREAMING_SNAKE_CASE` module constants) and the non-throwing style — no function in this module throws.

Background for the implementer: the module deliberately does **not** read `window.location.hostname`. A module that evaluates a browser global at import time throws `ReferenceError: window is not defined` the moment `node --test` imports it, and guarding with `typeof window` would make the module untestable in the branch that matters. Keeping it pure pushes the single `window` read up into `app.js` (Task 3).

The lookup uses `Object.hasOwn` rather than a bare property read. A plain object inherits `toString`, `constructor`, `valueOf` and friends from `Object.prototype`, so `HOSTNAME_ENVIRONMENTS["toString"]` returns an inherited function instead of `undefined`. A `??` fallback would not catch that, and the result would be `ENVIRONMENTS[<function>]` — `undefined` — which then crashes on `.apiBaseUrl`. `Object.hasOwn` only sees own properties, so inherited names fall through to production like any other unrecognized hostname.

- [ ] **Step 1: Write the failing tests**

Create `settings.test.js` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  environmentForHostname,
  settingsForHostname,
  loginEndpoint,
} from "./settings.js";

test("localhost resolves to the local environment", () => {
  assert.equal(environmentForHostname("localhost"), "local");
});

test("the loopback address resolves to the local environment", () => {
  assert.equal(environmentForHostname("127.0.0.1"), "local");
});

test("the staging host resolves to the staging environment", () => {
  assert.equal(environmentForHostname("staging.example.com"), "staging");
});

test("an unrecognized host resolves to production", () => {
  assert.equal(environmentForHostname("app.example.com"), "production");
});

test("an empty hostname resolves to production", () => {
  assert.equal(environmentForHostname(""), "production");
});

test("an inherited Object property name resolves to production", () => {
  assert.equal(environmentForHostname("toString"), "production");
  assert.equal(environmentForHostname("constructor"), "production");
});

test("settings carry the base URL for the resolved environment", () => {
  assert.deepEqual(settingsForHostname("localhost"), {
    apiBaseUrl: "http://localhost:3000",
  });
  assert.deepEqual(settingsForHostname("staging.example.com"), {
    apiBaseUrl: "https://staging-api.example.com",
  });
  assert.deepEqual(settingsForHostname("app.example.com"), {
    apiBaseUrl: "https://api.example.com",
  });
});

test("the login endpoint is derived from the resolved base URL", () => {
  assert.equal(loginEndpoint("localhost"), "http://localhost:3000/login");
  assert.equal(
    loginEndpoint("staging.example.com"),
    "https://staging-api.example.com/login",
  );
  assert.equal(loginEndpoint("app.example.com"), "https://api.example.com/login");
});

test("the login endpoint has exactly one slash before the path", () => {
  for (const hostname of ["localhost", "staging.example.com", "app.example.com"]) {
    assert.ok(
      !loginEndpoint(hostname).includes("//login"),
      `duplicated slash for ${hostname}`,
    );
    assert.ok(
      loginEndpoint(hostname).endsWith("/login"),
      `missing path for ${hostname}`,
    );
  }
});

test("an unrecognized host keeps today's production endpoint unchanged", () => {
  assert.equal(loginEndpoint("app.example.com"), "https://api.example.com/login");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. `node --test` reports the suite erroring with `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `./settings.js`, because the module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `settings.js` with exactly this content:

```js
// API settings keyed by environment. Every export is pure and takes the
// hostname as an argument: reading window here would make the module
// unimportable under node --test.
const ENVIRONMENTS = {
  local: { apiBaseUrl: "http://localhost:3000" },
  staging: { apiBaseUrl: "https://staging-api.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  localhost: "local",
  "127.0.0.1": "local",
  "staging.example.com": "staging",
};

const DEFAULT_ENVIRONMENT = "production";

// Object.hasOwn, not a bare read: inherited names like "toString" would
// otherwise return a function instead of falling through to the default.
export function environmentForHostname(hostname) {
  return Object.hasOwn(HOSTNAME_ENVIRONMENTS, hostname)
    ? HOSTNAME_ENVIRONMENTS[hostname]
    : DEFAULT_ENVIRONMENT;
}

export function settingsForHostname(hostname) {
  return ENVIRONMENTS[environmentForHostname(hostname)];
}

export function loginEndpoint(hostname) {
  return `${settingsForHostname(hostname).apiBaseUrl}/login`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `# pass 10`, `# fail 0`, exit 0.

- [ ] **Step 5: Verify the Node entry point is still unaffected**

Run: `node src/index.js`
Expected: prints `Hello, world!` and exits 0.

- [ ] **Step 6: Commit**

```bash
git add settings.js settings.test.js
git commit -m "feat: add hostname-resolved API settings module"
```

---

### Task 3: Consume the settings module from the page

**Risk tier:** standard — multi-file integration that changes how the page loads its script; `type="module"` alters both fetch semantics and execution timing.

**Files:**
- Modify: `app.js:1-7` (remove the constant, add the import and the resolved endpoint, update the stub comment)
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `loginEndpoint(hostname: string) => string` from `settings.js` (Task 2).
- Produces: nothing further; this is the final task.

**Mirror:** `app.js:1-15`, imitate the surrounding formatting exactly — the edit should be invisible in style terms.

Background for the implementer: `<script type="module">` changes two things. It is always deferred, so it executes after the document is parsed — the existing top-level `document.getElementById("login-form")` on line 17 keeps working, and in fact becomes safe regardless of where the tag sits. It is also fetched under CORS rules, so `file://` no longer works; the page must be served over http from now on. That tradeoff was accepted in the spec.

Do not change `login()`'s body beyond its comment, do not change `validateForm()`, and do not change the submit listener.

- [ ] **Step 1: Replace the constant with the resolved endpoint in `app.js`**

Replace lines 1-7 of `app.js`:

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
import { loginEndpoint } from "./settings.js";

const LOGIN_ENDPOINT = loginEndpoint(window.location.hostname);

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to LOGIN_ENDPOINT in real app
  return { success: true, user: username };
}
```

Everything from `function validateForm(formData) {` onward stays byte-identical.

- [ ] **Step 2: Switch the script tag to a module in `index.html`**

Replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Verify no stale reference to the old constant remains**

Run: `grep -rn "API_ENDPOINT" app.js index.html settings.js`
Expected: no output, exit 1. Any hit means Step 1 was applied partially.

- [ ] **Step 4: Verify the unit tests and the Node entry point still pass**

Run: `npm test && node src/index.js`
Expected: `# pass 10`, `# fail 0`, then `Hello, world!`, exit 0.

- [ ] **Step 5: Verify the page resolves the right endpoint in a browser**

`app.js` reads `window`, so this is the part no unit test covers and it must be checked by hand.

Run: `npx serve . -l 3456` (any static server works; `python3 -m http.server 3456` is an equivalent fallback).

Then open `http://localhost:3456/` and in the browser console run:

```js
(await import("/settings.js")).loginEndpoint(window.location.hostname)
```

Expected: `"http://localhost:3000/login"` — the local base URL, because the page is served from `localhost`.

Also confirm the page itself is not broken: the console shows no errors on load, and submitting the form with both fields filled logs `Logging in: <name>` followed by `Login result: {success: true, user: "<name>"}`. Submitting with an empty field logs `Validation error: Missing required fields`.

Stop the server when done.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "refactor: read the login endpoint from the settings module"
```

---

## Verification

After Task 3, the full state should be:

- `npm test` — 10 passing tests, exit 0.
- `node src/index.js` — prints `Hello, world!`, exit 0 (unchanged from before this plan).
- Served from `localhost`, the page resolves `http://localhost:3000/login`.
- Served from any host not in the table, the page resolves `https://api.example.com/login` — identical to the pre-change behavior.
- `git status --short` — clean apart from the uncommitted `docs/hyperpowers/` spec and plan.
