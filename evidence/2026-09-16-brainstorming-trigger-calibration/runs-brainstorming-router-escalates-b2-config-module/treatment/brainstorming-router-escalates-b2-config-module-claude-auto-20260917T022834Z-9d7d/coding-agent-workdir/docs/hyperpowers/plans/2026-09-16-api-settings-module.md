# API Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-16-api-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a dedicated ES module that resolves the environment from the browser hostname.

**Architecture:** A new root-level `settings.js` maps `location.hostname` to an environment, exposes a frozen `settings` object carrying `apiBaseUrl` and an `endpoints` map derived from it, and exports the hostname resolver separately so it can be exercised without a browser. `app.js` imports from it and `index.html` switches to `<script type="module">`.

**Tech Stack:** Plain browser JavaScript, native ES modules, no build step. Node 26 is available for syntax and behavior checks only — it is not a runtime dependency of the app.

## Global Constraints

- No new dependencies. `package.json` stays dependency-free.
- No linter, formatter, or test-runner infrastructure is added by this work. This is an explicit decision recorded in the spec, not an oversight.
- `src/index.js` and `src/utils.js` are not modified.
- Style: two-space indentation, double-quoted strings, semicolons.
- Commit messages contain no attribution or `Co-Authored-By` lines.
- Work lands on the current branch, `feature/webapp-enhancement`.

## Grounding

- Naming and style: `app.js:1-15` — `camelCase` functions (`login`, `validateForm`), `SCREAMING_SNAKE_CASE` module constant (`API_ENDPOINT` at line 2), two-space indent, double quotes, semicolons.
- Error handling: `app.js:10-15` — `validateForm` returns a result object (`{ valid, error }`) instead of throwing; `app.js:26` reports via `console.error`. The codebase signals failure through returned values and console output, never exceptions.
- Module exports: `src/utils.js:1-5` shows the only existing export pattern, and it is CommonJS (`module.exports = { greet }`) for Node. `none: no existing ES-module pattern in this repository` — `settings.js` introduces the first one, so there is nothing to imitate for `export` syntax.
- Script loading: `index.html:13` — `<script src="app.js"></script>`, a classic script placed after the form markup.
- Test shape: `none: no test runner, no test files, and no test script in package.json`. Verification in this plan is executable Node checks plus a scripted manual browser check, per the spec's Testing section.

---

### Task 1: Settings module

**Risk tier:** standard — introduces a new module whose exported interface later code consumes, and establishes the repository's first ES-module pattern.

**Files:**
- Create: `settings.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `resolveEnvironmentName(hostname: string) => "development" | "production"` — named export, pure.
  - `settings` — named export, frozen object of shape `{ environment: "development" | "production", apiBaseUrl: string, endpoints: { login: string } }`. `endpoints` is frozen as well.

**Mirror:** `app.js:1-15` — imitate the comment-at-top style, two-space indent, double-quoted strings, semicolons, and the habit of returning plain values rather than throwing.

- [ ] **Step 1: Create `settings.js` with the complete content below**

```javascript
// Environment-specific API configuration. The environment is resolved once at
// load from the hostname, so switching environments needs no build step and no
// edit to application code.

const ENVIRONMENTS = {
  development: { apiBaseUrl: "https://api.dev.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// An unrecognized hostname resolves to production. An unknown host is far more
// likely to be a real deployment than an unconfigured dev machine, and pointing
// a real user's login at the development API is the worse of the two failures.
export function resolveEnvironmentName(hostname) {
  return DEV_HOSTNAMES.has(hostname) ? "development" : "production";
}

const environment = resolveEnvironmentName(window.location.hostname);
const { apiBaseUrl } = ENVIRONMENTS[environment];

export const settings = Object.freeze({
  environment,
  apiBaseUrl,
  endpoints: Object.freeze({
    login: `${apiBaseUrl}/login`,
  }),
});
```

- [ ] **Step 2: Verify the file parses as a module**

Run: `node --check settings.js`

Expected: exit status 0 with no output. (A syntax error exits 1 and prints the offending line.)

- [ ] **Step 3: Verify the development branch resolves correctly**

`settings.js` reads `window.location.hostname` at import time, so Node needs a `window` stub installed before the module is imported. A dynamic `import()` after assigning `globalThis.window` achieves that with no dependencies.

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.apiBaseUrl, m.settings.endpoints.login);"
```

Expected exactly:

```
development https://api.dev.example.com https://api.dev.example.com/login
```

- [ ] **Step 4: Verify the production branch and the unknown-host fallback**

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'app.example.com' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.endpoints.login); console.log(m.resolveEnvironmentName('127.0.0.1'), m.resolveEnvironmentName('[::1]'), m.resolveEnvironmentName('totally-unknown-host'));"
```

Expected exactly:

```
production https://api.example.com/login
development development production
```

The third value on the second line is the fallback: an unrecognized host resolves to `production`.

- [ ] **Step 5: Verify the settings object is frozen**

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); try { m.settings.apiBaseUrl = 'mutated'; console.log('no throw'); } catch (e) { console.log('threw:', e.constructor.name); } console.log(m.settings.apiBaseUrl);"
```

Expected exactly:

```
threw: TypeError
https://api.dev.example.com
```

ES modules always run in strict mode, so writing to a frozen property throws rather than failing silently. Both lines matter: the `TypeError` proves the write was rejected, and the unchanged URL proves nothing was mutated. `no throw` on the first line means the `Object.freeze` call is missing.

- [ ] **Step 6: Commit**

```bash
git add settings.js
git commit -m "feat: add settings module for environment-specific API config"
```

---

### Task 2: Consume settings from the app

**Risk tier:** standard — multi-file integration that changes how the page loads its script, and a wrong edit breaks the page silently.

**Files:**
- Modify: `app.js:1-8`
- Modify: `index.html:13`

**Interfaces:**
- Consumes: the `settings` named export from Task 1 — `settings.endpoints.login` is the property referenced here.
- Produces: nothing later tasks rely on. This is the final task.

**Mirror:** `index.html:13` — keep the existing two-space indentation and the tag's position after the form markup; only the `type` attribute is added.

- [ ] **Step 1: Replace the top of `app.js`**

Replace lines 1-2, which currently read:

```javascript
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";
```

with:

```javascript
// Simple webapp with login form handling
import { settings } from "./settings.js";
```

The import must keep the `.js` extension: native browser ES modules do not resolve extensionless specifiers.

- [ ] **Step 2: Update the stub comment inside `login()`**

In `app.js`, the line that currently reads:

```javascript
  // Stub: would POST to API_ENDPOINT in real app
```

becomes:

```javascript
  // Stub: would POST to settings.endpoints.login in real app
```

`login()` stays a stub; this task introduces no network call.

- [ ] **Step 3: Confirm no reference to the old constant survives**

Run: `grep -rn "API_ENDPOINT" . --exclude-dir=.git --exclude-dir=docs`

Expected: no output, exit status 1. Any hit is a leftover reference that must be updated before continuing.

- [ ] **Step 4: Verify `app.js` parses as a module**

Run: `node --check app.js`

Expected: exit status 0 with no output. This confirms the `import` statement is syntactically valid. It does not execute the file — `app.js` touches `document` at top level and cannot run under Node.

- [ ] **Step 5: Switch `index.html` to a module script**

`index.html:13` currently reads:

```html
  <script src="app.js"></script>
```

Change it to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 6: Confirm the script tag changed and nothing else did**

Run: `git diff --stat index.html`

Expected: `1 file changed, 1 insertion(+), 1 deletion(-)`.

- [ ] **Step 7: Verify the page in a browser**

Module scripts are blocked by CORS over `file://`, so the page must be served over HTTP.

Start a server: `python3 -m http.server 8000`

Then open `http://localhost:8000` and, with the browser console open:

1. Submit the form with both fields empty. Expected: `Validation error: Missing required fields` logged via `console.error`.
2. Fill both fields and submit. Expected: `Logging in: <username>` followed by `Login result: { success: true, user: "<username>" }`.
3. Confirm the console shows no module-resolution or CORS errors.

Stop the server with Ctrl-C when done.

If the console reports a bare-specifier or 404 error for `./settings.js`, the import path in Step 1 lost its `.js` extension.

- [ ] **Step 8: Commit**

```bash
git add app.js index.html
git commit -m "refactor: read API endpoint from the settings module"
```

---

## Assumptions carried into execution

The spec records three assumptions. None of them gates a task — the values below
were approved as written, so every task can execute as specified. Their deadline
is deployment, not a task boundary, which is why they appear here rather than as
blocking unknowns.

- **Assumption:** `https://api.dev.example.com` is a placeholder for the real
  development API host. **Validate via** asking the repository owner for the
  actual development host and substituting it in `ENVIRONMENTS.development`,
  **before the first deployment to a real development environment.** Implement
  Task 1 with the placeholder as written; do not guess a different host.
- **Assumption:** `https://api.example.com` is still the correct production base
  URL. **Validate via** confirming with the repository owner that the value
  carried over from `app.js:2` is current, **before the first production
  deployment.**
- **Assumption:** no deployment opens `index.html` over `file://`. **Validate
  via** confirming with the repository owner that the page is always served over
  HTTP. This one has teeth: `type="module"` breaks a `file://` workflow outright,
  and the failure appears as a CORS error in the console.

## Notes for the implementer

- `.gitignore` already excludes `docs/hyperpowers`, so the spec and this plan are not committed. Do not `git add` them.
- Step 7 of Task 2 is the only step needing a human at a browser. If you cannot run it, say so plainly in your report and state that browser verification was not performed — do not report it as passed.
