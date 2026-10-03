# Persisted userId Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-03-persisted-userid-session-design.md`

**Goal:** After a successful login, persist the user's `userId` in `localStorage` via a shared `session.js` ES module that any form can import.

**Architecture:** `session.js` is the sole owner of `localStorage` (`setUser`/`getUser`/`clearUser`, storage failures swallowed). `login()` moves from `app.js` into a DOM-free `auth.js` module, returns a (stub) `userId`, and persists it on success. `app.js` becomes a browser ES module holding only DOM wiring and `validateForm`.

**Tech Stack:** Vanilla browser JavaScript (ES modules, no build step); Node built-in `node:test` + `node:assert/strict` for unit tests (Node v26 installed).

## Global Constraints

- No new runtime or dev dependencies.
- Unit tests run with `npm test` using `node:test`.
- Only `session.js` may access `localStorage` directly.
- Never store secrets (passwords, tokens) in `localStorage` — `userId` only.
- Do not add `"type": "module"` to `package.json` (it would break CommonJS `src/`). Browser modules at the repo root are ESM-syntax `.js`; tests are `.mjs`. (Assumption from spec validated 2026-10-03 on Node v26.10.0: a `.mjs` test importing an ESM-syntax `.js` file in a non-`"type":"module"` package passes under `node --test`.)

## Grounding

- Naming: `app.js:4-15` — camelCase function declarations (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
- Error handling: `app.js:10-15` — validation returns result objects (`{ valid: false, error }`) rather than throwing; `app.js:26` logs errors with `console.error`. No existing `try/catch` pattern.
- Module exports: `src/utils.js:5` — CommonJS `module.exports`; no existing ES module in repo (`none: no existing ESM pattern`).
- Test shape: `none: no existing tests or test runner in the repo`.
- Test env fact: in Node v26, `globalThis.localStorage` is a configurable accessor that returns `undefined` (with an ExperimentalWarning) unless `--localstorage-file` is passed; tests must install fakes with `Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true })` — plain assignment hits the native setter.

---

### Task 1: `session.js` module with tests and `npm test`

**Risk tier:** standard — new module plus new test infrastructure (`package.json` script).

**Files:**
- Create: `session.js`
- Create: `test/session.test.mjs`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces (ES module `./session.js`):
  - `export const STORAGE_KEY = "app.session.userId"`
  - `export function setUser(userId: string | number): void` — throws `TypeError` on `null`/`undefined`/`""`; storage errors → `console.warn`, no throw.
  - `export function getUser(): string | null`
  - `export function clearUser(): void` — storage errors → `console.warn`, no throw.

**Mirror:** `app.js:4-15` for naming/style.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the full file with:

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

- [ ] **Step 2: Write the failing tests** — `test/session.test.mjs`:

```js
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, setUser, getUser, clearUser } from "../session.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("storage disabled");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function installStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installStorage(memoryStorage());
});

test("setUser stores the id under STORAGE_KEY and getUser returns it", () => {
  setUser("u-123");
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY), "u-123");
  assert.equal(getUser(), "u-123");
});

test("setUser stringifies numeric ids", () => {
  setUser(42);
  assert.equal(getUser(), "42");
});

test("getUser returns null when nothing is stored", () => {
  assert.equal(getUser(), null);
});

test("clearUser removes the stored id", () => {
  setUser("u-123");
  clearUser();
  assert.equal(getUser(), null);
});

test("setUser rejects null, undefined, and empty string", () => {
  for (const bad of [null, undefined, ""]) {
    assert.throws(() => setUser(bad), TypeError);
  }
});

test("storage failures never throw", (t) => {
  t.mock.method(console, "warn", () => {});
  installStorage(throwingStorage());
  assert.equal(getUser(), null);
  assert.doesNotThrow(() => setUser("u-123"));
  assert.doesNotThrow(() => clearUser());
  assert.equal(console.warn.mock.callCount(), 2);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../session.js'`.

- [ ] **Step 4: Implement** — `session.js`:

```js
// Persisted session state. The only module allowed to touch localStorage.
export const STORAGE_KEY = "app.session.userId";

export function setUser(userId) {
  if (userId === null || userId === undefined || userId === "") {
    throw new TypeError("setUser requires a non-empty userId");
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, String(userId));
  } catch (err) {
    console.warn("Could not persist userId:", err);
  }
}

export function getUser() {
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Could not clear userId:", err);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add package.json session.js test/session.test.mjs
git commit -m "feat: add localStorage-backed session module"
```

---

### Task 2: `auth.js` login that persists userId; wire up `app.js` and `index.html`

**Risk tier:** standard — multi-file integration (new module, refactor of `app.js`, HTML script type change, README).

**Files:**
- Create: `auth.js`
- Create: `test/auth.test.mjs`
- Modify: `app.js` (entire file — remove `login`/`API_ENDPOINT`, add import)
- Modify: `index.html:13` (`<script>` → `type="module"`)
- Modify: `README.md` (serving note)

**Interfaces:**
- Consumes: `setUser(userId)` and `getUser()` from `./session.js` (Task 1).
- Produces (ES module `./auth.js`):
  - `export function login(username: string, password: string): { success: boolean, user: string, userId: string }` — on `success: true` calls `setUser(userId)` before returning. Must not touch the DOM.

**Mirror:** `app.js:2-8` — the existing `login` stub being moved (keep its `console.log` and the stub comment style).

- [ ] **Step 1: Write the failing tests** — `test/auth.test.mjs`:

```js
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { login } from "../auth.js";
import { getUser } from "../session.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function installStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

beforeEach((t) => {
  installStorage(memoryStorage());
  t.mock.method(console, "log", () => {});
});

test("successful login returns a userId and persists it", () => {
  const result = login("alice", "secret");
  assert.equal(result.success, true);
  assert.equal(result.user, "alice");
  assert.equal(result.userId, "stub-alice");
  assert.equal(getUser(), "stub-alice");
});

test("login still succeeds when storage fails", (t) => {
  t.mock.method(console, "warn", () => {});
  const fail = () => {
    throw new Error("storage disabled");
  };
  installStorage({ getItem: fail, setItem: fail, removeItem: fail });
  const result = login("alice", "secret");
  assert.equal(result.success, true);
  assert.equal(result.userId, "stub-alice");
});

test("login never persists the password", () => {
  login("alice", "secret");
  assert.notEqual(getUser(), "secret");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../auth.js'` (session tests still pass).

- [ ] **Step 3: Implement** — `auth.js`:

```js
import { setUser } from "./session.js";

const API_ENDPOINT = "https://api.example.com/login";

export function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app; userId stands in for the
  // server-assigned ID.
  const result = { success: true, user: username, userId: `stub-${username}` };
  if (result.success) {
    setUser(result.userId);
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 9 tests, 0 failures.

- [ ] **Step 5: Rewire `app.js`** — replace the full file with:

```js
// Simple webapp with login form handling
import { login } from "./auth.js";

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

- [ ] **Step 6: Load `app.js` as a module** — in `index.html`, change

```html
  <script src="app.js"></script>
```

to

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 7: Document serving** — replace `README.md` with:

```markdown
# Test Project

A minimal project for Drill test scenarios.

The webapp uses ES modules, which browsers do not load from `file://`. Serve
the repo root and open `index.html`, e.g. `python3 -m http.server` then
http://localhost:8000/. Run unit tests with `npm test`.
```

- [ ] **Step 8: Verify module graph in Node and browser smoke test**

Run: `npm test && node --check auth.js && node --input-type=module -e 'await import("./auth.js"); await import("./session.js"); console.log("ok")'`
Expected: tests PASS, then `ok`.

Then: `python3 -m http.server 8000` from repo root, open http://localhost:8000/, submit username `alice` / password `x`; DevTools console shows `Login result: {success: true, user: "alice", userId: "stub-alice"}` and `localStorage.getItem("app.session.userId")` returns `"stub-alice"`. If no browser is available to the executor, record the smoke test as not run.

- [ ] **Step 9: Commit**

```bash
git add auth.js test/auth.test.mjs app.js index.html README.md
git commit -m "feat: persist userId on login via session module"
```
