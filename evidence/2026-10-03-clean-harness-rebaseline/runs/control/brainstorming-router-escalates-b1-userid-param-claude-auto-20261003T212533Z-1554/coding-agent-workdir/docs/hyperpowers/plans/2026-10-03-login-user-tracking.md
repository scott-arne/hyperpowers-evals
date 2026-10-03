# Login User Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-login-user-tracking-design.md

**Goal:** Make the logged-in user's server-issued `userId` available app-wide via a shared sessionStorage-backed `Session` module, with login returning (not accepting) `userId`.

**Architecture:** A new browser script `session.js` exposes `window.Session` (`setCurrentUser` / `getCurrentUser` / `clearCurrentUser`) built by an injectable `createSession(storage)` factory. `app.js` keeps `login(username, password)`, whose stub now returns the server contract shape including `userId`; form-submit logic moves into a dependency-injected `handleLoginSubmit` that writes or clears the session. Both files end with a `module.exports` guard so Node's built-in test runner can load them.

**Tech Stack:** Plain browser JavaScript (classic `<script>` tags, no bundler), Node v26 `node:test` + `node:assert/strict` for unit tests.

## Global Constraints

- No bundler or build step. Browser code is loaded via plain `<script>` tags.
- Unit tests use Node's built-in `node:test` runner (zero dependencies), run via `npm test`. No lint/format or end-to-end tooling in this scope.
- `src/` (Node CommonJS entry point) is out of scope and stays untouched.
- The client never sends a `userId` to login; `login(username, password)` signature is unchanged.
- sessionStorage key is exactly `"currentUser"`; stored value is JSON `{ userId, username }`.
- Storage failures never throw out of `session.js`.

## Grounding

- Naming (camelCase functions, UPPER_SNAKE constants): `app.js:2-4` — `API_ENDPOINT`, `login`.
- Result-object error handling (return `{ valid|success, error }` instead of throwing): `app.js:10-15` — `validateForm`.
- Console error reporting in DOM handler: `app.js:24-27`.
- CommonJS export shape: `src/utils.js:1-5` — `module.exports = { greet };`.
- Browser script loading order: `index.html:13` — `<script src="app.js"></script>`.
- Test shape: none: no existing tests or test runner in the repo; this plan introduces `test/*.test.js` with `node:test`.

---

### Task 1: Shared session module with test runner

**Risk tier:** standard — new module plus new test infrastructure (`package.json` script).

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add `scripts.test`)
- Modify: `index.html:13` (load `session.js` before `app.js`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SESSION_KEY: string` = `"currentUser"`
  - `createSession(storage) -> { setCurrentUser({ userId: string, username: string }): void, getCurrentUser(): { userId: string, username: string } | null, clearCurrentUser(): void }` — `storage` is any object with `getItem/setItem/removeItem` (Web Storage API), or `null`.
  - Browser global `window.Session` = `createSession(window.sessionStorage)`.
  - Node: `module.exports = { createSession, SESSION_KEY }`.

**Mirror:** `src/utils.js:1-5` for the export line; `app.js:10-15` for small focused functions.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the file contents with:

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

- [ ] **Step 2: Write the failing tests** — create `test/session.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSession, SESSION_KEY } = require("../session.js");

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("storage unavailable");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

test("uses the currentUser storage key", () => {
  assert.equal(SESSION_KEY, "currentUser");
});

test("set then get returns the user", () => {
  const session = createSession(fakeStorage());
  session.setCurrentUser({ userId: "user-alice", username: "alice" });
  assert.deepEqual(session.getCurrentUser(), { userId: "user-alice", username: "alice" });
});

test("get on empty storage returns null", () => {
  const session = createSession(fakeStorage());
  assert.equal(session.getCurrentUser(), null);
});

test("clear after set makes get return null", () => {
  const session = createSession(fakeStorage());
  session.setCurrentUser({ userId: "user-alice", username: "alice" });
  session.clearCurrentUser();
  assert.equal(session.getCurrentUser(), null);
});

test("corrupt JSON returns null and removes the key", () => {
  const storage = fakeStorage({ currentUser: "{not json" });
  const session = createSession(storage);
  assert.equal(session.getCurrentUser(), null);
  assert.equal(storage.has("currentUser"), false);
});

test("stored value without userId returns null and removes the key", () => {
  const storage = fakeStorage({ currentUser: JSON.stringify({ username: "alice" }) });
  const session = createSession(storage);
  assert.equal(session.getCurrentUser(), null);
  assert.equal(storage.has("currentUser"), false);
});

test("throwing storage never throws out of the session", (t) => {
  t.mock.method(console, "warn", () => {});
  const session = createSession(throwingStorage());
  assert.doesNotThrow(() => session.setCurrentUser({ userId: "user-alice", username: "alice" }));
  assert.equal(session.getCurrentUser(), null);
  assert.doesNotThrow(() => session.clearCurrentUser());
  assert.equal(console.warn.mock.callCount(), 1);
});

test("null storage behaves like unavailable storage", (t) => {
  t.mock.method(console, "warn", () => {});
  const session = createSession(null);
  assert.doesNotThrow(() => session.setCurrentUser({ userId: "user-alice", username: "alice" }));
  assert.equal(session.getCurrentUser(), null);
  assert.doesNotThrow(() => session.clearCurrentUser());
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../session.js'`.

- [ ] **Step 4: Write the implementation** — create `session.js`:

```js
// Shared session: holds the logged-in user's identity for this browser tab
const SESSION_KEY = "currentUser";

function createSession(storage) {
  function setCurrentUser({ userId, username }) {
    try {
      storage.setItem(SESSION_KEY, JSON.stringify({ userId, username }));
    } catch (err) {
      console.warn("Session: could not save current user:", err);
    }
  }

  function getCurrentUser() {
    let raw;
    try {
      raw = storage.getItem(SESSION_KEY);
    } catch (err) {
      return null;
    }
    if (raw === null) {
      return null;
    }
    try {
      const user = JSON.parse(raw);
      if (user && typeof user.userId === "string") {
        return { userId: user.userId, username: user.username };
      }
    } catch (err) {
      // Corrupt value: fall through and clear it
    }
    clearCurrentUser();
    return null;
  }

  function clearCurrentUser() {
    try {
      storage.removeItem(SESSION_KEY);
    } catch (err) {
      // Storage unavailable: nothing to clear
    }
  }

  return { setCurrentUser, getCurrentUser, clearCurrentUser };
}

if (typeof window !== "undefined") {
  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch (err) {
    // Accessing sessionStorage can throw when storage is disabled
  }
  window.Session = createSession(storage);
}

if (typeof module !== "undefined") {
  module.exports = { createSession, SESSION_KEY };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 8 tests, 0 failures.

- [ ] **Step 6: Load `session.js` in the page** — in `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 7: Commit**

```bash
git add package.json session.js test/session.test.js index.html
git commit -m "feat: add shared sessionStorage-backed Session module"
```

---

### Task 2: Login returns userId and submit handler records the session

**Risk tier:** standard — changes the login flow and its DOM wiring across `app.js`, depending on Task 1's interface.

**Files:**
- Modify: `app.js` (whole file, 29 lines)
- Create: `test/app.test.js`

**Interfaces:**
- Consumes: from Task 1 — the session object shape `{ setCurrentUser({ userId, username }), getCurrentUser(), clearCurrentUser() }` and browser global `Session`; `createSession(storage)` from `../session.js` in tests.
- Produces:
  - `login(username: string, password: string) -> { success: true, userId: string, username: string } | { success: false, error: string }` (stub always succeeds with `userId = "user-" + username`).
  - `validateForm(formData) -> { valid: true } | { valid: false, error: string }` (unchanged).
  - `handleLoginSubmit(formData: { username, password }, deps: { login, session }) -> { success: true, userId, username } | { success: false, error }`.
  - Node: `module.exports = { login, validateForm, handleLoginSubmit }`.

**Mirror:** `app.js:10-15` — result-object error handling; `app.js:17-29` — existing DOM handler being slimmed.

- [ ] **Step 1: Write the failing tests** — create `test/app.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { login, handleLoginSubmit } = require("../app.js");
const { createSession } = require("../session.js");

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("login stub returns the server contract shape with userId", () => {
  assert.deepEqual(login("alice", "secret"), {
    success: true,
    userId: "user-alice",
    username: "alice",
  });
});

test("successful login writes the user to the session", () => {
  const session = createSession(memoryStorage());
  const result = handleLoginSubmit({ username: "alice", password: "secret" }, { login, session });
  assert.equal(result.success, true);
  assert.deepEqual(session.getCurrentUser(), { userId: "user-alice", username: "alice" });
});

test("failed login clears an existing session and writes nothing", () => {
  const session = createSession(memoryStorage());
  session.setCurrentUser({ userId: "user-bob", username: "bob" });
  const failingLogin = () => ({ success: false, error: "Invalid credentials" });
  const result = handleLoginSubmit(
    { username: "alice", password: "wrong" },
    { login: failingLogin, session }
  );
  assert.deepEqual(result, { success: false, error: "Invalid credentials" });
  assert.equal(session.getCurrentUser(), null);
});

test("invalid form does not call login or touch the session", () => {
  const session = createSession(memoryStorage());
  session.setCurrentUser({ userId: "user-bob", username: "bob" });
  let loginCalled = false;
  const spyLogin = () => {
    loginCalled = true;
    return { success: true, userId: "user-x", username: "x" };
  };
  const result = handleLoginSubmit({ username: "", password: "" }, { login: spyLogin, session });
  assert.deepEqual(result, { success: false, error: "Missing required fields" });
  assert.equal(loginCalled, false);
  assert.deepEqual(session.getCurrentUser(), { userId: "user-bob", username: "bob" });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL in `test/app.test.js` with `ReferenceError: document is not defined` (current `app.js` touches the DOM at load). `test/session.test.js` still passes.

- [ ] **Step 3: Write the implementation** — replace `app.js` contents with:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  // Stub: would POST { username, password } to API_ENDPOINT in real app.
  // The real server authenticates, records the login, and returns userId.
  return { success: true, userId: "user-" + username, username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

function handleLoginSubmit(formData, { login, session }) {
  const validation = validateForm(formData);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  const result = login(formData.username, formData.password);
  if (result.success) {
    session.setCurrentUser({ userId: result.userId, username: result.username });
  } else {
    session.clearCurrentUser();
  }
  return result;
}

if (typeof document !== "undefined") {
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const result = handleLoginSubmit({ username, password }, { login, session: Session });
    if (result.success) {
      console.log("Login result:", result);
    } else {
      console.error("Login error:", result.error);
    }
  });
}

if (typeof module !== "undefined") {
  module.exports = { login, validateForm, handleLoginSubmit };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 12 tests (8 session + 4 app), 0 failures.

- [ ] **Step 5: Confirm `src/` is untouched**

Run: `git status --short src/`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app.js test/app.test.js
git commit -m "feat: return userId from login and record it in the session"
```
