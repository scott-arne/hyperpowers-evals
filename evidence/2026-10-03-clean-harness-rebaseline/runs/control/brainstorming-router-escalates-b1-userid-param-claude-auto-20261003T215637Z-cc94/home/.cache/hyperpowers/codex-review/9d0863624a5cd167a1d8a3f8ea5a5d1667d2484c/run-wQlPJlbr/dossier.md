# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T215637Z-cc94/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-login-user-session.md

	1	# Login User Session Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-10-03-login-user-session-design.md`
	6	
	7	**Goal:** Capture a `userId` on successful login and make it available across the app for the life of the browser tab, through a shared `Session` module.
	8	
	9	**Architecture:** A new plain browser script `session.js` defines a global `Session` object backed by `sessionStorage`. It also exports itself via `module.exports` when loaded by Node, for tests. `login(username, password)` in `app.js` returns a `userId`, and the submit handler saves it via `Session.setCurrentUser` only on success. `index.html` loads `session.js` before `app.js`.
	10	
	11	**Tech Stack:** Vanilla browser JavaScript (classic `<script>` tags); Node's built-in test runner (`node --test`, Node v26) for unit tests.
	12	
	13	## Global Constraints
	14	
	15	- No runtime or dev dependencies are added.
	16	- Unit tests run with `npm test` (`node --test`).
	17	- Browser behavior is unchanged except for the additions described here.
	18	- `login()` keeps the signature `login(username, password)`; it gains no `userId` parameter.
	19	- Storage key is exactly `"currentUser"`; the stored value is `JSON.stringify({ userId, username })`.
	20	- Future consumers use `Session.getCurrentUserId()`, never `sessionStorage` directly.
	21	
	22	## Grounding
	23	
	24	- Naming (camelCase functions, `UPPER_SNAKE` constants): `app.js:2-4`, which shows `API_ENDPOINT` and `login`.
	25	- Error reporting to the console: `app.js:24-27`, which uses `console.log` / `console.error` with a label string. Use `console.warn` in the same style.
	26	- Stub marking: `app.js:6`, the comment `// Stub: would POST to API_ENDPOINT in real app`.
	27	- CommonJS export: `src/utils.js:5`, `module.exports = { greet };`.
	28	- Result-object returns: `app.js:10-15`, where `validateForm` returns `{ valid, error }`.
	29	- Test shape: none. The repo has no existing tests or runner.
	30	- Browser/Node dual-loading guard: none. There is no existing pattern for `typeof module` / `typeof document` guards.
	31	
	32	**Environment note:** Node v26 defines a built-in `globalThis.sessionStorage` through a configurable getter/setter. Tests MUST install their fake with `Object.defineProperty(globalThis, "sessionStorage", { value: fake, configurable: true, writable: true })`, not plain assignment.
	33	
	34	---
	35	
	36	### Task 1: `Session` module with unit tests and test runner
	37	
	38	**Risk tier:** standard (new module, a new test setup, and storage error handling that the trust-boundary comment depends on)
	39	
	40	**Files:**
	41	- Create: `session.js`
	42	- Create: `tests/session.test.js`
	43	- Modify: `package.json` (add `scripts.test`)
	44	
	45	**Interfaces:**
	46	- Consumes: nothing.
	47	- Produces (global `Session` in the browser; `module.exports = Session` in Node):
	48	  - `Session.setCurrentUser({ userId: string, username: string }): void`. Throws `Error("setCurrentUser requires a userId")` if `userId` is falsy.
	49	  - `Session.getCurrentUser(): { userId: string, username: string } | null`
	50	  - `Session.getCurrentUserId(): string | null`
	51	  - `Session.clearSession(): void`
	52	
	53	**Mirror:** `src/utils.js:5` for the export line; `app.js:6` for the comment style.
	54	
	55	- [ ] **Step 1: Add the test script to `package.json`**
	56	
	57	Replace the file with:
	58	
	59	```json
	60	{
	61	  "name": "drill-test-project",
	62	  "version": "1.0.0",
	63	  "description": "Test project for Drill scenarios",
	64	  "main": "src/index.js",
	65	  "scripts": {
	66	    "test": "node --test"
	67	  }
	68	}
	69	```
	70	
	71	- [ ] **Step 2: Write the failing tests in `tests/session.test.js`**
	72	
	73	```js
	74	const { test, beforeEach, afterEach } = require("node:test");
	75	const assert = require("node:assert/strict");
	76	const Session = require("../session.js");
	77	
	78	function installStorage(storage) {
	79	  Object.defineProperty(globalThis, "sessionStorage", {
	80	    value: storage,
	81	    configurable: true,
	82	    writable: true,
	83	  });
	84	}
	85	
	86	function fakeStorage() {
	87	  const data = new Map();
	88	  return {
	89	    data,
	90	    getItem: (key) => (data.has(key) ? data.get(key) : null),
	91	    setItem: (key, value) => data.set(key, String(value)),
	92	    removeItem: (key) => data.delete(key),
	93	  };
	94	}
	95	
	96	function throwingStorage() {
	97	  const fail = () => {
	98	    throw new Error("SecurityError: storage disabled");
	99	  };
	100	  return { getItem: fail, setItem: fail, removeItem: fail };
	101	}
	102	
	103	let storage;
	104	let warnings;
	105	let originalWarn;
	106	
	107	beforeEach(() => {
	108	  storage = fakeStorage();
	109	  installStorage(storage);
	110	  warnings = [];
	111	  originalWarn = console.warn;
	112	  console.warn = (...args) => warnings.push(args);
	113	});
	114	
	115	afterEach(() => {
	116	  console.warn = originalWarn;
	117	});
	118	
	119	test("setCurrentUser then getCurrentUser returns the user", () => {
	120	  Session.setCurrentUser({ userId: "u-1", username: "alice" });
	121	  assert.deepEqual(Session.getCurrentUser(), { userId: "u-1", username: "alice" });
	122	  assert.equal(storage.data.get("currentUser"), JSON.stringify({ userId: "u-1", username: "alice" }));
	123	});
	124	
	125	test("getCurrentUserId returns the id, or null when empty", () => {
	126	  assert.equal(Session.getCurrentUserId(), null);
	127	  Session.setCurrentUser({ userId: "u-2", username: "bob" });
	128	  assert.equal(Session.getCurrentUserId(), "u-2");
	129	});
	130	
	131	test("getCurrentUser returns null when nothing is stored", () => {
	132	  assert.equal(Session.getCurrentUser(), null);
	133	});
	134	
	135	test("clearSession removes the stored user", () => {
	136	  Session.setCurrentUser({ userId: "u-3", username: "carol" });
	137	  Session.clearSession();
	138	  assert.equal(storage.data.has("currentUser"), false);
	139	  assert.equal(Session.getCurrentUser(), null);
	140	});
	141	
	142	test("setCurrentUser throws when userId is missing or empty", () => {
	143	  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
	144	  assert.throws(() => Session.setCurrentUser({ userId: "", username: "alice" }), /requires a userId/);
	145	  assert.equal(storage.data.has("currentUser"), false);
	146	});
	147	
	148	test("setCurrentUser throws on missing userId even when storage is unavailable", () => {
	149	  installStorage(throwingStorage());
	150	  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
	151	});
	152	
	153	test("corrupt JSON is treated as empty and removed", () => {
	154	  storage.data.set("currentUser", "{not json");
	155	  assert.equal(Session.getCurrentUser(), null);
	156	  assert.equal(storage.data.has("currentUser"), false);
	157	});
	158	
	159	test("stored value without userId is treated as empty and removed", () => {
	160	  storage.data.set("currentUser", JSON.stringify({ username: "alice" }));
	161	  assert.equal(Session.getCurrentUser(), null);
	162	  assert.equal(storage.data.has("currentUser"), false);
	163	});
	164	
	165	test("unavailable storage warns and never throws", () => {
	166	  installStorage(throwingStorage());
	167	  assert.doesNotThrow(() => Session.setCurrentUser({ userId: "u-4", username: "dave" }));
	168	  assert.equal(Session.getCurrentUser(), null);
	169	  assert.equal(Session.getCurrentUserId(), null);
	170	  assert.doesNotThrow(() => Session.clearSession());
	171	  assert.ok(warnings.length >= 1, "expected at least one console.warn");
	172	});
	173	```
	174	
	175	- [ ] **Step 3: Run the tests and confirm they fail**
	176	
	177	Run: `npm test`
	178	Expected: FAIL with `Cannot find module '../session.js'`.
	179	
	180	- [ ] **Step 4: Write `session.js`**
	181	
	182	```js
	183	// Client-side session: remembers the logged-in user for the life of the tab.
	184	// The stored userId is client-side context only. Servers must check identity
	185	// from their own session or token, never trust this value.
	186	const Session = (() => {
	187	  const STORAGE_KEY = "currentUser";
	188	
	189	  function setCurrentUser({ userId, username } = {}) {
	190	    if (!userId) {
	191	      throw new Error("setCurrentUser requires a userId");
	192	    }
	193	    try {
	194	      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, username }));
	195	    } catch (err) {
	196	      console.warn("Session storage unavailable; user not saved:", err);
	197	    }
	198	  }
	199	
	200	  function clearSession() {
	201	    try {
	202	      sessionStorage.removeItem(STORAGE_KEY);
	203	    } catch (err) {
	204	      console.warn("Session storage unavailable; could not clear:", err);
	205	    }
	206	  }
	207	
	208	  function getCurrentUser() {
	209	    let raw;
	210	    try {
	211	      raw = sessionStorage.getItem(STORAGE_KEY);
	212	    } catch (err) {
	213	      console.warn("Session storage unavailable; no current user:", err);
	214	      return null;
	215	    }
	216	    if (raw === null) {
	217	      return null;
	218	    }
	219	    let user = null;
	220	    try {
	221	      user = JSON.parse(raw);
	222	    } catch (err) {
	223	      user = null;
	224	    }
	225	    if (!user || !user.userId) {
	226	      clearSession();
	227	      return null;
	228	    }
	229	    return { userId: user.userId, username: user.username };
	230	  }
	231	
	232	  function getCurrentUserId() {
	233	    const user = getCurrentUser();
	234	    return user ? user.userId : null;
	235	  }
	236	
	237	  return { setCurrentUser, getCurrentUser, getCurrentUserId, clearSession };
	238	})();
	239	
	240	if (typeof module !== "undefined") {
	241	  module.exports = Session;
	242	}
	243	```
	244	
	245	- [ ] **Step 5: Run the tests and confirm they pass**
	246	
	247	Run: `npm test`
	248	Expected: PASS, with all 9 tests in `tests/session.test.js` passing.
	249	
	250	- [ ] **Step 6: Commit**
	251	
	252	```bash
	253	git add package.json session.js tests/session.test.js
	254	git commit -m "feat: add Session module for tracking the logged-in user"
	255	```
	256	
	257	---
	258	
	259	### Task 2: `login()` returns `userId`; save it to `Session` on success
	260	
	261	**Risk tier:** standard (multi-file integration across `app.js` and `index.html`, plus a change to `login()`'s return shape)
	262	
	263	**Files:**
	264	- Modify: `app.js:1-28` (whole file)
	265	- Modify: `index.html:13` (script tags)
	266	- Create: `tests/app.test.js`
	267	
	268	**Interfaces:**
	269	- Consumes: global `Session.setCurrentUser({ userId, username })` from Task 1, used in the browser only. `app.js` must not `require` it.
	270	- Produces: `login(username: string, password: string): { success: boolean, user: string, userId: string }`. Under Node, `module.exports = { login, validateForm }`.
	271	
	272	**Mirror:** `app.js:6` for the `// Stub:` comment; `src/utils.js:5` for the export.
	273	
	274	- [ ] **Step 1: Write the failing tests in `tests/app.test.js`**
	275	
	276	```js
	277	const { test } = require("node:test");
	278	const assert = require("node:assert/strict");
	279	
	280	test("loading app.js without a DOM does not throw", () => {
	281	  assert.equal(typeof document, "undefined");
	282	  assert.doesNotThrow(() => require("../app.js"));
	283	});
	284	
	285	test("login returns success, user, and a non-empty userId", () => {
	286	  const { login } = require("../app.js");
	287	  const result = login("alice", "pw");
	288	  assert.equal(result.success, true);
	289	  assert.equal(result.user, "alice");
	290	  assert.equal(typeof result.userId, "string");
	291	  assert.ok(result.userId.length > 0);
	292	});
	293	
	294	test("validateForm is still exported and unchanged", () => {
	295	  const { validateForm } = require("../app.js");
	296	  assert.deepEqual(validateForm({ username: "a", password: "b" }), { valid: true });
	297	  assert.deepEqual(validateForm({ username: "", password: "b" }), {
	298	    valid: false,
	299	    error: "Missing required fields",
	300	  });
	301	});
	302	```
	303	
	304	- [ ] **Step 2: Run the tests and confirm they fail**
	305	
	306	Run: `npm test`
	307	Expected: FAIL. `tests/app.test.js` errors with `ReferenceError: document is not defined`, because `app.js` wires up the DOM when it loads.
	308	
	309	- [ ] **Step 3: Rewrite `app.js`**
	310	
	311	```js
	312	// Simple webapp with login form handling
	313	const API_ENDPOINT = "https://api.example.com/login";
	314	
	315	function login(username, password) {
	316	  console.log("Logging in:", username);
	317	  // Stub: would POST to API_ENDPOINT in real app; userId would come from the response
	318	  return { success: true, user: username, userId: "stub-" + username };
	319	}
	320	
	321	function validateForm(formData) {
	322	  if (!formData.username || !formData.password) {
	323	    return { valid: false, error: "Missing required fields" };
	324	  }
	325	  return { valid: true };
	326	}
	327	
	328	if (typeof document !== "undefined") {
	329	  document.getElementById("login-form").addEventListener("submit", (e) => {
	330	    e.preventDefault();
	331	    const username = document.getElementById("username").value;
	332	    const password = document.getElementById("password").value;
	333	    const validation = validateForm({ username, password });
	334	    if (validation.valid) {
	335	      const result = login(username, password);
	336	      console.log("Login result:", result);
	337	      if (result.success) {
	338	        Session.setCurrentUser({ userId: result.userId, username: result.user });
	339	      }
	340	    } else {
	341	      console.error("Validation error:", validation.error);
	342	    }
	343	  });
	344	}
	345	
	346	if (typeof module !== "undefined") {
	347	  module.exports = { login, validateForm };
	348	}
	349	```
	350	
	351	- [ ] **Step 4: Load `session.js` before `app.js` in `index.html`**
	352	
	353	Replace line 13:
	354	
	355	```html
	356	  <script src="app.js"></script>
	357	```
	358	
	359	with:
	360	
	361	```html
	362	  <script src="session.js"></script>
	363	  <script src="app.js"></script>
	364	```
	365	
	366	- [ ] **Step 5: Run the tests and confirm they pass**
	367	
	368	Run: `npm test`
	369	Expected: PASS, with all 12 tests passing (9 from `tests/session.test.js`, 3 from `tests/app.test.js`).
	370	
	371	- [ ] **Step 6: Manual browser check**
	372	
	373	Open `index.html` in a browser, enter any username and password, and submit. In DevTools → Application → Session Storage, confirm `currentUser` is `{"userId":"stub-<username>","username":"<username>"}`. Reload the page and confirm it is still there. Submit with an empty password and confirm `currentUser` does not change.
	374	
	375	- [ ] **Step 7: Commit**
	376	
	377	```bash
	378	git add app.js index.html tests/app.test.js
	379	git commit -m "feat: return userId from login and save it to Session"
	380	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T215637Z-cc94/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-user-session-design.md

	1	# Login User Session — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Draft, pending user review
	5	
	6	## Goal
	7	
	8	Track who logged in by capturing a `userId` on successful login and making it
	9	available across the app (reloads, navigation, and future forms) for the life of
	10	the browser tab.
	11	
	12	## Decisions
	13	
	14	- **The userId comes from the login result, not from the caller.** `login()` keeps
	15	  the signature `login(username, password)` and returns the `userId`. We dropped
	16	  the literal "add a userId parameter" request: no caller has an ID before
	17	  authentication, and an ID the caller supplies can be faked.
	18	- **Persistence:** a shared `session.js` module backed by `sessionStorage`. It
	19	  survives reloads and navigation and clears when the tab closes. No backend is
	20	  required.
	21	- **Tooling:** Node's built-in test runner (`node --test`), with no new
	22	  dependencies. No linter or E2E tests for now.
	23	
	24	## Global Constraints
	25	
	26	- No runtime or dev dependencies are added.
	27	- Unit tests run with `npm test` (`node --test`).
	28	- Browser behavior is unchanged except for the additions described here.
	29	
	30	## Components
	31	
	32	### `session.js` (new, repo root)
	33	
	34	A plain browser script loaded by `index.html` before `app.js`. It defines a global
	35	`Session` object, and also exports it via `module.exports` when `module` is
	36	defined, so Node tests can load it.
	37	
	38	| Function | Behavior |
	39	|---|---|
	40	| `setCurrentUser({ userId, username })` | Writes `JSON.stringify({ userId, username })` to `sessionStorage["currentUser"]`. Throws `Error` if `userId` is missing or an empty string. |
	41	| `getCurrentUser()` | Returns `{ userId, username }` or `null`. |
	42	| `getCurrentUserId()` | Returns `getCurrentUser()?.userId ?? null`. |
	43	| `clearSession()` | Removes `sessionStorage["currentUser"]`. |
	44	
	45	The storage backend is resolved when each function is called (the
	46	`sessionStorage` global), so tests can install a fake before calling.
	47	
	48	A header comment states the trust boundary: the stored ID is client-side context
	49	only, and servers must check identity from their own session or token.
	50	
	51	### `app.js` (modified)
	52	
	53	- `login(username, password)` returns `{ success, user, userId }`. The API is
	54	  still a stub, so `userId` is a stand-in derived from the username (for example
	55	  `"stub-" + username`), marked with a `// Stub:` comment like the existing one.
	56	- On submit, if `result.success` is true, it calls
	57	  `Session.setCurrentUser({ userId: result.userId, username: result.user })`.
	58	- The DOM wiring runs only when `typeof document !== "undefined"`.
	59	- When `module` is defined, it exports `{ login, validateForm }`.
	60	
	61	### `index.html` (modified)
	62	
	63	Adds `<script src="session.js"></script>` before `<script src="app.js"></script>`.
	64	
	65	### Consumers (future forms)
	66	
	67	Future forms call `Session.getCurrentUserId()` and never read `sessionStorage`
	68	directly.
	69	
	70	## Data Flow
	71	
	72	1. The user submits the form, and `validateForm` passes.
	73	2. `login(username, password)` returns `{ success, user, userId }`.
	74	3. On success, `Session.setCurrentUser(...)` saves the user to `sessionStorage`.
	75	4. Any page or script in the tab later calls `Session.getCurrentUserId()`.
	76	
	77	## Error Handling
	78	
	79	- **Storage unavailable (access or quota errors):** each `Session` function catches
	80	  the error and calls `console.warn`. `setCurrentUser` does nothing, and the
	81	  getters return `null`. Login still succeeds.
	82	- **Corrupt or invalid stored value** (unparseable JSON, or no `userId`):
	83	  `getCurrentUser()` calls `clearSession()` and returns `null`.
	84	- **Missing or empty `userId` passed to `setCurrentUser`:** throws, because that
	85	  is a bug in the calling code. Validation happens before any storage access, so
	86	  it throws even when storage is unavailable.
	87	- **Failed login:** nothing is written, and any previously saved user is left as
	88	  it is. Logging out happens only through an explicit `clearSession()`.
	89	
	90	## Testing
	91	
	92	Tests go in `tests/`, run with `node --test`. `package.json` gains
	93	`"scripts": { "test": "node --test" }`.
	94	
	95	`tests/session.test.js` uses a fake `sessionStorage` (a Map-backed
	96	`getItem`/`setItem`/`removeItem`) installed on `globalThis`, and covers:
	97	- set, then get, returning `{ userId, username }`
	98	- `getCurrentUserId()` returns the ID, or `null` when empty
	99	- `clearSession()` empties the storage
	100	- `setCurrentUser` throws when `userId` is missing or empty
	101	- a corrupt JSON value returns `null`, and the key is removed
	102	- a stored value with no `userId` returns `null`, and the key is removed
	103	- storage that throws: setter and getters don't crash, getters return `null`, and
	104	  a warning is logged
	105	
	106	`tests/app.test.js`:
	107	- `login("alice", "pw")` returns `success: true`, `user: "alice"`, and a
	108	  non-empty `userId`
	109	- loading `app.js` without `document` doesn't throw
	110	
	111	Manual check: open `index.html`, log in, confirm `currentUser` appears under
	112	DevTools → Application → Session Storage, and confirm a reload keeps it.
	113	
	114	## Out of Scope
	115	
	116	- Logout UI, session expiry, and sharing the session across tabs.
	117	- A real auth endpoint or server-side session.
	118	- Linting and E2E tooling.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T215637Z-cc94/home/.cache/hyperpowers/codex-review/9d0863624a5cd167a1d8a3f8ea5a5d1667d2484c/run-wQlPJlbr/adjudications.md

	1	# Context for plan review
	2	Spec gate: Codex review did not complete (empty payload, no verdict); spec approved by user after Claude self-review only.
	3	
	4	## Risk Tier Rubric (verbatim)
	5	- **high** — touches approval-authority code (verdict-normalize, gate-round, ungated-ledger, or any script whose output other machinery trusts), concurrency/locking, security surfaces, destructive git operations, or durable-record writers.
	6	- **standard** — multi-file integration, new scripts, behavior-shaping skill/doc surgery, anything not clearly low or high. The default.
	7	- **low** — single-file mechanical transcription where the plan contains the complete content to write; doc-reference or typo fixes; test-needle additions whose strings appear verbatim in the plan.
	8	Check each task's declared tier against this rubric; a mis-tiered task is blocking-eligible.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
