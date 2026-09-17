# User Identity Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-17-user-identity-store-design.md`

**Goal:** Give the app a per-tab store for the server-minted user id, populated by `login` and readable by any later code.

**Architecture:** A new classic script `session.js` wraps `sessionStorage` in an IIFE and exposes one global, `window.AppSession`, with `setUserId`/`getUserId`/`clear`. `index.html` loads it before `app.js`. The `login` stub gains a `userId` field in its return value (it does **not** gain a parameter — the server mints the id), and the submit handler writes that id into the store.

**Tech Stack:** Browser-native JavaScript (ES5-compatible classic script, no bundler), Node's built-in `node --test` runner. No runtime or dev dependencies.

## Global Constraints

Copied from the spec; every task inherits these.

- No dependencies. `package.json` gains a `scripts.test` entry and nothing else.
- Tests run on Node's built-in runner only: `node --test`. Installed Node is v26.8.2.
- No bundler and no build step. Classic `<script>` tags only; `type="module"` is forbidden — the page must keep working over `file://`.
- `sessionStorage` is named nowhere outside `session.js`.
- The storage key is exactly `"app.userId"`.
- No `AppSession` method ever throws. Tracking must never be able to fail a login.
- No `userId` parameter is added to `login`. `login` returns the id.
- `login` stays synchronous this round.
- `clear()` ships with no caller. That is intentional, not dead code to remove.

## Grounding

- Constant naming: `app.js:2` — module-level constants are `UPPER_SNAKE` `const`.
- Function naming: `app.js:4`, `app.js:10` — `camelCase` function declarations, `function` keyword (not arrow) at top level.
- Result-object convention: `app.js:10-15` — `validateForm` reports failure by returning `{ valid, error }` rather than throwing. `AppSession`'s non-throwing boolean return follows this house style.
- CommonJS export: `src/utils.js:5` — `module.exports = { greet };`. Task 1's dual export mirrors this for the Node half.
- Script loading: `index.html:13` — `<script src="app.js"></script>`, a plain classic script, last element in `<body>`.
- Error handling: **none** — there is no `try`/`catch` anywhere in the repo. Task 1 introduces the first one.
- Test shape: **none** — there are no test files, no runner, and no `scripts` block in `package.json`. Task 1 establishes the pattern.

---

### Task 1: The `AppSession` store

**Risk tier:** standard — a new script plus the repo's first test infrastructure; not mechanical transcription, not an approval-authority surface.

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add a `scripts` block)

**Interfaces:**
- Consumes: nothing.
- Produces: the global `AppSession` object, also available as the CommonJS export of `session.js`:
  - `setUserId(id: string) -> boolean` — `true` when the value reached `sessionStorage`. Returns `false` for a non-string, `null`, `undefined`, or `""` without writing anything, and `false` when storage rejected the write. Never throws.
  - `getUserId() -> string | null` — the stored id, else the in-memory fallback, else `null`. Never throws.
  - `clear() -> void` — drops both the stored and in-memory id. Never throws.

**Mirror:** `src/utils.js:1-5` for the CommonJS export shape; `app.js:10-15` for reporting failure by return value instead of throwing.

- [ ] **Step 1: Write the failing test**

Create `test/session.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");

// Loads a fresh copy of the module so the in-memory fallback does not leak
// between tests, with `storage` installed as the global sessionStorage.
function loadSession(storage) {
  globalThis.sessionStorage = storage;
  delete require.cache[require.resolve("../session.js")];
  return require("../session.js");
}

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

// Mimics Safari private mode and storage-disabled browsers, where every
// sessionStorage access throws.
function throwingStorage() {
  return {
    getItem() {
      throw new Error("storage disabled");
    },
    setItem() {
      throw new Error("storage disabled");
    },
    removeItem() {
      throw new Error("storage disabled");
    },
  };
}

test("set then get returns the stored id", () => {
  const session = loadSession(fakeStorage());
  assert.strictEqual(session.setUserId("u-123"), true);
  assert.strictEqual(session.getUserId(), "u-123");
});

test("the id is written under the app.userId key", () => {
  const storage = fakeStorage();
  const session = loadSession(storage);
  session.setUserId("u-123");
  assert.strictEqual(storage.getItem("app.userId"), "u-123");
});

test("clear removes a stored id", () => {
  const session = loadSession(fakeStorage());
  session.setUserId("u-123");
  session.clear();
  assert.strictEqual(session.getUserId(), null);
});

test("getUserId returns null when nothing is stored", () => {
  const session = loadSession(fakeStorage());
  assert.strictEqual(session.getUserId(), null);
});

test("setUserId rejects empty, null, and undefined without writing", () => {
  const storage = fakeStorage();
  const session = loadSession(storage);
  for (const bad of ["", null, undefined, 42]) {
    assert.strictEqual(session.setUserId(bad), false);
  }
  assert.strictEqual(storage.getItem("app.userId"), null);
  assert.strictEqual(session.getUserId(), null);
});

test("a rejected write leaves an existing id untouched", () => {
  const session = loadSession(fakeStorage());
  session.setUserId("u-123");
  session.setUserId("");
  assert.strictEqual(session.getUserId(), "u-123");
});

test("when storage throws, the id is still readable from memory", () => {
  const session = loadSession(throwingStorage());
  assert.strictEqual(session.setUserId("u-123"), false);
  assert.strictEqual(session.getUserId(), "u-123");
});

test("no method throws when storage is unavailable", () => {
  const session = loadSession(undefined);
  assert.doesNotThrow(() => session.setUserId("u-123"));
  assert.doesNotThrow(() => session.getUserId());
  assert.doesNotThrow(() => session.clear());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test`
Expected: FAIL — `Cannot find module '../session.js'`.

- [ ] **Step 3: Add the test script to `package.json`**

Add a `scripts` block after `"main"`. The full file becomes:

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

- [ ] **Step 4: Write the minimal implementation**

Create `session.js`:

```js
// Owns the signed-in user's identity for the lifetime of a tab. This is the
// only file that touches sessionStorage, so the storage medium can change
// without any reader changing with it.
(function (root) {
  "use strict";

  const STORAGE_KEY = "app.userId";

  // Holds the id when sessionStorage is unavailable (Safari private mode,
  // storage disabled), so the id still works for the life of the page.
  let memoryFallback = null;

  function setUserId(id) {
    if (typeof id !== "string" || id === "") {
      return false;
    }
    memoryFallback = id;
    try {
      root.sessionStorage.setItem(STORAGE_KEY, id);
      return true;
    } catch (err) {
      // Reported by return value, never thrown: a tracking failure must not
      // be able to fail a login.
      return false;
    }
  }

  function getUserId() {
    try {
      const stored = root.sessionStorage.getItem(STORAGE_KEY);
      if (stored !== null && stored !== undefined) {
        return stored;
      }
    } catch (err) {
      // Fall through to the in-memory value.
    }
    return memoryFallback;
  }

  function clear() {
    memoryFallback = null;
    try {
      root.sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // The in-memory value is already gone; nothing else to undo.
    }
  }

  const AppSession = {
    setUserId: setUserId,
    getUserId: getUserId,
    clear: clear,
  };

  root.AppSession = AppSession;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AppSession;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS — 8 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.js package.json
git commit -m "feat: add per-tab user identity store"
```

---

### Task 2: Wire the store into the login flow

**Risk tier:** standard — multi-file integration across the page's script loading and its login path.

**Files:**
- Modify: `app.js:4-8` (the `login` stub) and `app.js:17-28` (the submit handler)
- Modify: `index.html:13` (add the `session.js` tag)

**Interfaces:**
- Consumes: `AppSession.setUserId(id)` and `AppSession.getUserId()` from Task 1.
- Produces: `login(username, password) -> { success: boolean, user: string, userId: string }`. The added field is `userId`; the parameter list is unchanged.

**Mirror:** `index.html:13` for the script tag form; `app.js:4-8` for the stub's comment style.

**Testing note:** this task has no automated test. `app.js` calls `document.getElementById` at top level, so it cannot be loaded under `node --test` without a DOM shim, and end-to-end browser testing was explicitly ruled out of scope in the spec. Verification is the manual browser check in Step 4 plus Task 1's suite staying green. This gap is deliberate and recorded.

- [ ] **Step 1: Load `session.js` before `app.js`**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

Order matters: `app.js` reads `AppSession` when the form is submitted, and loading it second keeps the global defined by then.

- [ ] **Step 2: Return a `userId` from the login stub**

In `app.js`, replace lines 4-8:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

with:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app, and the response would
  // supply userId. The "stub-" prefix keeps a fabricated id recognisable if
  // one ever reaches a log or a request.
  return { success: true, user: username, userId: `stub-${username}` };
}
```

- [ ] **Step 3: Store the id on a successful login**

In `app.js`, replace the `if (validation.valid)` branch of the submit handler:

```js
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
```

with:

```js
  if (validation.valid) {
    const result = login(username, password);
    if (result.success) {
      AppSession.setUserId(result.userId);
      console.log("Logged in user:", AppSession.getUserId());
    }
    console.log("Login result:", result);
  } else {
```

The return value of `setUserId` is deliberately ignored: a storage failure must not change what the login flow does.

- [ ] **Step 4: Verify in a browser**

Open `index.html` directly from disk, enter any username and password, and submit. In the devtools console expect:

```
Logging in: alice
Logged in user: stub-alice
Login result: {success: true, user: 'alice', userId: 'stub-alice'}
```

Then run `AppSession.getUserId()` in the console and expect `'stub-alice'`. Reload the page and run it again — it must still return `'stub-alice'` (per-tab persistence). Open the same file in a new tab and expect `null`.

- [ ] **Step 5: Confirm Task 1's tests still pass**

Run: `node --test`
Expected: PASS — 8 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "feat: record the logged-in user id at login"
```
