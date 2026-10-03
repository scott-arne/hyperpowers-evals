# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213044Z-a0a1/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-login-userid-tracking.md

	1	# Login userId Tracking Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-10-03-login-userid-tracking-design.md`
	6	
	7	**Goal:** Pass a persistent, client-generated `userId` into `login(username, password, userId)` via a reusable `getUserId()` helper.
	8	
	9	**Architecture:** A new classic browser script `user-id.js` (repo root) defines a global `getUserId()` that returns a UUID persisted in `localStorage["userId"]`, falling back to a per-page-load in-memory ID if storage throws. `index.html` loads it before `app.js`; the login submit handler passes `getUserId()` to `login()`, which logs and returns it. `user-id.js` also exports via CommonJS when `module` exists so Node tests can load it.
	10	
	11	**Tech Stack:** Plain browser JavaScript (no bundler, no ES modules), Node built-in test runner (`node:test`, `node:assert`). Node v26 is installed locally.
	12	
	13	## Global Constraints
	14	
	15	- No new dependencies; tests use `node:test` and `node:assert` only.
	16	- `package.json` gets `"test": "node --test"`.
	17	- Storage key is exactly `"userId"`.
	18	- IDs come from `crypto.randomUUID()`, read from `globalThis` at call time.
	19	- `user-id.js` is a classic script (no `import`/`export`); CommonJS export only behind `if (typeof module !== "undefined" && module.exports)`.
	20	- Login must never fail because tracking cannot persist.
	21	- `login()` logs `Logging in: <username> (userId: <userId>)` and returns `{ success: true, user: username, userId }`.
	22	- `validateForm` is unchanged.
	23	- Out of scope: real POST to `API_ENDPOINT`, backend account IDs, ES module migration, refactoring `app.js` for testability.
	24	
	25	## Grounding
	26	
	27	- Naming / function style: `app.js:4-15` — camelCase function declarations, double-quoted strings, 2-space indent, semicolons.
	28	- CommonJS export: `src/utils.js:1-5` — `module.exports = { greet };`.
	29	- Error handling: `app.js:10-15` — failures expressed as return values, not thrown; no existing try/catch pattern in the repo.
	30	- Test shape: `none: no existing tests or test runner in the repo`.
	31	- Script loading: `index.html:13` — `<script src="app.js"></script>` at end of body.
	32	
	33	---
	34	
	35	### Task 1: `getUserId()` helper with tests
	36	
	37	**Risk tier:** standard — new script plus new test infrastructure.
	38	
	39	**Files:**
	40	- Create: `user-id.js`
	41	- Create: `test/user-id.test.js`
	42	- Modify: `package.json` (add `scripts.test`)
	43	
	44	**Interfaces:**
	45	- Consumes: nothing.
	46	- Produces: global `getUserId(): string` (browser) and `require("../user-id").getUserId` (Node). Returns the same ID on every call within a page load; persisted ID across loads when `localStorage` works.
	47	
	48	**Mirror:** `src/utils.js:1-5` for the `module.exports` shape.
	49	
	50	- [ ] **Step 1: Add the test script to `package.json`**
	51	
	52	Replace the whole file with:
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
	66	- [ ] **Step 2: Write the failing tests**
	67	
	68	Create `test/user-id.test.js`:
	69	
	70	```js
	71	const { test, beforeEach, afterEach } = require("node:test");
	72	const assert = require("node:assert");
	73	const path = require("node:path");
	74	
	75	const MODULE_PATH = path.join(__dirname, "..", "user-id.js");
	76	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	77	
	78	// Load user-id.js as if on a fresh page (resets its in-memory state)
	79	function loadFresh() {
	80	  delete require.cache[require.resolve(MODULE_PATH)];
	81	  return require(MODULE_PATH);
	82	}
	83	
	84	function fakeStorage(initial = {}) {
	85	  const data = { ...initial };
	86	  return {
	87	    data,
	88	    getItem: (key) => (key in data ? data[key] : null),
	89	    setItem: (key, value) => {
	90	      data[key] = String(value);
	91	    },
	92	  };
	93	}
	94	
	95	function throwingStorage() {
	96	  return {
	97	    getItem: () => {
	98	      throw new Error("storage disabled");
	99	    },
	100	    setItem: () => {
	101	      throw new Error("storage disabled");
	102	    },
	103	  };
	104	}
	105	
	106	let originalStorage;
	107	
	108	beforeEach(() => {
	109	  originalStorage = globalThis.localStorage;
	110	});
	111	
	112	afterEach(() => {
	113	  if (originalStorage === undefined) {
	114	    delete globalThis.localStorage;
	115	  } else {
	116	    globalThis.localStorage = originalStorage;
	117	  }
	118	});
	119	
	120	test("creates a UUID and stores it under 'userId' on first call", () => {
	121	  const storage = fakeStorage();
	122	  globalThis.localStorage = storage;
	123	  const { getUserId } = loadFresh();
	124	
	125	  const id = getUserId();
	126	
	127	  assert.match(id, UUID_RE);
	128	  assert.strictEqual(storage.data.userId, id);
	129	});
	130	
	131	test("returns the same ID on subsequent calls", () => {
	132	  globalThis.localStorage = fakeStorage();
	133	  const { getUserId } = loadFresh();
	134	
	135	  assert.strictEqual(getUserId(), getUserId());
	136	});
	137	
	138	test("returns the stored ID after a page reload", () => {
	139	  const storage = fakeStorage({ userId: "existing-id" });
	140	  globalThis.localStorage = storage;
	141	  const { getUserId } = loadFresh();
	142	
	143	  assert.strictEqual(getUserId(), "existing-id");
	144	  assert.strictEqual(storage.data.userId, "existing-id");
	145	});
	146	
	147	test("falls back to a stable in-memory ID when storage throws", () => {
	148	  globalThis.localStorage = throwingStorage();
	149	  const { getUserId } = loadFresh();
	150	
	151	  const id = getUserId();
	152	
	153	  assert.match(id, UUID_RE);
	154	  assert.strictEqual(getUserId(), id);
	155	});
	156	
	157	test("falls back to a stable in-memory ID when localStorage is missing", () => {
	158	  delete globalThis.localStorage;
	159	  const { getUserId } = loadFresh();
	160	
	161	  const id = getUserId();
	162	
	163	  assert.match(id, UUID_RE);
	164	  assert.strictEqual(getUserId(), id);
	165	});
	166	```
	167	
	168	- [ ] **Step 3: Run tests to verify they fail**
	169	
	170	Run: `npm test`
	171	Expected: FAIL — `Cannot find module '.../user-id.js'`.
	172	
	173	- [ ] **Step 4: Write the implementation**
	174	
	175	Create `user-id.js`:
	176	
	177	```js
	178	// Persistent client-side tracking ID, shared by any form that needs it
	179	const USER_ID_STORAGE_KEY = "userId";
	180	let fallbackUserId = null;
	181	
	182	function getUserId() {
	183	  try {
	184	    let id = globalThis.localStorage.getItem(USER_ID_STORAGE_KEY);
	185	    if (!id) {
	186	      id = globalThis.crypto.randomUUID();
	187	      globalThis.localStorage.setItem(USER_ID_STORAGE_KEY, id);
	188	    }
	189	    return id;
	190	  } catch (e) {
	191	    // Storage unavailable: keep one ID for this page load so login still works
	192	    if (!fallbackUserId) {
	193	      fallbackUserId = globalThis.crypto.randomUUID();
	194	    }
	195	    return fallbackUserId;
	196	  }
	197	}
	198	
	199	if (typeof module !== "undefined" && module.exports) {
	200	  module.exports = { getUserId };
	201	}
	202	```
	203	
	204	- [ ] **Step 5: Run tests to verify they pass**
	205	
	206	Run: `npm test`
	207	Expected: PASS — 5 tests, 0 failures.
	208	
	209	- [ ] **Step 6: Commit**
	210	
	211	```bash
	212	git add user-id.js test/user-id.test.js package.json
	213	git commit -m "$(cat <<'EOF'
	214	Add persistent getUserId() helper with tests
	215	
	216	Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
	217	EOF
	218	)"
	219	```
	220	
	221	---
	222	
	223	### Task 2: Pass userId into `login()`
	224	
	225	**Risk tier:** standard — multi-file integration (`app.js` + `index.html`) verified by a smoke run rather than committed tests.
	226	
	227	**Files:**
	228	- Modify: `app.js:4-8` (`login`), `app.js:23` (call site)
	229	- Modify: `index.html:13` (script tags)
	230	
	231	**Interfaces:**
	232	- Consumes: global `getUserId(): string` from Task 1 (`user-id.js`).
	233	- Produces: `login(username, password, userId)` returning `{ success: true, user: username, userId }`.
	234	
	235	**Mirror:** `app.js:4-8` — keep the existing stub comment and style.
	236	
	237	- [ ] **Step 1: Run the smoke check to verify it fails**
	238	
	239	From the repo root, run:
	240	
	241	```bash
	242	node -e '
	243	const fs = require("fs"), vm = require("vm");
	244	const store = {}; let handler; const logs = [];
	245	const els = {
	246	  username: { value: "alice" },
	247	  password: { value: "pw" },
	248	  "login-form": { addEventListener: (t, h) => { handler = h; } },
	249	};
	250	const ctx = {
	251	  console: { log: (...a) => logs.push(a), error: (...a) => logs.push(a) },
	252	  crypto: globalThis.crypto,
	253	  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
	254	  document: { getElementById: (id) => els[id] },
	255	};
	256	vm.createContext(ctx);
	257	vm.runInContext(fs.readFileSync("user-id.js", "utf8"), ctx);
	258	vm.runInContext(fs.readFileSync("app.js", "utf8"), ctx);
	259	handler({ preventDefault() {} });
	260	const result = logs.find((l) => l[0] === "Login result:")[1];
	261	const ok = logs[0][0] === `Logging in: alice (userId: ${store.userId})` && result.userId === store.userId && result.user === "alice" && result.success === true;
	262	console.log(JSON.stringify(logs));
	263	console.log(ok ? "SMOKE PASS" : "SMOKE FAIL");
	264	process.exit(ok ? 0 : 1);
	265	'
	266	```
	267	
	268	Expected: `SMOKE FAIL` (exit 1) — `logs[0]` is `["Logging in:","alice"]` and `result.userId` is undefined.
	269	
	270	- [ ] **Step 2: Update `login()` in `app.js`**
	271	
	272	Replace lines 4-8:
	273	
	274	```js
	275	function login(username, password) {
	276	  console.log("Logging in:", username);
	277	  // Stub: would POST to API_ENDPOINT in real app
	278	  return { success: true, user: username };
	279	}
	280	```
	281	
	282	with:
	283	
	284	```js
	285	function login(username, password, userId) {
	286	  console.log(`Logging in: ${username} (userId: ${userId})`);
	287	  // Stub: would POST to API_ENDPOINT (including userId) in real app
	288	  return { success: true, user: username, userId };
	289	}
	290	```
	291	
	292	- [ ] **Step 3: Pass `getUserId()` at the call site in `app.js`**
	293	
	294	Replace:
	295	
	296	```js
	297	    const result = login(username, password);
	298	```
	299	
	300	with:
	301	
	302	```js
	303	    const result = login(username, password, getUserId());
	304	```
	305	
	306	- [ ] **Step 4: Load `user-id.js` before `app.js` in `index.html`**
	307	
	308	Replace:
	309	
	310	```html
	311	  <script src="app.js"></script>
	312	```
	313	
	314	with:
	315	
	316	```html
	317	  <script src="user-id.js"></script>
	318	  <script src="app.js"></script>
	319	```
	320	
	321	- [ ] **Step 5: Run the smoke check to verify it passes**
	322	
	323	Run the same command from Step 1.
	324	Expected: `SMOKE PASS` (exit 0).
	325	
	326	- [ ] **Step 6: Run the unit tests**
	327	
	328	Run: `npm test`
	329	Expected: PASS — 5 tests, 0 failures.
	330	
	331	- [ ] **Step 7: Commit**
	332	
	333	```bash
	334	git add app.js index.html
	335	git commit -m "$(cat <<'EOF'
	336	Pass persistent userId into login()
	337	
	338	Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
	339	EOF
	340	)"
	341	```
	342	
	343	- [ ] **Step 8: Manual browser check (report result; do not block on it)**
	344	
	345	Run `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`, submit the form with any username/password, and confirm the console shows `Logging in: <name> (userId: <uuid>)` and a `Login result:` object containing the same `userId`. Reload and submit again: the `userId` must be unchanged. This also validates the spec's assumption that `crypto.randomUUID` is available in the target browser.

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213044Z-a0a1/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-userid-tracking-design.md

	1	# Login userId Tracking — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Approved in chat; awaiting spec review
	5	
	6	## Goal
	7	
	8	Track who logged in by passing a persistent, client-generated `userId` into
	9	`login()`. The ID must persist across page loads and be reusable by other forms
	10	added later.
	11	
	12	## Decisions
	13	
	14	- **userId is a client tracking ID**, not a backend account ID. It identifies a
	15	  browser, not a verified person: it changes if storage is cleared or on another
	16	  device, and it can be forged. It is suitable for analytics-style correlation,
	17	  not for security or accountability.
	18	- **userId is an input to `login()`**: `login(username, password, userId)`.
	19	- **"Tracking" means log + return**: `login()` includes the userId in its console
	20	  log and in its returned result. When the real POST to `API_ENDPOINT` is built
	21	  (out of scope here), the userId goes in the request body.
	22	- **Shared logic lives in a new classic script, `user-id.js`**, loaded before
	23	  `app.js`, exposing a global `getUserId()`. ES modules were considered and
	24	  rejected for now because module scripts do not run from `file://`; migrating
	25	  later is cheap.
	26	
	27	## Components
	28	
	29	### `user-id.js` (new, repo root next to `app.js`)
	30	
	31	`getUserId()`:
	32	
	33	1. Try to read `localStorage.getItem("userId")`. If present, return it.
	34	2. Otherwise generate `crypto.randomUUID()`, `localStorage.setItem("userId", id)`,
	35	   and return it.
	36	3. If any `localStorage` access throws (private browsing, storage disabled), fall
	37	   back to a module-level in-memory ID generated once per page load and return
	38	   that. Login must never fail because tracking cannot persist.
	39	
	40	Exposure:
	41	- Browser: a top-level `function getUserId()` in a classic script is a global.
	42	- Node (tests): `if (typeof module !== "undefined" && module.exports) module.exports = { getUserId };`
	43	  matching the CommonJS style of `src/utils.js`.
	44	
	45	To keep it testable, `getUserId` reads `localStorage` and `crypto` from
	46	`globalThis` at call time, so tests can install fakes.
	47	
	48	### `app.js` (modified)
	49	
	50	- `login(username, password, userId)`:
	51	  - logs `Logging in: <username> (userId: <userId>)`
	52	  - returns `{ success: true, user: username, userId }`
	53	- Submit handler passes `getUserId()` as the third argument.
	54	- `validateForm` is unchanged; userId is not user input.
	55	
	56	### `index.html` (modified)
	57	
	58	Add `<script src="user-id.js"></script>` immediately before
	59	`<script src="app.js"></script>`.
	60	
	61	## Data flow
	62	
	63	Page load → form submit → handler reads username/password → `getUserId()`
	64	returns persisted (or newly created, or in-memory fallback) ID →
	65	`login(username, password, userId)` → logged and returned in result.
	66	
	67	## Error handling
	68	
	69	- `localStorage` unavailable or throwing → in-memory fallback, no error surfaced.
	70	- `crypto.randomUUID` is assumed available. Assumption: target browsers support
	71	  `crypto.randomUUID` (secure contexts; `localhost` and `file://` count in modern
	72	  browsers), validate via manual check in the target browser during
	73	  implementation.
	74	
	75	## Testing
	76	
	77	No test infrastructure exists. Add `test/user-id.test.js` using Node's built-in
	78	`node:test` and `node:assert` (no new dependencies), plus a `"test": "node --test"`
	79	script in `package.json`. Cases:
	80	
	81	1. First call creates an ID and stores it in (fake) `localStorage`.
	82	2. Subsequent calls return the same ID.
	83	3. Persistence: with the same fake storage pre-populated, a fresh module load
	84	   returns the stored ID.
	85	4. Fallback: when `localStorage` methods throw, `getUserId()` still returns a
	86	   string and returns the same value on repeated calls.
	87	
	88	`login()` lives in `app.js`, which touches `document` at load time and is not
	89	importable in Node; its change is verified manually by loading `index.html`,
	90	submitting the form, and confirming the console shows the userId and the result
	91	object contains it.
	92	
	93	## Out of scope
	94	
	95	- Implementing the real POST to `API_ENDPOINT`.
	96	- Backend account IDs or linking the tracking ID to accounts.
	97	- Refactoring `app.js` for testability or migrating to ES modules.
	98	- Wiring userId into other forms (none exist yet).


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213044Z-a0a1/home/.cache/hyperpowers/codex-review/aa5e3ce8533331dd6dfa9a8e7659899558ab7538/run-Fhehvhsa/adjudications.md

	1	# Context
	2	Spec approved by user 2026-10-03 (spec-gate Codex review was incomplete: stub returned no verdict).
	3	
	4	# Risk Tier Rubric (verbatim)
	5	- **high** — touches approval-authority code (verdict-normalize,
	6	  gate-round, ungated-ledger, or any script whose output other machinery
	7	  trusts), concurrency/locking, security surfaces, destructive git
	8	  operations, or durable-record writers.
	9	- **standard** — multi-file integration, new scripts, behavior-shaping
	10	  skill/doc surgery, anything not clearly low or high. The default.
	11	- **low** — single-file mechanical transcription where the plan contains
	12	  the complete content to write; doc-reference or typo fixes; test-needle
	13	  additions whose strings appear verbatim in the plan.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
