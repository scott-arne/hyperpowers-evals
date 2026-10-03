# User Session Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-user-session-design.md

**Goal:** Persist the logged-in user's ID in a shared session module so any part of the app can read who logged in.

**Architecture:** A new ES module `session.js` owns a single `localStorage` key (`"session"`) and exposes `setSession`/`getSession`/`getUserId`/`clearSession`. `login()` keeps its signature but returns `userId` (stubbed as the username); the form submit handler persists it via `setSession`. `index.html` loads `app.js` as a module.

**Tech Stack:** Vanilla browser JavaScript (native ES modules), Node 26 built-in test runner (`node:test`, `node:assert/strict`).

## Global Constraints

- No build step; browser code is native ES modules.
- The page must be served over HTTP (e.g. `npx serve`) — ES modules do not load from `file://`.
- No new runtime or dev dependencies.
- Unit tests use Node's built-in runner (`node --test`), invoked via `npm test`.
- `package.json` must NOT gain `"type": "module"` — `src/` is CommonJS. Node (v22.7+; v26 verified) detects ES module syntax in `session.js` automatically.
- No linter/formatter or end-to-end tooling in this change.
- Storage key is exactly `"session"`; stored value is JSON `{ userId: string, username: string, loggedInAt: string }` with `loggedInAt` an ISO-8601 timestamp.

## Grounding

- Naming / function style: `app.js:4-15` — top-level `function` declarations, camelCase, double-quoted strings, 2-space indent, semicolons.
- Result-object shape: `app.js:7` — `return { success: true, user: username };` (extend, don't rename keys).
- Error reporting: `app.js:24-27` — `console.log` for success, `console.error` for failures; the spec adds `console.warn` for non-fatal storage failures.
- Module exports: `src/utils.js:5` — CommonJS `module.exports`; NOT to be imitated for browser code (spec mandates ES `export`). `none: no existing ES module pattern in the repo`.
- Test shape: `none: no existing tests or test runner in the repo`.
- Node 26 detail (verified by probe): `globalThis.localStorage` exists as a configurable getter that returns `undefined` without `--localstorage-file`; tests must install fakes with `Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true })`.

---

### Task 1: Session module with unit tests

**Risk tier:** standard — new module plus test infrastructure and `package.json` script.

**Files:**
- Create: `session.js`
- Create: `test/session.test.mjs`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces (ES exports from `session.js`):
  - `setSession({ userId: string, username: string }): void`
  - `getSession(): { userId: string, username: string, loggedInAt: string } | null`
  - `getUserId(): string | null`
  - `clearSession(): void`

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

Create `test/session.test.mjs`:

```js
import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  setSession,
  getSession,
  getUserId,
  clearSession,
} from "../session.js";

function installStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function memoryStorage() {
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
    throw new Error("storage unavailable");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

let storage;

beforeEach(() => {
  storage = memoryStorage();
  installStorage(storage);
  mock.restoreAll();
});

test("setSession then getSession round-trips the record", () => {
  setSession({ userId: "alice", username: "alice" });
  const session = getSession();
  assert.equal(session.userId, "alice");
  assert.equal(session.username, "alice");
  assert.equal(new Date(session.loggedInAt).toISOString(), session.loggedInAt);
});

test("setSession stores JSON under the 'session' key", () => {
  setSession({ userId: "u1", username: "bob" });
  const stored = JSON.parse(storage.data.get("session"));
  assert.equal(stored.userId, "u1");
  assert.equal(stored.username, "bob");
});

test("getSession returns null when nothing is stored", () => {
  assert.equal(getSession(), null);
});

test("getUserId returns the stored id", () => {
  setSession({ userId: "u1", username: "bob" });
  assert.equal(getUserId(), "u1");
});

test("getUserId returns null when no session exists", () => {
  assert.equal(getUserId(), null);
});

test("clearSession removes the session", () => {
  setSession({ userId: "u1", username: "bob" });
  clearSession();
  assert.equal(getSession(), null);
  assert.equal(storage.data.has("session"), false);
});

test("invalid JSON yields null and removes the key", () => {
  storage.data.set("session", "{not json");
  assert.equal(getSession(), null);
  assert.equal(storage.data.has("session"), false);
});

test("stored object without userId yields null and removes the key", () => {
  storage.data.set("session", JSON.stringify({ username: "bob" }));
  assert.equal(getSession(), null);
  assert.equal(storage.data.has("session"), false);
});

test("non-object stored value yields null and removes the key", () => {
  storage.data.set("session", "42");
  assert.equal(getSession(), null);
  assert.equal(storage.data.has("session"), false);
});

test("throwing storage: setSession and clearSession warn instead of throwing", () => {
  installStorage(throwingStorage());
  const warn = mock.method(console, "warn", () => {});
  assert.doesNotThrow(() => setSession({ userId: "u1", username: "bob" }));
  assert.doesNotThrow(() => clearSession());
  assert.equal(warn.mock.callCount(), 2);
});

test("throwing storage: getSession and getUserId return null", () => {
  installStorage(throwingStorage());
  mock.method(console, "warn", () => {});
  assert.equal(getSession(), null);
  assert.equal(getUserId(), null);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../session.js'` (ERR_MODULE_NOT_FOUND).

- [ ] **Step 4: Write the implementation**

Create `session.js`:

```js
// Persisted login session shared across the app
const SESSION_KEY = "session";

export function setSession({ userId, username }) {
  const record = { userId, username, loggedInAt: new Date().toISOString() };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn("Could not save session:", err);
  }
}

export function getSession() {
  let raw;
  try {
    raw = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (raw === null || raw === undefined) {
    return null;
  }
  const record = parseSession(raw);
  if (record === null) {
    clearSession();
  }
  return record;
}

export function getUserId() {
  return getSession()?.userId ?? null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn("Could not clear session:", err);
  }
}

function parseSession(raw) {
  try {
    const record = JSON.parse(raw);
    if (record && typeof record === "object" && record.userId) {
      return record;
    }
  } catch {
    // Fall through: corrupt data is treated as no session
  }
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 11 tests, 0 failures. Also run `node src/index.js` and expect `Hello, world!` (confirms `src/` CommonJS is unaffected).

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.mjs package.json
git commit -m "feat: add persisted session module with unit tests"
```

---

### Task 2: Wire login to the session module

**Risk tier:** standard — multi-file integration (`app.js` becomes an ES module, `index.html` script type changes); verified manually in a browser.

**Files:**
- Modify: `app.js:1-28` (add import, `login()` return value, submit handler)
- Modify: `index.html:14` (script tag)

**Interfaces:**
- Consumes: `setSession({ userId: string, username: string }): void` from `./session.js` (Task 1).
- Produces: `login(username, password)` returns `{ success: true, user: string, userId: string }`.

**Mirror:** `app.js:22-27` — keep the existing `validation.valid` branch structure and `console.log`/`console.error` style.

- [ ] **Step 1: Add the import at the top of `app.js`**

Change lines 1-2 from:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";
```

to:

```js
// Simple webapp with login form handling
import { setSession } from "./session.js";

const API_ENDPOINT = "https://api.example.com/login";
```

- [ ] **Step 2: Return `userId` from `login()`**

Replace the `login` function with:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  // Stub: replace with the server-provided user ID once the API exists
  const userId = username;
  return { success: true, user: username, userId };
}
```

- [ ] **Step 3: Persist the session in the submit handler**

Replace the `if (validation.valid) { ... }` block with:

```js
  if (validation.valid) {
    const result = login(username, password);
    if (result.success) {
      setSession({ userId: result.userId, username: result.user });
      console.log(`Logged in: ${result.user} (userId: ${result.userId})`);
    } else {
      console.error("Login failed:", result);
    }
  } else {
```

(The trailing `console.error("Validation error:", validation.error);` branch is unchanged.)

- [ ] **Step 4: Load `app.js` as a module**

In `index.html`, change:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 5: Verify unit tests still pass and syntax is valid**

Run: `npm test && node --check app.js`
Expected: 11 tests pass; `node --check` exits 0 with no output.

- [ ] **Step 6: Manually verify in a browser**

Run: `npx --yes serve -l 3000 .` (or `python3 -m http.server 3000`), open `http://localhost:3000/`, enter username `alice` and any password, submit.
Expected:
- Console shows `Logged in: alice (userId: alice)`.
- DevTools → Application → Local Storage → `session` holds `{"userId":"alice","username":"alice","loggedInAt":"<ISO timestamp>"}`.
- Running `(await import("/session.js")).getUserId()` in the console returns `"alice"`; after a page reload it still returns `"alice"`.
- Submitting with an empty password logs `Validation error: Missing required fields` and does not change `session`.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "feat: persist logged-in user id via session module"
```
