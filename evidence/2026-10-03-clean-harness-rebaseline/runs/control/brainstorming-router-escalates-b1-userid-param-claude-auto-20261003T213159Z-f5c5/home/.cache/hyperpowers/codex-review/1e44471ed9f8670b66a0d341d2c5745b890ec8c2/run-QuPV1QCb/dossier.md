# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213159Z-f5c5/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-persisted-userid-session.md

	1	# Persisted userId Session Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-10-03-persisted-userid-session-design.md`
	6	
	7	**Goal:** After a successful login, persist the user's `userId` in `localStorage` via a shared `session.js` ES module that any form can import.
	8	
	9	**Architecture:** `session.js` is the sole owner of `localStorage` (`setUser`/`getUser`/`clearUser`, storage failures swallowed). `login()` moves from `app.js` into a DOM-free `auth.js` module, returns a (stub) `userId`, and persists it on success. `app.js` becomes a browser ES module holding only DOM wiring and `validateForm`.
	10	
	11	**Tech Stack:** Vanilla browser JavaScript (ES modules, no build step); Node built-in `node:test` + `node:assert/strict` for unit tests (Node v26 installed).
	12	
	13	## Global Constraints
	14	
	15	- No new runtime or dev dependencies.
	16	- Unit tests run with `npm test` using `node:test`.
	17	- Only `session.js` may access `localStorage` directly.
	18	- Never store secrets (passwords, tokens) in `localStorage` — `userId` only.
	19	- Do not add `"type": "module"` to `package.json` (it would break CommonJS `src/`). Browser modules at the repo root are ESM-syntax `.js`; tests are `.mjs`. (Assumption from spec validated 2026-10-03 on Node v26.10.0: a `.mjs` test importing an ESM-syntax `.js` file in a non-`"type":"module"` package passes under `node --test`.)
	20	
	21	## Grounding
	22	
	23	- Naming: `app.js:4-15` — camelCase function declarations (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
	24	- Error handling: `app.js:10-15` — validation returns result objects (`{ valid: false, error }`) rather than throwing; `app.js:26` logs errors with `console.error`. No existing `try/catch` pattern.
	25	- Module exports: `src/utils.js:5` — CommonJS `module.exports`; no existing ES module in repo (`none: no existing ESM pattern`).
	26	- Test shape: `none: no existing tests or test runner in the repo`.
	27	- Test env fact: in Node v26, `globalThis.localStorage` is a configurable accessor that returns `undefined` (with an ExperimentalWarning) unless `--localstorage-file` is passed; tests must install fakes with `Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true })` — plain assignment hits the native setter.
	28	
	29	---
	30	
	31	### Task 1: `session.js` module with tests and `npm test`
	32	
	33	**Risk tier:** standard — new module plus new test infrastructure (`package.json` script).
	34	
	35	**Files:**
	36	- Create: `session.js`
	37	- Create: `test/session.test.mjs`
	38	- Modify: `package.json` (add `scripts.test`)
	39	
	40	**Interfaces:**
	41	- Consumes: nothing.
	42	- Produces (ES module `./session.js`):
	43	  - `export const STORAGE_KEY = "app.session.userId"`
	44	  - `export function setUser(userId: string | number): void` — throws `TypeError` on `null`/`undefined`/`""`; storage errors → `console.warn`, no throw.
	45	  - `export function getUser(): string | null`
	46	  - `export function clearUser(): void` — storage errors → `console.warn`, no throw.
	47	
	48	**Mirror:** `app.js:4-15` for naming/style.
	49	
	50	- [ ] **Step 1: Add the test script to `package.json`**
	51	
	52	Replace the full file with:
	53	
	54	```json
	55	{
	56	  "name": "drill-test-project",
	57	  "version": "1.0.0",
	58	  "description": "Test project for Drill scenarios",
	59	  "main": "src/index.js",
	60	  "scripts": {
	61	    "test": "node --test"
	62	  }
	63	}
	64	```
	65	
	66	- [ ] **Step 2: Write the failing tests** — `test/session.test.mjs`:
	67	
	68	```js
	69	import { test, beforeEach } from "node:test";
	70	import assert from "node:assert/strict";
	71	import { STORAGE_KEY, setUser, getUser, clearUser } from "../session.js";
	72	
	73	function memoryStorage() {
	74	  const data = new Map();
	75	  return {
	76	    getItem: (key) => (data.has(key) ? data.get(key) : null),
	77	    setItem: (key, value) => data.set(key, String(value)),
	78	    removeItem: (key) => data.delete(key),
	79	  };
	80	}
	81	
	82	function throwingStorage() {
	83	  const fail = () => {
	84	    throw new Error("storage disabled");
	85	  };
	86	  return { getItem: fail, setItem: fail, removeItem: fail };
	87	}
	88	
	89	function installStorage(storage) {
	90	  Object.defineProperty(globalThis, "localStorage", {
	91	    value: storage,
	92	    configurable: true,
	93	    writable: true,
	94	  });
	95	}
	96	
	97	beforeEach(() => {
	98	  installStorage(memoryStorage());
	99	});
	100	
	101	test("setUser stores the id under STORAGE_KEY and getUser returns it", () => {
	102	  setUser("u-123");
	103	  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY), "u-123");
	104	  assert.equal(getUser(), "u-123");
	105	});
	106	
	107	test("setUser stringifies numeric ids", () => {
	108	  setUser(42);
	109	  assert.equal(getUser(), "42");
	110	});
	111	
	112	test("getUser returns null when nothing is stored", () => {
	113	  assert.equal(getUser(), null);
	114	});
	115	
	116	test("clearUser removes the stored id", () => {
	117	  setUser("u-123");
	118	  clearUser();
	119	  assert.equal(getUser(), null);
	120	});
	121	
	122	test("setUser rejects null, undefined, and empty string", () => {
	123	  for (const bad of [null, undefined, ""]) {
	124	    assert.throws(() => setUser(bad), TypeError);
	125	  }
	126	});
	127	
	128	test("storage failures never throw", (t) => {
	129	  t.mock.method(console, "warn", () => {});
	130	  installStorage(throwingStorage());
	131	  assert.equal(getUser(), null);
	132	  assert.doesNotThrow(() => setUser("u-123"));
	133	  assert.doesNotThrow(() => clearUser());
	134	  assert.equal(console.warn.mock.callCount(), 2);
	135	});
	136	```
	137	
	138	- [ ] **Step 3: Run tests to verify they fail**
	139	
	140	Run: `npm test`
	141	Expected: FAIL — `Cannot find module '.../session.js'`.
	142	
	143	- [ ] **Step 4: Implement** — `session.js`:
	144	
	145	```js
	146	// Persisted session state. The only module allowed to touch localStorage.
	147	export const STORAGE_KEY = "app.session.userId";
	148	
	149	export function setUser(userId) {
	150	  if (userId === null || userId === undefined || userId === "") {
	151	    throw new TypeError("setUser requires a non-empty userId");
	152	  }
	153	  try {
	154	    globalThis.localStorage.setItem(STORAGE_KEY, String(userId));
	155	  } catch (err) {
	156	    console.warn("Could not persist userId:", err);
	157	  }
	158	}
	159	
	160	export function getUser() {
	161	  try {
	162	    return globalThis.localStorage.getItem(STORAGE_KEY);
	163	  } catch {
	164	    return null;
	165	  }
	166	}
	167	
	168	export function clearUser() {
	169	  try {
	170	    globalThis.localStorage.removeItem(STORAGE_KEY);
	171	  } catch (err) {
	172	    console.warn("Could not clear userId:", err);
	173	  }
	174	}
	175	```
	176	
	177	- [ ] **Step 5: Run tests to verify they pass**
	178	
	179	Run: `npm test`
	180	Expected: PASS — 6 tests, 0 failures.
	181	
	182	- [ ] **Step 6: Commit**
	183	
	184	```bash
	185	git add package.json session.js test/session.test.mjs
	186	git commit -m "feat: add localStorage-backed session module"
	187	```
	188	
	189	---
	190	
	191	### Task 2: `auth.js` login that persists userId; wire up `app.js` and `index.html`
	192	
	193	**Risk tier:** standard — multi-file integration (new module, refactor of `app.js`, HTML script type change, README).
	194	
	195	**Files:**
	196	- Create: `auth.js`
	197	- Create: `test/auth.test.mjs`
	198	- Modify: `app.js` (entire file — remove `login`/`API_ENDPOINT`, add import)
	199	- Modify: `index.html:13` (`<script>` → `type="module"`)
	200	- Modify: `README.md` (serving note)
	201	
	202	**Interfaces:**
	203	- Consumes: `setUser(userId)` and `getUser()` from `./session.js` (Task 1).
	204	- Produces (ES module `./auth.js`):
	205	  - `export function login(username: string, password: string): { success: boolean, user: string, userId: string }` — on `success: true` calls `setUser(userId)` before returning. Must not touch the DOM.
	206	
	207	**Mirror:** `app.js:2-8` — the existing `login` stub being moved (keep its `console.log` and the stub comment style).
	208	
	209	- [ ] **Step 1: Write the failing tests** — `test/auth.test.mjs`:
	210	
	211	```js
	212	import { test, beforeEach } from "node:test";
	213	import assert from "node:assert/strict";
	214	import { login } from "../auth.js";
	215	import { getUser } from "../session.js";
	216	
	217	function memoryStorage() {
	218	  const data = new Map();
	219	  return {
	220	    getItem: (key) => (data.has(key) ? data.get(key) : null),
	221	    setItem: (key, value) => data.set(key, String(value)),
	222	    removeItem: (key) => data.delete(key),
	223	  };
	224	}
	225	
	226	function installStorage(storage) {
	227	  Object.defineProperty(globalThis, "localStorage", {
	228	    value: storage,
	229	    configurable: true,
	230	    writable: true,
	231	  });
	232	}
	233	
	234	beforeEach((t) => {
	235	  installStorage(memoryStorage());
	236	  t.mock.method(console, "log", () => {});
	237	});
	238	
	239	test("successful login returns a userId and persists it", () => {
	240	  const result = login("alice", "secret");
	241	  assert.equal(result.success, true);
	242	  assert.equal(result.user, "alice");
	243	  assert.equal(result.userId, "stub-alice");
	244	  assert.equal(getUser(), "stub-alice");
	245	});
	246	
	247	test("login still succeeds when storage fails", (t) => {
	248	  t.mock.method(console, "warn", () => {});
	249	  const fail = () => {
	250	    throw new Error("storage disabled");
	251	  };
	252	  installStorage({ getItem: fail, setItem: fail, removeItem: fail });
	253	  const result = login("alice", "secret");
	254	  assert.equal(result.success, true);
	255	  assert.equal(result.userId, "stub-alice");
	256	});
	257	
	258	test("login never persists the password", () => {
	259	  login("alice", "secret");
	260	  assert.notEqual(getUser(), "secret");
	261	});
	262	```
	263	
	264	- [ ] **Step 2: Run tests to verify they fail**
	265	
	266	Run: `npm test`
	267	Expected: FAIL — `Cannot find module '.../auth.js'` (session tests still pass).
	268	
	269	- [ ] **Step 3: Implement** — `auth.js`:
	270	
	271	```js
	272	import { setUser } from "./session.js";
	273	
	274	const API_ENDPOINT = "https://api.example.com/login";
	275	
	276	export function login(username, password) {
	277	  console.log("Logging in:", username);
	278	  // Stub: would POST to API_ENDPOINT in real app; userId stands in for the
	279	  // server-assigned ID.
	280	  const result = { success: true, user: username, userId: `stub-${username}` };
	281	  if (result.success) {
	282	    setUser(result.userId);
	283	  }
	284	  return result;
	285	}
	286	```
	287	
	288	- [ ] **Step 4: Run tests to verify they pass**
	289	
	290	Run: `npm test`
	291	Expected: PASS — 9 tests, 0 failures.
	292	
	293	- [ ] **Step 5: Rewire `app.js`** — replace the full file with:
	294	
	295	```js
	296	// Simple webapp with login form handling
	297	import { login } from "./auth.js";
	298	
	299	function validateForm(formData) {
	300	  if (!formData.username || !formData.password) {
	301	    return { valid: false, error: "Missing required fields" };
	302	  }
	303	  return { valid: true };
	304	}
	305	
	306	document.getElementById("login-form").addEventListener("submit", (e) => {
	307	  e.preventDefault();
	308	  const username = document.getElementById("username").value;
	309	  const password = document.getElementById("password").value;
	310	  const validation = validateForm({ username, password });
	311	  if (validation.valid) {
	312	    const result = login(username, password);
	313	    console.log("Login result:", result);
	314	  } else {
	315	    console.error("Validation error:", validation.error);
	316	  }
	317	});
	318	```
	319	
	320	- [ ] **Step 6: Load `app.js` as a module** — in `index.html`, change
	321	
	322	```html
	323	  <script src="app.js"></script>
	324	```
	325	
	326	to
	327	
	328	```html
	329	  <script type="module" src="app.js"></script>
	330	```
	331	
	332	- [ ] **Step 7: Document serving** — replace `README.md` with:
	333	
	334	```markdown
	335	# Test Project
	336	
	337	A minimal project for Drill test scenarios.
	338	
	339	The webapp uses ES modules, which browsers do not load from `file://`. Serve
	340	the repo root and open `index.html`, e.g. `python3 -m http.server` then
	341	http://localhost:8000/. Run unit tests with `npm test`.
	342	```
	343	
	344	- [ ] **Step 8: Verify module graph in Node and browser smoke test**
	345	
	346	Run: `npm test && node --check auth.js && node --input-type=module -e 'await import("./auth.js"); await import("./session.js"); console.log("ok")'`
	347	Expected: tests PASS, then `ok`.
	348	
	349	Then: `python3 -m http.server 8000` from repo root, open http://localhost:8000/, submit username `alice` / password `x`; DevTools console shows `Login result: {success: true, user: "alice", userId: "stub-alice"}` and `localStorage.getItem("app.session.userId")` returns `"stub-alice"`. If no browser is available to the executor, record the smoke test as not run.
	350	
	351	- [ ] **Step 9: Commit**
	352	
	353	```bash
	354	git add auth.js test/auth.test.mjs app.js index.html README.md
	355	git commit -m "feat: persist userId on login via session module"
	356	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213159Z-f5c5/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-persisted-userid-session-design.md

	1	# Persisted userId Session — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Draft, awaiting user review
	5	
	6	## Goal
	7	
	8	Track who logged in. After a successful login, the logged-in user's `userId`
	9	is persisted in the browser and readable from any current or future form in
	10	the webapp.
	11	
	12	## Decisions
	13	
	14	| Decision | Choice | Rationale |
	15	|---|---|---|
	16	| Source of `userId` | Returned by `login()` (from the server response), not passed in | The caller (login form) does not know a user's ID before login; a client-supplied ID is untrustworthy for tracking |
	17	| Persistence | `localStorage` | Survives reloads, tabs, and browser restarts until cleared |
	18	| Module format | Browser ES modules (`<script type="module">`), no build step | Explicit imports for future forms, no globals, no new tooling |
	19	| Tests | Node built-in `node:test`, zero dependencies | Repo has no test infrastructure; cheapest useful setup |
	20	
	21	## Global Constraints
	22	
	23	- No new runtime or dev dependencies.
	24	- Unit tests run with `npm test` using `node:test`.
	25	- Only `session.js` may access `localStorage` directly.
	26	- Never store secrets (passwords, tokens) in `localStorage` — `userId` only.
	27	
	28	## Architecture
	29	
	30	### `session.js` (new, project root)
	31	
	32	Browser ES module; the single owner of persisted session state.
	33	
	34	- `STORAGE_KEY = "app.session.userId"`
	35	- `setUser(userId)` — stores `String(userId)` under `STORAGE_KEY`. Rejects
	36	  `null`/`undefined`/empty string by throwing `TypeError` (a programming
	37	  error, not a runtime condition).
	38	- `getUser()` — returns the stored string, or `null` if absent.
	39	- `clearUser()` — removes the key.
	40	
	41	**Error handling:** `localStorage` access can throw (storage disabled, private
	42	mode, quota exceeded). Each function wraps storage access in `try/catch`:
	43	`getUser()` returns `null`; `setUser()` and `clearUser()` log
	44	`console.warn` and return without throwing. Storage failure must never break
	45	login.
	46	
	47	**Testability:** functions resolve storage via `globalThis.localStorage` at
	48	call time, so tests can install an in-memory fake on `globalThis` (and a
	49	throwing fake to exercise the error path).
	50	
	51	### `login()` changes (`app.js`)
	52	
	53	- Signature unchanged: `login(username, password)`.
	54	- Stub response gains a `userId`. Until the real API exists, the stub derives
	55	  a placeholder: `userId: \`stub-${username}\`` with a comment marking it as a
	56	  stand-in for the server-assigned ID.
	57	- On `success: true`, `login()` calls `setUser(result.userId)` before
	58	  returning. On failure, nothing is stored. (The current stub always
	59	  succeeds, so the failure branch is untested until the real API exists.)
	60	- Returns `{ success, user, userId }`.
	61	
	62	To make `login()` testable from Node, it moves out of `app.js` into
	63	`auth.js` (ES module, exports `login`). `app.js` keeps only DOM wiring and
	64	`validateForm`, and imports `login` from `./auth.js`. `auth.js` must not touch
	65	the DOM.
	66	
	67	### `index.html`
	68	
	69	`<script src="app.js">` becomes `<script type="module" src="app.js">`.
	70	Note: ES modules do not load over `file://`; the page must be served (e.g.
	71	`npx serve` or `python3 -m http.server`). README gets a one-line note.
	72	
	73	### `package.json`
	74	
	75	- Add `"scripts": { "test": "node --test" }`.
	76	- Root browser modules use the `.js` extension and ESM syntax, while `src/`
	77	  is CommonJS. To avoid flipping the whole package to `"type": "module"`
	78	  (which would break `src/`), tests are written as `.mjs` files and import
	79	  the root modules — Assumption: Node loads ESM-syntax `.js` files imported
	80	  from `.mjs` via its syntax detection (Node ≥ 22.7 default), validate via
	81	  running `npm test` on the installed Node version. If unsupported, fallback:
	82	  add a `package.json` with `{"type":"module"}` scoped to a new `web/`
	83	  directory holding the browser files.
	84	
	85	## Data Flow
	86	
	87	1. User submits form → `app.js` validates → calls `login(username, password)`.
	88	2. `login()` gets (stub) response with `userId`.
	89	3. On success → `setUser(userId)` → `localStorage["app.session.userId"]`.
	90	4. Any form later → `import { getUser } from "./session.js"` → `userId` or `null`.
	91	
	92	## Testing
	93	
	94	`test/session.test.mjs`:
	95	- `setUser` then `getUser` returns the ID; `clearUser` then `getUser` → `null`.
	96	- `getUser` with nothing stored → `null`.
	97	- `setUser(null | undefined | "")` throws `TypeError`.
	98	- Throwing storage fake: `getUser` → `null`; `setUser`/`clearUser` do not throw.
	99	
	100	`test/auth.test.mjs`:
	101	- Successful `login` returns a `userId` and persists it (`getUser()` matches).
	102	- Storage failure during `login` still returns `success: true`.
	103	
	104	## Out of Scope
	105	
	106	- Logout UI (`clearUser` exists for it), session expiry, real API call,
	107	  server-side sessions, other forms, linting, E2E tests.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213159Z-f5c5/home/.cache/hyperpowers/codex-review/1e44471ed9f8670b66a0d341d2c5745b890ec8c2/run-QuPV1QCb/adjudications.md

	1	# Context for plan review
	2	- User approved spec as written ("looks good, go ahead"), including extracting login() into auth.js.
	3	- Spec gate: Codex review incomplete (no verdict) — recorded in ungated ledger.
	4	- Spec assumption on ESM .js imported from .mjs validated on Node v26.10.0.
	5	
	6	## Risk Tier Rubric (verbatim)
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
