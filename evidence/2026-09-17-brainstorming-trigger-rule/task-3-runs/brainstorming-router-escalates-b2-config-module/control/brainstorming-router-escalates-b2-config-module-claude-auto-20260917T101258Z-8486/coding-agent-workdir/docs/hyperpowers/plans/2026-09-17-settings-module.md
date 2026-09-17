# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-17-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a new `settings.js` ES module that selects local, staging, or production at runtime from the hostname.

**Architecture:** A single new root-level `settings.js` owns an `ENVIRONMENTS` map, a pure `resolveEnvironment(hostname, search)` function returning `{ environment, warning }`, and a frozen `settings` object resolved once at module load. `app.js` imports only `settings` and composes request URLs from `settings.apiBaseUrl`. Because ES modules and Node's test runner are used together, the repository first migrates to `"type": "module"`.

**Tech Stack:** Plain ES modules, no build step. Node's built-in `node:test` and `node:assert/strict` as the test runner. Node v26.8.2 verified on this machine. Zero dependencies.

## Global Constraints

- **Zero dependencies.** `package.json` must list no `dependencies` and no `devDependencies` when this work is complete. Do not run `npm install <anything>`.
- **No linter or formatter** is introduced by this work.
- **Unit test infrastructure lands with this change**, not as a follow-up.
- **Style in `app.js` and `settings.js`:** double-quoted strings, two-space indentation, semicolons.
- **Style in `src/`:** single-quoted strings (preserve the existing local style; do not reformat).
- **Invariant:** every `apiBaseUrl` value carries no trailing slash.
- **No code path in `settings.js` throws.** Every failure mode resolves to a value plus a warning.
- **`resolveEnvironment` performs no logging.** It returns warnings; callers log them.

## Grounding

- Naming and style: `app.js:10-15` — `function validateForm(formData)`, camelCase declarations, double-quoted strings, two-space indent, object-literal returns.
- Error handling: `app.js:11-14` — guard returns a result object (`{ valid: false, error: "..." }`) instead of throwing; `app.js:26` — `console.error("Validation error:", validation.error)` shows the label-then-value console convention that `console.warn` calls should imitate.
- Current module style being replaced: `src/utils.js:5` — `module.exports = { greet };`, and `src/index.js:1` — `const { greet } = require('./utils');`.
- Browser script loading: `index.html:13` — `<script src="app.js"></script>`, a classic (non-module) script tag.
- Test shape: **none** — no test file, test directory, or test runner configuration exists anywhere in this repository. Task 2 establishes the pattern.
- Existing ES module usage: **none** — no file in this repository currently uses `import` or `export`.

---

### Task 1: Migrate the repository to ES modules

**Risk tier:** standard — changes package-wide module resolution and touches three files; a mistake here breaks both the Node entry point and every later task.

**Files:**
- Modify: `package.json:1-6`
- Modify: `src/utils.js:1-5`
- Modify: `src/index.js:1-7`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a repository where `.js` files are ES modules, so `settings.js` may use `export` and a `node:test` file may `import` it. Also produces the `npm test` script (`node --test`) that Tasks 2 and 3 run. `src/utils.js` now exports `greet(name: string): string` as a named ESM export.

**Mirror:** `src/utils.js:1-5` — keep the existing single-quoted strings and two-space indentation in `src/`; this task changes only the export and import syntax, not formatting.

Background for the implementer: Node decides whether a `.js` file is CommonJS or ESM from the nearest `package.json`. With no `"type"` field it assumes CommonJS, so `export` in `settings.js` would be a syntax error under `node --test`. Browsers ignore `package.json` entirely and go by `<script type="module">`, so this change is invisible to the page. Note that ESM import specifiers for local files **require the file extension** — `'./utils.js'`, not `'./utils'`.

- [ ] **Step 1: Record the baseline behavior**

Run: `node src/index.js`
Expected: prints `Hello, world!`

This is the regression check for the whole task. If it does not print that, stop and report — the starting state is not what the plan assumes.

- [ ] **Step 2: Switch the package to ESM and add the test script**

Replace the entire contents of `package.json` with:

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

- [ ] **Step 3: Run the entry point to verify it now fails**

Run: `node src/index.js`
Expected: FAIL with `ReferenceError: require is not defined in ES module scope`

This failure is the point: it proves `"type": "module"` took effect. If it still prints `Hello, world!`, the edit did not land.

- [ ] **Step 4: Convert `src/utils.js` to an ESM export**

Replace the entire contents of `src/utils.js` with:

```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```

- [ ] **Step 5: Convert `src/index.js` to an ESM import**

Replace the entire contents of `src/index.js` with:

```js
import { greet } from './utils.js';

function main() {
  console.log(greet('world'));
}

main();
```

- [ ] **Step 6: Run the entry point to verify the regression check passes**

Run: `node src/index.js`
Expected: prints `Hello, world!` — identical to Step 1.

- [ ] **Step 7: Verify the test runner is wired up**

Run: `npm test`
Expected: exits 0, reporting `tests 0`. No test files exist yet; `node --test` treats that as success. (Verified on Node v26.8.2.)

- [ ] **Step 8: Commit**

```bash
git add package.json src/utils.js src/index.js
git commit -m "refactor: migrate package to ES modules and add test script"
```

---

### Task 2: Build the settings module

**Risk tier:** standard — new module carrying all of the feature's logic, plus the repository's first test file.

**Files:**
- Create: `settings.js`
- Create: `test/settings.test.mjs`

**Interfaces:**
- Consumes: the ESM package configuration and the `npm test` script from Task 1.
- Produces, all named exports of `settings.js`:
  - `ENVIRONMENTS` — object keyed by `"local" | "staging" | "production"`, each value `{ apiBaseUrl: string }`.
  - `STAGING_HOSTNAME` — string, the served-from staging host.
  - `resolveEnvironment(hostname: string, search: string): { environment: string, warning: string | null }` — pure.
  - `settings` — frozen `{ apiBaseUrl: string }` for the current page. **This is the only export Task 3 uses.**

**Mirror:** `app.js:10-15` — imitate the function-declaration style, double-quoted strings, two-space indent, and object-literal returns. There is no test to mirror; this task creates the first one.

Two things the implementer must not "fix":

1. `resolveEnvironment` must not call `console.warn`. It returns `warning` and the module's browser branch logs it. This is what makes the warning testable.
2. The `typeof window === "undefined"` branch is deliberate. Without it, importing `settings.js` under Node throws `ReferenceError: window is not defined` and every test in this file fails at import.

- [ ] **Step 1: Write the failing test**

Create `test/settings.test.mjs` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ENVIRONMENTS,
  STAGING_HOSTNAME,
  resolveEnvironment,
} from "../settings.js";

test("localhost resolves to local", () => {
  assert.deepEqual(resolveEnvironment("localhost", ""), {
    environment: "local",
    warning: null,
  });
});

test("127.0.0.1 resolves to local", () => {
  assert.deepEqual(resolveEnvironment("127.0.0.1", ""), {
    environment: "local",
    warning: null,
  });
});

test("the staging hostname resolves to staging", () => {
  assert.deepEqual(resolveEnvironment(STAGING_HOSTNAME, ""), {
    environment: "staging",
    warning: null,
  });
});

test("an unrecognized hostname resolves to production with a warning", () => {
  const result = resolveEnvironment("www.unknown-host.test", "");
  assert.equal(result.environment, "production");
  assert.match(result.warning, /www\.unknown-host\.test/);
});

test("?env=staging overrides the hostname", () => {
  assert.deepEqual(resolveEnvironment("localhost", "?env=staging"), {
    environment: "staging",
    warning: null,
  });
});

test("?env=bogus is ignored and the hostname decides", () => {
  const result = resolveEnvironment("localhost", "?env=bogus");
  assert.equal(result.environment, "local");
  assert.match(result.warning, /bogus/);
});

test("?envelope=staging is not read as an env override", () => {
  assert.deepEqual(resolveEnvironment("localhost", "?envelope=staging"), {
    environment: "local",
    warning: null,
  });
});

test("hostname matching is case-insensitive", () => {
  assert.deepEqual(resolveEnvironment("LOCALHOST", ""), {
    environment: "local",
    warning: null,
  });
});

test("every environment has an apiBaseUrl with no trailing slash", () => {
  const names = Object.keys(ENVIRONMENTS);
  assert.ok(names.length > 0, "ENVIRONMENTS must not be empty");

  for (const name of names) {
    const { apiBaseUrl } = ENVIRONMENTS[name];
    assert.equal(typeof apiBaseUrl, "string", `${name}: apiBaseUrl must be a string`);
    assert.ok(apiBaseUrl.length > 0, `${name}: apiBaseUrl must be non-empty`);
    assert.ok(!apiBaseUrl.endsWith("/"), `${name}: apiBaseUrl must not end with "/"`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `../settings.js`, because the module does not exist yet.

- [ ] **Step 3: Write the settings module**

Create `settings.js` with exactly this content:

```js
// Environment configuration for the webapp.
//
// apiBaseUrl values carry NO trailing slash; call sites compose paths as
// `${settings.apiBaseUrl}/login`. The unit tests enforce this invariant.
//
// These are placeholders. Replace them with the real hosts before deploying.
export const ENVIRONMENTS = {
  local: { apiBaseUrl: "http://localhost:3000" },
  staging: { apiBaseUrl: "https://staging-api.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

// The host the app is SERVED FROM in staging, which is not the host it calls.
// Detection input only; this never appears in a request URL.
export const STAGING_HOSTNAME = "staging.example.com";

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

// Pure: reads no globals, performs no I/O, and does not log. Problems come
// back as `warning` so that callers can log them and tests can assert them.
export function resolveEnvironment(hostname, search) {
  const requested = new URLSearchParams(search).get("env");
  if (requested) {
    if (Object.prototype.hasOwnProperty.call(ENVIRONMENTS, requested)) {
      return { environment: requested, warning: null };
    }
    // A bad override is more actionable than an unmatched hostname, so its
    // warning wins even when both apply.
    return {
      environment: detectFromHostname(hostname).environment,
      warning: `Ignoring unknown env override "${requested}".`,
    };
  }

  return detectFromHostname(hostname);
}

function detectFromHostname(hostname) {
  const normalized = String(hostname).toLowerCase();

  if (LOCAL_HOSTNAMES.includes(normalized)) {
    return { environment: "local", warning: null };
  }

  if (normalized === STAGING_HOSTNAME.toLowerCase()) {
    return { environment: "staging", warning: null };
  }

  // Falling back to production silently is how a mistyped staging host ends
  // up talking to the real API, so say so.
  return {
    environment: "production",
    warning: `Unrecognized hostname "${normalized}"; falling back to production.`,
  };
}

function resolveCurrentSettings() {
  // Outside a browser (the unit tests) there is no location to inspect.
  // Skip detection entirely rather than resolving against empty strings,
  // which would emit a spurious warning on every test run.
  if (typeof window === "undefined") {
    return ENVIRONMENTS.production;
  }

  const { environment, warning } = resolveEnvironment(
    window.location.hostname,
    window.location.search,
  );

  if (warning) {
    console.warn("Settings:", warning);
  }

  return ENVIRONMENTS[environment];
}

export const settings = Object.freeze(resolveCurrentSettings());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `tests 9`, `pass 9`, `fail 0`, and no `console.warn` output in the run.

- [ ] **Step 5: Confirm no dependencies were added**

Run: `git diff package.json`
Expected: no output. If `package.json` changed in this task, revert that change — Task 2 must not touch it.

- [ ] **Step 6: Commit**

```bash
git add settings.js test/settings.test.mjs
git commit -m "feat: add settings module with runtime environment detection"
```

---

### Task 3: Wire the webapp to the settings module

**Risk tier:** standard — changes how the page loads its script, which has no automated coverage and must be verified by hand in a browser.

**Files:**
- Modify: `app.js:1-8`
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `settings` from `settings.js` (Task 2) — a frozen `{ apiBaseUrl: string }`. Import only `settings`; do not import `ENVIRONMENTS` or `resolveEnvironment` into `app.js`.
- Produces: nothing later tasks depend on. This is the last task.

**Mirror:** `app.js:5` — `console.log("Logging in:", username)` shows the label-then-value console convention to imitate for the new log line.

Note on scope: `login()` stays a stub. This task makes it *read* the configured base URL and log the composed URL; it does not add a `fetch`. Adding a real request is explicitly out of scope per the spec's Non-Goals.

- [ ] **Step 1: Replace the hardcoded constant with an import**

In `app.js`, replace lines 1-8 — the header comment, the `API_ENDPOINT` constant, and the `login` function — with:

```js
// Simple webapp with login form handling
import { settings } from "./settings.js";

function login(username, password) {
  const url = `${settings.apiBaseUrl}/login`;
  console.log("Logging in:", username, "via", url);
  // Stub: would POST to url in real app
  return { success: true, user: username };
}
```

Leave `validateForm` and the submit listener (currently `app.js:10-28`) exactly as they are.

- [ ] **Step 2: Load the app as a module**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Confirm the unit tests still pass**

Run: `npm test`
Expected: PASS — `tests 9`, `pass 9`, `fail 0`. Nothing in this task should affect them; a failure here means Task 2's module was edited by mistake.

- [ ] **Step 4: Verify the browser wiring by hand**

This step has no automated coverage and must actually be performed — `file://` will not work, because ES modules require HTTP.

Run in one terminal:

```bash
python3 -m http.server 8000
```

Then, in a browser:

1. Open `http://localhost:8000/` and open the developer console.
2. Expected: no errors, and in particular no `Failed to load module script` or CORS error.
3. Submit the form with a username and password filled in.
4. Expected console line: `Logging in: <username> via http://localhost:3000/login` — the `local` base URL, proving hostname detection ran.
5. Open `http://localhost:8000/?env=staging`, submit again.
6. Expected: `... via https://staging-api.example.com/login` — proving the override works.
7. Open `http://localhost:8000/?env=bogus`, reload.
8. Expected: a `console.warn` reading `Settings: Ignoring unknown env override "bogus".`, and submitting still uses the `local` URL.

Stop the server with Ctrl-C when done.

If any expectation fails, stop and report it rather than adjusting the expected values.

- [ ] **Step 5: Confirm the endpoint constant is gone**

Run: `grep -rn "API_ENDPOINT" . --exclude-dir=.git --exclude-dir=docs`
Expected: no output. The old constant must not survive anywhere in the shipped code.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "feat: read the API base URL from the settings module"
```

---

## Verification Summary

After Task 3, the complete state is:

- `npm test` passes with 9 tests.
- `node src/index.js` prints `Hello, world!`.
- `git grep API_ENDPOINT` finds nothing outside `docs/`.
- `package.json` still declares no dependencies.
- The page, served over HTTP, resolves `local` by hostname and honors `?env=`.

## Known Follow-Up (not in this plan)

The placeholder values in `settings.js` — the three `apiBaseUrl` entries and `STAGING_HOSTNAME` — must be replaced with real hosts before any deploy. Until then a real staging site resolves to `production`; the unmatched-hostname `console.warn` is what makes that visible. This is the spec's Open Item and is the human partner's to supply.
