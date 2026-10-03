# Login Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-03-login-tracking-design.md

**Goal:** Record who logged in via a server-issued `userId` returned by `login()`, sent through a shared, reusable `track()` module.

**Architecture:** A new ES module `tracking.js` exports `track(event, data, { transport })`, which builds a timestamped event and hands it to an injectable transport (default: a stub that logs the would-be POST). `app.js` becomes an ES module; `login()` returns a `userId`, and a new exported `handleLogin()` calls `track("login", { userId })` after a successful login. The DOM listener is a thin, guarded wrapper.

**Tech Stack:** Plain browser ES modules, Node 26 built-in test runner (`node --test`, `node:assert/strict`), no dependencies.

## Global Constraints

- Plain browser ES modules; no bundler.
- Unit tests use Node's built-in runner (`node --test`); no test dependencies.
- No lint/format or end-to-end tooling in this change.
- Network calls remain stubbed (no backend exists yet), matching the existing `login()` stub.
- Assumption: the page is served over HTTP (ES modules do not load from `file://`), validate via opening `index.html` through a local static server.

## Grounding

- Naming (camelCase functions, UPPER_SNAKE constants): `app.js:2-4` — `API_ENDPOINT`, `login`.
- Stubbed network call pattern: `app.js:4-8` — logs instead of POSTing, returns a canned result.
- Result-object error style (`{ valid, error }`): `app.js:10-15`.
- Module exports: `src/utils.js:1-5` — CommonJS `module.exports`, to be converted to ESM.
- Test shape: none: no existing tests or test runner in the repo.

---

### Task 1: ESM + test runner setup

**Risk tier:** standard — changes module system for existing files and introduces test infrastructure.

**Files:**
- Modify: `package.json`
- Modify: `src/utils.js:1-5`
- Modify: `src/index.js:1`
- Test: `src/utils.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs `node --test`, which auto-discovers `**/*.test.js`. `src/utils.js` exports `greet(name: string): string` as a named ESM export.

**Mirror:** `src/utils.js:1-5` — keep `greet` behavior identical; only the export syntax changes.

- [ ] **Step 1: Write the failing test**

`src/utils.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "./utils.js";

test("greet formats a greeting", () => {
  assert.equal(greet("world"), "Hello, world!");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `SyntaxError` / named export `greet` not found (utils is CommonJS and package has no `"type": "module"`).

- [ ] **Step 3: Implement**

`package.json`:
```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "test": "node --test"
  }
}
```

`src/utils.js`:
```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```

`src/index.js` line 1 becomes:
```js
import { greet } from './utils.js';
```
(rest of file unchanged)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && node src/index.js`
Expected: test PASS; `node src/index.js` prints `Hello, world!`.

- [ ] **Step 5: Commit**

```bash
git add package.json src/utils.js src/index.js src/utils.test.js
git commit -m "chore: switch to ES modules and add node --test runner"
```

---

### Task 2: Shared tracking module

**Risk tier:** standard — new shared module that other forms will depend on.

**Files:**
- Create: `tracking.js`
- Test: `tracking.test.js`

**Interfaces:**
- Consumes: Task 1's ESM setup and `npm test`.
- Produces:
  - `export const TRACKING_ENDPOINT = "https://api.example.com/events"`
  - `export async function track(event: string, data: object = {}, { transport }: { transport?: (payload) => any } = {}): Promise<void>`
  - Payload passed to transport: `{ event: string, data: object, timestamp: string /* ISO-8601 */ }`
  - Throws `TypeError` synchronously-in-promise (rejects) only when `event` is not a non-empty string. Transport errors are caught, logged via `console.error`, and the promise resolves.

**Mirror:** `app.js:4-8` — stub style for `defaultTransport` (log what would be sent, no real network).

- [ ] **Step 1: Write the failing tests**

`tracking.test.js`:
```js
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { track } from "./tracking.js";

test("track sends event, data, and ISO timestamp to the transport", async () => {
  const sent = [];
  await track("login", { userId: "u1" }, { transport: (p) => sent.push(p) });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].event, "login");
  assert.deepEqual(sent[0].data, { userId: "u1" });
  assert.equal(new Date(sent[0].timestamp).toISOString(), sent[0].timestamp);
});

test("track defaults data to an empty object", async () => {
  const sent = [];
  await track("ping", undefined, { transport: (p) => sent.push(p) });
  assert.deepEqual(sent[0].data, {});
});

test("track resolves and logs when the transport throws", async (t) => {
  const errorSpy = t.mock.method(console, "error", () => {});
  await assert.doesNotReject(
    track("login", {}, { transport: () => { throw new Error("network down"); } })
  );
  assert.equal(errorSpy.mock.callCount(), 1);
});

test("track resolves and logs when an async transport rejects", async (t) => {
  const errorSpy = t.mock.method(console, "error", () => {});
  await assert.doesNotReject(
    track("login", {}, { transport: async () => { throw new Error("500"); } })
  );
  assert.equal(errorSpy.mock.callCount(), 1);
});

test("track rejects on a missing or empty event name", async () => {
  const transport = () => {};
  await assert.rejects(track(undefined, {}, { transport }), TypeError);
  await assert.rejects(track("", {}, { transport }), TypeError);
  await assert.rejects(track(42, {}, { transport }), TypeError);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tracking.test.js`
Expected: FAIL — cannot find module `./tracking.js`.

- [ ] **Step 3: Implement**

`tracking.js`:
```js
// Shared event tracking. Other forms import track() to record events.
export const TRACKING_ENDPOINT = "https://api.example.com/events";

function defaultTransport(payload) {
  // Stub: would POST payload to TRACKING_ENDPOINT in real app
  console.log("Tracking:", TRACKING_ENDPOINT, payload);
}

export async function track(event, data = {}, { transport = defaultTransport } = {}) {
  if (typeof event !== "string" || event === "") {
    throw new TypeError("track: event must be a non-empty string");
  }
  const payload = { event, data, timestamp: new Date().toISOString() };
  try {
    await transport(payload);
  } catch (err) {
    console.error("Tracking failed:", err);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tracking.js tracking.test.js
git commit -m "feat: add shared track() module with stubbed transport"
```

---

### Task 3: Return userId from login and track successful logins

**Risk tier:** standard — multi-file integration (app.js, index.html) and changes `login()`'s return contract.

**Files:**
- Modify: `app.js:1-29` (whole file)
- Modify: `index.html:13`
- Test: `app.test.js`

**Interfaces:**
- Consumes: `track(event, data, opts)` from `tracking.js` (Task 2).
- Produces:
  - `export function login(username: string, password: string): { success: boolean, userId: string | null, user: string }`
  - `export function validateForm(formData: { username, password }): { valid: boolean, error?: string }` (unchanged behavior)
  - `export function handleLogin({ username, password }, { track: trackFn = track } = {}): { valid, error?, result? }` — calls `trackFn("login", { userId })` only on successful login; does not await it.

**Mirror:** `app.js:10-15` — result-object style for validation; `app.js:4-8` — stub style for `login()`.

- [ ] **Step 1: Write the failing tests**

`app.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { login, handleLogin } from "./app.js";

test("login returns a userId", () => {
  const result = login("alice", "pw");
  assert.equal(result.success, true);
  assert.equal(typeof result.userId, "string");
  assert.ok(result.userId.length > 0);
  assert.equal(result.user, "alice");
});

test("successful handleLogin tracks login with the returned userId", () => {
  const calls = [];
  const out = handleLogin(
    { username: "alice", password: "pw" },
    { track: (...args) => { calls.push(args); return Promise.resolve(); } }
  );
  assert.equal(out.valid, true);
  assert.deepEqual(calls, [["login", { userId: out.result.userId }]]);
});

test("failed validation does not track", () => {
  const calls = [];
  const out = handleLogin(
    { username: "", password: "pw" },
    { track: (...args) => { calls.push(args); return Promise.resolve(); } }
  );
  assert.equal(out.valid, false);
  assert.equal(calls.length, 0);
});

test("handleLogin tracks userId null and warns when login has no userId", (t) => {
  const warnSpy = t.mock.method(console, "warn", () => {});
  const calls = [];
  const out = handleLogin(
    { username: "alice", password: "pw" },
    {
      track: (...args) => { calls.push(args); return Promise.resolve(); },
      login: () => ({ success: true, user: "alice" }),
    }
  );
  assert.equal(out.valid, true);
  assert.deepEqual(calls, [["login", { userId: null }]]);
  assert.equal(warnSpy.mock.callCount(), 1);
});

test("failed login does not track", () => {
  const calls = [];
  handleLogin(
    { username: "alice", password: "pw" },
    {
      track: (...args) => { calls.push(args); return Promise.resolve(); },
      login: () => ({ success: false, userId: null, user: "alice" }),
    }
  );
  assert.equal(calls.length, 0);
});
```

Note: `handleLogin` accepts an optional `login` override (default: the module's `login`) so the missing-userId and failed-login paths are testable while `login()` is a stub. Update the Produces signature accordingly: `handleLogin({ username, password }, { track: trackFn = track, login: loginFn = login } = {})`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test app.test.js`
Expected: FAIL — `app.js` has no exports (and top-level `document` access throws `ReferenceError` under Node).

- [ ] **Step 3: Implement**

`app.js`:
```js
// Simple webapp with login form handling
import { track } from "./tracking.js";

const API_ENDPOINT = "https://api.example.com/login";

export function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app; server returns the user's id
  return { success: true, userId: "user-123", user: username };
}

export function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

export function handleLogin({ username, password }, { track: trackFn = track, login: loginFn = login } = {}) {
  const validation = validateForm({ username, password });
  if (!validation.valid) {
    return validation;
  }
  const result = loginFn(username, password);
  if (result.success) {
    if (!result.userId) {
      console.warn("Login succeeded without a userId");
    }
    // Not awaited: tracking must never block or break login
    trackFn("login", { userId: result.userId ?? null });
  }
  return { valid: true, result };
}

if (typeof document !== "undefined") {
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const outcome = handleLogin({ username, password });
    if (outcome.valid) {
      console.log("Login result:", outcome.result);
    } else {
      console.error("Validation error:", outcome.error);
    }
  });
}
```

`index.html` line 13 becomes:
```html
  <script type="module" src="app.js"></script>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all suites (utils, tracking, app) PASS.

- [ ] **Step 5: Manual browser check (validates the Global Constraints assumption)**

Run: `python3 -m http.server 8000` from repo root, open `http://localhost:8000/`, submit `alice` / `pw`.
Expected console: `Logging in: alice`, `Tracking: https://api.example.com/events { event: "login", data: { userId: "user-123" }, timestamp: ... }`, `Login result: {...}`. Submitting with an empty field logs `Validation error:` and no `Tracking:` line.

- [ ] **Step 6: Commit**

```bash
git add app.js app.test.js index.html
git commit -m "feat: return userId from login and track successful logins"
```
