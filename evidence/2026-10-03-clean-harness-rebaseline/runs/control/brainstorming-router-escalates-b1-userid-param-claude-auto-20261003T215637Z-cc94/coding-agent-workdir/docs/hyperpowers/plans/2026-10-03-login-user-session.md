# Login User Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-03-login-user-session-design.md`

**Goal:** Capture a `userId` on successful login and make it available across the app for the life of the browser tab, through a shared `Session` module.

**Architecture:** A new plain browser script `session.js` defines a global `Session` object backed by `sessionStorage`. It also exports itself via `module.exports` when loaded by Node, for tests. `login(username, password)` in `app.js` returns a `userId`, and the submit handler saves it via `Session.setCurrentUser` only on success. `index.html` loads `session.js` before `app.js`.

**Tech Stack:** Vanilla browser JavaScript (classic `<script>` tags); Node's built-in test runner (`node --test`, Node v26) for unit tests.

## Global Constraints

- No runtime or dev dependencies are added.
- Unit tests run with `npm test` (`node --test`).
- Browser behavior is unchanged except for the additions described here.
- `login()` keeps the signature `login(username, password)`; it gains no `userId` parameter.
- Storage key is exactly `"currentUser"`; the stored value is `JSON.stringify({ userId, username })`.
- Future consumers use `Session.getCurrentUserId()`, never `sessionStorage` directly.

## Grounding

- Naming (camelCase functions, `UPPER_SNAKE` constants): `app.js:2-4`, which shows `API_ENDPOINT` and `login`.
- Error reporting to the console: `app.js:24-27`, which uses `console.log` / `console.error` with a label string. Use `console.warn` in the same style.
- Stub marking: `app.js:6`, the comment `// Stub: would POST to API_ENDPOINT in real app`.
- CommonJS export: `src/utils.js:5`, `module.exports = { greet };`.
- Result-object returns: `app.js:10-15`, where `validateForm` returns `{ valid, error }`.
- Test shape: none. The repo has no existing tests or runner.
- Browser/Node dual-loading guard: none. There is no existing pattern for `typeof module` / `typeof document` guards.

**Environment note:** Node v26 defines a built-in `globalThis.sessionStorage` through a configurable getter/setter. Tests MUST install their fake with `Object.defineProperty(globalThis, "sessionStorage", { value: fake, configurable: true, writable: true })`, not plain assignment.

---

### Task 1: `Session` module with unit tests and test runner

**Risk tier:** standard (new module, a new test setup, and storage error handling that the trust-boundary comment depends on)

**Files:**
- Create: `session.js`
- Create: `tests/session.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces (global `Session` in the browser; `module.exports = Session` in Node):
  - `Session.setCurrentUser({ userId: string, username: string }): void`. Throws `Error("setCurrentUser requires a userId")` if `userId` is falsy.
  - `Session.getCurrentUser(): { userId: string, username: string } | null`
  - `Session.getCurrentUserId(): string | null`
  - `Session.clearSession(): void`

**Mirror:** `src/utils.js:5` for the export line; `app.js:6` for the comment style.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the file with:

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

- [ ] **Step 2: Write the failing tests in `tests/session.test.js`**

```js
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const Session = require("../session.js");

function installStorage(storage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("SecurityError: storage disabled");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

let storage;
let warnings;
let originalWarn;

beforeEach(() => {
  storage = fakeStorage();
  installStorage(storage);
  warnings = [];
  originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
});

afterEach(() => {
  console.warn = originalWarn;
});

test("setCurrentUser then getCurrentUser returns the user", () => {
  Session.setCurrentUser({ userId: "u-1", username: "alice" });
  assert.deepEqual(Session.getCurrentUser(), { userId: "u-1", username: "alice" });
  assert.equal(storage.data.get("currentUser"), JSON.stringify({ userId: "u-1", username: "alice" }));
});

test("getCurrentUserId returns the id, or null when empty", () => {
  assert.equal(Session.getCurrentUserId(), null);
  Session.setCurrentUser({ userId: "u-2", username: "bob" });
  assert.equal(Session.getCurrentUserId(), "u-2");
});

test("getCurrentUser returns null when nothing is stored", () => {
  assert.equal(Session.getCurrentUser(), null);
});

test("clearSession removes the stored user", () => {
  Session.setCurrentUser({ userId: "u-3", username: "carol" });
  Session.clearSession();
  assert.equal(storage.data.has("currentUser"), false);
  assert.equal(Session.getCurrentUser(), null);
});

test("setCurrentUser throws when userId is missing or empty", () => {
  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
  assert.throws(() => Session.setCurrentUser({ userId: "", username: "alice" }), /requires a userId/);
  assert.equal(storage.data.has("currentUser"), false);
});

test("setCurrentUser throws on missing userId even when storage is unavailable", () => {
  installStorage(throwingStorage());
  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
});

test("corrupt JSON is treated as empty and removed", () => {
  storage.data.set("currentUser", "{not json");
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(storage.data.has("currentUser"), false);
});

test("stored value without userId is treated as empty and removed", () => {
  storage.data.set("currentUser", JSON.stringify({ username: "alice" }));
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(storage.data.has("currentUser"), false);
});

test("unavailable storage warns and never throws", () => {
  installStorage(throwingStorage());
  assert.doesNotThrow(() => Session.setCurrentUser({ userId: "u-4", username: "dave" }));
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(Session.getCurrentUserId(), null);
  assert.doesNotThrow(() => Session.clearSession());
  assert.ok(warnings.length >= 1, "expected at least one console.warn");
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../session.js'`.

- [ ] **Step 4: Write `session.js`**

```js
// Client-side session: remembers the logged-in user for the life of the tab.
// The stored userId is client-side context only. Servers must check identity
// from their own session or token, never trust this value.
const Session = (() => {
  const STORAGE_KEY = "currentUser";

  function setCurrentUser({ userId, username } = {}) {
    if (!userId) {
      throw new Error("setCurrentUser requires a userId");
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, username }));
    } catch (err) {
      console.warn("Session storage unavailable; user not saved:", err);
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Session storage unavailable; could not clear:", err);
    }
  }

  function getCurrentUser() {
    let raw;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Session storage unavailable; no current user:", err);
      return null;
    }
    if (raw === null) {
      return null;
    }
    let user = null;
    try {
      user = JSON.parse(raw);
    } catch (err) {
      user = null;
    }
    if (!user || !user.userId) {
      clearSession();
      return null;
    }
    return { userId: user.userId, username: user.username };
  }

  function getCurrentUserId() {
    const user = getCurrentUser();
    return user ? user.userId : null;
  }

  return { setCurrentUser, getCurrentUser, getCurrentUserId, clearSession };
})();

if (typeof module !== "undefined") {
  module.exports = Session;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with all 9 tests in `tests/session.test.js` passing.

- [ ] **Step 6: Commit**

```bash
git add package.json session.js tests/session.test.js
git commit -m "feat: add Session module for tracking the logged-in user"
```

---

### Task 2: `login()` returns `userId`; save it to `Session` on success

**Risk tier:** standard (multi-file integration across `app.js` and `index.html`, plus a change to `login()`'s return shape)

**Files:**
- Modify: `app.js:1-28` (whole file)
- Modify: `index.html:13` (script tags)
- Create: `tests/app.test.js`

**Interfaces:**
- Consumes: global `Session.setCurrentUser({ userId, username })` from Task 1, used in the browser only. `app.js` must not `require` it.
- Produces: `login(username: string, password: string): { success: boolean, user: string, userId: string }`. Under Node, `module.exports = { login, validateForm }`.

**Mirror:** `app.js:6` for the `// Stub:` comment; `src/utils.js:5` for the export.

- [ ] **Step 1: Write the failing tests in `tests/app.test.js`**

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("loading app.js without a DOM does not throw", () => {
  assert.equal(typeof document, "undefined");
  assert.doesNotThrow(() => require("../app.js"));
});

test("login returns success, user, and a non-empty userId", () => {
  const { login } = require("../app.js");
  const result = login("alice", "pw");
  assert.equal(result.success, true);
  assert.equal(result.user, "alice");
  assert.equal(typeof result.userId, "string");
  assert.ok(result.userId.length > 0);
});

test("validateForm is still exported and unchanged", () => {
  const { validateForm } = require("../app.js");
  assert.deepEqual(validateForm({ username: "a", password: "b" }), { valid: true });
  assert.deepEqual(validateForm({ username: "", password: "b" }), {
    valid: false,
    error: "Missing required fields",
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL. `tests/app.test.js` errors with `ReferenceError: document is not defined`, because `app.js` wires up the DOM when it loads.

- [ ] **Step 3: Rewrite `app.js`**

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app; userId would come from the response
  return { success: true, user: username, userId: "stub-" + username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

if (typeof document !== "undefined") {
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const validation = validateForm({ username, password });
    if (validation.valid) {
      const result = login(username, password);
      console.log("Login result:", result);
      if (result.success) {
        Session.setCurrentUser({ userId: result.userId, username: result.user });
      }
    } else {
      console.error("Validation error:", validation.error);
    }
  });
}

if (typeof module !== "undefined") {
  module.exports = { login, validateForm };
}
```

- [ ] **Step 4: Load `session.js` before `app.js` in `index.html`**

Replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with all 12 tests passing (9 from `tests/session.test.js`, 3 from `tests/app.test.js`).

- [ ] **Step 6: Manual browser check**

Open `index.html` in a browser, enter any username and password, and submit. In DevTools → Application → Session Storage, confirm `currentUser` is `{"userId":"stub-<username>","username":"<username>"}`. Reload the page and confirm it is still there. Submit with an empty password and confirm `currentUser` does not change.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html tests/app.test.js
git commit -m "feat: return userId from login and save it to Session"
```
