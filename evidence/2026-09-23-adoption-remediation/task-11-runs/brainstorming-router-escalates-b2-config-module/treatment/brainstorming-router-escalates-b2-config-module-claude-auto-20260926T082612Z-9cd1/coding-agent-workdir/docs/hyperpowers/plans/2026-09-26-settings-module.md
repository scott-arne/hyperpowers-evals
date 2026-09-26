# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-26-settings-module-design.md`

**Goal:** Move the hardcoded API endpoint out of `app.js` into a new `config.js` settings module that selects the endpoint from the page's hostname.

**Architecture:** A new root-level `config.js` holds a hostname-to-settings map, a pure `resolveSettings(hostname)` function that throws on unrecognized hosts, and an eagerly-resolved `APP_SETTINGS` global. `index.html` loads it with a classic script tag ahead of `app.js`, which then reads `APP_SETTINGS.apiEndpoint` instead of its own constant. No module system, no bundler, no new dependencies.

**Tech Stack:** Plain browser JavaScript (no framework, no build step). Node 26.9.0 is available locally and is used only for verification probes, never as a runtime dependency of the page.

## Global Constraints

Copied from the spec; every task's requirements implicitly include these.

- No new dependencies, no bundler, no build step, no `.env` handling.
- The page must keep working when `index.html` is opened directly from disk over `file://`.
- Plain dependency-free JavaScript matching the existing root-level style; no module syntax (`import`/`export`/`require`) in `config.js` or `app.js`.
- Scope is the API endpoint only — no timeouts, feature flags, or base-URL splitting.
- `src/index.js` and `src/utils.js` are out of scope and must not be modified.
- No test runner, lint config, or CI is added by this work.
- The production endpoint value must remain exactly `https://api.example.com/login`, unchanged from today.

## Grounding

- **Module-level constant naming:** `app.js:2` — `const API_ENDPOINT = "https://api.example.com/login";` shows SCREAMING_SNAKE_CASE for a file-level constant in the browser code. `ENVIRONMENTS` and `APP_SETTINGS` follow it.
- **File-header comment style:** `app.js:1` — `// Simple webapp with login form handling`, a single `//` line at the top stating what the file is for.
- **Functions returning object literals:** `app.js:10-15` — `validateForm` returns `{ valid: false, error: "..." }` / `{ valid: true }`. `resolveSettings` returning `{ apiEndpoint }` matches this shape.
- **Error handling:** `app.js:26` — `console.error("Validation error:", validation.error);` is the only error-signaling code in the repo. **There is no existing `throw` anywhere in the codebase**, so the throw in `resolveSettings` is a new pattern, introduced deliberately per the spec's unknown-hostname decision.
- **Script loading:** `index.html:13` — `<script src="app.js"></script>`, a classic non-module script tag. The new tag mirrors it exactly.
- **CommonJS module shape:** `src/utils.js:1-5` — `module.exports = { greet };`. Cited as the pattern `config.js` deliberately does **not** follow: `src/` is Node-only and is not loaded by the page.
- **Test shape:** `none: the repository has no test runner, no test directory, and no test files.` Verification in this plan is executable probes via `node -e`, not a test suite.

## Assumption

`Assumption:` production is served from the hostname `www.example.com`; `validate via` confirming the deployed page's actual hostname with your human partner, `before` the map is relied on in a real deployment. This does **not** block any task below — the spec approved local and staging as explicit placeholder values, and the production *endpoint* is carried over unchanged, so no current behavior depends on the guess being right.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `config.js` | Create | Owns the environment table and hostname resolution. The only place an endpoint is written. |
| `index.html` | Modify (`:13`) | Loads `config.js` before `app.js`. |
| `app.js` | Modify (`:2`, `:6`) | Drops its own endpoint constant; reads `APP_SETTINGS.apiEndpoint`. |

Two tasks. Task 1 delivers the settings module and can be verified entirely on its own with a Node probe; Task 2 wires it into the page. A reviewer could reasonably accept the resolver's map-and-throw semantics while rejecting the script ordering, or vice versa, so the split earns its own gate.

---

### Task 1: Settings module with hostname resolution

**Risk tier:** standard — a new script introducing the codebase's first `throw`, whose failure mode silently disables the page.

**Files:**
- Create: `config.js`
- Test: none — no test runner exists (see Grounding). Verification is the Node probe in Steps 2 and 4.

**Interfaces:**
- Consumes: nothing.
- Produces, all as script-tag globals:
  - `ENVIRONMENTS` — object keyed by hostname string, each value `{ apiEndpoint: string }`.
  - `resolveSettings(hostname: string) => { apiEndpoint: string }` — throws `Error` when `hostname` is not a key of `ENVIRONMENTS`.
  - `APP_SETTINGS` — the resolved `{ apiEndpoint: string }` for the current page, produced at load time.

**Mirror:** `app.js:1-15` — imitate the single-line file-header comment, the SCREAMING_SNAKE constant naming, and the object-literal return shape.

- [ ] **Step 1: Write the verification probe**

The repo has no test runner and this plan does not add one, so the "failing test" is an executable probe. Create `verify-config.js` at the repo root as a **temporary** file — Step 5 deletes it, and it is never committed.

```js
// Temporary verification probe for config.js. Not committed; deleted after use.
const vm = require("vm");
const fs = require("fs");

function load(hostname) {
  const ctx = vm.createContext({ window: { location: { hostname } } });
  const src = fs.readFileSync("config.js", "utf8");
  return vm.runInContext(src + "\n; APP_SETTINGS.apiEndpoint", ctx);
}

const cases = [
  ["", "http://localhost:3000/login"],
  ["localhost", "http://localhost:3000/login"],
  ["127.0.0.1", "http://localhost:3000/login"],
  ["staging.example.com", "https://api-staging.example.com/login"],
  ["www.example.com", "https://api.example.com/login"],
];

let failures = 0;
for (const [hostname, expected] of cases) {
  let actual;
  try {
    actual = load(hostname);
  } catch (e) {
    actual = `THREW: ${e.message}`;
  }
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} "${hostname}" -> ${actual}`);
}

try {
  load("nope.example.com");
  console.log("FAIL unknown hostname did not throw");
  failures++;
} catch (e) {
  const ok =
    e.message.includes("nope.example.com") && e.message.includes("config.js");
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} unknown hostname threw: ${e.message}`);
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the probe to verify it fails**

Run: `node verify-config.js`

Expected: FAIL — the process exits non-zero with an error like `ENOENT: no such file or directory, open 'config.js'`, because `config.js` does not exist yet.

- [ ] **Step 3: Write the settings module**

Create `config.js`:

```js
// Per-environment settings, selected by the hostname the page is served from,
// so the same files can be deployed to every environment unchanged.
const ENVIRONMENTS = {
  // Empty hostname is a file:// URL — opening index.html directly from disk.
  "": { apiEndpoint: "http://localhost:3000/login" },
  "localhost": { apiEndpoint: "http://localhost:3000/login" },
  "127.0.0.1": { apiEndpoint: "http://localhost:3000/login" },
  "staging.example.com": { apiEndpoint: "https://api-staging.example.com/login" },
  "www.example.com": { apiEndpoint: "https://api.example.com/login" },
};

function resolveSettings(hostname) {
  const settings = ENVIRONMENTS[hostname];
  if (!settings) {
    throw new Error(
      `No settings configured for hostname "${hostname}". ` +
      `Add it to ENVIRONMENTS in config.js.`
    );
  }
  return settings;
}

const APP_SETTINGS = resolveSettings(window.location.hostname);
```

The local and staging values are placeholders the maintainer replaces with real hosts. The `www.example.com` endpoint is the value carried over verbatim from `app.js:2` — do not alter it.

- [ ] **Step 4: Run the probe to verify it passes**

Run: `node verify-config.js`

Expected: PASS — six `PASS` lines (five hostname mappings plus the throw case) followed by `ALL PASS`, exit code 0.

- [ ] **Step 5: Delete the probe and commit**

The probe is scaffolding, not a test suite; the spec decided against adding one.

```bash
rm verify-config.js
git add config.js
git commit -m "Add settings module resolving API endpoint by hostname"
```

Confirm `git status --short` shows no leftover `verify-config.js` before committing.

---

### Task 2: Wire the settings module into the page

**Risk tier:** standard — two coordinated file edits where script ordering is load-bearing; getting it wrong leaves a silently dead login form.

**Files:**
- Modify: `index.html:13`
- Modify: `app.js:2`, `app.js:6`

**Interfaces:**
- Consumes, from Task 1: the `APP_SETTINGS` global, an object with an `apiEndpoint` string property, defined by `config.js` at load time.
- Produces: nothing for later tasks; this is the final task.

**Mirror:** `index.html:13` — the new tag copies the existing `<script src="...">` form exactly, with no `type`, `defer`, or `async` attribute.

- [ ] **Step 1: Add the config script tag**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="config.js"></script>
  <script src="app.js"></script>
```

Order matters: `config.js` must define `APP_SETTINGS` before `app.js` is parsed. Do not add `defer` or `async` to either tag — both would change execution timing relative to the inline assumptions in `app.js`.

- [ ] **Step 2: Remove the hardcoded constant from `app.js`**

Delete line 2 entirely:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

The file now begins with its header comment on line 1, followed by a blank line, then `function login(...)`.

- [ ] **Step 3: Point the stub comment at the new source**

`API_ENDPOINT` is referenced only from a comment inside `login()` — the function makes no network call yet — so this is the only remaining reference to update. Change:

```js
  // Stub: would POST to API_ENDPOINT in real app
```

to:

```js
  // Stub: would POST to APP_SETTINGS.apiEndpoint in real app
```

- [ ] **Step 4: Verify no stale references remain**

Run: `grep -n "API_ENDPOINT" app.js index.html config.js`

Expected: no matches, exit status 1. Any match means a reference was missed.

- [ ] **Step 5: Verify the page loads from disk**

Open `index.html` directly in a browser (a `file://` URL). In the console, confirm:

- No error is logged on load.
- `APP_SETTINGS.apiEndpoint` evaluates to `http://localhost:3000/login` — the empty-hostname entry, which is what `file://` produces.
- `resolveSettings("nope.example.com")` throws an error naming that hostname and pointing at `config.js`.
- Submitting the form with both fields filled still logs `Login result: {success: true, user: "..."}`, and submitting it empty still logs the validation error — the pre-existing behavior is unchanged.

If the browser is unavailable in your environment, say so in the task report rather than marking this step done; Step 4 plus Task 1's probe are the automated coverage, and this step is the only check of the wiring itself.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js
git commit -m "Read API endpoint from settings module"
```
