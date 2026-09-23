# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a `settings.js` module that picks an environment from the browser hostname.

**Architecture:** A single root-level `settings.js` IIFE holds an environment table and a hostname table, derives the environment from `window.location.hostname`, and publishes a frozen `window.AppSettings` consumed by `app.js`. A guarded `module.exports` tail exposes the pure lookup function to Node unit tests without giving browser code a second interface. No bundler, no build step, no dependencies.

**Tech Stack:** Plain ES5-style browser JavaScript (classic `<script>`, no modules), Node 26 with the built-in `node:test` runner.

## Global Constraints

Copied verbatim from the spec's Global Constraints:

- **Zero runtime dependencies.** `package.json` gains no `dependencies` and no `devDependencies`. The test runner is Node's built-in `node:test`.
- **Unit test infrastructure is in scope** for this work: a `test` script and a first passing test file. Linting, formatting, and end-to-end testing were considered and declined.
- Browser code must keep working when `index.html` is opened directly from the filesystem (`file://`). This rules out native ES modules.
- Match existing style in `app.js`: plain scripts, no framework.

Additional binding constraints from the spec body:

- `apiBaseUrl` is origin only — no trailing slash, no path.
- `window.AppSettings` is frozen.
- `settings.js` must load **before** `app.js` in `index.html`.
- No fallback endpoint literal survives in `app.js`; a missing `settings.js` must fail loudly.

## Grounding

- `app.js:1-15` — naming and style convention this work must match: `const` for module-level values, `function name(args) {}` declarations, double-quoted strings, 2-space indent, `//` line comments.
- `app.js:2` — the exact line being replaced: `const API_ENDPOINT = "https://api.example.com/login";`
- `src/utils.js:1-5` — the only existing CommonJS export shape in the repo: a bare function declaration followed by `module.exports = { greet };`. Task 1's export tail imitates this object-literal form.
- `index.html:13` — the only existing script tag, `<script src="app.js"></script>`, immediately before `</body>`. The new tag goes directly above this line.
- `package.json:1-6` — currently has `name`, `version`, `description`, `main` and **no** `scripts` key. Task 1 adds the first one.
- **none: no existing pattern for tests.** The repo has no `test/` directory, no test runner, no test dependency, and no test file to imitate. Task 1 establishes the shape; later tasks follow Task 1.
- **none: no existing pattern for error handling.** `app.js:26` uses `console.error` for a validation message and nothing in the repo throws or catches. Task 1's `console.warn` is the first diagnostic of its kind.

## Assumptions

Carried from the spec. Each is written into the code as a working placeholder, not a blocker.

- **Assumption:** the staging web hostname is `staging.example.com`, validate via confirming the real staging hostname with the deployment owner, before Task 2. If unresolved when Task 2 starts, proceed — the value only affects staging, which does not exist yet.
- **Assumption:** the staging API base URL is `https://staging-api.example.com`, validate the same way, before Task 2.
- **Assumption:** the development API listens on `http://localhost:3000`, validate by starting the local API server and reading its port, before Task 2.
- **Assumption:** the production web hostnames are `example.com` and `www.example.com`, validate via the deployment owner, before Task 2. See the note below — this entry is new relative to the spec.

**Note on the production hostname list (deviation from the spec, flag to your human partner).** The spec's hostname table listed only `development` and `staging`, and separately required a `console.warn` naming any "unmatched" hostname. Those two are inconsistent: with no production entries, the real production host is also unmatched, so the warning would fire on every production page load. This plan resolves it by giving `production` its own hostname list, so the warning means "genuinely unrecognized host" as the spec intended. The fallback behavior itself is unchanged — an unrecognized host still resolves to production.

## File Structure

| File | Responsibility |
|---|---|
| `settings.js` (new, root) | Environment + hostname tables, `detectEnvironment`, publishes `window.AppSettings`. The only file that knows about environments. |
| `test/settings.test.js` (new) | Unit tests for `detectEnvironment` and table consistency. |
| `test/index-html.test.js` (new) | Guards the load-order invariant between `settings.js` and `app.js`. |
| `package.json` (modify) | Adds the `test` script. No dependencies. |
| `index.html` (modify) | Loads `settings.js` before `app.js`. |
| `app.js` (modify) | Line 2 only: derives `API_ENDPOINT` from `AppSettings.apiBaseUrl`. |

---

### Task 1: Settings module and test infrastructure

**Risk tier:** standard — new module plus the repo's first test runner wiring; multi-file and establishes conventions later tasks copy.

**Files:**
- Create: `settings.js`
- Create: `test/settings.test.js`
- Modify: `package.json:1-6` (add `scripts`)

**Interfaces:**
- Consumes: nothing — this is the first task.
- Produces:
  - `detectEnvironment(hostname: string) -> "development" | "staging" | "production"` — pure, logs nothing.
  - `ENVIRONMENTS: { [env: string]: { apiBaseUrl: string } }`
  - `HOSTNAMES: { [env: string]: string[] }`
  - Browser-side global `window.AppSettings: { environment: string, apiBaseUrl: string }`, frozen. Task 2 reads `AppSettings.apiBaseUrl`.
  - All three named values are reachable from Node via `require("../settings.js")`.

**Mirror:** `src/utils.js:1-5` — imitate the export form (`module.exports = { name };` object literal at the end of the file), not the file's content.

- [ ] **Step 1: Create the test directory and write the failing test**

Create `test/settings.test.js` with exactly this content:

```js
const test = require("node:test");
const assert = require("node:assert");
const { detectEnvironment, ENVIRONMENTS, HOSTNAMES } = require("../settings.js");

test("localhost resolves to development", () => {
  assert.strictEqual(detectEnvironment("localhost"), "development");
});

test("127.0.0.1 resolves to development", () => {
  assert.strictEqual(detectEnvironment("127.0.0.1"), "development");
});

test("the staging hostname resolves to staging", () => {
  assert.strictEqual(detectEnvironment("staging.example.com"), "staging");
});

test("a listed production hostname resolves to production", () => {
  assert.strictEqual(detectEnvironment("www.example.com"), "production");
});

test("an unrecognized hostname falls back to production", () => {
  assert.strictEqual(detectEnvironment("preview-42.vercel.app"), "production");
});

test("detectEnvironment is pure and logs nothing", () => {
  const original = console.warn;
  let calls = 0;
  console.warn = () => {
    calls += 1;
  };
  try {
    detectEnvironment("preview-42.vercel.app");
  } finally {
    console.warn = original;
  }
  assert.strictEqual(calls, 0);
});

test("every hostname table key has an ENVIRONMENTS entry", () => {
  for (const name of Object.keys(HOSTNAMES)) {
    assert.ok(ENVIRONMENTS[name], `missing ENVIRONMENTS entry for ${name}`);
  }
});

test("the production fallback target exists", () => {
  assert.ok(ENVIRONMENTS.production, "production must exist as the fallback");
});

test("every apiBaseUrl is an origin with no trailing slash and no path", () => {
  for (const [name, config] of Object.entries(ENVIRONMENTS)) {
    const url = new URL(config.apiBaseUrl);
    assert.strictEqual(url.pathname, "/", `${name} apiBaseUrl must have no path`);
    assert.ok(!config.apiBaseUrl.endsWith("/"), `${name} apiBaseUrl must not end with a slash`);
  }
});
```

- [ ] **Step 2: Add the test script to package.json**

Modify `package.json` so it reads exactly:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js",
  "scripts": {
    "test": "node --test test/"
  }
}
```

Do not add `dependencies` or `devDependencies`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. Node cannot resolve `../settings.js`, reporting `Cannot find module` — the file does not exist yet.

- [ ] **Step 4: Write the settings module**

Create `settings.js` with exactly this content:

```js
// Environment configuration for the browser app.
// Loaded by index.html before app.js; publishes window.AppSettings.
(function () {
  var ENVIRONMENTS = {
    development: { apiBaseUrl: "http://localhost:3000" },
    staging: { apiBaseUrl: "https://staging-api.example.com" },
    production: { apiBaseUrl: "https://api.example.com" },
  };

  var HOSTNAMES = {
    development: ["localhost", "127.0.0.1"],
    staging: ["staging.example.com"],
    production: ["example.com", "www.example.com"],
  };

  // Unrecognized hosts resolve to production. Every real deployment host is
  // unknown until it is added above, and defaulting those to development would
  // point a live page at a localhost server that does not exist. The caller
  // warns so the silent-to-production case stays visible.
  function detectEnvironment(hostname) {
    var names = Object.keys(HOSTNAMES);
    for (var i = 0; i < names.length; i++) {
      if (HOSTNAMES[names[i]].indexOf(hostname) !== -1) {
        return names[i];
      }
    }
    return "production";
  }

  function isKnownHostname(hostname) {
    return Object.keys(HOSTNAMES).some(function (name) {
      return HOSTNAMES[name].indexOf(hostname) !== -1;
    });
  }

  if (typeof window !== "undefined") {
    var hostname = window.location.hostname;
    if (!isKnownHostname(hostname)) {
      console.warn(
        "settings: unrecognized hostname '" + hostname + "', falling back to production"
      );
    }
    var environment = detectEnvironment(hostname);
    window.AppSettings = Object.freeze({
      environment: environment,
      apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
    });
  }

  // Test seam only. Browser code reads window.AppSettings, never this export.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      detectEnvironment: detectEnvironment,
      ENVIRONMENTS: ENVIRONMENTS,
      HOSTNAMES: HOSTNAMES,
    };
  }
})();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add settings.js test/settings.test.js package.json
git commit -m "feat: add settings module with hostname-based environment detection"
```

---

### Task 2: Wire the settings module into the app

**Risk tier:** standard — changes which host the login form targets at runtime; a wrong edit here sends credentials to the wrong origin, and the load-order dependency is easy to get silently wrong.

**Files:**
- Modify: `index.html:13`
- Modify: `app.js:2`
- Create: `test/index-html.test.js`

**Interfaces:**
- Consumes: from Task 1, the browser global `window.AppSettings` with the string property `apiBaseUrl` (origin only, no trailing slash).
- Produces: nothing new for later tasks. `app.js` keeps its existing `API_ENDPOINT` constant name and its existing value in production.

**Mirror:** `app.js:1-15` — imitate the surrounding style: `const` at module level, double-quoted strings, 2-space indent.

- [ ] **Step 1: Write the failing load-order test**

The spec calls script order load-bearing, so it gets a test rather than a code comment. Create `test/index-html.test.js` with exactly this content:

```js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("index.html loads settings.js", () => {
  assert.ok(html.includes('<script src="settings.js"></script>'));
});

test("settings.js is loaded before app.js", () => {
  const settingsAt = html.indexOf('src="settings.js"');
  const appAt = html.indexOf('src="app.js"');
  assert.notStrictEqual(settingsAt, -1, "settings.js script tag is missing");
  assert.notStrictEqual(appAt, -1, "app.js script tag is missing");
  assert.ok(settingsAt < appAt, "settings.js must be loaded before app.js");
});

test("app.js keeps no hardcoded API endpoint", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.ok(
    !appJs.includes('"https://api.example.com'),
    "app.js must derive its endpoint from AppSettings, not hardcode it"
  );
  assert.ok(appJs.includes("AppSettings.apiBaseUrl"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. All three new tests fail — `index.html` has no `settings.js` tag and `app.js` still holds the literal. Task 1's tests still pass.

- [ ] **Step 3: Add the script tag to index.html**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with these two lines, in this order:

```html
  <script src="settings.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 4: Derive the endpoint in app.js**

In `app.js`, replace line 2:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

with:

```js
const API_ENDPOINT = AppSettings.apiBaseUrl + "/login";
```

Change nothing else in `app.js`. Do not add a fallback value or a `typeof AppSettings` guard — a missing `settings.js` must fail loudly rather than post credentials to a default host.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 12 tests passing, 0 failing.

- [ ] **Step 6: Verify in a browser**

Open `index.html` directly from the filesystem (double-click, or `open index.html`). In the browser console:

- Expect a warning naming the hostname, because a `file://` page reports an empty hostname, which is correctly unrecognized.
- Run `AppSettings` — expect `{ environment: "production", apiBaseUrl: "https://api.example.com" }`, frozen.
- Submit the form with both fields filled — expect the existing `Login result:` log, unchanged.

This confirms the `file://` constraint from Global Constraints still holds.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js test/index-html.test.js
git commit -m "feat: read the API endpoint from the settings module"
```
