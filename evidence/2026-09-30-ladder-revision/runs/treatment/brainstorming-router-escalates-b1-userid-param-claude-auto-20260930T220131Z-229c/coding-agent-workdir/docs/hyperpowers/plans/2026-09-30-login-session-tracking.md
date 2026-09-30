# Login Session Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-30-login-session-tracking-design.md`

**Goal:** Make `login()` return a `userId` and persist `{ userId, username }` to a tab-scoped browser session record owned by a single new module.

**Architecture:** A new classic browser script `session.js` owns the `sessionStorage` key and the stored shape, exposing `Session.save/read/clear`. `app.js` calls it and never touches `sessionStorage` directly. `index.html` loads `session.js` before `app.js`. The repo gains its first unit tests, covering `session.js` via `node:test`.

**Tech Stack:** Plain browser JavaScript (classic `<script>` tags, no build step, no modules); Node.js v26.10.0 with the built-in `node:test` runner and `node:assert`.

## Global Constraints

Copied from the spec's Global Constraints:

- The stored `userId` is **non-authoritative**. It may be displayed and logged. It must never be the basis for deciding who a user is or what they are permitted to do.
- **A storage failure must never fail a login.** Persistence is a side benefit of logging in, not a precondition for it.
- **Zero new runtime dependencies.** `package.json` gains a `scripts` entry and no `devDependencies`.
- **No change to how the page loads.** `index.html` keeps classic `<script src>` tags; the page must still open correctly over `file://`.

Two values are pinned here so both tasks agree on them:

- sessionStorage key: `"login.session"` (declared once, in `session.js`).
- Stored shape: `{ userId, username }` — no timestamp (spec, Decisions).

## Grounding

- **Function naming** — `app.js:4` (`function login(username, password)`) and `app.js:10` (`function validateForm(formData)`): plain camelCase function declarations at module top level.
- **String quoting** — `app.js:2,5` uses double quotes throughout; `src/index.js:4` uses single quotes. New browser-side files follow `app.js` and use **double quotes**; two-space indentation, semicolons, `app.js:1-28`.
- **Error reporting** — `app.js:26` (`console.error("Validation error:", validation.error)`): a `console.*` call with a literal label followed by the value. There is no error-object or throw convention in this repo.
- **CommonJS export** — `src/utils.js:5` (`module.exports = { greet };`): the only export form in the repo. `session.js`'s dual-export guard imitates this shape.
- **Script loading** — `index.html:13` (`<script src="app.js"></script>`): classic script tag, no `type`, no `defer`.
- **Test shape** — `none: the repo has no tests, no test directory, and no test runner.` Task 1 establishes the pattern; nothing to mirror.
- **Lint/format config** — `none: no eslint, prettier, or editorconfig exists.` Match `app.js` by hand.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `session.js` | Create | Owns the sessionStorage key and the stored session shape. The only file that touches `sessionStorage`. |
| `test/session.test.js` | Create | Unit tests for `session.js`, including both error-handling paths. |
| `package.json` | Modify | Adds the `scripts.test` entry. No dependencies. |
| `app.js` | Modify | `login()` returns `userId`; the submit handler saves on success and clears on both non-success paths. |
| `index.html` | Modify | Loads `session.js` before `app.js`. |

Task 1 delivers `session.js` plus the test infrastructure it needs. Task 2 wires it into the app. A reviewer could reject either while accepting the other, so they are separate tasks; the `package.json` change is folded into Task 1 because that is the task whose deliverable needs a test runner.

---

### Task 1: Session storage module

**Risk tier:** standard — a new module plus the repository's first test infrastructure; multi-file and not mechanical transcription.

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json:1-6` (add a `scripts` block)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a `Session` object, reachable in the browser as the top-level binding `Session` and in Node as `require("./session.js")`, with exactly three methods:
  - `Session.save(session)` → `boolean` — `true` when persisted, `false` when the storage backend threw.
  - `Session.read()` → `{ userId: string, username: string } | null` — `null` when absent, unreadable, or corrupt.
  - `Session.clear()` → `undefined`.
  - Module constant `SESSION_KEY = "login.session"`, not exported.

**Mirror:** `src/utils.js:1-5` for the `module.exports` line's shape; nothing else in the repo to imitate (see Grounding: test shape is `none`).

- [ ] **Step 1: Add the test script to `package.json`**

Add a `scripts` block after `"main"`. The full file afterwards:

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

No `devDependencies` — `node:test` ships with Node.

- [ ] **Step 2: Write the failing tests**

Create `test/session.test.js`:

```js
const { test, beforeEach } = require("node:test");
const assert = require("node:assert");

const Session = require("../session.js");

const SESSION_KEY = "login.session";

function fakeStorage() {
  const entries = new Map();
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

function throwingStorage() {
  const refuse = () => {
    throw new Error("storage is disabled");
  };
  return { getItem: refuse, setItem: refuse, removeItem: refuse };
}

beforeEach(() => {
  globalThis.sessionStorage = fakeStorage();
});

test("save then read round-trips the session record", () => {
  const record = { userId: "user-ada", username: "ada" };
  assert.strictEqual(Session.save(record), true);
  assert.deepStrictEqual(Session.read(), record);
});

test("read returns null when nothing is stored", () => {
  assert.strictEqual(Session.read(), null);
});

test("read on a corrupt record returns null and clears the key", () => {
  globalThis.sessionStorage.setItem(SESSION_KEY, "{not json");
  assert.strictEqual(Session.read(), null);
  assert.strictEqual(globalThis.sessionStorage.getItem(SESSION_KEY), null);
});

test("clear removes the stored record", () => {
  Session.save({ userId: "user-ada", username: "ada" });
  Session.clear();
  assert.strictEqual(globalThis.sessionStorage.getItem(SESSION_KEY), null);
});

test("save returns false without throwing when storage refuses", () => {
  globalThis.sessionStorage = throwingStorage();
  assert.strictEqual(
    Session.save({ userId: "user-ada", username: "ada" }),
    false,
  );
});
```

Note the two tests that earn their keep: the corrupt-record test asserts the key is *also* cleared, and the refusing-storage test asserts `save` returns rather than throws.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../session.js'`.

- [ ] **Step 4: Write the implementation**

Create `session.js`:

```js
// Owns the browser-side login session record. Nothing else in the app reads
// or writes sessionStorage directly, so the key and the stored shape have a
// single owner.
const SESSION_KEY = "login.session";

const Session = {
  save(session) {
    try {
      globalThis.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      // Storage throws in private browsing, when disabled by policy, and on
      // quota exhaustion. Losing the record must not fail the login.
      console.warn("Could not persist session:", error);
      return false;
    }
  },

  read() {
    try {
      const raw = globalThis.sessionStorage.getItem(SESSION_KEY);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      // A corrupt record would throw on every later read; drop it once.
      Session.clear();
      return null;
    }
  },

  clear() {
    try {
      globalThis.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn("Could not clear session:", error);
    }
  },
};

// Inert in the browser, where this file is a classic script and `Session` is
// reachable as a top-level binding; in Node it is what makes the module
// testable.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Session;
}
```

`sessionStorage` is read through `globalThis` at call time rather than captured at load time. That is what lets the test swap the backend between cases.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 5/5. The refusing-storage test prints a `console.warn` line — that is the code under test reporting the refusal, not a failure.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.js package.json
git commit -m "feat: add tab-scoped session storage module"
```

---

### Task 2: Return and persist the userId

**Risk tier:** standard — changes `login()`'s return contract and the submit handler's control flow across two files, with no automated test covering either.

**Files:**
- Modify: `app.js:4-8` (login returns `userId`), `app.js:17-28` (submit handler)
- Modify: `index.html:13` (add the `session.js` tag before `app.js`)

**Interfaces:**
- Consumes: `Session.save({ userId, username })` and `Session.clear()` from Task 1, exactly as specified in that task's Produces block. `Session.save`'s return value is deliberately ignored here — a refused write is reported by `session.js` and must not change the handler's behavior (spec, Global Constraints).
- Produces: `login(username, password)` → `{ success: boolean, user: string, userId: string }`. The `user` and `success` fields keep their current meaning; `userId` is new.

**Mirror:** `app.js:26` for the error-reporting shape — a `console.error` with a literal label followed by the value.

- [ ] **Step 1: Add the `userId` to `login()`'s return value**

Replace `app.js:4-8` with:

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  // The derived userId is placeholder data; the real API response replaces it.
  return { success: true, user: username, userId: `user-${username}` };
}
```

- [ ] **Step 2: Persist on success, clear on every other path**

Replace the submit handler at `app.js:17-28` with:

```js
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (!validation.valid) {
    Session.clear();
    console.error("Validation error:", validation.error);
    return;
  }
  const result = login(username, password);
  if (!result.success) {
    // Without this, a record from an earlier successful login in this tab
    // survives the failure and reads as the current user.
    Session.clear();
    console.error("Login failed for:", username);
    return;
  }
  Session.save({ userId: result.userId, username: result.user });
  console.log("Login result:", result);
});
```

The `if/else` becomes early returns because there are now three outcomes rather than two. The `success` field is hard-coded `true` in the stub, so the middle branch is unreachable today; it is written now because it becomes live the moment the real API call replaces the stub (spec, Architecture).

- [ ] **Step 3: Load `session.js` before `app.js`**

At `index.html:13`, replace the single script tag with two, in this order:

```html
  <script src="session.js"></script>
  <script src="app.js"></script>
```

Order matters: both are classic scripts, so they execute in document order and `Session` must exist before `app.js` runs.

- [ ] **Step 4: Verify syntax and that Task 1's tests still pass**

Run: `node --check app.js`
Expected: no output (exit 0).

Run: `npm test`
Expected: PASS, 5/5 — unchanged from Task 1. `app.js` has no automated test: it reads `document` at load time and would need a DOM harness, which the spec scoped out (spec, Testing).

- [ ] **Step 5: Verify in the browser**

Open `index.html` directly (`file://`) — this must still work, per Global Constraints. In the devtools console:

1. Type `ada` and any password, submit. Expected console output: `Logging in: ada`, then `Login result: { success: true, user: "ada", userId: "user-ada" }`.
2. Run `Session.read()`. Expected: `{ userId: "user-ada", username: "ada" }`.
3. Submit with both fields empty. Expected: `Validation error: Missing required fields`, and `Session.read()` now returns `null` — the stale record from step 1 is gone.
4. Open the same page in a new tab and run `Session.read()`. Expected: `null` — the record is tab-scoped.

Record the actual console output for each of the four checks; step 3 is the stale-session behavior and is the one worth reporting explicitly.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html
git commit -m "feat: persist userId to the session record on login"
```
