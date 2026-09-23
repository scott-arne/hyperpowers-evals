# Settings Module for API Endpoint Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a new `settings.js` module that resolves the API base URL from the page's hostname.

**Architecture:** A new root-level `settings.js` holds a per-environment table and a hostname-to-environment map, resolves one environment at load time, and assigns `window.APP_SETTINGS`. `index.html` loads it before `app.js`; `app.js` guards on its presence and composes `API_ENDPOINT` from `apiBaseUrl`. No build step, no bundler, no new dependencies.

**Tech Stack:** Plain browser JavaScript (ES2015 template literals, `const`), loaded as global `<script>` tags. Node is used only as a scratch interpreter for verification commands — it is not a runtime dependency of the app.

## Global Constraints

Copied from the spec; every task's requirements implicitly include these.

- **No new dependencies.** `package.json` gains no `dependencies` and no `devDependencies`.
- **No lint, format, or test tooling.** Explicitly declined during brainstorming. Do not add a test runner, eslint, prettier, or any `scripts` entry.
- **No build step and no server.** `index.html` must remain openable directly from the filesystem.
- **Plain global scripts only.** Do not add `type="module"`, `import`, `export`, or `require` to `settings.js`, `app.js`, or `index.html`. Module scripts are CORS-restricted and would break `file://` loading.
- **Config shape is base-URL-only.** `settings.js` exposes `apiBaseUrl`; endpoint paths such as `/login` stay in feature code. Do not introduce a `paths` map or per-endpoint full URLs.
- **Unknown hostnames resolve to `production`.** This is a deliberate fail-safe, not an oversight: an unrecognized host must reach the real API rather than silently reach staging or a developer machine.
- **`src/index.js` and `src/utils.js` are out of scope.** They are an unrelated CommonJS Node entry point. Do not modify them.
- **Approved placeholder values.** `http://localhost:3000`, `https://api-staging.example.com`, and `staging.example.com` are placeholders approved by the human partner during spec review; only `https://api.example.com` comes from existing code. Write them as given. They are single-line edits to correct later and do not block any task.

## Grounding

- **Module-level constant naming:** `app.js:2` — `const API_ENDPOINT = "...";` SCREAMING_SNAKE_CASE for module-level constants.
- **Function naming and declaration style:** `app.js:4`, `app.js:10` — `function login(...)`, `function validateForm(...)`; camelCase, `function` declarations rather than arrow-function constants.
- **Formatting:** `app.js:10-15` — two-space indentation, double-quoted strings, semicolon-terminated statements.
- **Comment style:** `app.js:1`, `app.js:6` — `//` line comments that state intent above the code they describe.
- **Error signalling:** `app.js:10-15` returns `{ valid, error }` result objects; `app.js:26` reports failures with `console.error`. `none: no existing throw/guard pattern anywhere in the webapp code` — Task 2 introduces the first `throw`, so there is nothing to mirror for it.
- **Script loading:** `index.html:13` — a single `<script src="app.js"></script>` immediately before `</body>`.
- **Test shape:** `none: no test runner, no test files, and no `scripts` entry in `package.json`.` Verification in this plan is executable `node -e` commands rather than test files, which adds no tooling and satisfies the Global Constraints.

---

### Task 1: The settings module

**Risk tier:** standard — the unknown-hostname fallback decides which API real users reach, so a fresh reviewer should judge it even though the file content is fully specified here.

**Files:**
- Create: `settings.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the global `window.APP_SETTINGS`, an object with exactly two properties:
  - `environment` — string, one of `"local"`, `"staging"`, `"production"`.
  - `apiBaseUrl` — string, an origin with no trailing slash and no path (e.g. `"https://api.example.com"`).

  Task 2 reads `window.APP_SETTINGS.apiBaseUrl` and relies on it having no trailing slash, because it appends `"/login"` directly.

**Mirror:** `app.js:1-2`, for comment-above-code style, SCREAMING_SNAKE_CASE module constants, double-quoted strings, and two-space indentation.

- [ ] **Step 1: Write the failing verification check**

Create the check as a shell command you will run in Step 2 — there is no test runner in this repo and the Global Constraints forbid adding one, so verification is an executable `node -e` snippet that loads `settings.js` with a stubbed `window` and prints the resolved values.

Run this from the repository root:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "localhost" } };
eval(fs.readFileSync("settings.js", "utf8"));
console.log(window.APP_SETTINGS.environment, window.APP_SETTINGS.apiBaseUrl);
'
```

- [ ] **Step 2: Run the check to verify it fails**

Run the Step 1 command.
Expected: FAIL with `Error: ENOENT: no such file or directory, open 'settings.js'`.

- [ ] **Step 3: Create `settings.js`**

Write exactly this content to `settings.js` at the repository root (not under `src/`):

```javascript
// API host per environment. Resolved at load time from the page's hostname so a
// single set of files can be served to every environment without a build step.
const ENVIRONMENTS = {
  local:      { apiBaseUrl: "http://localhost:3000" },
  staging:    { apiBaseUrl: "https://api-staging.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  "localhost": "local",
  "127.0.0.1": "local",
  "staging.example.com": "staging",
};

// Unmapped hosts fall through to production: reaching the real API from an
// unrecognized host is a visible failure, whereas silently reaching staging is
// not.
function resolveEnvironment(hostname) {
  return HOSTNAME_ENVIRONMENTS[hostname] || "production";
}

const environment = resolveEnvironment(window.location.hostname);

window.APP_SETTINGS = {
  environment,
  apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
};
```

- [ ] **Step 4: Run the check to verify it passes**

Run the Step 1 command again.
Expected: PASS, printing exactly `local http://localhost:3000`.

- [ ] **Step 5: Verify the production fallback for an unmapped hostname**

Run:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "app.example.com" } };
eval(fs.readFileSync("settings.js", "utf8"));
console.log(window.APP_SETTINGS.environment, window.APP_SETTINGS.apiBaseUrl);
'
```

Expected: PASS, printing exactly `production https://api.example.com`.

- [ ] **Step 6: Verify the staging mapping**

Run:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "staging.example.com" } };
eval(fs.readFileSync("settings.js", "utf8"));
console.log(window.APP_SETTINGS.environment, window.APP_SETTINGS.apiBaseUrl);
'
```

Expected: PASS, printing exactly `staging https://api-staging.example.com`.

- [ ] **Step 7: Commit**

```bash
git add settings.js
git commit -m "feat: add settings module resolving API base URL per environment"
```

---

### Task 2: Wire the settings module into the page

**Risk tier:** standard — multi-file integration across `index.html` and `app.js`, and it introduces the load-order guard that the whole design depends on.

**Files:**
- Modify: `index.html:13` — add one script tag before the existing `app.js` tag.
- Modify: `app.js:1-2` — replace the hardcoded constant with a guard plus a composed value.

**Interfaces:**
- Consumes: `window.APP_SETTINGS.apiBaseUrl` (string, origin with no trailing slash) and `window.APP_SETTINGS.environment` (string), both produced by Task 1's `settings.js`.
- Produces: nothing new for later tasks. `API_ENDPOINT` keeps its existing name and module-level scope in `app.js`, so `login()` and the comment at `app.js:6` continue to refer to it unchanged.

**Mirror:** `app.js:1-2` for the comment-above-constant shape and naming. There is no existing `throw` anywhere in this codebase (see Grounding), so the guard in Step 3 has no analogue to imitate — write it as given.

- [ ] **Step 1: Write the failing verification check**

Two checks. The first proves the composed URL is correct; the second proves the guard fires when `settings.js` is absent. Both stub `document` because `app.js:17` attaches a submit listener at load time.

Check A — composed URL, run from the repository root:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "staging.example.com" } };
globalThis.document = { getElementById: () => ({ addEventListener: () => {} }) };
eval(fs.readFileSync("settings.js", "utf8") + "\n" + fs.readFileSync("app.js", "utf8") + "\nconsole.log(API_ENDPOINT);");
'
```

Check B — guard fires without settings:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "localhost" } };
globalThis.document = { getElementById: () => ({ addEventListener: () => {} }) };
try { eval(fs.readFileSync("app.js", "utf8")); }
catch (e) { console.log("THREW:", e.message); }
'
```

- [ ] **Step 2: Run both checks to verify they fail**

Run Check A.
Expected: FAIL, printing `https://api.example.com/login` — the old hardcoded value, ignoring the staging hostname.

Run Check B.
Expected: FAIL, printing nothing at all — today's `app.js` has no guard, so nothing throws and the `catch` never runs.

- [ ] **Step 3: Replace the constant in `app.js`**

Replace lines 1-2 of `app.js`, which currently read:

```javascript
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";
```

with:

```javascript
// Simple webapp with login form handling
// settings.js resolves the API host for this environment and must load first;
// without the guard a missing settings.js would silently yield "undefined/login".
if (!window.APP_SETTINGS) {
  throw new Error("settings.js must load before app.js");
}

const API_ENDPOINT = `${window.APP_SETTINGS.apiBaseUrl}/login`;
```

Change nothing else in `app.js`. `login()`, `validateForm()`, and the submit handler stay exactly as they are.

- [ ] **Step 4: Add the script tag to `index.html`**

`index.html:13` currently reads:

```html
  <script src="app.js"></script>
```

Replace it with:

```html
  <script src="settings.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 5: Run both checks to verify they pass**

Run Check A from Step 1.
Expected: PASS, printing exactly `https://api-staging.example.com/login`.

Run Check B from Step 1.
Expected: PASS, printing exactly `THREW: settings.js must load before app.js`.

- [ ] **Step 6: Verify the script order in `index.html`**

Run:

```bash
grep -n 'script src' index.html
```

Expected: exactly two lines, `settings.js` on the lower line number and `app.js` on the higher one.

- [ ] **Step 7: Verify production behavior is unchanged**

Run:

```bash
node -e '
const fs = require("fs");
globalThis.window = { location: { hostname: "app.example.com" } };
globalThis.document = { getElementById: () => ({ addEventListener: () => {} }) };
eval(fs.readFileSync("settings.js", "utf8") + "\n" + fs.readFileSync("app.js", "utf8") + "\nconsole.log(API_ENDPOINT);");
'
```

Expected: PASS, printing exactly `https://api.example.com/login` — byte-identical to the value `app.js` hardcoded before this change.

- [ ] **Step 8: Confirm no stray hardcoded endpoint remains**

Run:

```bash
grep -rn 'api.example.com' app.js index.html
```

Expected: no matches. The only occurrences of the host should be in `settings.js`.

- [ ] **Step 9: Commit**

```bash
git add app.js index.html
git commit -m "refactor: source API endpoint from settings module"
```

---

## Self-Review

**1. Spec coverage.** Spec "New file: `settings.js`" → Task 1 Step 3. "Changed file: `index.html`" → Task 2 Step 4. "Changed file: `app.js`" → Task 2 Step 3. "Error handling" (load-order guard) → Task 2 Steps 1B/3/5. Spec "Testing" step 1 (local resolves) → Task 1 Step 4; step 2 (unmapped host → production URL) → Task 1 Step 5 and Task 2 Step 7; step 3 (missing settings.js throws) → Task 2 Check B. Spec "Out of Scope" items appear as Global Constraints. No spec requirement is without a task.

**2. Placeholder scan.** No TBD, TODO, "similar to Task N", or "add appropriate error handling". Every code step carries literal content. The placeholder *hostnames* are approved values recorded in Global Constraints, not plan placeholders.

**3. Type consistency.** Task 1 produces `window.APP_SETTINGS.{environment, apiBaseUrl}`; Task 2 consumes exactly those names. `resolveEnvironment(hostname)` is referenced only inside `settings.js`. `API_ENDPOINT` keeps its Task-0 name throughout.

**4. Grounding is real.** Every citation was read at plan-writing time against the files shown above: `app.js` is 28 lines, `index.html` is 15 lines, and the cited ranges resolve. The two `none:` entries (no throw pattern, no test shape) are explicit, not omissions.
