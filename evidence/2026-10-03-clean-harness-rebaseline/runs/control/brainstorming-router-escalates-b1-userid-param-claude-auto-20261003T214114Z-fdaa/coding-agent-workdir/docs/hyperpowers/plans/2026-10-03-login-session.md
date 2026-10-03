# Login Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-login-session-design.md

**Goal:** Track who logged in by returning a `userId` from `login()` and persisting the logged-in user in a reusable client-side session module.

**Architecture:** A new ES module `session.js` is the sole owner of `localStorage` session state (`saveSession` / `getCurrentUser` / `clearSession`). `app.js` becomes an ES module that saves the session after a successful login and exports `logout()`. `index.html` loads `app.js` with `type="module"`.

**Tech Stack:** Vanilla browser JavaScript (ES modules), `localStorage`, Node built-in test runner (`node --test`).

## Global Constraints

- Tests use Node's built-in runner (`node --test`), no dependencies.
- No linting/formatting setup.
- `package.json` keeps its current (CommonJS) type; `src/` is untouched.
- The page must be served over HTTP (ES modules do not load from `file://`).
- `login(username, password)` keeps its signature — no `userId` parameter.
- Placeholder `userId` is `"user-" + username`, commented as a placeholder for the server-issued ID.
- No logout button; `logout()` is exported only.

## Grounding

- Naming: `app.js:4-15` — camelCase function declarations (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
- Result objects / error handling: `app.js:10-15` returns plain result objects (`{ valid: false, error: ... }`) rather than throwing; `app.js:26` reports problems with `console.error`.
- Module exports: none: no existing ES-module pattern (`src/utils.js:5` uses CommonJS `module.exports`, which is the Node side and must not be imitated in browser code).
- Test shape: none: no existing tests or test runner in the repo.

Notes verified on local Node v26.10.0:
- A `.mjs` file can `import` an ESM-syntax `.js` file without `"type": "module"` (module syntax detection).
- Node defines `globalThis.localStorage` as a configurable getter with no setter; plain assignment throws in ESM. Tests MUST install the stub with `Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true })`.

---

### Task 1: Session module with tests

**Risk tier:** standard — new module that other forms will depend on, plus test infrastructure.

**Files:**
- Create: `session.js`
- Create: `test/session.test.mjs`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces (`session.js`, ES module named exports):
  - `saveSession({ userId, username }) → boolean` — throws `Error("saveSession requires a userId")` if `userId` is falsy; returns `true` on success, `false` if storage throws.
  - `getCurrentUser() → { userId: string, username: string, loggedInAt: string } | null`
  - `clearSession() → void`

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

Create `test/session.test.mjs`:

```js
import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { saveSession, getCurrentUser, clearSession } from "../session.js";

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function installStorage(storage) {
  // Node defines localStorage as a getter-only global; assignment would throw.
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installStorage(createStorage());
  mock.method(console, "error", () => {});
});

afterEach(() => {
  mock.restoreAll();
});

test("saveSession then getCurrentUser returns the saved user", () => {
  assert.equal(saveSession({ userId: "user-alice", username: "alice" }), true);
  const user = getCurrentUser();
  assert.equal(user.userId, "user-alice");
  assert.equal(user.username, "alice");
  assert.equal(new Date(user.loggedInAt).toISOString(), user.loggedInAt);
});

test("getCurrentUser returns null when no session exists", () => {
  assert.equal(getCurrentUser(), null);
});

test("getCurrentUser returns null on corrupt JSON", () => {
  localStorage.setItem("session", "{not json");
  assert.equal(getCurrentUser(), null);
});

test("getCurrentUser returns null when stored object lacks userId", () => {
  localStorage.setItem("session", JSON.stringify({ username: "alice" }));
  assert.equal(getCurrentUser(), null);
});

test("clearSession removes the session", () => {
  saveSession({ userId: "user-alice", username: "alice" });
  clearSession();
  assert.equal(getCurrentUser(), null);
});

test("saveSession throws when userId is missing", () => {
  assert.throws(() => saveSession({ username: "alice" }), /requires a userId/);
});

test("saveSession returns false when storage setItem throws", () => {
  installStorage({
    ...createStorage(),
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  assert.equal(saveSession({ userId: "user-alice", username: "alice" }), false);
  assert.equal(console.error.mock.callCount(), 1);
});

test("getCurrentUser returns null when storage getItem throws", () => {
  installStorage({
    ...createStorage(),
    getItem: () => {
      throw new Error("SecurityError");
    },
  });
  assert.equal(getCurrentUser(), null);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found for `../session.js`.

- [ ] **Step 4: Write the implementation**

Create `session.js`:

```js
// Client-side login session, persisted in localStorage until logout.
const SESSION_KEY = "session";

export function saveSession({ userId, username }) {
  if (!userId) {
    throw new Error("saveSession requires a userId");
  }
  const session = { userId, username, loggedInAt: new Date().toISOString() };
  try {
    globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (err) {
    console.error("Could not save session:", err);
    return false;
  }
}

export function getCurrentUser() {
  try {
    const raw = globalThis.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw);
    return session && session.userId ? session : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    globalThis.localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error("Could not clear session:", err);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: 8 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.mjs package.json
git commit -m "feat: add localStorage-backed session module"
```

---

### Task 2: Wire login to the session

**Risk tier:** standard — multi-file integration (`app.js`, `index.html`) verified manually in a browser.

**Files:**
- Modify: `app.js:1-28` (whole file)
- Modify: `index.html:13`

**Interfaces:**
- Consumes: `saveSession({ userId, username }) → boolean`, `clearSession() → void` from `./session.js` (Task 1).
- Produces:
  - `login(username, password) → { success: boolean, user: string, userId: string }` (module-private, unchanged signature)
  - `export function logout() → void`

**Mirror:** `app.js:4-8`, keep the existing stub style and comment voice.

- [ ] **Step 1: Rewrite `app.js`**

Replace the file contents with:

```js
// Simple webapp with login form handling
import { saveSession, clearSession } from "./session.js";

const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app.
  // Placeholder userId until the server issues real IDs.
  return { success: true, user: username, userId: "user-" + username };
}

export function logout() {
  clearSession();
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
      saveSession({ userId: result.userId, username: result.user });
    }
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

- [ ] **Step 2: Load `app.js` as a module**

In `index.html`, change:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Syntax-check and re-run unit tests**

Run: `node --check app.js && npm test`
Expected: no syntax errors; 8 tests pass.

- [ ] **Step 4: Manual browser verification**

Run: `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`.
1. Submit with username `alice`, password `x`.
   Expected: console shows `Login result: {success: true, user: "alice", userId: "user-alice"}`; DevTools → Application → Local Storage shows key `session` with `{"userId":"user-alice","username":"alice","loggedInAt":"<ISO>"}`.
2. Reload the page. Expected: `session` key still present.
3. In the console run `(await import("./session.js")).getCurrentUser()`. Expected: the saved object.
4. Run `(await import("./app.js")).logout()` then step 3 again. Expected: `null`.
   (Re-importing `app.js` returns the cached module; it does not re-attach the listener.)
5. Submit with an empty password. Expected: `Validation error: Missing required fields`; `session` unchanged.

Stop the server afterwards.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "feat: return userId from login and persist session"
```
