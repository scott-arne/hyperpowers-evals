# Login User Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-22-login-user-identity-design.md`

**Goal:** Give the webapp a user identity that arrives from the login response, persists in `localStorage`, and is readable from anywhere in the app.

**Architecture:** Three new ES modules under `auth/`: `session.mjs` wraps `localStorage` behind an injectable storage object, `api.mjs` owns the network call and the sole function that knows the server's wire shape, and `login.mjs` orchestrates the two. `app.js` becomes form wiring only and loads as a module. `login` keeps its `(username, password)` signature and becomes `async`; the userId is a return value, never a parameter.

**Tech Stack:** Vanilla browser JavaScript, native ES modules, no build step. Tests run on Node's built-in `node:test` (Node v26.9.0 confirmed present).

## Global Constraints

Copied from the spec. Every task's requirements implicitly include these.

- **No dependencies.** `package.json` gains no `dependencies` or `devDependencies`. Tests use `node:test` and `node:assert` only.
- **Do not add `"type": "module"` to `package.json`.** `src/index.js` and `src/utils.js` are CommonJS and would break. New modules use the `.mjs` extension so Node treats them as ESM regardless.
- **Do not modify `src/index.js` or `src/utils.js`.** They are unrelated to the browser code.
- **The password is never persisted and never logged.**
- **The stored `userId` is a display and correlation value only, never an authorization fact.**
- Storage key is exactly `app.session.v1`.
- Out of scope: logout UI, login-failure UI, any audit or event logging. `clearSession()` exists and stays uncalled; failures reach `console.error` only.
- After this change `index.html` must be served over HTTP (`python3 -m http.server`), not opened via `file://` — ES modules do not load over `file://`.

## Grounding

- **Error handling — result objects, not exceptions:** `app.js:10-15`. `validateForm` returns `{ valid: false, error: "..." }` rather than throwing. The new `normalizeLoginResponse` and `postLogin` mirror this with `{ ok, error }`.
- **Constant naming — SCREAMING_SNAKE_CASE at module top:** `app.js:2` (`const API_ENDPOINT = "https://api.example.com/login";`).
- **Function naming — camelCase:** `app.js:4` (`login`), `app.js:10` (`validateForm`), `src/utils.js:1` (`greet`).
- **Module export shape:** `src/utils.js:5` (`module.exports = { greet };`) — a single named-export object. This is the closest existing analogue, but it is CommonJS in unrelated Node code; the new browser modules use ESM `export` instead. Cited so the implementer does not copy `module.exports` into `.mjs` files.
- **Test shape:** `none: no existing pattern for tests` — the repo has no test files, no test runner, and no `test` script. Task 1 establishes the pattern; Tasks 2 and 3 follow Task 1.
- **Lint/format config:** `none: no existing pattern` — no linter or formatter is configured, and none is being added.

---

### Task 1: Session store

**Risk tier:** standard — new module plus the repo's first test infrastructure; owns corrupt-data recovery that later tasks depend on.

**Files:**
- Create: `auth/session.mjs`
- Create: `auth/session.test.mjs`
- Modify: `package.json` (add the `scripts.test` entry)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createSessionStore(storage?: StorageLike) -> SessionStore` where `StorageLike` is any object with `getItem(key) -> string | null`, `setItem(key, value) -> void`, `removeItem(key) -> void`. Defaults to `globalThis.localStorage`.
  - `SessionStore` is `{ getSession() -> {userId: string, displayName: string | null} | null, getUserId() -> string | null, setSession({userId: string, displayName?: string | null}) -> void, clearSession() -> void }`.
  - `session` — a module-level `SessionStore` over the real `localStorage`, for app use.

**Mirror:** `app.js:10-15`, for the result-object style (return a value describing the outcome; do not throw for expected conditions).

- [ ] **Step 1: Write the failing test**

Create `auth/session.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { createSessionStore } from "./session.mjs";

// Minimal stand-in for the Web Storage API. Node has no localStorage, and
// injecting this is the whole reason createSessionStore takes a parameter.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

test("setSession then getUserId round-trips the identity", () => {
  const storage = fakeStorage();
  const store = createSessionStore(storage);

  store.setSession({ userId: "u_12345", displayName: "Ada" });

  assert.equal(store.getUserId(), "u_12345");
  assert.deepEqual(store.getSession(), { userId: "u_12345", displayName: "Ada" });
});

test("writes under the versioned storage key", () => {
  const storage = fakeStorage();
  createSessionStore(storage).setSession({ userId: "u_1", displayName: null });

  assert.ok("app.session.v1" in storage.data);
});

test("getUserId returns null when nothing is stored", () => {
  const store = createSessionStore(fakeStorage());

  assert.equal(store.getUserId(), null);
  assert.equal(store.getSession(), null);
});

test("corrupt JSON reads as no session and clears the key", () => {
  const storage = fakeStorage({ "app.session.v1": "{not json" });
  const store = createSessionStore(storage);

  assert.equal(store.getSession(), null);
  assert.equal("app.session.v1" in storage.data, false);
});

test("a stored record without a usable userId reads as no session", () => {
  const storage = fakeStorage({ "app.session.v1": JSON.stringify({ displayName: "Ada" }) });
  const store = createSessionStore(storage);

  assert.equal(store.getSession(), null);
  assert.equal("app.session.v1" in storage.data, false);
});

test("clearSession removes the stored identity", () => {
  const storage = fakeStorage();
  const store = createSessionStore(storage);
  store.setSession({ userId: "u_1", displayName: null });

  store.clearSession();

  assert.equal(store.getUserId(), null);
});

test("setSession rejects an empty userId instead of storing it", () => {
  const store = createSessionStore(fakeStorage());

  assert.throws(() => store.setSession({ userId: "", displayName: "Ada" }), TypeError);
});
```

- [ ] **Step 2: Add the test script, then run the test to verify it fails**

Edit `package.json` so it reads exactly:

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

Run: `npm test`
Expected: FAIL — `Cannot find module` / `Cannot find package` for `./session.mjs`.

- [ ] **Step 3: Write minimal implementation**

Create `auth/session.mjs`:

```js
// Holds the identity returned by login. The stored userId is a display and
// correlation value only — never an authorization fact, because anyone can
// edit it in devtools.

const STORAGE_KEY = "app.session.v1";

function isUsableUserId(value) {
  return typeof value === "string" && value !== "";
}

export function createSessionStore(storage = globalThis.localStorage) {
  function getSession() {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // A corrupt record is indistinguishable from no record, and leaving it
      // in place would make every future read fail the same way.
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    if (parsed === null || typeof parsed !== "object" || !isUsableUserId(parsed.userId)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      userId: parsed.userId,
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : null,
    };
  }

  return {
    getSession,

    getUserId() {
      const current = getSession();
      return current === null ? null : current.userId;
    },

    setSession({ userId, displayName = null }) {
      if (!isUsableUserId(userId)) {
        throw new TypeError("setSession requires a non-empty string userId");
      }
      storage.setItem(STORAGE_KEY, JSON.stringify({ userId, displayName }));
    },

    clearSession() {
      storage.removeItem(STORAGE_KEY);
    },
  };
}

// Constructing the store touches no storage, so this is safe to import under
// Node (where globalThis.localStorage is undefined) as long as nothing calls
// its methods there. Tests must build their own store via createSessionStore.
export const session = createSessionStore();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add auth/session.mjs auth/session.test.mjs package.json
git commit -m "feat: add localStorage-backed session store for user identity"
```

---

### Task 2: Login API client and response normalizer

**Risk tier:** high — this is the credential-handling boundary. It builds the request carrying the user's password and owns the only code that decides whether a response counts as an authenticated identity.

**Files:**
- Create: `auth/api.mjs`
- Create: `auth/api-fake.mjs`
- Create: `auth/api.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `normalizeLoginResponse(raw: unknown) -> {ok: true, userId: string, displayName: string | null} | {ok: false, error: string}`
  - `postLogin({username: string, password: string}) -> Promise<same shape as above>`
  - `auth/api-fake.mjs` exports `fakeLogin({username, password}) -> Promise<object>` returning a raw, un-normalized body.

**Mirror:** `app.js:10-15`, for the result-object style; `app.js:2`, for the `SCREAMING_SNAKE_CASE` module constant.

- [ ] **Step 1: Write the failing test**

Create `auth/api.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLoginResponse } from "./api.mjs";

test("a successful response yields the userId", () => {
  const result = normalizeLoginResponse({ ok: true, userId: "u_12345", displayName: "Ada" });

  assert.deepEqual(result, { ok: true, userId: "u_12345", displayName: "Ada" });
});

test("displayName is null when the server omits it", () => {
  const result = normalizeLoginResponse({ ok: true, userId: "u_12345" });

  assert.deepEqual(result, { ok: true, userId: "u_12345", displayName: null });
});

test("a declared failure surfaces the server's error", () => {
  const result = normalizeLoginResponse({ ok: false, error: "invalid_credentials" });

  assert.deepEqual(result, { ok: false, error: "invalid_credentials" });
});

test("a failure without an error string still fails", () => {
  const result = normalizeLoginResponse({ ok: false });

  assert.deepEqual(result, { ok: false, error: "login_failed" });
});

test("a malformed body is a failure", () => {
  assert.deepEqual(normalizeLoginResponse(null), { ok: false, error: "malformed_response" });
  assert.deepEqual(normalizeLoginResponse("nope"), { ok: false, error: "malformed_response" });
  assert.deepEqual(normalizeLoginResponse(undefined), { ok: false, error: "malformed_response" });
});

test("ok:true without a usable userId is a failure, not a session", () => {
  assert.deepEqual(normalizeLoginResponse({ ok: true }), { ok: false, error: "missing_user_id" });
  assert.deepEqual(normalizeLoginResponse({ ok: true, userId: "" }), { ok: false, error: "missing_user_id" });
  assert.deepEqual(normalizeLoginResponse({ ok: true, userId: 12345 }), { ok: false, error: "missing_user_id" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./api.mjs`.

- [ ] **Step 3: Write minimal implementation**

Create `auth/api-fake.mjs`:

```js
// FAKE. This is not an authentication check: it accepts any credentials and
// ignores the password entirely. It exists only because API_ENDPOINT does not
// resolve, and it is selected by USE_FAKE_API in api.mjs.
export async function fakeLogin({ username }) {
  return { ok: true, userId: `u_${username}`, displayName: username };
}
```

Create `auth/api.mjs`:

```js
const API_ENDPOINT = "https://api.example.com/login";

// No backend exists yet — API_ENDPOINT is a placeholder that does not resolve,
// so the real path cannot succeed. Flip this to false when a real login
// endpoint is available; that is the only edit needed to switch over.
const USE_FAKE_API = true;

function isUsableUserId(value) {
  return typeof value === "string" && value !== "";
}

// The only function that knows the server's wire shape. When the real backend
// lands and disagrees with the contract in the spec, this is what changes.
export function normalizeLoginResponse(raw) {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "malformed_response" };
  }

  if (raw.ok !== true) {
    const error = typeof raw.error === "string" && raw.error !== "" ? raw.error : "login_failed";
    return { ok: false, error };
  }

  if (!isUsableUserId(raw.userId)) {
    // Treating this as success would store an undefined identity, which every
    // later read would report as a logged-in user.
    return { ok: false, error: "missing_user_id" };
  }

  return {
    ok: true,
    userId: raw.userId,
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
  };
}

export async function postLogin({ username, password }) {
  if (USE_FAKE_API) {
    const { fakeLogin } = await import("./api-fake.mjs");
    return normalizeLoginResponse(await fakeLogin({ username, password }));
  }

  let raw;
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    raw = await response.json();
  } catch {
    return { ok: false, error: "network_error" };
  }

  return normalizeLoginResponse(raw);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 7 tests from Task 1 plus 6 here, 13 total.

- [ ] **Step 5: Commit**

```bash
git add auth/api.mjs auth/api-fake.mjs auth/api.test.mjs
git commit -m "feat: add login API client with isolated response normalizer"
```

---

### Task 3: Login orchestrator

**Risk tier:** standard — small integration module, but it owns the rule that a failed login must not write an identity.

**Files:**
- Create: `auth/login.mjs`
- Create: `auth/login.test.mjs`

**Interfaces:**
- Consumes: `postLogin` from `auth/api.mjs` (Task 2); `session` and the `SessionStore` shape from `auth/session.mjs` (Task 1).
- Produces:
  - `createLogin({postLogin, session}) -> (username: string, password: string) => Promise<LoginResult>`
  - `login(username: string, password: string) -> Promise<LoginResult>` — the bound instance `app.js` imports. `LoginResult` is the `postLogin` return shape from Task 2.

The factory exists for the same reason `createSessionStore` takes a `storage`
parameter: the bound `login` reaches the real `localStorage`, which does not
exist under Node, so the behavior is tested through injected fakes.

**Mirror:** `auth/session.mjs` as written in Task 1 — same factory-plus-bound-instance shape, same comment style.

- [ ] **Step 1: Write the failing test**

Create `auth/login.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { createLogin } from "./login.mjs";

function recordingSession() {
  const calls = [];
  return {
    calls,
    setSession: (value) => calls.push(value),
    getUserId: () => null,
    getSession: () => null,
    clearSession: () => {},
  };
}

test("a successful login stores the returned identity", async () => {
  const session = recordingSession();
  const login = createLogin({
    postLogin: async () => ({ ok: true, userId: "u_12345", displayName: "Ada" }),
    session,
  });

  const result = await login("ada", "hunter2");

  assert.deepEqual(result, { ok: true, userId: "u_12345", displayName: "Ada" });
  assert.deepEqual(session.calls, [{ userId: "u_12345", displayName: "Ada" }]);
});

test("a failed login stores nothing", async () => {
  const session = recordingSession();
  const login = createLogin({
    postLogin: async () => ({ ok: false, error: "invalid_credentials" }),
    session,
  });

  const result = await login("ada", "wrong");

  assert.deepEqual(result, { ok: false, error: "invalid_credentials" });
  assert.deepEqual(session.calls, []);
});

test("credentials are forwarded to the API unchanged", async () => {
  const seen = [];
  const login = createLogin({
    postLogin: async (credentials) => {
      seen.push(credentials);
      return { ok: false, error: "invalid_credentials" };
    },
    session: recordingSession(),
  });

  await login("ada", "hunter2");

  assert.deepEqual(seen, [{ username: "ada", password: "hunter2" }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./login.mjs`.

- [ ] **Step 3: Write minimal implementation**

Create `auth/login.mjs`:

```js
import { postLogin as realPostLogin } from "./api.mjs";
import { session as realSession } from "./session.mjs";

// The userId is assigned by the server, so it is a result of logging in rather
// than an input to it. login keeps its (username, password) signature.
export function createLogin({ postLogin, session }) {
  return async function login(username, password) {
    const result = await postLogin({ username, password });

    if (result.ok) {
      session.setSession({ userId: result.userId, displayName: result.displayName });
    }

    return result;
  };
}

export const login = createLogin({ postLogin: realPostLogin, session: realSession });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 16 tests total.

- [ ] **Step 5: Commit**

```bash
git add auth/login.mjs auth/login.test.mjs
git commit -m "feat: add login orchestrator storing identity on success only"
```

---

### Task 4: Wire the form to the identity layer

**Risk tier:** standard — multi-file integration that removes the existing `login` stub from `app.js` and changes how `index.html` loads its script.

**Files:**
- Modify: `app.js:1-28` (replace the stub `login` and `API_ENDPOINT` with an import; make the submit handler `async`)
- Modify: `index.html:13` (add `type="module"`)

**Interfaces:**
- Consumes: `login` from `auth/login.mjs` (Task 3).
- Produces: nothing other tasks depend on. This is the last task.

**Mirror:** `app.js:17-28` as it stands — keep the same handler structure, the same `validateForm` guard, and the same `console.log` / `console.error` reporting. Only the call to `login` becomes awaited.

- [ ] **Step 1: Replace the contents of `app.js`**

`API_ENDPOINT` and the stub `login` move out to `auth/api.mjs` and `auth/login.mjs`. `validateForm` is unchanged. Write `app.js` as exactly:

```js
// Simple webapp with login form handling
import { login } from "./auth/login.mjs";

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    console.log("Logging in:", username);
    const result = await login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

The `console.log("Logging in:", username)` is preserved from the old `login`
body and still logs only the username. The password must not be added to
either log line.

- [ ] **Step 2: Make `index.html` load `app.js` as a module**

Change line 13 of `index.html` from:

```html
  <script src="app.js"></script>
```

to:

```html
  <script type="module" src="app.js"></script>
```

Leave the rest of the file unchanged.

- [ ] **Step 3: Confirm the unit tests still pass**

Run: `npm test`
Expected: PASS — 16 tests. `app.js` is not unit-tested; this step confirms Task 4 broke nothing in `auth/`.

- [ ] **Step 4: Verify the flow end to end in a browser**

ES modules do not load over `file://`, so the page must be served:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`, enter any username and password, submit, then check the devtools console and Application > Local Storage:

- Console shows `Logging in: <username>` then `Login result: {ok: true, userId: "u_<username>", …}`.
- Local Storage for `http://localhost:8000` has key `app.session.v1` with a JSON value containing that `userId`.
- Reload the page: the key is still present, confirming persistence.
- No module-resolution or CORS errors appear in the console.

Stop the server with Ctrl-C when done.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "feat: wire login form to the persisted identity layer"
```

---

## Verification against the spec

After Task 4, these spec claims should hold:

- `login(username, password)` has no `userId` parameter and returns the identity — `auth/login.mjs`.
- The wire shape is known to exactly one function — `normalizeLoginResponse` in `auth/api.mjs`.
- Identity persists in `localStorage` under `app.session.v1` — `auth/session.mjs`.
- `src/index.js`, `src/utils.js`, and `package.json`'s missing `"type"` field are untouched apart from the added `scripts.test`.
- No dependencies were added.
- The four accepted gaps still stand: no logout path calls `clearSession()`, failures are console-only, no audit trail exists, and the stored value is XSS-readable.
