# Login User Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-login-user-tracking-design.md

**Goal:** Record who logged in and make the logged-in user's `userId` available app-wide for the lifetime of the browser tab.

**Architecture:** A new plain-browser-script `session.js` defines one global `Session` object backed by `sessionStorage` and a stubbed login-event sink. `app.js`'s `login()` stub returns a placeholder server-issued `userId`; the submit handler stores it via `Session` and records a login event. `index.html` loads `session.js` before `app.js`.

**Tech Stack:** Vanilla browser JavaScript (classic `<script>` tags, no build), Node 26 built-in test runner (`node:test`, `node:assert`), CommonJS for the Node test path.

## Global Constraints

- `login(username, password)` keeps its current signature; `userId` comes from its return value, never from a caller-supplied parameter.
- Persistence: `sessionStorage`, single key `"session.user"`, value `JSON.stringify({ userId, username })`.
- Packaging: plain browser script exposing a single `Session` global, loaded before `app.js`. No build step, no ES modules.
- Tracking is best-effort: storage failures are caught and logged with `console.error`; they never throw and never block login.
- No dependencies added. Test script: `"scripts": { "test": "node --test" }`.
- Out of scope: `logout()`, real backend calls, ES modules/bundler, consuming `Session` from other forms.

## Grounding

- Naming (camelCase functions, double-quoted strings, 2-space indent): `app.js:4-15` (`login`, `validateForm`).
- Stub-with-comment for unimplemented backend calls: `app.js:4-8` (`// Stub: would POST to API_ENDPOINT in real app`).
- Error reporting: `app.js:25-27` (`console.error("Validation error:", ...)`) — label string then value.
- CommonJS export for Node: `src/utils.js:5` (`module.exports = { greet };`).
- Test shape: `none: no existing tests or test runner in this repo`.
- Browser/Node dual-loading guard: `none: no existing pattern for a script loaded both by the browser and by Node`.

---

### Task 1: `Session` module with unit tests

**Risk tier:** standard — new file plus new test infrastructure (`package.json` script, first test file).

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: global `Session` (browser) / `module.exports = Session` (Node) with:
  - `Session.setUser({ userId, username })` → `undefined`; writes to `sessionStorage["session.user"]`; never throws.
  - `Session.getUser()` → `{ userId: string, username: string } | null`.
  - `Session.getUserId()` → `string | null`.
  - `Session.recordLogin({ userId, username })` → `{ type: "login", userId, username, timestamp }` (ISO-8601 string); logs `console.log("Login event:", event)`; never throws.

**Mirror:** `app.js:4-8` for naming and stub-comment style; `src/utils.js:5` for the export line.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the whole file with:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `test/session.test.js`:

```js
const { test, beforeEach } = require("node:test");
const assert = require("node:assert");

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function createThrowingStorage() {
  return {
    getItem: () => {
      throw new Error("storage unavailable");
    },
    setItem: () => {
      throw new Error("storage unavailable");
    },
    removeItem: () => {
      throw new Error("storage unavailable");
    },
  };
}

const Session = require("../session.js");

beforeEach(() => {
  globalThis.sessionStorage = createMemoryStorage();
});

test("setUser then getUser/getUserId round-trips", () => {
  Session.setUser({ userId: "user-alice", username: "alice" });
  assert.deepStrictEqual(Session.getUser(), {
    userId: "user-alice",
    username: "alice",
  });
  assert.strictEqual(Session.getUserId(), "user-alice");
});

test("empty storage returns null", () => {
  assert.strictEqual(Session.getUser(), null);
  assert.strictEqual(Session.getUserId(), null);
});

test("corrupted JSON returns null", () => {
  globalThis.sessionStorage.setItem("session.user", "{not json");
  assert.strictEqual(Session.getUser(), null);
  assert.strictEqual(Session.getUserId(), null);
});

test("throwing storage does not throw and reads return null", (t) => {
  t.mock.method(console, "error", () => {});
  globalThis.sessionStorage = createThrowingStorage();
  assert.doesNotThrow(() =>
    Session.setUser({ userId: "user-alice", username: "alice" })
  );
  assert.strictEqual(Session.getUser(), null);
  assert.strictEqual(Session.getUserId(), null);
});

test("recordLogin returns a login event with ISO timestamp", (t) => {
  t.mock.method(console, "log", () => {});
  const event = Session.recordLogin({ userId: "user-alice", username: "alice" });
  assert.strictEqual(event.type, "login");
  assert.strictEqual(event.userId, "user-alice");
  assert.strictEqual(event.username, "alice");
  assert.strictEqual(new Date(event.timestamp).toISOString(), event.timestamp);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../session.js'`.

- [ ] **Step 4: Write the implementation**

Create `session.js`:

```js
// Shared session state for the logged-in user (persists until the tab closes)
const SESSION_KEY = "session.user";

const Session = {
  setUser({ userId, username }) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, username }));
    } catch (err) {
      console.error("Session storage error:", err);
    }
  },

  getUser() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw === null) {
        return null;
      }
      const { userId, username } = JSON.parse(raw);
      return { userId, username };
    } catch (err) {
      return null;
    }
  },

  getUserId() {
    return Session.getUser()?.userId ?? null;
  },

  recordLogin({ userId, username }) {
    const event = {
      type: "login",
      userId,
      username,
      timestamp: new Date().toISOString(),
    };
    // Stub: would POST event to a tracking endpoint in real app
    console.log("Login event:", event);
    return event;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Session;
}
```

Notes for the implementer: `sessionStorage` is referenced inside each method (resolved at call time), so tests can swap `globalThis.sessionStorage` per test. `getUser` returns `null` for a stored JSON `null` too, because destructuring `null` throws into the `catch`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.js package.json
git commit -m "feat: add Session module for logged-in user tracking"
```

---

### Task 2: Wire `Session` into the login flow

**Risk tier:** standard — multi-file integration (`app.js` + `index.html`) verified manually in a browser.

**Files:**
- Modify: `app.js:4-8` (`login` return value)
- Modify: `app.js:22-24` (submit handler success branch)
- Modify: `index.html:13` (script tags)

**Interfaces:**
- Consumes: global `Session.setUser({ userId, username })` and `Session.recordLogin({ userId, username })` from Task 1.
- Produces: `login(username, password)` → `{ success: true, user: string, userId: string }`.

**Mirror:** `app.js:4-8` and `app.js:17-28` — keep the existing style.

- [ ] **Step 1: Run the existing tests as a baseline**

Run: `npm test`
Expected: PASS — 5 tests (from Task 1).

- [ ] **Step 2: Return a placeholder `userId` from `login`**

In `app.js`, replace lines 4-8 with:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app; server would issue userId
  return { success: true, user: username, userId: "user-" + username };
}
```

- [ ] **Step 3: Store the user and record the login on success**

In `app.js`, replace the success branch (current lines 22-24):

```js
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
```

with:

```js
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
    if (result.success && result.userId) {
      const user = { userId: result.userId, username: result.user };
      Session.setUser(user);
      Session.recordLogin(user);
    }
```

The `} else {` branch and everything after stays unchanged.

- [ ] **Step 4: Load `session.js` before `app.js`**

In `index.html`, replace:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 5: Syntax-check and re-run tests**

Run: `node --check app.js && node --check session.js && npm test`
Expected: no syntax errors; 5 tests PASS.

- [ ] **Step 6: Manual browser verification**

Open `index.html` directly in a browser (`open index.html` on macOS). Open DevTools console. Enter username `alice`, any password, submit.
Expected console output, in order:
- `Logging in: alice`
- `Login result: {success: true, user: "alice", userId: "user-alice"}`
- `Login event: {type: "login", userId: "user-alice", username: "alice", timestamp: "<ISO>"}`

Then in the console run `Session.getUserId()` → `"user-alice"`, and `sessionStorage.getItem("session.user")` → `'{"userId":"user-alice","username":"alice"}'`. Reload the page and re-run `Session.getUserId()` → still `"user-alice"`.
Submit with an empty password → `Validation error: Missing required fields`, no `Login event`.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "feat: track logged-in user via Session on login"
```
