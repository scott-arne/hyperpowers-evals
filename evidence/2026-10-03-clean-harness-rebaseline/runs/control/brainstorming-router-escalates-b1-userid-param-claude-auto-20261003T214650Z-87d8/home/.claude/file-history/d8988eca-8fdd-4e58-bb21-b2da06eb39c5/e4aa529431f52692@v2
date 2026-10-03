# userId on Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-03-userid-login-design.md`

**Goal:** `login(username, password, userId)` sends and logs the userId, which persists in localStorage via a shared `Session` script that other forms can reuse.

**Architecture:** New classic script `session.js` defines a `Session` global (the only code touching `localStorage`), loaded before `app.js`. `app.js` gains the `userId` parameter, validation, and DOM wiring that reads the stored ID or falls back to a new form field, saving it after a successful login. Both scripts end with a guarded `module.exports` so Node tests can load them.

**Tech Stack:** Plain browser JavaScript (classic `<script>` tags, no build), Node v26 built-in `node:test` / `node:assert`.

## Global Constraints

- No build step, no bundler; scripts stay classic `<script src>` tags.
- No new dependencies. Tests use Node's built-in `node:test`.
- `session.js` is the only code that touches `localStorage`.
- The password is never logged.

## Grounding

- Login stub shape (log + return object): `app.js:4-8`.
- Error/result shape `{ valid: false, error: "Missing required fields" }`: `app.js:10-15`.
- DOM wiring style (`getElementById`, submit handler, `console.log`/`console.error`): `app.js:17-28`.
- Export pattern `module.exports = { ... }`: `src/utils.js:5`.
- Naming: camelCase functions and `id` attributes in camelCase/kebab-case as in `index.html:8-10` (`login-form`, `username`).
- Tests: `none: no existing test files or runner; this plan introduces node:test under test/`.
- Note: Node v26 defines `globalThis.localStorage` as a configurable getter/setter; tests install fakes with `Object.defineProperty` rather than plain assignment.

---

### Task 1: `Session` storage module

**Risk tier:** standard — new script plus new test infrastructure (`package.json` test script).

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: global `Session` (browser) / `module.exports = Session` (Node) with
  - `Session.getUserId(): string | null`
  - `Session.setUserId(id: string): void`
  - `Session.clearUserId(): void`
  - storage key `"userId"`.

**Mirror:** `src/utils.js:1-5` for function style and export line.

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

- [ ] **Step 2: Write the failing tests** — create `test/session.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");

function installStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const blocked = () => {
    throw new Error("storage blocked");
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked };
}

const Session = require("../session.js");

test.beforeEach(() => installStorage(fakeStorage()));

test("getUserId returns null when nothing is stored", () => {
  assert.strictEqual(Session.getUserId(), null);
});

test("setUserId stores a trimmed id that getUserId returns", () => {
  Session.setUserId("  u-42  ");
  assert.strictEqual(Session.getUserId(), "u-42");
  assert.strictEqual(globalThis.localStorage.getItem("userId"), "u-42");
});

test("setUserId ignores empty and whitespace-only ids", () => {
  Session.setUserId("u-1");
  Session.setUserId("   ");
  Session.setUserId("");
  assert.strictEqual(Session.getUserId(), "u-1");
});

test("clearUserId removes the stored id", () => {
  Session.setUserId("u-42");
  Session.clearUserId();
  assert.strictEqual(Session.getUserId(), null);
});

test("throwing storage degrades to nothing stored", () => {
  installStorage(throwingStorage());
  assert.strictEqual(Session.getUserId(), null);
  assert.doesNotThrow(() => Session.setUserId("u-42"));
  assert.doesNotThrow(() => Session.clearUserId());
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../session.js'`.

- [ ] **Step 4: Write the implementation** — create `session.js`:

```js
// Shared user-session state. Load this script before any script that uses `Session`.
const Session = (() => {
  const KEY = "userId";

  function getUserId() {
    try {
      return globalThis.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function setUserId(id) {
    const trimmed = String(id ?? "").trim();
    if (!trimmed) return;
    try {
      globalThis.localStorage.setItem(KEY, trimmed);
    } catch (e) {
      // Storage unavailable: the user will be asked for their ID again next time.
    }
  }

  function clearUserId() {
    try {
      globalThis.localStorage.removeItem(KEY);
    } catch (e) {
      // Storage unavailable: nothing to clear.
    }
  }

  return { getUserId, setUserId, clearUserId };
})();

if (typeof module !== "undefined") module.exports = Session;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json session.js test/session.test.js
git commit -m "feat: add Session module for persisted userId"
```

---

### Task 2: `login` takes `userId`; form reads/stores it

**Risk tier:** standard — multi-file integration (`app.js`, `index.html`) with UI wiring.

**Files:**
- Modify: `app.js` (whole file, currently lines 1-28)
- Modify: `index.html:8-13`
- Create: `test/app.test.js`

**Interfaces:**
- Consumes: `Session.getUserId()`, `Session.setUserId(id)`, `Session.clearUserId()` from Task 1.
- Produces:
  - `login(username: string, password: string, userId: string): { success: boolean, user: string, userId: string }`
  - `validateForm({ username, password, userId }): { valid: true } | { valid: false, error: "Missing required fields" }`
  - Node export `module.exports = { login, validateForm }`.
  - DOM ids: `userId-entry`, `userId`, `userId-known`, `userId-display`, `userId-clear`.

**Mirror:** `app.js:4-28` for log/return shape, error shape, and handler style.

- [ ] **Step 1: Write the failing tests** — create `test/app.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const { login, validateForm } = require("../app.js");

test("validateForm accepts username, password, and userId", () => {
  assert.deepStrictEqual(
    validateForm({ username: "alice", password: "s3cret", userId: "u-42" }),
    { valid: true }
  );
});

test("validateForm rejects a missing userId", () => {
  assert.deepStrictEqual(
    validateForm({ username: "alice", password: "s3cret" }),
    { valid: false, error: "Missing required fields" }
  );
});

test("validateForm rejects a whitespace-only userId", () => {
  assert.deepStrictEqual(
    validateForm({ username: "alice", password: "s3cret", userId: "   " }),
    { valid: false, error: "Missing required fields" }
  );
});

test("login returns the userId and logs it without the password", (t) => {
  const logs = [];
  t.mock.method(console, "log", (...args) => logs.push(args.join(" ")));

  const result = login("alice", "s3cret", "u-42");

  assert.deepStrictEqual(result, { success: true, user: "alice", userId: "u-42" });
  assert.ok(logs.some((line) => line.includes("u-42")), "userId is logged");
  assert.ok(logs.every((line) => !line.includes("s3cret")), "password is never logged");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `app.js` throws `ReferenceError: document is not defined` on load.

- [ ] **Step 3: Write the implementation** — replace `app.js` with:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password, userId) {
  const payload = { username, password, userId };
  console.log("Logging in:", username, "userId:", userId);
  // Stub: would POST payload to API_ENDPOINT in real app
  return { success: true, user: payload.username, userId: payload.userId };
}

function validateForm(formData) {
  const required = ["username", "password", "userId"];
  if (required.some((field) => !String(formData[field] ?? "").trim())) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

if (typeof document !== "undefined") {
  const userIdInput = document.getElementById("userId");
  const userIdEntry = document.getElementById("userId-entry");
  const userIdKnown = document.getElementById("userId-known");
  const userIdDisplay = document.getElementById("userId-display");

  const renderUserId = () => {
    const storedId = Session.getUserId();
    userIdEntry.hidden = storedId !== null;
    userIdKnown.hidden = storedId === null;
    userIdDisplay.textContent = storedId ?? "";
  };

  document.getElementById("userId-clear").addEventListener("click", (e) => {
    e.preventDefault();
    Session.clearUserId();
    userIdInput.value = "";
    renderUserId();
  });

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const userId = Session.getUserId() ?? userIdInput.value.trim();
    const validation = validateForm({ username, password, userId });
    if (validation.valid) {
      const result = login(username, password, userId);
      console.log("Login result:", result);
      if (result.success) {
        Session.setUserId(userId);
        renderUserId();
      }
    } else {
      console.error("Validation error:", validation.error);
    }
  });

  renderUserId();
}

if (typeof module !== "undefined") module.exports = { login, validateForm };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests (5 session + 4 app).

- [ ] **Step 5: Update `index.html`** — replace lines 8-14 (form through script tag) with:

```html
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <div id="userId-entry">
      <input type="text" id="userId" placeholder="User ID" />
    </div>
    <div id="userId-known" hidden>
      Logged in as <span id="userId-display"></span> — <a href="#" id="userId-clear">not you?</a>
    </div>
    <button type="submit">Log In</button>
  </form>
  <script src="session.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 6: Manual browser check**

Open `index.html` in a browser with DevTools open, then:
1. Run `localStorage.clear()` in the console and reload → the "User ID" field is visible; "Logged in as" is hidden.
2. Submit with username, password, and user ID `u-42` → console shows `Logging in: <username> userId: u-42` and the result object; no password in the console; the UI switches to "Logged in as u-42".
3. Reload → field stays hidden, "Logged in as u-42" shown; submitting with username/password logs `userId: u-42`.
4. Click "not you?" → field reappears, empty; `localStorage.getItem("userId")` is `null`.
5. Submit with the user ID field empty → console shows `Validation error: Missing required fields`; nothing stored.

- [ ] **Step 7: Run full test suite again**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 8: Commit**

```bash
git add app.js index.html test/app.test.js
git commit -m "feat: pass persisted userId to login for tracking"
```
