# userId Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-userid-tracking-design.md`

**Goal:** Give the app a persistent, server-assigned `userId` that any form can read, and pass the previously-stored one into `login`.

**Architecture:** A new `session.js` owns all identity storage behind three functions on a `Session` global, backed by `localStorage` with an in-memory fallback. `app.js` becomes a consumer: its `login` gains an optional third parameter carrying the prior ID, returns the new one, and the submit handler wires the two together. No storage logic lives outside `session.js`.

**Tech Stack:** Plain browser JavaScript (no modules, no bundler, no framework). Node's built-in `node --test` runner for unit tests. Zero runtime and dev dependencies.

## Global Constraints

- The userId is an identifier for tracking, never an authorization credential. The server must never grant access based on a client-supplied copy.
- No new dependencies in `package.json`. Tests use Node's built-in runner only.
- Match the existing style: plain browser scripts, globals, no modules.
- `index.html` must keep opening directly from the filesystem — no ES modules, no local web server requirement.
- `localStorage` key is exactly `app.userId`.
- Do not modify `src/index.js` or `src/utils.js`.
- No logout UI, no real authentication backend, no authorization.

## Grounding

- Function and stub style: `app.js:4-8` — plain `function` declaration at top level, `//` comment marking the stub seam, returns an object literal.
- Return-object shape: `app.js:10-15` — functions return `{ valid: true }` / `{ valid: false, error: ... }`; flat object literals with short keys.
- Error handling: `app.js:25-27` — the only existing error handling is a `console.error` in the submit handler's else branch. There is no try/catch anywhere in the codebase and no error-reporting helper.
- CommonJS export shape: `src/utils.js:1-5` — `function` declaration followed by `module.exports = { greet };`. This is the only export pattern in the repo.
- Script loading: `index.html:13` — `<script src="app.js"></script>` as the last element in `<body>`, no `type`, no `defer`.
- Naming: `app.js:4,10,19-20` — lowerCamelCase for functions and variables (`login`, `validateForm`, `username`); `app.js:2` — SCREAMING_SNAKE_CASE for module-level constants (`API_ENDPOINT`).
- Test shape: **none — no existing pattern for tests.** There are no test files, no `test` script in `package.json`, and no test runner configured. Task 1 establishes the pattern.

---

### Task 1: Session storage module and its tests

**Risk tier:** standard — a new script plus the repo's first test infrastructure; multi-file.

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add a `scripts.test` entry)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a global `Session` object, also exported via `module.exports` for tests, with exactly three functions:
  - `getUserId()` → `string | null` — the stored id, or `null` when nothing is stored or storage is unavailable.
  - `setUserId(id)` → `undefined` — persists `id`.
  - `clear()` → `undefined` — removes the stored id.

**Mirror:** `src/utils.js:1-5` for the `module.exports` shape; `app.js:2` for the SCREAMING_SNAKE_CASE module constant.

- [ ] **Step 1: Write the failing tests**

Create `test/session.test.js` with exactly this content:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const SESSION_PATH = path.join(__dirname, '..', 'session.js');

// session.js holds closure state (the in-memory fallback and the
// storage-usable flag), so each case needs a freshly-loaded copy.
function loadSession(storage) {
  delete require.cache[require.resolve(SESSION_PATH)];
  globalThis.localStorage = storage;
  return require(SESSION_PATH);
}

function workingStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function throwingStorage(failOn) {
  return {
    getItem() {
      if (failOn === 'read') throw new Error('storage disabled');
      return null;
    },
    setItem() {
      if (failOn === 'write') throw new Error('storage disabled');
    },
    removeItem() {
      if (failOn === 'write') throw new Error('storage disabled');
    },
  };
}

test('getUserId returns null when nothing is stored', () => {
  const Session = loadSession(workingStorage());
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId then getUserId returns that id', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  assert.strictEqual(Session.getUserId(), 'u-123');
});

test('clear then getUserId returns null', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  Session.clear();
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId overwrites a previously stored id', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  Session.setUserId('u-456');
  assert.strictEqual(Session.getUserId(), 'u-456');
});

test('getUserId returns null and does not throw when reads fail', () => {
  const Session = loadSession(throwingStorage('read'));
  assert.doesNotThrow(() => Session.getUserId());
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId falls back to memory when writes fail', () => {
  const Session = loadSession(throwingStorage('write'));
  assert.doesNotThrow(() => Session.setUserId('u-789'));
  assert.strictEqual(Session.getUserId(), 'u-789');
});

test('stores under the app.userId key', () => {
  const storage = workingStorage();
  const Session = loadSession(storage);
  Session.setUserId('u-123');
  assert.strictEqual(storage.getItem('app.userId'), 'u-123');
});
```

- [ ] **Step 2: Add the test script to package.json**

Modify `package.json` so it reads exactly:

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

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. Every case errors while loading the module — `Cannot find module` for `session.js`, which does not exist yet.

- [ ] **Step 4: Write the implementation**

Create `session.js` with exactly this content:

```javascript
// Identity storage for the app. The userId here is a tracking identifier
// only: it is never an authorization credential, and the server must not
// grant access based on a client-supplied copy.
(function (global) {
  const STORAGE_KEY = "app.userId";

  // localStorage throws rather than returning null when it is unavailable
  // (Safari private mode, disabled storage, enterprise policy). One failure
  // condemns it for the page load: falling back to memory keeps the login
  // form working instead of breaking it over a storage problem.
  let storageUsable = true;
  let fallbackUserId = null;

  function getUserId() {
    if (!storageUsable) {
      return fallbackUserId;
    }
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      storageUsable = false;
      return fallbackUserId;
    }
  }

  function setUserId(id) {
    fallbackUserId = id;
    if (!storageUsable) {
      return;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      storageUsable = false;
    }
  }

  // The logout path. Nothing calls this yet — the app has no logout — but
  // the persistence design depends on an explicit clear existing.
  function clear() {
    fallbackUserId = null;
    if (!storageUsable) {
      return;
    }
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      storageUsable = false;
    }
  }

  const Session = { getUserId, setUserId, clear };

  global.Session = Session;

  // Lets the Node test runner require this file; inert in the browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Session;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS — 7 passing tests, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.js package.json
git commit -m "feat: add Session module for persistent userId storage"
```

---

### Task 2: Wire login and the submit handler to Session

**Risk tier:** standard — changes `login`'s signature, which its existing call site depends on.

**Files:**
- Modify: `app.js:4-8` (the `login` function), `app.js:17-28` (the submit handler)
- Modify: `index.html:13` (add the `session.js` script tag)

**Interfaces:**
- Consumes: `Session.getUserId()` and `Session.setUserId(id)` from Task 1.
- Produces: `login(username, password, previousUserId)` where `previousUserId` is optional and defaults to `null`; returns `{ success: boolean, user: string, userId: string }`.

**Mirror:** `app.js:4-8`, the existing `login` — keep the `//` stub comment marking where a real API call would go, and keep returning a flat object literal.

- [ ] **Step 1: Add the session.js script tag**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 2: Change the login signature and return value**

In `app.js`, replace lines 4-8:

```javascript
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

with:

```javascript
// previousUserId is who this browser was on its last successful login, or
// null on a first visit. It is context for the server, never a claim about
// who is authenticating now.
function login(username, password, previousUserId = null) {
  console.log("Logging in:", username, "previous userId:", previousUserId);
  // Stub: would POST to API_ENDPOINT in real app. The real response supplies
  // userId — the server owns that value, the client never invents it.
  const userId = "stub-" + username;
  return { success: true, user: username, userId: userId };
}
```

- [ ] **Step 3: Wire the submit handler**

In `app.js`, replace the `if (validation.valid)` branch (lines 22-24 of the original file):

```javascript
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
```

with:

```javascript
  if (validation.valid) {
    const previousUserId = Session.getUserId();
    const result = login(username, password, previousUserId);
    if (result.success) {
      Session.setUserId(result.userId);
    }
    console.log("Login result:", result);
```

- [ ] **Step 4: Verify the unit tests still pass**

Run: `npm test`

Expected: PASS — 7 passing, 0 failing. Task 2 touches no `session.js` behavior, so any failure here means Task 1 was disturbed.

- [ ] **Step 5: Verify no stale call sites remain**

Run: `grep -n "login(" app.js`

Expected: exactly two lines — the declaration on the `function login(` line, and the single call inside the submit handler passing three arguments. Any two-argument call to `login` is a missed call site.

- [ ] **Step 6: Manual browser verification**

`app.js` touches `document` at load time and there is no DOM harness, so this step is manual and its result gets reported, not asserted.

1. Open `index.html` in a browser and open the developer console.
2. Enter any username and password, submit.
3. Expected console output: `Logging in: <username> previous userId: null`, then `Login result: { success: true, user: "<username>", userId: "stub-<username>" }`.
4. Reload the page and submit again with the same username.
5. Expected: `previous userId:` now shows `stub-<username>` rather than `null` — this is the persistence working across reloads.
6. In the console, run `Session.getUserId()`. Expected: `"stub-<username>"`.
7. In the console, run `Session.clear()`, then `Session.getUserId()`. Expected: `null`.

Record the actual console output in the task report. If step 5 still shows `null`, the persistence is not working — do not report the task complete.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html
git commit -m "feat: pass previous userId into login and persist the assigned one"
```
