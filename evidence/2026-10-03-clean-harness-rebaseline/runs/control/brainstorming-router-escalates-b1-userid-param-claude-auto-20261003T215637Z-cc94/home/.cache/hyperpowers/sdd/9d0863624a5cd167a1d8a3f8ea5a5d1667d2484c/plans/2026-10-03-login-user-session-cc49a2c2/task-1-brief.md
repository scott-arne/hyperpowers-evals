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

