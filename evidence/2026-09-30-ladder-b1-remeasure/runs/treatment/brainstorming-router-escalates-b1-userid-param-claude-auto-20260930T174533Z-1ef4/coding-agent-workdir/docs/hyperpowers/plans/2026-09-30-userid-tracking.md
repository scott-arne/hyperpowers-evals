# Shared userId Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-09-30-userid-tracking-design.md`

**Goal:** Give the webapp one named place that holds the server-assigned user id for a browser tab session, so any page can label its log events with who logged in.

**Architecture:** A new global-script module `user-tracking.js` wraps a single `sessionStorage` key behind `setUserId` / `getUserId` / `clearUserId` on `window.UserTracking`. `login()` in `app.js` starts returning a `userId` alongside its existing result fields, and the form's submit handler hands that id to the module. Future pages become consumers by loading the same script and calling `getUserId()`; no consumer touches `sessionStorage` directly.

**Tech Stack:** Plain browser JavaScript (ES5/ES6 syntax, no modules), plain HTML. No build step, no dependencies, no test runner.

## Global Constraints

Copied from the spec's Global Constraints and Decisions; every task inherits these.

- No new dependencies. The project has none and adds none.
- No build step, no bundler, no transpilation.
- No linting, formatting, or test tooling is added by this work.
- Browser code stays in the existing global-script style; no `import` or `export` in files loaded by `index.html`.
- The stored id is **tracking only**: non-authoritative, never used to gate access, decide what a user may see, or prove identity.
- Lifetime is the browser tab session, backed by `sessionStorage` (not `localStorage`).
- `login()` returns the id; it does **not** take one as a parameter.
- Out of scope, do not add: logout flow, authentication, authorization, real network calls, changes to `validateForm()`, changes to anything under `src/`.

## Grounding

- **Function declaration and naming style:** `app.js:4-15` — top-level `function name(args) {}` declarations, `lower_camelCase` names, 2-space indent, double-quoted strings, semicolons.
- **Error handling:** `app.js:10-15` — the only existing error convention is a returned result object (`{ valid: false, error: "..." }`); the codebase has **no** `try`/`catch` anywhere. The `try`/`catch` this plan adds is new to the repo and is justified in the spec's Error handling section (storage access can throw).
- **Returned result shape:** `app.js:7` — `return { success: true, user: username };`, a plain object literal with shorthand-friendly fields. Task 2 extends this exact object.
- **Script loading:** `index.html:13` — `<script src="app.js"></script>` at the end of `<body>`, no `type="module"`, no `defer`.
- **Test shape:** `none: no existing test pattern` — the repo has no test framework, no test files, and no test script in `package.json`. Per the spec and the user's explicit tooling decision, none is added; verification steps in this plan are manual browser checks with exact expected output.
- **Browser module pattern:** `none: no existing browser module pattern` — `app.js` declares bare globals and `src/utils.js:1-5` uses CommonJS (`module.exports`), which does not apply to scripts loaded by `index.html`. The IIFE wrapper in Task 1 is new to the repo; it is what keeps the storage key private.

---

### Task 1: The `user-tracking.js` storage module

**Risk tier:** standard — new file plus an HTML integration point, establishing a shared boundary other pages will depend on.

**Files:**
- Create: `user-tracking.js`
- Modify: `index.html:13`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the global `window.UserTracking` with exactly three functions:
  - `setUserId(id)` → `undefined`. Stores `id` (a string). Ignores `null`/`undefined`. Never throws.
  - `getUserId()` → `string | null`. Returns the stored id, or `null` when nothing is stored or storage is unavailable. Never throws.
  - `clearUserId()` → `undefined`. Removes the stored id. Never throws.
  - The `sessionStorage` key is `"tracking.userId"` and is private to this file. Task 2 and all future consumers use the functions, never the key.

**Mirror:** `app.js:1-15`, for file-comment placement, function declaration style, 2-space indent, and double-quoted strings.

- [ ] **Step 1: Create `user-tracking.js`**

Create the file with exactly this content:

```javascript
// Shared login attribution for the webapp.
//
// The value stored here is for log and analytics attribution ONLY. It is not
// authoritative: never use it to gate access, decide what a user may see, or
// prove identity to a server. A missing or wrong value must cost nothing more
// than a mislabeled log line.
(function (global) {
  // Private to this module: consumers use the functions below, never the key.
  const STORAGE_KEY = "tracking.userId";

  function setUserId(id) {
    // Ignore absent values so "no id" stays distinguishable from the string
    // "null" once it has been through storage.
    if (id === null || id === undefined) {
      return;
    }
    try {
      global.sessionStorage.setItem(STORAGE_KEY, id);
    } catch (err) {
      // Storage can be unavailable (disabled, private browsing, quota).
      // Attribution is optional; losing it must never break the caller.
    }
  }

  function getUserId() {
    try {
      return global.sessionStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function clearUserId() {
    try {
      global.sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // See setUserId: storage failures are non-fatal.
    }
  }

  global.UserTracking = {
    setUserId: setUserId,
    getUserId: getUserId,
    clearUserId: clearUserId
  };
})(window);
```

- [ ] **Step 2: Load the module before `app.js`**

In `index.html`, replace line 13:

```html
  <script src="app.js"></script>
```

with:

```html
  <script src="user-tracking.js"></script>
  <script src="app.js"></script>
```

Order matters: `app.js` calls `UserTracking` in Task 2, so the global must already exist.

- [ ] **Step 3: Verify the module in the browser**

There is no test runner in this repo (see Grounding). Verify by hand:

Open `index.html` in a browser and run these in the DevTools console, in order:

```javascript
UserTracking.getUserId();            // expect: null
UserTracking.setUserId("abc123");
UserTracking.getUserId();            // expect: "abc123"
sessionStorage.getItem("tracking.userId");  // expect: "abc123"
UserTracking.setUserId(null);
UserTracking.getUserId();            // expect: "abc123"  (null ignored, not stored)
UserTracking.clearUserId();
UserTracking.getUserId();            // expect: null
```

Every line must produce the commented expectation. If `setUserId(null)` leaves `getUserId()` returning the string `"null"`, the guard in Step 1 is wrong — fix it before continuing.

- [ ] **Step 4: Verify it survives a reload**

In the console: `UserTracking.setUserId("reload-check")`, then reload the page (Cmd-R), then run `UserTracking.getUserId()`.

Expected: `"reload-check"`.

Then open `index.html` in a **new tab** and run `UserTracking.getUserId()`.

Expected: `null` — a fresh tab starts with no attribution. (A new tab opened via Cmd-T and navigated manually; duplicating a tab copies session storage and is not a valid check here.)

Finally, clean up: `UserTracking.clearUserId()`.

- [ ] **Step 5: Commit**

```bash
git add user-tracking.js index.html
git commit -m "feat: add user-tracking module for login attribution"
```

---

### Task 2: Return and store the userId on login

**Risk tier:** standard — changes the return contract of `login()` and its call site.

**Files:**
- Modify: `app.js:4-8` (the `login` stub), `app.js:22-24` (the submit handler)

**Interfaces:**
- Consumes: `window.UserTracking.setUserId(id)` from Task 1 — takes a string, returns `undefined`, never throws.
- Produces: `login(username, password)` now returns `{ success: boolean, user: string, userId: string }`. The `success` and `user` fields keep their existing meaning and values; `userId` is new. The function signature is **unchanged** — no parameter is added.

**Mirror:** `app.js:4-8`, the existing stub: keep its `console.log` line, keep its `// Stub:` comment, and extend the returned object literal rather than rewriting the function.

- [ ] **Step 1: Return a `userId` from `login()`**

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
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  // Placeholder id. The real userId is assigned by the server and will be read
  // from the API_ENDPOINT response body once this stub makes a real request.
  const userId = "stub-" + username;
  return { success: true, user: username, userId: userId };
}
```

The placeholder is deliberate and marked: this stub makes no network call, so there is no server-assigned id to read yet.

- [ ] **Step 2: Store the id after a successful login**

In `app.js`, inside the submit handler, replace these two lines (originally `app.js:23-24`, now shifted down by the Step 1 edit — locate them by content, not by line number):

```javascript
    const result = login(username, password);
    console.log("Login result:", result);
```

with:

```javascript
    const result = login(username, password);
    if (result.success) {
      UserTracking.setUserId(result.userId);
    }
    console.log("Login result:", result);
```

Guarding on `result.success` keeps a failed login from attributing events to a user who did not log in. The stub always reports success; the guard is what makes that stay correct when the real call lands.

- [ ] **Step 3: Verify end to end in the browser**

Open `index.html` in a fresh tab. Before touching the form, in the console:

```javascript
UserTracking.getUserId();   // expect: null
```

Then fill in username `alice` and any password, and submit. Expected console output:

```
Logging in: alice
Login result: {success: true, user: "alice", userId: "stub-alice"}
```

Then in the console:

```javascript
UserTracking.getUserId();   // expect: "stub-alice"
```

- [ ] **Step 4: Verify the no-id path is still clean**

Reload the page into a **new tab**, and submit the form with the username field left empty.

Expected: the console shows `Validation error: Missing required fields`, `login()` is never called (no `Logging in:` line), and `UserTracking.getUserId()` returns `null` — a rejected submission leaves no attribution behind.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: return server-assigned userId from login and record it"
```

---

## Verification summary

The spec's four manual checks map to steps as follows: id appears in storage and in the logged result (Task 2 Step 3); survives reload (Task 1 Step 4); new tab starts clean (Task 1 Step 4, Task 2 Step 4); no-login state logs no id (Task 2 Step 4).
