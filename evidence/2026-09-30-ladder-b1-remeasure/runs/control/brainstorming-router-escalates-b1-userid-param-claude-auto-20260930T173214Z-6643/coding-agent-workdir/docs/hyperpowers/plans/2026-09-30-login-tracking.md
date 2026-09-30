# Login Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-30-login-tracking-design.md`

**Goal:** Make `login` return a server-shaped `userId` and record each successful login through a single replaceable tracking seam.

**Architecture:** `login` moves out of the DOM file into `src/auth.mjs` and returns `{ success, userId, username }` — the shape the real endpoint will return — instead of taking a `userId` parameter. A new `src/tracking.mjs` owns the tracking destination behind a `trackLogin(event)` function, so changing where events go later is a one-file change. `app.js` becomes DOM wiring only and loads as an ES module.

**Tech Stack:** Plain ES modules in the browser, Node's built-in `node:test` runner, zero third-party dependencies.

## Global Constraints

These apply to every task below.

- **No new runtime or dev dependencies.** Tests use `node:test` and `node:assert/strict` only.
- **New source and test files use the `.mjs` extension.** Do NOT add `"type": "module"` to `package.json` — it would break the existing CommonJS files.
- **Do NOT modify `src/utils.js` or `src/index.js`.** They are an unrelated demo and are out of scope.
- **`login` keeps its public signature** `login(username, password)`. No `userId` parameter. The third argument is a test-injection options object with a working default.
- The stub user ID is the exact string `"stub-user-id"`.
- Tracking fires only on successful login; failure tracking is deliberately out of scope.

---

### Task 1: Tracking seam and test infrastructure

**Risk tier:** standard — new module plus the project's first test infrastructure; later tasks depend on both.

**Files:**
- Create: `src/tracking.mjs`
- Create: `test/tracking.test.mjs`
- Modify: `package.json` (add a `scripts.test` entry)

**Interfaces:**
- Consumes: nothing.
- Produces: `trackLogin(event)` from `src/tracking.mjs`, where `event` is `{ userId: string, username: string, timestamp: string }`. Returns `undefined`. Task 2 imports this.
- Produces: a working `npm test` command that runs every `test/*.test.mjs` file. Task 2 and Task 3 rely on it.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the whole file with:

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

Note there is no `"type"` field. That is deliberate — adding one breaks `src/utils.js` and `src/index.js`.

- [ ] **Step 2: Write the failing test**

Create `test/tracking.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { trackLogin } from "../src/tracking.mjs";

/**
 * Swap console.log for a recorder while fn runs, then restore it.
 * Returns the argument arrays of each captured call.
 */
function captureConsoleLog(fn) {
  const original = console.log;
  const calls = [];
  console.log = (...args) => {
    calls.push(args);
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return calls;
}

test("trackLogin emits the userId, username and timestamp it is given", () => {
  const calls = captureConsoleLog(() =>
    trackLogin({
      userId: "u-1",
      username: "ada",
      timestamp: "2026-09-30T00:00:00.000Z",
    }),
  );

  assert.equal(calls.length, 1);
  const [label, payload] = calls[0];
  assert.equal(label, "login-event");
  assert.deepEqual(JSON.parse(payload), {
    userId: "u-1",
    username: "ada",
    timestamp: "2026-09-30T00:00:00.000Z",
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL. The error is a module resolution failure — `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `../src/tracking.mjs`, because the file does not exist yet.

- [ ] **Step 4: Write the minimal implementation**

Create `src/tracking.mjs`:

```js
/**
 * Login tracking.
 *
 * This module is the only place that knows where login events go. Changing
 * the destination — to an analytics endpoint, an audit log, anywhere — means
 * changing this file and nothing else.
 */

/**
 * Record a login event.
 *
 * @param {{userId: string, username: string, timestamp: string}} event
 * @returns {void}
 */
export function trackLogin(event) {
  console.log("login-event", JSON.stringify(event));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`

Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add package.json src/tracking.mjs test/tracking.test.mjs
git commit -m "feat: add login tracking seam"
```

---

### Task 2: Extract login into src/auth.mjs

**Risk tier:** standard — moves an existing function across files and changes its return contract; Task 3 depends on the new import path.

**Files:**
- Create: `src/auth.mjs`
- Create: `test/auth.test.mjs`
- Test: `test/auth.test.mjs`

Do not edit `app.js` in this task. Task 3 rewires it. Until then `app.js` still has its own copy of `login`; that duplication is expected and temporary.

**Interfaces:**
- Consumes: `trackLogin(event)` from `src/tracking.mjs` (Task 1).
- Produces: `login(username, password, deps)` from `src/auth.mjs`.
  - `username: string`, `password: string`
  - `deps: {track?: (event: object) => void}` — optional, defaults to `{}`; `track` defaults to `trackLogin`. Production callers pass two arguments only.
  - Returns `{ success: boolean, userId: string, username: string }`.
  - Task 3 imports this and calls it as `login(username, password)`.

- [ ] **Step 1: Write the failing tests**

Create `test/auth.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { login } from "../src/auth.mjs";

/** Collects the events passed to an injected tracker. */
function recordingTracker() {
  const events = [];
  const track = (event) => {
    events.push(event);
  };
  return { events, track };
}

test("login reports success and echoes the username back", () => {
  const { track } = recordingTracker();

  const result = login("ada", "correct-horse", { track });

  assert.equal(result.success, true);
  assert.equal(result.username, "ada");
});

test("login returns a userId", () => {
  const { track } = recordingTracker();

  const result = login("ada", "correct-horse", { track });

  assert.equal(result.userId, "stub-user-id");
});

test("login records one tracking event with all three fields", () => {
  const { events, track } = recordingTracker();

  login("ada", "correct-horse", { track });

  assert.equal(events.length, 1);
  const [event] = events;
  assert.equal(event.userId, "stub-user-id");
  assert.equal(event.username, "ada");
  // An ISO-8601 timestamp round-trips through Date without becoming NaN.
  assert.equal(typeof event.timestamp, "string");
  assert.ok(!Number.isNaN(Date.parse(event.timestamp)));
});

test("a failing tracker does not break login", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = login("ada", "correct-horse", {
      track: () => {
        throw new Error("tracking backend down");
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.username, "ada");
    assert.equal(result.userId, "stub-user-id");
  } finally {
    console.error = originalError;
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. Module resolution failure — `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `../src/auth.mjs`. The Task 1 tracking test still passes.

- [ ] **Step 3: Write the minimal implementation**

Create `src/auth.mjs`:

```js
import { trackLogin } from "./tracking.mjs";

// The endpoint this stub will POST to once the real request is implemented.
const API_ENDPOINT = "https://api.example.com/login";

// The stub has no server to get a real ID from. This value reads as fake on
// purpose: a plausible-looking ID (a hash of the username, a counter) could
// reach a tracking backend and be mistaken for real data. Replaced when the
// request to API_ENDPOINT is implemented.
const STUB_USER_ID = "stub-user-id";

/**
 * Authenticate a user.
 *
 * Currently a stub that does not contact API_ENDPOINT. The return shape
 * matches what the real endpoint is expected to return, so implementing the
 * request later does not change this function's contract for callers.
 *
 * @param {string} username
 * @param {string} password
 * @param {{track?: (event: object) => void}} [deps] Injection point for
 *   tests. Production callers omit it.
 * @returns {{success: boolean, userId: string, username: string}}
 */
export function login(username, password, { track = trackLogin } = {}) {
  const result = { success: true, userId: STUB_USER_ID, username };

  // A tracking failure must never turn a successful login into a failed one.
  try {
    track({
      userId: result.userId,
      username: result.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to record login event:", error);
  }

  return result;
}
```

`API_ENDPOINT` and `password` are both unused in the stub. Keep them: the endpoint documents where the request will go, and the parameter is the signature callers already use.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS, 5 tests total (1 from Task 1, 4 from this task).

- [ ] **Step 5: Commit**

```bash
git add src/auth.mjs test/auth.test.mjs
git commit -m "feat: return server-shaped userId from login and track logins"
```

---

### Task 3: Rewire app.js and index.html as ES modules

**Risk tier:** standard — multi-file integration that changes how the page loads; removes the now-duplicated `login` from `app.js`.

**Files:**
- Modify: `app.js` (full rewrite, 28 lines)
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `login(username, password)` from `src/auth.mjs` (Task 2).
- Produces: nothing importable. This is the application's entry point.

- [ ] **Step 1: Rewrite `app.js` as DOM wiring only**

Replace the entire contents of `app.js` with:

```js
// DOM wiring for the login form. Authentication lives in src/auth.mjs and
// login tracking in src/tracking.mjs.
import { login } from "./src/auth.mjs";

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

Three things changed from the original: the local `login` definition is gone (it now lives in `src/auth.mjs`), `API_ENDPOINT` moved with it, and the old `console.log("Logging in:", username)` inside `login` is replaced by the tracking seam. `validateForm` is unchanged and stays here.

- [ ] **Step 2: Make `index.html` load `app.js` as a module**

In `index.html`, change line 13 from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Confirm the test suite still passes**

Run: `npm test`

Expected: PASS, 5 tests. Neither file in this task is imported by the tests, so this is a regression check — it confirms Task 2's extraction did not leave the modules broken.

- [ ] **Step 4: Verify the page in a browser**

A `type="module"` page cannot be opened over `file://` — the browser blocks the module load. Serve it:

```bash
npx --yes serve -l 3000 .
```

Open `http://localhost:3000`, submit the form with a username and password, and check the browser console. Expected: two lines, a `login-event` line whose JSON carries `userId`, `username`, and `timestamp`, then `Login result: {success: true, userId: "stub-user-id", username: "<what you typed>"}`.

Then submit with both fields empty. Expected: `Validation error: Missing required fields`, and **no** `login-event` line.

If the module fails to load with a MIME type error, the static server is not serving `.mjs` as JavaScript. `npx serve` does; note the server if you hit this.

Stop the server with Ctrl-C when done.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "refactor: load app.js as a module and delegate login to src/auth.mjs"
```

---

## Verification

After Task 3, the full state is:

- `npm test` passes 5 tests.
- `login(username, password)` takes no `userId` parameter and returns `{ success, userId, username }`.
- Each successful login emits one `login-event` carrying `userId`, `username`, and `timestamp`.
- A thrown error inside the tracker does not fail the login.
- `src/utils.js` and `src/index.js` are untouched, and `package.json` has no `"type"` field.
