# User Preferences Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-user-preferences-storage-design.md`

**Goal:** Give the webapp a preferences store that survives a browser session, with "remember my username" as its first consumer.

**Architecture:** A single browser module, `prefs.js`, keeps all preferences in one namespaced `localStorage` entry (`webapp.prefs`) holding a JSON object, and is the only file that touches `localStorage`. It is loaded as a plain global `<script>` before `app.js`, and exports itself for CommonJS so Node's built-in test runner can require it. A `Prefs.init(store)` seam lets tests swap a fake backend in place of `localStorage`.

**Tech Stack:** Vanilla browser JavaScript (no framework, no build step); Node's built-in `node:test` + `node:assert` for unit tests.

## Global Constraints

- Zero runtime and dev dependencies. Do not add anything to `package.json` other than the `test` script. No npm installs.
- Test runner is Node's built-in `node --test` only. No jest, no mocha, no jsdom.
- No build step. Browser files are plain global scripts loaded by `<script src="...">`.
- No linter or formatter setup in this change (the user chose unit tests only).
- `prefs.js` never reads, writes, or references the password.
- Leave `src/index.js`, `src/utils.js`, and `README.md` untouched.
- Do not commit `docs/hyperpowers/specs/` or `docs/hyperpowers/plans/`. They are uncommitted working files in this repo.
- Style, matching the existing code: 2-space indent, double-quoted strings, semicolons, `function` declarations for named functions, `const`/`let` (never `var`), camelCase.

## Grounding

- Naming and code style: `app.js:4-15` — `function` declarations, double-quoted strings, 2-space indent, camelCase, early-return guard clauses.
- CommonJS export shape: `src/utils.js:1-5` — `module.exports = { greet };` at the end of the file.
- Script loading in the page: `index.html:13` — a bare `<script src="app.js"></script>` as the last element in `<body>`, so the DOM exists by the time the script runs.
- DOM access pattern: `app.js:17-20` — `document.getElementById("...")` read directly at top level, no DOMContentLoaded wrapper.
- Error handling: `none: no existing error-handling pattern beyond console.error at app.js:26`. There is no try/catch anywhere in the repo; this plan introduces the first.
- Test shape: `none: the repo has no tests and no test runner`. Task 1 establishes both.

---

### Task 1: Preferences module — core API over an injected store

**Risk tier:** standard — new module plus the repo's first test infrastructure.

**Files:**
- Create: `prefs.js`
- Create: `test/helpers/fake-store.js`
- Create: `test/prefs.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `Prefs.init(store)` → the active backend object. Re-points the module at `store`.
  - `Prefs.get(key: string, fallback: any)` → the stored value, or `fallback` when the key is absent.
  - `Prefs.set(key: string, value: any)` → `true` on success.
  - `Prefs.remove(key: string)` → `true` on success.
  - `Prefs.clear()` → `true` on success.
  - `module.exports = Prefs` and `globalThis.Prefs = Prefs`.
  - `test/helpers/fake-store.js` exports `{ fakeStore }`, where `fakeStore()` returns an object with `getItem`/`setItem`/`removeItem`, a public `data` Map, and mutable `throwOnRead`/`throwOnWrite` flags.

**Mirror:** `src/utils.js:1-5` for the CommonJS export footer; `app.js:4-15` for function style and guard clauses.

- [ ] **Step 1: Write the fake store helper**

Create `test/helpers/fake-store.js`:

```js
// A stand-in for window.localStorage. The throw flags are mutable so a test
// can let init() succeed and only then make the backend start failing.
function fakeStore(options) {
  const settings = options || {};
  const data = new Map();
  return {
    data,
    throwOnRead: settings.throwOnRead === true,
    throwOnWrite: settings.throwOnWrite === true,
    getItem(key) {
      if (this.throwOnRead) {
        const error = new Error("read blocked");
        error.name = "SecurityError";
        throw error;
      }
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (this.throwOnWrite) {
        const error = new Error("quota exceeded");
        error.name = "QuotaExceededError";
        throw error;
      }
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

module.exports = { fakeStore };
```

- [ ] **Step 2: Write the failing core tests**

Create `test/prefs.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");

const Prefs = require("../prefs");
const { fakeStore } = require("./helpers/fake-store");

test("set then get returns the stored value", () => {
  Prefs.init(fakeStore());
  Prefs.set("username", "ada");
  assert.strictEqual(Prefs.get("username", ""), "ada");
});

test("get returns the fallback for a missing key", () => {
  Prefs.init(fakeStore());
  assert.strictEqual(Prefs.get("username", "default"), "default");
});

test("values keep their type", () => {
  Prefs.init(fakeStore());
  Prefs.set("remember", true);
  assert.strictEqual(Prefs.get("remember", false), true);
});

test("remove deletes one preference and leaves the others", () => {
  Prefs.init(fakeStore());
  Prefs.set("username", "ada");
  Prefs.set("remember", true);
  Prefs.remove("username");
  assert.strictEqual(Prefs.get("username", "gone"), "gone");
  assert.strictEqual(Prefs.get("remember", false), true);
});

test("clear empties the namespace", () => {
  Prefs.init(fakeStore());
  Prefs.set("username", "ada");
  Prefs.set("remember", true);
  Prefs.clear();
  assert.strictEqual(Prefs.get("username", "gone"), "gone");
  assert.strictEqual(Prefs.get("remember", false), false);
});

test("all preferences live under one storage key", () => {
  const store = fakeStore();
  Prefs.init(store);
  Prefs.set("username", "ada");
  Prefs.set("remember", true);
  assert.deepStrictEqual([...store.data.keys()], ["webapp.prefs"]);
});
```

- [ ] **Step 3: Add the test script to package.json**

Set the `scripts` block in `package.json` so the file reads:

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

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../prefs'`.

- [ ] **Step 5: Write the minimal implementation**

Create `prefs.js`:

```js
// Browser preference storage. Every preference lives in one namespaced
// localStorage entry so adding a preference needs no new storage plumbing and
// clear() cannot touch unrelated keys.
(function (global) {
  "use strict";

  const NAMESPACE_KEY = "webapp.prefs";

  let backend = null;

  // The seam that lets tests run against a fake in place of localStorage.
  function init(store) {
    backend = store;
    return backend;
  }

  function readAll() {
    const raw = backend.getItem(NAMESPACE_KEY);
    if (raw === null || raw === undefined) {
      return {};
    }
    return JSON.parse(raw);
  }

  function writeAll(prefs) {
    backend.setItem(NAMESPACE_KEY, JSON.stringify(prefs));
    return true;
  }

  function get(key, fallback) {
    const prefs = readAll();
    return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : fallback;
  }

  function set(key, value) {
    const prefs = readAll();
    prefs[key] = value;
    return writeAll(prefs);
  }

  function remove(key) {
    const prefs = readAll();
    delete prefs[key];
    return writeAll(prefs);
  }

  function clear() {
    return writeAll({});
  }

  const Prefs = { init, get, set, remove, clear };

  init(global.localStorage);

  global.Prefs = Prefs;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Prefs;
  }
})(globalThis);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 6 passing tests.

- [ ] **Step 7: Commit**

```bash
git add prefs.js test/helpers/fake-store.js test/prefs.test.js package.json
git commit -m "feat: add preferences module with core get/set/remove/clear"
```

---

### Task 2: Preferences module — survive a hostile localStorage

**Risk tier:** standard — rewrites the module's read/write internals and adds the repo's first error handling.

**Files:**
- Modify: `prefs.js` (replace `init`, `readAll`, `writeAll`; add `memoryStore`, `usable`, `resetNamespace`)
- Modify: `test/prefs.test.js` (append tests; leave the Task 1 tests unchanged)

**Interfaces:**
- Consumes: everything Task 1 produced — `Prefs.init/get/set/remove/clear`, `fakeStore()` with its `data` Map and `throwOnRead`/`throwOnWrite` flags.
- Produces: the same five-function surface, with changed contracts —
  - `Prefs.init(store)` now probes `store` and substitutes an in-memory backend when the probe throws; still returns the active backend.
  - `Prefs.set(key, value)` now returns `false` instead of throwing when the backend rejects the write.
  - `Prefs.get(key, fallback)` now returns `fallback` instead of throwing when the stored entry is unparseable or is not a plain object, and resets that entry.
  - No function in the module throws.

**Mirror:** none — the repo has no existing try/catch to imitate. Follow the style in `app.js:10-15` (guard clauses, early returns) and keep every `catch` block commented with why it swallows.

- [ ] **Step 1: Write the failing resilience tests**

Append to `test/prefs.test.js`:

```js
test("corrupt JSON is treated as no preferences and the entry is reset", () => {
  const store = fakeStore();
  store.data.set("webapp.prefs", "{not json");
  Prefs.init(store);
  assert.strictEqual(Prefs.get("username", "fallback"), "fallback");
  assert.strictEqual(store.data.has("webapp.prefs"), false);
});

test("a stored non-object is treated as no preferences", () => {
  for (const junk of ["null", "[]", '"a string"', "42"]) {
    const store = fakeStore();
    store.data.set("webapp.prefs", junk);
    Prefs.init(store);
    assert.strictEqual(Prefs.get("username", "fallback"), "fallback", junk);
    assert.strictEqual(store.data.has("webapp.prefs"), false, junk);
  }
});

test("set returns false when the backend rejects the write", () => {
  const store = fakeStore();
  Prefs.init(store);
  // Flip the flag after init so the availability probe succeeds and we are
  // testing a write failure, not the in-memory fallback.
  store.throwOnWrite = true;
  assert.strictEqual(Prefs.set("username", "ada"), false);
});

test("an unreadable backend falls back to memory and still works", () => {
  Prefs.init(fakeStore({ throwOnRead: true }));
  assert.strictEqual(Prefs.set("username", "ada"), true);
  assert.strictEqual(Prefs.get("username", ""), "ada");
});

test("an unwritable backend falls back to memory and still works", () => {
  Prefs.init(fakeStore({ throwOnWrite: true }));
  assert.strictEqual(Prefs.set("username", "ada"), true);
  assert.strictEqual(Prefs.get("username", ""), "ada");
});

test("a missing backend falls back to memory instead of throwing", () => {
  Prefs.init(undefined);
  assert.strictEqual(Prefs.set("username", "ada"), true);
  assert.strictEqual(Prefs.get("username", ""), "ada");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — the corrupt-JSON test throws `SyntaxError: Unexpected token`, and the backend-failure tests throw instead of returning a value.

- [ ] **Step 3: Replace the module internals**

In `prefs.js`, replace everything between the `const NAMESPACE_KEY` line and the `function get(key, fallback)` line with this, leaving `get`, `set`, `remove`, `clear`, and the footer as they are:

```js
  const NAMESPACE_KEY = "webapp.prefs";
  const PROBE_KEY = "webapp.prefs.probe";

  let backend = null;

  function memoryStore() {
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

  // Safari private mode throws on every write and a user can disable site data
  // entirely, so a store that exists is not necessarily a store that works.
  function usable(store) {
    if (!store) {
      return false;
    }
    try {
      store.setItem(PROBE_KEY, "1");
      store.getItem(PROBE_KEY);
      store.removeItem(PROBE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  // The seam that lets tests run against a fake in place of localStorage.
  function init(store) {
    backend = usable(store) ? store : memoryStore();
    return backend;
  }

  function resetNamespace() {
    try {
      backend.removeItem(NAMESPACE_KEY);
    } catch (error) {
      // The entry is already unreadable and unwritable; there is nothing left
      // to try, and the caller gets its fallback either way.
    }
  }

  function readAll() {
    let raw;
    try {
      raw = backend.getItem(NAMESPACE_KEY);
    } catch (error) {
      // A backend usable at init can still start failing. Degrade for the rest
      // of the session rather than throwing at every call site.
      backend = memoryStore();
      return {};
    }
    if (raw === null || raw === undefined) {
      return {};
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      resetNamespace();
      return {};
    }
    // Anything on the page can overwrite the key, so a successful parse is not
    // proof we got the shape we wrote.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      resetNamespace();
      return {};
    }
    return parsed;
  }

  function writeAll(prefs) {
    try {
      backend.setItem(NAMESPACE_KEY, JSON.stringify(prefs));
      return true;
    } catch (error) {
      return false;
    }
  }

```

Then replace the load-time initialization line `init(global.localStorage);` with:

```js
  let initialStore = null;
  try {
    initialStore = global.localStorage;
  } catch (error) {
    // Reading window.localStorage itself throws when site data is disabled.
    initialStore = null;
  }
  init(initialStore);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 12 passing tests (Task 1's 6 plus these 6). If a Task 1 test now fails, the rewrite broke the happy path; fix `prefs.js`, not the Task 1 tests.

- [ ] **Step 5: Commit**

```bash
git add prefs.js test/prefs.test.js
git commit -m "feat: make preferences module resilient to unusable storage"
```

---

### Task 3: Wire "remember username" into the login form

**Risk tier:** standard — touches the live login page, and its verification is manual rather than automated.

**Files:**
- Modify: `index.html:8-13` (add the checkbox and the `prefs.js` script tag)
- Modify: `app.js:17-28` (save or clear on submit; prefill on load)

**Interfaces:**
- Consumes: the global `Prefs` object from Task 2 — `Prefs.get(key, fallback)`, `Prefs.set(key, value)`, `Prefs.remove(key)`. `prefs.js` assigns `globalThis.Prefs`, so `app.js` uses the bare name `Prefs`.
- Produces: nothing other tasks depend on. This is the last task.

**Mirror:** `app.js:17-20` for reading DOM nodes at top level with `document.getElementById`; `index.html:13` for the script tag placement.

- [ ] **Step 1: Add the checkbox and the script tag**

In `index.html`, replace lines 8-13 with:

```html
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <label><input type="checkbox" id="remember-username" /> Remember me</label>
    <button type="submit">Log In</button>
  </form>
  <script src="prefs.js"></script>
  <script src="app.js"></script>
```

`prefs.js` must load before `app.js`: `app.js` calls `Prefs` at top level.

- [ ] **Step 2: Save or clear the username on submit**

In `app.js`, inside the submit handler, replace the `if (validation.valid) { ... }` block (lines 22-27) with:

```js
  if (validation.valid) {
    if (document.getElementById("remember-username").checked) {
      Prefs.set("username", username);
    } else {
      // Unticking actively clears a previously remembered username rather than
      // leaving it behind.
      Prefs.remove("username");
    }
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
```

The password is never passed to `Prefs`.

- [ ] **Step 3: Prefill the username on load**

Append to the end of `app.js`:

```js
function restoreUsername() {
  const saved = Prefs.get("username", "");
  if (!saved) {
    return;
  }
  document.getElementById("username").value = saved;
  document.getElementById("remember-username").checked = true;
}

restoreUsername();
```

- [ ] **Step 4: Check both files parse**

Run: `node --check app.js && node --check prefs.js`
Expected: no output, exit 0.

- [ ] **Step 5: Re-run the unit tests**

Run: `npm test`
Expected: PASS — still 12 passing tests. Task 3 changes no module behavior; a failure here means `prefs.js` was edited by mistake.

- [ ] **Step 6: Verify by hand in a browser**

There is no jsdom in this project, so the DOM wiring has no automated coverage. Open `index.html` in a browser and confirm all five, recording the result of each in the task report:

1. Type a username and password, tick "Remember me", submit. Reload the page: the username field is prefilled and the checkbox is ticked.
2. In devtools, `localStorage.getItem("webapp.prefs")` shows only the username — no password.
3. Untick "Remember me" and submit again. Reload: the username field is empty and the checkbox is unticked.
4. Submit with an empty password while "Remember me" is ticked. The console shows the validation error and `localStorage` is unchanged — nothing is saved when validation fails.
5. In devtools, set `localStorage.setItem("webapp.prefs", "garbage")` and reload. The page loads normally with an empty username field and no console error.

If a browser is unavailable in the execution environment, say so explicitly in the task report and leave this step unchecked rather than reporting it as done.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js
git commit -m "feat: remember username on the login form"
```
