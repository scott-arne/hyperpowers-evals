# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-17-settings-module-design.md`

**Goal:** Move the hardcoded login API endpoint out of `app.js` into a new browser-side settings module that resolves the API base URL from the page's hostname.

**Architecture:** A new root-level `config.js` holds an environment table, a hostname detector, and publishes the single resolved object `window.AppConfig`. `index.html` loads it immediately before `app.js`, so plain document-order script execution guarantees availability. `app.js` drops its `API_ENDPOINT` constant and composes the login URL from `window.AppConfig.apiBaseUrl` at call time.

**Tech Stack:** Plain browser JavaScript. No bundler, no module system, no dependencies.

## Global Constraints

Every task's requirements implicitly include this section.

- **No new dependencies.** `package.json` gains no `dependencies`, `devDependencies`, or `scripts`.
- **No test infrastructure.** The spec decides verification is manual in a browser. Do NOT add a test runner, jsdom, a `node:vm` harness, or any test file. This overrides the default TDD step pattern; the verification steps below are manual by design.
- **No linting or formatting tooling**, and do not reformat any existing file. Touch only the lines each task names.
- **Browser-only module format.** `config.js` must not use `require`, `module.exports`, `import`, or `export`. It is a plain script that assigns to `window`.
- **The production base URL must remain exactly `https://api.example.com`** — the value currently hardcoded at `app.js:2`.
- **Do not commit the spec or plan documents.** `.gitignore` already lists `docs/hyperpowers` and `docs/superpowers`.
- **Commit messages carry no AI attribution and no `Co-Authored-By` line.**
- **Do not push.** Commit locally only.
- Current branch is `feature/webapp-enhancement`. Stay on it.

## Grounding

- **Constant naming:** `app.js:2` — module-level constants are `UPPER_SNAKE_CASE` (`API_ENDPOINT`).
- **Function naming and declaration style:** `app.js:4`, `app.js:10` — `camelCase`, plain `function name() {}` declarations, not arrow consts.
- **Error handling (recoverable):** `app.js:10-15` — `validateForm` returns a result object (`{ valid, error }`) rather than throwing; the caller branches on it.
- **Error reporting at the boundary:** `app.js:26` — the submit handler reports with `console.error`.
- **Comment style:** `app.js:1`, `app.js:6` — short `//` comments stating intent, not restating the code.
- **Browser script loading:** `index.html:13` — a single plain `<script src="app.js"></script>` at the end of `<body>`. No `type="module"`, no `defer`, no bundler. Document order is the only ordering mechanism available.
- **Node-side module pattern (NOT used by this work):** `src/utils.js:5` — `module.exports = { greet }`. Recorded so the implementer does not copy it into `config.js`; `src/` is CommonJS Node code with no relationship to the browser scripts.
- **Test shape:** none — there are no test files, no test runner, and `package.json` has no `scripts` or dependencies. No test pattern exists to imitate.
- **Global-scope encapsulation:** none — `app.js` declares everything at top level with no wrapper. Task 1 deliberately deviates by using an IIFE; the rationale is in that task.

---

### Task 1: Settings module and load wiring

**Risk tier:** standard — creates a new script and modifies the page's load order across two files.

**Files:**
- Create: `config.js`
- Modify: `index.html:13` (insert one line before the existing `app.js` tag)
- Test: none — see Global Constraints; verification is manual.

**Interfaces:**
- Consumes: nothing. This is the first task.
- Produces: the global `window.AppConfig`, an object with exactly two string properties:
  - `environment` — one of `"development"`, `"staging"`, `"production"`
  - `apiBaseUrl` — the base URL for that environment, no trailing slash

  Task 2 reads `window.AppConfig.apiBaseUrl` and checks `window.AppConfig` for existence. No other property is part of the contract.

**Mirror:** `app.js:1-15`, for comment style (short `//` intent comments), `UPPER_SNAKE_CASE` constants, and plain `function` declarations.

**Deliberate deviation from the mirror:** `config.js` wraps its body in an IIFE, which `app.js` does not do. The reason is that the whole purpose of this module is to expose exactly one global; leaving `ENVIRONMENTS` and `detectEnvironment` at top level would add two more globals that could collide with future app code. If the reviewer prefers strict consistency with `app.js`, unwrapping the IIFE is a valid alternative that changes no behavior.

- [ ] **Step 1: Create `config.js` with this exact content**

```javascript
// Environment-specific settings, resolved from the page's hostname.
// Loaded before app.js; publishes window.AppConfig for the app to read.
(function () {
  const ENVIRONMENTS = {
    development: { apiBaseUrl: "http://localhost:3000" },
    staging: { apiBaseUrl: "https://staging-api.example.com" },
    production: { apiBaseUrl: "https://api.example.com" },
  };

  // An empty hostname means the page was opened over file://, which is the
  // local workflow here because the project has no dev server.
  const DEVELOPMENT_HOSTNAMES = ["localhost", "127.0.0.1", ""];

  function detectEnvironment() {
    const hostname = window.location.hostname;
    if (DEVELOPMENT_HOSTNAMES.includes(hostname)) {
      return "development";
    }
    if (hostname.startsWith("staging.")) {
      return "staging";
    }
    // Any unrecognized host is treated as production. The accepted tradeoff:
    // a new deploy target that is not listed here talks to the production
    // API rather than failing loudly.
    return "production";
  }

  const environment = detectEnvironment();

  // Publish only the resolved environment, so callers cannot reach into
  // another environment's settings.
  window.AppConfig = {
    environment: environment,
    apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
  };
})();
```

- [ ] **Step 2: Check the file parses**

Run: `node --check config.js`

Expected: no output, exit status 0. (This is a syntax check only — it does not execute the file, which would fail on `window`. It is not test infrastructure.)

- [ ] **Step 3: Add the script tag to `index.html`**

Replace line 13:

```html
  <script src="app.js"></script>
```

with these two lines, in this order:

```html
  <script src="config.js"></script>
  <script src="app.js"></script>
```

Change nothing else in the file. The ordering is what guarantees `window.AppConfig` exists before `app.js` runs.

- [ ] **Step 4: Verify manually in a browser**

Open `index.html` directly in a browser (a `file://` URL). In the developer console, evaluate:

```javascript
window.AppConfig
```

Expected: `{ environment: "development", apiBaseUrl: "http://localhost:3000" }` — because a `file://` page has an empty `location.hostname`.

Then confirm the app still works unchanged: submit the login form with a username and password filled in. Expected: the console logs `Logging in: <username>` and `Login result: {success: true, user: "<username>"}`, exactly as before. Nothing consumes `AppConfig` yet, so this task must not change app behavior.

If the browser cannot be opened in this environment, say so plainly in the task report rather than claiming the verification passed.

- [ ] **Step 5: Commit**

```bash
git add config.js index.html
git commit -m "Add settings module resolving API base URL per environment"
```

---

### Task 2: Consume the settings module in `app.js`

**Risk tier:** standard — changes the behavior of the app's only endpoint-composing path and introduces a new failure mode.

**Files:**
- Modify: `app.js:2` (delete), `app.js:4-8` (rewrite `login`, add `loginEndpoint` above it)
- Test: none — see Global Constraints; verification is manual.

**Interfaces:**
- Consumes: `window.AppConfig` from Task 1 — specifically `window.AppConfig.apiBaseUrl` (a string, no trailing slash) and the existence of `window.AppConfig` itself.
- Produces: `loginEndpoint()`, a zero-argument function returning the composed login URL as a string, or throwing `Error("AppConfig not loaded — config.js must load before app.js")` when `window.AppConfig` is absent. Nothing later in this plan depends on it; it is internal to `app.js`.

**Mirror:** `app.js:4-8` for the existing `login` shape (plain function declaration, `console.log` of progress, returned result object) and `app.js:1`/`app.js:6` for comment style.

- [ ] **Step 1: Delete the hardcoded constant**

Remove line 2 of `app.js` entirely:

```javascript
const API_ENDPOINT = "https://api.example.com/login";
```

Leave line 1's comment and the blank line structure intact.

- [ ] **Step 2: Add `loginEndpoint` and update `login`**

The region that currently reads:

```javascript
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

becomes:

```javascript
// Composed at call time rather than at load time, so a configuration that
// arrives late is never baked in stale.
function loginEndpoint() {
  if (!window.AppConfig) {
    throw new Error("AppConfig not loaded — config.js must load before app.js");
  }
  return window.AppConfig.apiBaseUrl + "/login";
}

function login(username, password) {
  const endpoint = loginEndpoint();
  console.log("Logging in:", username, "via", endpoint);
  // Stub: would POST to endpoint in real app
  return { success: true, user: username };
}
```

Do not modify `validateForm` or the submit handler. A throw from `loginEndpoint` is intended to surface as an uncaught error in the console — that is the "fail loudly" behavior the spec chose over composing `undefined/login`.

- [ ] **Step 3: Check the file parses**

Run: `node --check app.js`

Expected: no output, exit status 0.

- [ ] **Step 4: Verify the happy path manually**

Open `index.html` directly in a browser (`file://`). Submit the form with a username and password filled in.

Expected console output:

```
Logging in: <username> via http://localhost:3000/login
Login result: {success: true, user: "<username>"}
```

The `http://localhost:3000/login` portion is the point of the change — it proves the URL is composed from the settings module rather than a constant.

- [ ] **Step 5: Verify the missing-config failure path manually**

In the same browser console, on a freshly loaded page, run:

```javascript
delete window.AppConfig;
```

Then submit the form again.

Expected: an uncaught `Error: AppConfig not loaded — config.js must load before app.js`, and no `Login result:` line. Reload the page afterwards to restore normal state.

If the browser cannot be opened in this environment, say so plainly in the task report rather than claiming the verification passed.

- [ ] **Step 6: Confirm no stray references remain**

Run: `grep -rn "API_ENDPOINT" . --exclude-dir=.git --exclude-dir=docs`

Expected: no matches. (The spec and plan under `docs/` legitimately mention the old name; they are excluded.)

- [ ] **Step 7: Commit**

```bash
git add app.js
git commit -m "Compose login URL from settings module instead of hardcoded constant"
```

---

## Verification Summary

After both tasks, the complete manual check from the spec:

1. Open `index.html` over `file://` — `window.AppConfig.environment` is `"development"`, `apiBaseUrl` is `http://localhost:3000`.
2. Submit the form — the console shows the composed `http://localhost:3000/login`.
3. Serve the page from a non-localhost, non-`staging.` host — the environment resolves to `production` and the composed URL is `https://api.example.com/login`. Step 3 needs a served host; if none is available, report it as unverified rather than assumed.
