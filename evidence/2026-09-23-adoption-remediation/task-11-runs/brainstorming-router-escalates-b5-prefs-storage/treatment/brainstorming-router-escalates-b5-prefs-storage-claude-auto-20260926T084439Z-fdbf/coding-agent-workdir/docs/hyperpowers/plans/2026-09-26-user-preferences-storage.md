# User Preferences Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-26-user-preferences-storage-design.md`

**Goal:** Give the webapp a browser-local preferences module and use it to remember the user's username across page loads.

**Architecture:** A single classic script, `prefs.js`, owns one localStorage key holding one JSON object. It exposes four synchronous functions over a `DEFAULTS` constant that defines the whole preference schema. Storage failures degrade to an in-process fallback so the page keeps working; programmer errors throw. `app.js` consumes it for one preference: a "remember my username" checkbox.

**Tech Stack:** Plain browser JavaScript (classic scripts, no modules, no framework). Node's built-in test runner (`node:test` + `node:assert`) for unit tests. No third-party dependencies.

## Global Constraints

- Unit tests are part of this work: Node's built-in test runner (`node:test` + `node:assert`), run via `npm test`. Every task that adds behavior adds tests with it.
- No third-party dependencies. `package.json` declares none and must continue to declare none.
- No linter, formatter, or end-to-end test infrastructure is set up by this work. It was considered and declined. Match the existing file style by hand.
- The password is never persisted. Not to localStorage, not anywhere.
- The storage key is exactly `webapp.preferences`. The schema version is exactly `1`.

## Grounding

- Module export convention: `src/utils.js:1-5` — a bare `function` declaration followed by `module.exports = { greet };`. `prefs.js` imitates the `module.exports` tail so tests can require it.
- Browser script wiring: `index.html:13` — a single `<script src="app.js"></script>` at the end of `<body>`, no `type="module"`. New scripts are added the same way.
- DOM access and event handling: `app.js:17-28` — top-level `document.getElementById(...)` with no `DOMContentLoaded` wrapper (safe because the script tag is last in `<body>`), and `e.preventDefault()` inside the submit handler.
- Error-shape convention: `app.js:10-15` — `validateForm` returns a `{ valid, error }` result object rather than throwing. This is the only error-handling precedent in the repo; note that `prefs.js` deliberately differs (it throws on programmer error and returns a boolean on storage failure) because it is a storage API, not a form validator.
- Test shape: `none: no existing pattern for tests` — the repo has no test directory, no test script, and no test framework. Task 1 establishes the pattern.
- Naming: `src/utils.js:1` and `app.js:4,10` — `lowerCamelCase` function names, double-quoted strings in `app.js`, two-space indentation throughout.

---

### Task 1: Preferences module core and test infrastructure

**Risk tier:** standard — new module plus the repo's first test infrastructure; multi-file, and every later task depends on its interface.

**Files:**
- Create: `prefs.js`
- Create: `test/prefs.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a global `Prefs` object, also exported via `module.exports`, with:
  - `Prefs.get(name: string) => boolean | string` — the stored value or its default.
  - `Prefs.set(name: string, value: boolean | string) => boolean` — `true` if persisted to localStorage, `false` if only held in memory.
  - `Prefs.all() => { rememberUsername: boolean, lastUsername: string }` — a copy, excluding `version`.
  - `Prefs.reset() => boolean` — restore defaults; same boolean meaning as `set`.
  - Preference names: `"rememberUsername"` (boolean, default `false`) and `"lastUsername"` (string, default `""`).

**Mirror:** `src/utils.js:1-5` — the `module.exports = { ... }` tail and the bare function-declaration style.

- [ ] **Step 1: Add the test script to `package.json`**

Add a `scripts` block. The full file afterwards:

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

Create `test/prefs.test.js` with exactly this content:

```js
const test = require("node:test");
const assert = require("node:assert");

const PREFS_PATH = require.resolve("../prefs.js");
const STORAGE_KEY = "webapp.preferences";

// Each test gets a fresh module instance so the module's in-memory fallback
// state never leaks between cases.
function loadPrefs() {
  delete require.cache[PREFS_PATH];
  return require(PREFS_PATH);
}

function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    data: data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

function useStorage(store) {
  globalThis.localStorage = store;
}

test.afterEach(() => {
  delete globalThis.localStorage;
});

test("returns defaults when the store is empty", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.get("rememberUsername"), false);
  assert.strictEqual(Prefs.get("lastUsername"), "");
});

test("all() returns every preference and excludes version", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  assert.deepStrictEqual(Prefs.all(), {
    rememberUsername: false,
    lastUsername: "",
  });
});

test("set then get round-trips the value", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.set("rememberUsername", true), true);
  assert.strictEqual(Prefs.set("lastUsername", "ada"), true);
  assert.strictEqual(Prefs.get("rememberUsername"), true);
  assert.strictEqual(Prefs.get("lastUsername"), "ada");
});

test("a written value survives a fresh module load on the same store", () => {
  const store = fakeStorage();
  useStorage(store);
  loadPrefs().set("lastUsername", "grace");

  useStorage(store);
  assert.strictEqual(loadPrefs().get("lastUsername"), "grace");
});

test("the persisted object carries the schema version", () => {
  const store = fakeStorage();
  useStorage(store);
  loadPrefs().set("lastUsername", "ada");
  assert.strictEqual(JSON.parse(store.data[STORAGE_KEY]).version, 1);
});

test("an unknown preference name throws on get and on set", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  assert.throws(() => Prefs.get("nope"), /Unknown preference/);
  assert.throws(() => Prefs.set("nope", 1), /Unknown preference/);
});

test("a value of the wrong type throws", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  assert.throws(() => Prefs.set("rememberUsername", "yes"), /Expected/);
  assert.throws(() => Prefs.set("lastUsername", 42), /Expected/);
});

test("all() returns a copy that cannot mutate internal state", () => {
  useStorage(fakeStorage());
  const Prefs = loadPrefs();
  const snapshot = Prefs.all();
  snapshot.lastUsername = "mutated";
  assert.strictEqual(Prefs.get("lastUsername"), "");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../prefs.js'` from `require.resolve`.

- [ ] **Step 4: Write the module**

Create `prefs.js` with exactly this content:

```js
// Browser-local user preferences. One localStorage key holds one JSON object;
// DEFAULTS is the schema.
(function (global) {
  "use strict";

  const STORAGE_KEY = "webapp.preferences";
  const SCHEMA_VERSION = 1;

  const DEFAULTS = {
    rememberUsername: false,
    lastUsername: "",
  };

  // Holds values that could not reach localStorage, so preferences still behave
  // correctly for the lifetime of the page. Null means storage is authoritative.
  let fallback = null;

  function storage() {
    try {
      return global.localStorage || null;
    } catch (e) {
      // Merely touching localStorage throws in some privacy modes.
      return null;
    }
  }

  function assertKnown(name) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, name)) {
      throw new Error("Unknown preference: " + name);
    }
  }

  function parse(raw) {
    if (typeof raw !== "string") {
      return {};
    }
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch (e) {
      return {};
    }
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return {};
    }
    if (stored.version !== SCHEMA_VERSION) {
      return {};
    }
    const clean = {};
    Object.keys(DEFAULTS).forEach((name) => {
      if (typeof stored[name] === typeof DEFAULTS[name]) {
        clean[name] = stored[name];
      }
    });
    return clean;
  }

  function load() {
    const store = storage();
    let stored = {};
    if (store) {
      try {
        stored = parse(store.getItem(STORAGE_KEY));
      } catch (e) {
        stored = {};
      }
    }
    return Object.assign({}, DEFAULTS, stored, fallback || {});
  }

  function write(prefs) {
    const payload = { version: SCHEMA_VERSION };
    Object.keys(DEFAULTS).forEach((name) => {
      payload[name] = prefs[name];
    });

    const store = storage();
    if (store) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(payload));
        fallback = null;
        return true;
      } catch (e) {
        // Quota exhausted or storage denied; fall through to memory.
      }
    }

    fallback = fallback || {};
    Object.keys(DEFAULTS).forEach((name) => {
      fallback[name] = prefs[name];
    });
    return false;
  }

  function get(name) {
    assertKnown(name);
    return load()[name];
  }

  function set(name, value) {
    assertKnown(name);
    if (typeof value !== typeof DEFAULTS[name]) {
      throw new TypeError(
        "Expected " + typeof DEFAULTS[name] + " for preference " + name
      );
    }
    const next = load();
    next[name] = value;
    return write(next);
  }

  function all() {
    const prefs = load();
    const copy = {};
    Object.keys(DEFAULTS).forEach((name) => {
      copy[name] = prefs[name];
    });
    return copy;
  }

  function reset() {
    const store = storage();
    if (store) {
      try {
        store.removeItem(STORAGE_KEY);
        fallback = null;
        return true;
      } catch (e) {
        // Fall through to memory.
      }
    }
    fallback = Object.assign({}, DEFAULTS);
    return false;
  }

  const Prefs = { get, set, all, reset };

  global.Prefs = Prefs;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Prefs;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 8 tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add prefs.js test/prefs.test.js package.json
git commit -m "feat: add browser-local preferences module"
```

---

### Task 2: Storage failure handling

**Risk tier:** standard — no new interface, but it defines how the module behaves in every degraded browser state, and a mistake here silently breaks preferences rather than failing loudly.

**Files:**
- Modify: `prefs.js` (only if a test exposes a defect; the Task 1 implementation is expected to satisfy these tests as written)
- Modify: `test/prefs.test.js` (append)

**Interfaces:**
- Consumes: `Prefs.get`, `Prefs.set`, `Prefs.all`, `Prefs.reset` from Task 1, and the `loadPrefs`, `fakeStorage`, `useStorage`, `STORAGE_KEY` test helpers defined at the top of `test/prefs.test.js`.
- Produces: nothing new. This task adds confidence, not surface area.

**Mirror:** `test/prefs.test.js:1-40` as written in Task 1 — the helper-plus-`test(...)` shape and the `useStorage(...)` / `loadPrefs()` opening of every case.

- [ ] **Step 1: Write the failing tests**

Append to `test/prefs.test.js`:

```js
test("corrupt JSON falls back to defaults without throwing", () => {
  useStorage(fakeStorage({ [STORAGE_KEY]: "{not json" }));
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.get("lastUsername"), "");
  assert.strictEqual(Prefs.get("rememberUsername"), false);
});

test("a non-object payload falls back to defaults", () => {
  useStorage(fakeStorage({ [STORAGE_KEY]: "[1,2,3]" }));
  assert.strictEqual(loadPrefs().get("lastUsername"), "");
});

test("a version mismatch resets to defaults", () => {
  const raw = JSON.stringify({ version: 2, lastUsername: "ada" });
  useStorage(fakeStorage({ [STORAGE_KEY]: raw }));
  assert.strictEqual(loadPrefs().get("lastUsername"), "");
});

test("a stored field of the wrong type falls back while others survive", () => {
  const raw = JSON.stringify({
    version: 1,
    rememberUsername: "yes",
    lastUsername: "ada",
  });
  useStorage(fakeStorage({ [STORAGE_KEY]: raw }));
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.get("rememberUsername"), false);
  assert.strictEqual(Prefs.get("lastUsername"), "ada");
});

test("absent localStorage keeps values in memory without throwing", () => {
  delete globalThis.localStorage;
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.set("lastUsername", "ada"), false);
  assert.strictEqual(Prefs.get("lastUsername"), "ada");
});

test("a localStorage accessor that throws is treated as absent", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError");
    },
  });
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.set("lastUsername", "ada"), false);
  assert.strictEqual(Prefs.get("lastUsername"), "ada");
});

test("quota exhaustion keeps the value in memory and reports false", () => {
  const store = fakeStorage();
  store.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  useStorage(store);
  const Prefs = loadPrefs();
  assert.strictEqual(Prefs.set("lastUsername", "ada"), false);
  assert.strictEqual(Prefs.get("lastUsername"), "ada");
});

test("reset restores defaults and clears the stored key", () => {
  const store = fakeStorage();
  useStorage(store);
  const Prefs = loadPrefs();
  Prefs.set("rememberUsername", true);
  Prefs.set("lastUsername", "ada");
  assert.strictEqual(Prefs.reset(), true);
  assert.deepStrictEqual(Prefs.all(), {
    rememberUsername: false,
    lastUsername: "",
  });
  assert.strictEqual(store.data[STORAGE_KEY], undefined);
});

test("no key outside the schema can ever be written", () => {
  const store = fakeStorage();
  useStorage(store);
  const Prefs = loadPrefs();
  assert.throws(() => Prefs.set("password", "hunter2"), /Unknown preference/);
  Prefs.set("lastUsername", "ada");
  const written = JSON.parse(store.data[STORAGE_KEY]);
  assert.deepStrictEqual(Object.keys(written).sort(), [
    "lastUsername",
    "rememberUsername",
    "version",
  ]);
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: the 8 Task 1 tests still PASS. The 9 new tests should also PASS against the Task 1 implementation, which already handles these paths.

If any new test FAILS, that is a real defect in `prefs.js` — fix `prefs.js` so the test passes, and do not weaken the test to match the code.

- [ ] **Step 3: Confirm the full suite is green**

Run: `npm test`
Expected: PASS — 17 tests passing, 0 failing.

- [ ] **Step 4: Commit**

```bash
git add prefs.js test/prefs.test.js
git commit -m "test: cover preferences storage failure modes"
```

---

### Task 3: Remember-username integration

**Risk tier:** high — this is the code path that decides what user-entered credentials data reaches persistent storage, and the "password is never persisted" invariant lives here. It also has no automated coverage, because end-to-end test infrastructure was explicitly declined; verification is a human loading the page.

**Files:**
- Modify: `index.html:8-13`
- Modify: `app.js:17-28`

**Interfaces:**
- Consumes: `Prefs.get("rememberUsername")`, `Prefs.get("lastUsername")`, `Prefs.set("rememberUsername", boolean)`, `Prefs.set("lastUsername", string)` from Task 1.
- Produces: nothing other tasks depend on. This is the last task.

**Mirror:** `app.js:17-28` — top-level `document.getElementById(...)` with no `DOMContentLoaded` wrapper, and the existing submit-handler shape.

- [ ] **Step 1: Add the checkbox and the script tag to `index.html`**

Replace the `<form>` block and the script tag. The full file afterwards:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <label>
      <input type="checkbox" id="remember-username" /> Remember my username
    </label>
    <button type="submit">Log In</button>
  </form>
  <script src="prefs.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

`prefs.js` must come before `app.js`, so `Prefs` is defined when `app.js` runs.

- [ ] **Step 2: Wire the preference into `app.js`**

Add the two functions below the existing `validateForm`, call `storeUsernamePreference` from the submit handler, and apply stored preferences at the end of the file. The full file afterwards:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

function applyStoredPreferences() {
  const remember = Prefs.get("rememberUsername");
  document.getElementById("remember-username").checked = remember;
  if (remember) {
    document.getElementById("username").value = Prefs.get("lastUsername");
  }
}

// Only the username is ever persisted. Unticking the box actively erases the
// stored value rather than leaving it orphaned.
function storeUsernamePreference(username) {
  const remember = document.getElementById("remember-username").checked;
  Prefs.set("rememberUsername", remember);
  Prefs.set("lastUsername", remember ? username : "");
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  storeUsernamePreference(username);
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});

applyStoredPreferences();
```

- [ ] **Step 3: Confirm the unit suite is still green**

Run: `npm test`
Expected: PASS — 17 tests passing, 0 failing. (These tests cover `prefs.js` only; `app.js` has no automated coverage.)

- [ ] **Step 4: Verify in a browser**

Open `index.html` in a browser and walk through both directions:

1. Type `ada` as the username and any password, tick "Remember my username", submit.
2. Reload the page. Expected: the username field reads `ada` and the box is ticked.
3. Untick the box, submit again.
4. Reload. Expected: the username field is empty and the box is unticked.
5. In DevTools, inspect `localStorage["webapp.preferences"]`. Expected: a JSON object with exactly `version`, `rememberUsername`, and `lastUsername`. **No password value appears anywhere in it.** If a password is present, stop and treat it as a defect.

Record the outcome of each of the five checks in the task report. If a browser is unavailable in the execution environment, say so explicitly rather than reporting the steps as passed.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js
git commit -m "feat: remember the username across sessions"
```
