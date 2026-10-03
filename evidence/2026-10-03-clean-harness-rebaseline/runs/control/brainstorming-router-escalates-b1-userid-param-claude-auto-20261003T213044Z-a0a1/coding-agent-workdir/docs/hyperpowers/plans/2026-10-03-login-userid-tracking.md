# Login userId Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-03-login-userid-tracking-design.md`

**Goal:** Pass a persistent, client-generated `userId` into `login(username, password, userId)` via a reusable `getUserId()` helper.

**Architecture:** A new classic browser script `user-id.js` (repo root) defines a global `getUserId()` that returns a UUID persisted in `localStorage["userId"]`, falling back to a per-page-load in-memory ID if storage throws. `index.html` loads it before `app.js`; the login submit handler passes `getUserId()` to `login()`, which logs and returns it. `user-id.js` also exports via CommonJS when `module` exists so Node tests can load it.

**Tech Stack:** Plain browser JavaScript (no bundler, no ES modules), Node built-in test runner (`node:test`, `node:assert`). Node v26 is installed locally.

## Global Constraints

- No new dependencies; tests use `node:test` and `node:assert` only.
- `package.json` gets `"test": "node --test"`.
- Storage key is exactly `"userId"`.
- IDs come from `crypto.randomUUID()`, read from `globalThis` at call time.
- `user-id.js` is a classic script (no `import`/`export`); CommonJS export only behind `if (typeof module !== "undefined" && module.exports)`.
- Login must never fail because tracking cannot persist.
- `login()` logs `Logging in: <username> (userId: <userId>)` and returns `{ success: true, user: username, userId }`.
- `validateForm` is unchanged.
- Out of scope: real POST to `API_ENDPOINT`, backend account IDs, ES module migration, refactoring `app.js` for testability.

## Grounding

- Naming / function style: `app.js:4-15` — camelCase function declarations, double-quoted strings, 2-space indent, semicolons.
- CommonJS export: `src/utils.js:1-5` — `module.exports = { greet };`.
- Error handling: `app.js:10-15` — failures expressed as return values, not thrown; no existing try/catch pattern in the repo.
- Test shape: `none: no existing tests or test runner in the repo`.
- Script loading: `index.html:13` — `<script src="app.js"></script>` at end of body.

---

### Task 1: `getUserId()` helper with tests

**Risk tier:** standard — new script plus new test infrastructure.

**Files:**
- Create: `user-id.js`
- Create: `test/user-id.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: global `getUserId(): string` (browser) and `require("../user-id").getUserId` (Node). Returns the same ID on every call within a page load; persisted ID across loads when `localStorage` works.

**Mirror:** `src/utils.js:1-5` for the `module.exports` shape.

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

Create `test/user-id.test.js`:

```js
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const MODULE_PATH = path.join(__dirname, "..", "user-id.js");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Load user-id.js as if on a fresh page (resets its in-memory state)
function loadFresh() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error("storage disabled");
    },
    setItem: () => {
      throw new Error("storage disabled");
    },
  };
}

let originalStorage;

beforeEach(() => {
  originalStorage = globalThis.localStorage;
});

afterEach(() => {
  if (originalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalStorage;
  }
});

test("creates a UUID and stores it under 'userId' on first call", () => {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const { getUserId } = loadFresh();

  const id = getUserId();

  assert.match(id, UUID_RE);
  assert.strictEqual(storage.data.userId, id);
});

test("returns the same ID on subsequent calls", () => {
  globalThis.localStorage = fakeStorage();
  const { getUserId } = loadFresh();

  assert.strictEqual(getUserId(), getUserId());
});

test("returns the stored ID after a page reload", () => {
  const storage = fakeStorage({ userId: "existing-id" });
  globalThis.localStorage = storage;
  const { getUserId } = loadFresh();

  assert.strictEqual(getUserId(), "existing-id");
  assert.strictEqual(storage.data.userId, "existing-id");
});

test("falls back to a stable in-memory ID when storage throws", () => {
  globalThis.localStorage = throwingStorage();
  const { getUserId } = loadFresh();

  const id = getUserId();

  assert.match(id, UUID_RE);
  assert.strictEqual(getUserId(), id);
});

test("falls back to a stable in-memory ID when localStorage is missing", () => {
  delete globalThis.localStorage;
  const { getUserId } = loadFresh();

  const id = getUserId();

  assert.match(id, UUID_RE);
  assert.strictEqual(getUserId(), id);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../user-id.js'`.

- [ ] **Step 4: Write the implementation**

Create `user-id.js`:

```js
// Persistent client-side tracking ID, shared by any form that needs it
const USER_ID_STORAGE_KEY = "userId";
let fallbackUserId = null;

function getUserId() {
  try {
    let id = globalThis.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = globalThis.crypto.randomUUID();
      globalThis.localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    // Storage unavailable: keep one ID for this page load so login still works
    if (!fallbackUserId) {
      fallbackUserId = globalThis.crypto.randomUUID();
    }
    return fallbackUserId;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getUserId };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add user-id.js test/user-id.test.js package.json
git commit -m "$(cat <<'EOF'
Add persistent getUserId() helper with tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pass userId into `login()`

**Risk tier:** standard — multi-file integration (`app.js` + `index.html`) verified by a smoke run rather than committed tests.

**Files:**
- Modify: `app.js:4-8` (`login`), `app.js:23` (call site)
- Modify: `index.html:13` (script tags)

**Interfaces:**
- Consumes: global `getUserId(): string` from Task 1 (`user-id.js`).
- Produces: `login(username, password, userId)` returning `{ success: true, user: username, userId }`.

**Mirror:** `app.js:4-8` — keep the existing stub comment and style.

- [ ] **Step 1: Run the smoke check to verify it fails**

From the repo root, run:

```bash
node -e '
const fs = require("fs"), vm = require("vm");
const store = {}; let handler; const logs = [];
const els = {
  username: { value: "alice" },
  password: { value: "pw" },
  "login-form": { addEventListener: (t, h) => { handler = h; } },
};
const ctx = {
  console: { log: (...a) => logs.push(a), error: (...a) => logs.push(a) },
  crypto: globalThis.crypto,
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  document: { getElementById: (id) => els[id] },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("user-id.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("app.js", "utf8"), ctx);
handler({ preventDefault() {} });
const result = logs.find((l) => l[0] === "Login result:")[1];
const ok = logs[0][0] === `Logging in: alice (userId: ${store.userId})` && result.userId === store.userId && result.user === "alice" && result.success === true;
console.log(JSON.stringify(logs));
console.log(ok ? "SMOKE PASS" : "SMOKE FAIL");
process.exit(ok ? 0 : 1);
'
```

Expected: `SMOKE FAIL` (exit 1) — `logs[0]` is `["Logging in:","alice"]` and `result.userId` is undefined.

- [ ] **Step 2: Update `login()` in `app.js`**

Replace lines 4-8:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

with:

```js
function login(username, password, userId) {
  console.log(`Logging in: ${username} (userId: ${userId})`);
  // Stub: would POST to API_ENDPOINT (including userId) in real app
  return { success: true, user: username, userId };
}
```

- [ ] **Step 3: Pass `getUserId()` at the call site in `app.js`**

Replace:

```js
    const result = login(username, password);
```

with:

```js
    const result = login(username, password, getUserId());
```

- [ ] **Step 4: Load `user-id.js` before `app.js` in `index.html`**

Replace:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="user-id.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 5: Run the smoke check to verify it passes**

Run the same command from Step 1.
Expected: `SMOKE PASS` (exit 0).

- [ ] **Step 6: Run the unit tests**

Run: `npm test`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "$(cat <<'EOF'
Pass persistent userId into login()

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Manual browser check (report result; do not block on it)**

Run `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`, submit the form with any username/password, and confirm the console shows `Logging in: <name> (userId: <uuid>)` and a `Login result:` object containing the same `userId`. Reload and submit again: the `userId` must be unchanged. This also validates the spec's assumption that `crypto.randomUUID` is available in the target browser.
