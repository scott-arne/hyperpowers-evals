# Current-User Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-current-user-session-design.md

**Goal:** Persist the logged-in user (`userId`, `username`, `loggedInAt`) in localStorage behind a shared `session.js` ES module, and have `login()` return the `userId`.

**Architecture:** `session.js` exports `createSession(storage)` (dependency-injected storage, for tests) and a default `session` instance backed by `localStorage`. `app.js` becomes an ES module. On a successful `login()` it calls `session.setCurrentUser(...)`. `login()` keeps its `(username, password)` signature and returns `{ success, user, userId }`.

**Tech Stack:** Plain browser JavaScript (ES modules), Node 26 `node:test` + `node:assert/strict` for unit tests. No dependencies.

## Global Constraints

- Unit tests run with `npm test` (`node --test`); no test dependencies.
- No new runtime or dev dependencies.
- Existing CommonJS code in `src/` is left untouched; do not add `"type": "module"` to `package.json`.
- Pages must be served over HTTP (ES modules do not load from `file://`).
- Storage key: `"currentUser"`. Stored value: JSON `{ "userId": string, "username": string, "loggedInAt": string }`, where `loggedInAt` is ISO-8601.

## Grounding

- Naming (camelCase functions, UPPER_SNAKE constants): `app.js:2-15` — `API_ENDPOINT`, `login`, `validateForm`.
- Error reporting: `app.js:26` — `console.error("Validation error:", validation.error);` (message string, then the detail).
- Result-object return shape: `app.js:7` — `return { success: true, user: username };`.
- Module exports: `src/utils.js:5` uses CommonJS `module.exports`; `none: no existing ES-module pattern` — `session.js` is the first ES module.
- Test shape: `none: no existing tests or test runner in this repo`.
- Verified on Node v26.10.0 (2026-10-03): `globalThis.localStorage` is `undefined` without `--localstorage-file`, and reading it prints a one-time `ExperimentalWarning` (expected in test output, harmless). A `.js` file with `export` syntax and no `"type": "module"` is loaded as ESM without a warning.

---

### Task 1: `session.js` module with unit tests

**Risk tier:** standard — new module plus test infrastructure; durable client-side storage format.

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function createSession(storage = globalThis.localStorage)` → `{ setCurrentUser, getCurrentUser, clearCurrentUser }`
  - `setCurrentUser({ userId: string, username: string }) → void`: throws `TypeError` if `userId` is not a non-empty string; never throws on storage errors.
  - `getCurrentUser() → { userId: string, username: string, loggedInAt: string } | null`
  - `clearCurrentUser() → void`: never throws.
  - `export const session`: the default instance, `createSession()`.

**Mirror:** `app.js:26`, error reporting via `console.error("<message>:", detail)`.

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

- [ ] **Step 2: Write the failing tests**

Create `test/session.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../session.js";

const KEY = "currentUser";

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
}

test("set then get returns the user with an ISO loggedInAt", () => {
  const s = createSession(fakeStorage());
  s.setCurrentUser({ userId: "u1", username: "alice" });
  const user = s.getCurrentUser();
  assert.equal(user.userId, "u1");
  assert.equal(user.username, "alice");
  assert.equal(new Date(user.loggedInAt).toISOString(), user.loggedInAt);
});

test("get returns null when nothing is stored", () => {
  const s = createSession(fakeStorage());
  assert.equal(s.getCurrentUser(), null);
});

test("clear removes the stored user", () => {
  const storage = fakeStorage();
  const s = createSession(storage);
  s.setCurrentUser({ userId: "u1", username: "alice" });
  s.clearCurrentUser();
  assert.equal(s.getCurrentUser(), null);
  assert.equal(storage.data.has(KEY), false);
});

test("a second set overwrites the first", () => {
  const s = createSession(fakeStorage());
  s.setCurrentUser({ userId: "u1", username: "alice" });
  s.setCurrentUser({ userId: "u2", username: "bob" });
  assert.equal(s.getCurrentUser().userId, "u2");
  assert.equal(s.getCurrentUser().username, "bob");
});

test("unparseable JSON returns null and removes the entry", () => {
  const storage = fakeStorage({ [KEY]: "{not json" });
  const s = createSession(storage);
  assert.equal(s.getCurrentUser(), null);
  assert.equal(storage.data.has(KEY), false);
});

test("a stored record without userId returns null and removes the entry", () => {
  const storage = fakeStorage({ [KEY]: JSON.stringify({ username: "alice" }) });
  const s = createSession(storage);
  assert.equal(s.getCurrentUser(), null);
  assert.equal(storage.data.has(KEY), false);
});

test("set does not throw when setItem throws, and logs an error", (t) => {
  const errorSpy = t.mock.method(console, "error", () => {});
  const storage = fakeStorage();
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const s = createSession(storage);
  assert.doesNotThrow(() => s.setCurrentUser({ userId: "u1", username: "alice" }));
  assert.equal(errorSpy.mock.callCount(), 1);
});

test("get returns null when getItem throws", () => {
  const storage = fakeStorage();
  storage.getItem = () => {
    throw new Error("SecurityError");
  };
  const s = createSession(storage);
  assert.equal(s.getCurrentUser(), null);
});

test("set without a userId throws TypeError", () => {
  const s = createSession(fakeStorage());
  assert.throws(() => s.setCurrentUser({ username: "alice" }), TypeError);
  assert.throws(() => s.setCurrentUser({ userId: "", username: "alice" }), TypeError);
});

test("createSession(undefined) works with no storage available", (t) => {
  t.mock.method(console, "error", () => {});
  // Under Node, globalThis.localStorage is undefined, so the default applies.
  const s = createSession(undefined);
  assert.equal(s.getCurrentUser(), null);
  assert.doesNotThrow(() => s.setCurrentUser({ userId: "u1", username: "alice" }));
  assert.doesNotThrow(() => s.clearCurrentUser());
});
```

(The tests use the per-test `t.mock`, which is restored automatically after each test.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL. The test file errors with `Cannot find module '.../session.js'` (ERR_MODULE_NOT_FOUND).

- [ ] **Step 4: Write the implementation**

Create `session.js`:

```js
// Current-user session: the single place that reads/writes who is logged in.
const STORAGE_KEY = "currentUser";

export function createSession(storage = globalThis.localStorage) {
  function setCurrentUser({ userId, username } = {}) {
    if (typeof userId !== "string" || userId === "") {
      throw new TypeError("setCurrentUser requires a non-empty string userId");
    }
    const record = { userId, username, loggedInAt: new Date().toISOString() };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (err) {
      console.error("Could not save current user:", err);
    }
  }

  function getCurrentUser() {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw == null) return null;

    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      record = null;
    }
    if (record && typeof record === "object" && typeof record.userId === "string") {
      return record;
    }
    removeQuietly();
    return null;
  }

  function clearCurrentUser() {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Could not clear current user:", err);
    }
  }

  function removeQuietly() {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; nothing more to do.
    }
  }

  return { setCurrentUser, getCurrentUser, clearCurrentUser };
}

export const session = createSession();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 10 tests, 0 failures. A single `ExperimentalWarning: localStorage is not available...` line is expected and harmless.

- [ ] **Step 6: Commit**

```bash
git add package.json session.js test/session.test.js
git commit -m "feat: add current-user session module backed by localStorage"
```

---

### Task 2: Wire login to the session and switch the page to ES modules

**Risk tier:** standard — multi-file integration (`app.js` + `index.html`), verified manually in a browser.

**Files:**
- Modify: `app.js:1-28`
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `import { session } from "./session.js"`; `session.setCurrentUser({ userId: string, username: string })` from Task 1.
- Produces: `login(username, password) → { success: boolean, user: string, userId: string }`.

**Mirror:** `app.js:7`, result-object return shape.

- [ ] **Step 1: Update `app.js`**

Replace the file contents with:

```js
// Simple webapp with login form handling
import { session } from "./session.js";

const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app.
  // Real app: take userId from the API response, not from client input.
  const userId = username;
  return { success: true, user: username, userId };
}

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
    if (result.success) {
      session.setCurrentUser({ userId: result.userId, username: result.user });
    }
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

- [ ] **Step 2: Load `app.js` as a module**

In `index.html`, change line 13 from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Confirm the unit tests still pass**

Run: `npm test`
Expected: PASS, 10 tests, 0 failures.

- [ ] **Step 4: Manual browser check**

Run from the repo root: `python3 -m http.server 8000`
Open `http://localhost:8000/`. Then:
1. Enter username `alice` and any password, and submit. The console shows `Login result: {success: true, user: "alice", userId: "alice"}` and no errors.
2. In the DevTools console, `JSON.parse(localStorage.currentUser)` returns `{ userId: "alice", username: "alice", loggedInAt: "<ISO timestamp>" }`.
3. Reload the page and repeat step 2. The record is still there.
4. Submit with the password empty. The console shows `Validation error: Missing required fields`, and `localStorage.currentUser` is unchanged.

Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "feat: return userId from login and persist current user"
```
