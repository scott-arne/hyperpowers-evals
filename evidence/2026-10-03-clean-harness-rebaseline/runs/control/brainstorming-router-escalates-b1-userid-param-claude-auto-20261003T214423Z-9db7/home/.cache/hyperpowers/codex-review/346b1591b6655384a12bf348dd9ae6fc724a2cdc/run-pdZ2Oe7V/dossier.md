# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214423Z-9db7/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-current-user-session.md

	1	# Current-User Session Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** docs/hyperpowers/specs/2026-10-03-current-user-session-design.md
	6	
	7	**Goal:** Persist the logged-in user (`userId`, `username`, `loggedInAt`) in localStorage behind a shared `session.js` ES module, and have `login()` return the `userId`.
	8	
	9	**Architecture:** `session.js` exports `createSession(storage)` (dependency-injected storage, for tests) and a default `session` instance backed by `localStorage`. `app.js` becomes an ES module. On a successful `login()` it calls `session.setCurrentUser(...)`. `login()` keeps its `(username, password)` signature and returns `{ success, user, userId }`.
	10	
	11	**Tech Stack:** Plain browser JavaScript (ES modules), Node 26 `node:test` + `node:assert/strict` for unit tests. No dependencies.
	12	
	13	## Global Constraints
	14	
	15	- Unit tests run with `npm test` (`node --test`); no test dependencies.
	16	- No new runtime or dev dependencies.
	17	- Existing CommonJS code in `src/` is left untouched; do not add `"type": "module"` to `package.json`.
	18	- Pages must be served over HTTP (ES modules do not load from `file://`).
	19	- Storage key: `"currentUser"`. Stored value: JSON `{ "userId": string, "username": string, "loggedInAt": string }`, where `loggedInAt` is ISO-8601.
	20	
	21	## Grounding
	22	
	23	- Naming (camelCase functions, UPPER_SNAKE constants): `app.js:2-15` — `API_ENDPOINT`, `login`, `validateForm`.
	24	- Error reporting: `app.js:26` — `console.error("Validation error:", validation.error);` (message string, then the detail).
	25	- Result-object return shape: `app.js:7` — `return { success: true, user: username };`.
	26	- Module exports: `src/utils.js:5` uses CommonJS `module.exports`; `none: no existing ES-module pattern` — `session.js` is the first ES module.
	27	- Test shape: `none: no existing tests or test runner in this repo`.
	28	- Verified on Node v26.10.0 (2026-10-03): `globalThis.localStorage` is `undefined` without `--localstorage-file`, and reading it prints a one-time `ExperimentalWarning` (expected in test output, harmless). A `.js` file with `export` syntax and no `"type": "module"` is loaded as ESM without a warning.
	29	
	30	---
	31	
	32	### Task 1: `session.js` module with unit tests
	33	
	34	**Risk tier:** standard — new module plus test infrastructure; durable client-side storage format.
	35	
	36	**Files:**
	37	- Create: `session.js`
	38	- Create: `test/session.test.js`
	39	- Modify: `package.json` (add `scripts.test`)
	40	
	41	**Interfaces:**
	42	- Consumes: nothing.
	43	- Produces:
	44	  - `export function createSession(storage = globalThis.localStorage)` → `{ setCurrentUser, getCurrentUser, clearCurrentUser }`
	45	  - `setCurrentUser({ userId: string, username: string }) → void`: throws `TypeError` if `userId` is not a non-empty string; never throws on storage errors.
	46	  - `getCurrentUser() → { userId: string, username: string, loggedInAt: string } | null`
	47	  - `clearCurrentUser() → void`: never throws.
	48	  - `export const session`: the default instance, `createSession()`.
	49	
	50	**Mirror:** `app.js:26`, error reporting via `console.error("<message>:", detail)`.
	51	
	52	- [ ] **Step 1: Add the test script to `package.json`**
	53	
	54	Replace the file contents with:
	55	
	56	```json
	57	{
	58	  "name": "drill-test-project",
	59	  "version": "1.0.0",
	60	  "description": "Test project for Drill scenarios",
	61	  "main": "src/index.js",
	62	  "scripts": {
	63	    "test": "node --test"
	64	  }
	65	}
	66	```
	67	
	68	- [ ] **Step 2: Write the failing tests**
	69	
	70	Create `test/session.test.js`:
	71	
	72	```js
	73	import { test } from "node:test";
	74	import assert from "node:assert/strict";
	75	import { createSession } from "../session.js";
	76	
	77	const KEY = "currentUser";
	78	
	79	function fakeStorage(initial = {}) {
	80	  const data = new Map(Object.entries(initial));
	81	  return {
	82	    getItem: (k) => (data.has(k) ? data.get(k) : null),
	83	    setItem: (k, v) => data.set(k, String(v)),
	84	    removeItem: (k) => data.delete(k),
	85	    data,
	86	  };
	87	}
	88	
	89	test("set then get returns the user with an ISO loggedInAt", () => {
	90	  const s = createSession(fakeStorage());
	91	  s.setCurrentUser({ userId: "u1", username: "alice" });
	92	  const user = s.getCurrentUser();
	93	  assert.equal(user.userId, "u1");
	94	  assert.equal(user.username, "alice");
	95	  assert.equal(new Date(user.loggedInAt).toISOString(), user.loggedInAt);
	96	});
	97	
	98	test("get returns null when nothing is stored", () => {
	99	  const s = createSession(fakeStorage());
	100	  assert.equal(s.getCurrentUser(), null);
	101	});
	102	
	103	test("clear removes the stored user", () => {
	104	  const storage = fakeStorage();
	105	  const s = createSession(storage);
	106	  s.setCurrentUser({ userId: "u1", username: "alice" });
	107	  s.clearCurrentUser();
	108	  assert.equal(s.getCurrentUser(), null);
	109	  assert.equal(storage.data.has(KEY), false);
	110	});
	111	
	112	test("a second set overwrites the first", () => {
	113	  const s = createSession(fakeStorage());
	114	  s.setCurrentUser({ userId: "u1", username: "alice" });
	115	  s.setCurrentUser({ userId: "u2", username: "bob" });
	116	  assert.equal(s.getCurrentUser().userId, "u2");
	117	  assert.equal(s.getCurrentUser().username, "bob");
	118	});
	119	
	120	test("unparseable JSON returns null and removes the entry", () => {
	121	  const storage = fakeStorage({ [KEY]: "{not json" });
	122	  const s = createSession(storage);
	123	  assert.equal(s.getCurrentUser(), null);
	124	  assert.equal(storage.data.has(KEY), false);
	125	});
	126	
	127	test("a stored record without userId returns null and removes the entry", () => {
	128	  const storage = fakeStorage({ [KEY]: JSON.stringify({ username: "alice" }) });
	129	  const s = createSession(storage);
	130	  assert.equal(s.getCurrentUser(), null);
	131	  assert.equal(storage.data.has(KEY), false);
	132	});
	133	
	134	test("set does not throw when setItem throws, and logs an error", (t) => {
	135	  const errorSpy = t.mock.method(console, "error", () => {});
	136	  const storage = fakeStorage();
	137	  storage.setItem = () => {
	138	    throw new Error("QuotaExceededError");
	139	  };
	140	  const s = createSession(storage);
	141	  assert.doesNotThrow(() => s.setCurrentUser({ userId: "u1", username: "alice" }));
	142	  assert.equal(errorSpy.mock.callCount(), 1);
	143	});
	144	
	145	test("get returns null when getItem throws", () => {
	146	  const storage = fakeStorage();
	147	  storage.getItem = () => {
	148	    throw new Error("SecurityError");
	149	  };
	150	  const s = createSession(storage);
	151	  assert.equal(s.getCurrentUser(), null);
	152	});
	153	
	154	test("set without a userId throws TypeError", () => {
	155	  const s = createSession(fakeStorage());
	156	  assert.throws(() => s.setCurrentUser({ username: "alice" }), TypeError);
	157	  assert.throws(() => s.setCurrentUser({ userId: "", username: "alice" }), TypeError);
	158	});
	159	
	160	test("createSession(undefined) works with no storage available", (t) => {
	161	  t.mock.method(console, "error", () => {});
	162	  // Under Node, globalThis.localStorage is undefined, so the default applies.
	163	  const s = createSession(undefined);
	164	  assert.equal(s.getCurrentUser(), null);
	165	  assert.doesNotThrow(() => s.setCurrentUser({ userId: "u1", username: "alice" }));
	166	  assert.doesNotThrow(() => s.clearCurrentUser());
	167	});
	168	```
	169	
	170	(The tests use the per-test `t.mock`, which is restored automatically after each test.)
	171	
	172	- [ ] **Step 3: Run tests to verify they fail**
	173	
	174	Run: `npm test`
	175	Expected: FAIL. The test file errors with `Cannot find module '.../session.js'` (ERR_MODULE_NOT_FOUND).
	176	
	177	- [ ] **Step 4: Write the implementation**
	178	
	179	Create `session.js`:
	180	
	181	```js
	182	// Current-user session: the single place that reads/writes who is logged in.
	183	const STORAGE_KEY = "currentUser";
	184	
	185	export function createSession(storage = globalThis.localStorage) {
	186	  function setCurrentUser({ userId, username } = {}) {
	187	    if (typeof userId !== "string" || userId === "") {
	188	      throw new TypeError("setCurrentUser requires a non-empty string userId");
	189	    }
	190	    const record = { userId, username, loggedInAt: new Date().toISOString() };
	191	    try {
	192	      storage.setItem(STORAGE_KEY, JSON.stringify(record));
	193	    } catch (err) {
	194	      console.error("Could not save current user:", err);
	195	    }
	196	  }
	197	
	198	  function getCurrentUser() {
	199	    let raw;
	200	    try {
	201	      raw = storage.getItem(STORAGE_KEY);
	202	    } catch {
	203	      return null;
	204	    }
	205	    if (raw == null) return null;
	206	
	207	    let record;
	208	    try {
	209	      record = JSON.parse(raw);
	210	    } catch {
	211	      record = null;
	212	    }
	213	    if (record && typeof record === "object" && typeof record.userId === "string") {
	214	      return record;
	215	    }
	216	    removeQuietly();
	217	    return null;
	218	  }
	219	
	220	  function clearCurrentUser() {
	221	    try {
	222	      storage.removeItem(STORAGE_KEY);
	223	    } catch (err) {
	224	      console.error("Could not clear current user:", err);
	225	    }
	226	  }
	227	
	228	  function removeQuietly() {
	229	    try {
	230	      storage.removeItem(STORAGE_KEY);
	231	    } catch {
	232	      // Storage unavailable; nothing more to do.
	233	    }
	234	  }
	235	
	236	  return { setCurrentUser, getCurrentUser, clearCurrentUser };
	237	}
	238	
	239	export const session = createSession();
	240	```
	241	
	242	- [ ] **Step 5: Run tests to verify they pass**
	243	
	244	Run: `npm test`
	245	Expected: PASS, 10 tests, 0 failures. A single `ExperimentalWarning: localStorage is not available...` line is expected and harmless.
	246	
	247	- [ ] **Step 6: Commit**
	248	
	249	```bash
	250	git add package.json session.js test/session.test.js
	251	git commit -m "feat: add current-user session module backed by localStorage"
	252	```
	253	
	254	---
	255	
	256	### Task 2: Wire login to the session and switch the page to ES modules
	257	
	258	**Risk tier:** standard — multi-file integration (`app.js` + `index.html`), verified manually in a browser.
	259	
	260	**Files:**
	261	- Modify: `app.js:1-28`
	262	- Modify: `index.html:13`
	263	
	264	**Interfaces:**
	265	- Consumes: `import { session } from "./session.js"`; `session.setCurrentUser({ userId: string, username: string })` from Task 1.
	266	- Produces: `login(username, password) → { success: boolean, user: string, userId: string }`.
	267	
	268	**Mirror:** `app.js:7`, result-object return shape.
	269	
	270	- [ ] **Step 1: Update `app.js`**
	271	
	272	Replace the file contents with:
	273	
	274	```js
	275	// Simple webapp with login form handling
	276	import { session } from "./session.js";
	277	
	278	const API_ENDPOINT = "https://api.example.com/login";
	279	
	280	function login(username, password) {
	281	  console.log("Logging in:", username);
	282	  // Stub: would POST to API_ENDPOINT in real app.
	283	  // Real app: take userId from the API response, not from client input.
	284	  const userId = username;
	285	  return { success: true, user: username, userId };
	286	}
	287	
	288	function validateForm(formData) {
	289	  if (!formData.username || !formData.password) {
	290	    return { valid: false, error: "Missing required fields" };
	291	  }
	292	  return { valid: true };
	293	}
	294	
	295	document.getElementById("login-form").addEventListener("submit", (e) => {
	296	  e.preventDefault();
	297	  const username = document.getElementById("username").value;
	298	  const password = document.getElementById("password").value;
	299	  const validation = validateForm({ username, password });
	300	  if (validation.valid) {
	301	    const result = login(username, password);
	302	    console.log("Login result:", result);
	303	    if (result.success) {
	304	      session.setCurrentUser({ userId: result.userId, username: result.user });
	305	    }
	306	  } else {
	307	    console.error("Validation error:", validation.error);
	308	  }
	309	});
	310	```
	311	
	312	- [ ] **Step 2: Load `app.js` as a module**
	313	
	314	In `index.html`, change line 13 from:
	315	
	316	```html
	317	  <script src="app.js"></script>
	318	```
	319	
	320	to:
	321	
	322	```html
	323	  <script type="module" src="app.js"></script>
	324	```
	325	
	326	- [ ] **Step 3: Confirm the unit tests still pass**
	327	
	328	Run: `npm test`
	329	Expected: PASS, 10 tests, 0 failures.
	330	
	331	- [ ] **Step 4: Manual browser check**
	332	
	333	Run from the repo root: `python3 -m http.server 8000`
	334	Open `http://localhost:8000/`. Then:
	335	1. Enter username `alice` and any password, and submit. The console shows `Login result: {success: true, user: "alice", userId: "alice"}` and no errors.
	336	2. In the DevTools console, `JSON.parse(localStorage.currentUser)` returns `{ userId: "alice", username: "alice", loggedInAt: "<ISO timestamp>" }`.
	337	3. Reload the page and repeat step 2. The record is still there.
	338	4. Submit with the password empty. The console shows `Validation error: Missing required fields`, and `localStorage.currentUser` is unchanged.
	339	
	340	Stop the server (Ctrl-C).
	341	
	342	- [ ] **Step 5: Commit**
	343	
	344	```bash
	345	git add app.js index.html
	346	git commit -m "feat: return userId from login and persist current user"
	347	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214423Z-9db7/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-current-user-session-design.md

	1	# Current-User Session — Design
	2	
	3	Date: 2026-10-03
	4	Status: Approved in brainstorming, pending spec review
	5	
	6	## Goal
	7	
	8	Record which user logged in, persist it across page loads, and expose it
	9	through one shared module that the login form and future forms all use.
	10	
	11	Original request: "Add a userId parameter to the login function so we can
	12	track who logged in." Decided instead: `login()` **returns** the userId
	13	rather than taking it as a parameter. The client has no verified userId
	14	before login; identity should come from whatever verified the credentials.
	15	
	16	## Decisions
	17	
	18	| Topic | Decision | Rationale |
	19	|-------|----------|-----------|
	20	| userId source | Returned by `login()`, signature unchanged | Caller cannot know a verified ID before login |
	21	| Persistence | `localStorage`, behind a session module | Survives reloads/restarts, shared across tabs; module keeps it swappable |
	22	| Module system | ES modules (`<script type="module">`) | Explicit dependencies; cheapest to adopt while there is one form |
	23	| Tracking scope | Current user only (no login history) | Cross-form reuse needs "who am I"; client-side history is not a trustworthy audit trail |
	24	| Tooling | Unit tests via `node:test` only | Zero dependencies; lint and E2E deferred |
	25	
	26	## Global Constraints
	27	
	28	- Unit tests run with `npm test` (`node --test`); no test dependencies.
	29	- No new runtime or dev dependencies.
	30	- Existing CommonJS code in `src/` is left untouched; do not add
	31	  `"type": "module"` to `package.json`.
	32	- Pages must be served over HTTP (ES modules do not load from `file://`).
	33	
	34	## Components
	35	
	36	### `session.js` (new, repo root, ES module)
	37	
	38	The only code that reads or writes the stored user.
	39	
	40	```js
	41	export function createSession(storage = globalThis.localStorage) {
	42	  return { setCurrentUser, getCurrentUser, clearCurrentUser };
	43	}
	44	export const session = createSession();
	45	```
	46	
	47	- Storage key: `"currentUser"`.
	48	- Stored value: JSON `{ "userId": string, "username": string, "loggedInAt": string }`
	49	  where `loggedInAt` is an ISO-8601 timestamp set by `setCurrentUser`.
	50	- `setCurrentUser({ userId, username })`: validates, stamps `loggedInAt`,
	51	  writes JSON.
	52	- `getCurrentUser()`: returns the parsed record or `null`.
	53	- `clearCurrentUser()`: removes the key.
	54	- `createSession(storage)` accepts any object with `getItem`, `setItem`,
	55	  and `removeItem`. Tests pass an in-memory fake; a server-backed version
	56	  can replace it later without changing any form.
	57	- `session` is created when the module loads. In Node, `globalThis.localStorage`
	58	  may be undefined. Creating the default instance must not throw in that
	59	  case; calls on it then follow the "storage not available" rules below.
	60	
	61	### `app.js` (modified)
	62	
	63	- Add `import { session } from './session.js';`.
	64	- `login(username, password)`: signature unchanged; returns
	65	  `{ success, user, userId }`. The stub sets `userId = username` and has a
	66	  comment marking where the real API response's ID will come from.
	67	- Submit handler: on `result.success`, call
	68	  `session.setCurrentUser({ userId: result.userId, username: result.user })`.
	69	  Writing the session is the caller's job, not `login()`'s.
	70	
	71	### `index.html` (modified)
	72	
	73	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	74	
	75	### `package.json` (modified)
	76	
	77	- Add `"scripts": { "test": "node --test" }`.
	78	
	79	## Data Flow
	80	
	81	form submit → `validateForm` → `login(username, password)` →
	82	`{ success, user, userId }` → if `success`:
	83	`session.setCurrentUser({ userId, username: user })` → any form:
	84	`session.getCurrentUser()`.
	85	
	86	## Error Handling
	87	
	88	- **Failed login** (`success: false`): the session is not touched; the
	89	  previously logged-in user stays logged in.
	90	- **Corrupt stored data** (JSON that won't parse, a non-object value, or
	91	  `userId` missing or not a string): `getCurrentUser()` returns `null`
	92	  and removes the entry.
	93	- **Storage not available** (missing `localStorage`, or `getItem`/`setItem`/`removeItem`
	94	  throwing, e.g. Safari private mode or quota exceeded):
	95	  - `setCurrentUser` catches the error, calls `console.error`, and does not throw.
	96	  - `getCurrentUser` returns `null`.
	97	  - `clearCurrentUser` catches the error, calls `console.error`, and does not throw.
	98	- **Programming error**: `setCurrentUser` called with `userId` missing or
	99	  not a non-empty string throws `TypeError`. Input is validated before any
	100	  storage access.
	101	
	102	## Testing
	103	
	104	`test/session.test.js` imports `../session.js`. Each test builds a fresh
	105	in-memory fake storage and passes it to `createSession`.
	106	
	107	1. set then get returns `userId`, `username`, and a valid ISO `loggedInAt`.
	108	2. get with nothing stored returns `null`.
	109	3. clear removes the stored user.
	110	4. A second set overwrites the first.
	111	5. JSON that won't parse under `currentUser`: get returns `null` and the entry is removed.
	112	6. A stored record with no `userId`: get returns `null`.
	113	7. Storage whose `setItem` throws: set does not throw and `console.error` is called.
	114	8. Storage whose `getItem` throws: get returns `null`.
	115	9. set with no `userId` throws `TypeError`.
	116	10. `createSession(undefined)` does not throw; get returns `null` and set does not throw.
	117	
	118	Assumption: Node detects ES module syntax in `session.js` and the test file
	119	without `"type": "module"`. Validate by running `npm test` on Node 26.
	120	
	121	`app.js` has no automated tests (it runs DOM code at load, and the new
	122	logic is just wiring). Check it by hand: serve the repo over HTTP, log in,
	123	confirm `localStorage.currentUser` holds the record, reload, and confirm it
	124	is still there.
	125	
	126	Implementation is TDD: write the session tests first and see them fail,
	127	then write the module to make them pass.
	128	
	129	## Out of Scope
	130	
	131	- Logout UI (`clearCurrentUser` exists for when one is added).
	132	- Login history or audit trail.
	133	- Server-side sessions and the real API call.
	134	- Lint/format and E2E tooling.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214423Z-9db7/home/.cache/hyperpowers/codex-review/346b1591b6655384a12bf348dd9ae6fc724a2cdc/run-pdZ2Oe7V/adjudications.md

	1	# Plan review context
	2	
	3	Spec approved by user; spec-gate Codex review was incomplete (no verdict), recorded in the ungated ledger.
	4	
	5	## Risk Tier Rubric (verbatim)
	6	
	7	- **high** — touches approval-authority code (verdict-normalize,
	8	  gate-round, ungated-ledger, or any script whose output other machinery
	9	  trusts), concurrency/locking, security surfaces, destructive git
	10	  operations, or durable-record writers.
	11	- **standard** — multi-file integration, new scripts, behavior-shaping
	12	  skill/doc surgery, anything not clearly low or high. The default.
	13	- **low** — single-file mechanical transcription where the plan contains
	14	  the complete content to write; doc-reference or typo fixes; test-needle
	15	  additions whose strings appear verbatim in the plan.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
