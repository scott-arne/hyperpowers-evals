# Login userId Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-login-userid-design.md

**Goal:** Pass a persisted, client-generated `userId` into `login(username, password, userId)` via a shared `identity.js` ES module that other forms can import.

**Architecture:** `identity.js` (repo root) exports `getUserId(storage)`. It reads, or generates and saves, a UUID in `localStorage`, and falls back to an in-memory ID if storage throws. `app.js` becomes an ES module, imports `getUserId`, and passes the result to `login`, which logs it, notes it in the stubbed payload, and returns it.

**Tech Stack:** Plain browser JavaScript (native ES modules), Node 26 `node:test` for unit tests. No dependencies, no build step.

## Global Constraints

- No build step; the app stays plain browser JavaScript.
- `package.json` must NOT gain `"type": "module"` (it would break the CommonJS `src/index.js`). Node 26 detects ESM syntax in `.js` files on its own.
- Tests use Node's built-in `node:test`; no new dependencies.
- `localStorage` key is exactly `"userId"`.
- `getUserId` never throws.

## Grounding

- Naming: `app.js:4-15` — camelCase function names (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
- Error handling: `app.js:10-15` — failures are returned as values, not thrown. `getUserId` follows the same never-throw style.
- Module export style: `src/utils.js:5` — CommonJS `module.exports`. none: no existing ES module pattern in the repo; `identity.js` is the first. Do not convert `src/` files.
- Test shape: none: no existing tests or test runner in the repo.

---

### Task 1: `identity.js` module with unit tests

**Risk tier:** standard — new module and test infrastructure (test script in package.json).

**Files:**
- Create: `identity.js`
- Create: `identity.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function getUserId(storage = globalThis.localStorage): string`. `storage` is any object with `getItem(key): string | null` and `setItem(key, value): void`. Returns the persisted ID, or a newly generated and saved UUID, or (if storage is missing or throws) a module-level in-memory UUID that stays the same for the life of the module.

- [ ] **Step 1: Add the test script to `package.json`**

Final `package.json`:

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

- [ ] **Step 2: Write the failing tests in `identity.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserId } from "./identity.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
      throw new Error("storage blocked");
    },
    setItem: () => {
      throw new Error("storage blocked");
    },
  };
}

test("generates and persists a UUID when storage is empty", () => {
  const storage = fakeStorage();
  const id = getUserId(storage);
  assert.match(id, UUID_RE);
  assert.equal(storage.data.userId, id);
});

test("returns the same ID on subsequent calls", () => {
  const storage = fakeStorage();
  assert.equal(getUserId(storage), getUserId(storage));
});

test("reuses an ID already in storage", () => {
  const storage = fakeStorage({ userId: "existing-id" });
  assert.equal(getUserId(storage), "existing-id");
  assert.equal(storage.data.userId, "existing-id");
});

test("falls back to a stable in-memory ID when storage throws", () => {
  const first = getUserId(throwingStorage());
  const second = getUserId(throwingStorage());
  assert.match(first, UUID_RE);
  assert.equal(first, second);
});
```

Do not test `getUserId(undefined)`: that triggers the `globalThis.localStorage` default, which in Node is an experimental global that may warn or behave differently.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL. The run errors because `./identity.js` cannot be found.

- [ ] **Step 4: Implement `identity.js`**

```js
// Shared user identity: a persisted, client-generated userId
const STORAGE_KEY = "userId";

let fallbackId;

export function getUserId(storage = globalThis.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const id = crypto.randomUUID();
    storage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage missing or blocked (e.g. private mode): keep one ID for this page load
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: 4 tests pass, 0 fail. A `MODULE_TYPELESS_PACKAGE_JSON` warning from Node's ESM syntax detection is acceptable. Do NOT add `"type": "module"` to silence it (see Global Constraints).

- [ ] **Step 6: Confirm the CommonJS entry point still runs**

Run: `node src/index.js`
Expected: prints `Hello, world!`

- [ ] **Step 7: Commit**

```bash
git add identity.js identity.test.js package.json
git commit -m "feat: add shared identity module with persisted userId"
```

---

### Task 2: Pass userId into `login` and load `app.js` as a module

**Risk tier:** standard — multi-file integration (app.js, index.html, README).

**Files:**
- Modify: `app.js:1-28` (whole file shown below)
- Modify: `index.html:13`
- Modify: `README.md`

**Interfaces:**
- Consumes: `getUserId(): string` from `./identity.js` (Task 1).
- Produces: `login(username, password, userId)` returning `{ success: true, user: username, userId }`.

**Mirror:** `app.js:4-8`, existing `login` stub style (console log, stub comment, plain object return).

- [ ] **Step 1: Update `app.js`**

Final `app.js`:

```js
// Simple webapp with login form handling
import { getUserId } from "./identity.js";

const API_ENDPOINT = "https://api.example.com/login";

function login(username, password, userId) {
  console.log("Logging in:", username, "userId:", userId);
  // Stub: would POST { username, password, userId } to API_ENDPOINT in real app
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
    const result = login(username, password, getUserId());
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

- [ ] **Step 2: Load `app.js` as a module in `index.html`**

Change line 13:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 3: Document serving and tests in `README.md`**

Final `README.md`:

```markdown
# Test Project

A minimal project for Drill test scenarios.

## Running the webapp

The webapp uses native ES modules, which browsers do not load from `file://`.
Serve the repo root over HTTP, for example:

    npx serve .

Then open the printed URL.

## Tests

    npm test
```

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Manual browser check**

Run: `npx serve .` (or `python3 -m http.server`), then open the page.
1. Enter any username and password and submit. The console shows `Logging in: <username> userId: <uuid>`, and `Login result:` includes `userId`.
2. Reload the page and submit again. The console shows the same `<uuid>`.
3. Submit with an empty field. The console shows `Validation error: Missing required fields` and no login log.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html README.md
git commit -m "feat: pass persisted userId into login"
```
