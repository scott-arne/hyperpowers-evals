# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T100818Z-1d38/coding-agent-workdir/docs/hyperpowers/plans/2026-09-22-userid-tracking.md

	1	# userId Tracking Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-09-22-userid-tracking-design.md`
	6	
	7	**Goal:** Give the app a persistent, server-assigned `userId` that any form can read, and pass the previously-stored one into `login`.
	8	
	9	**Architecture:** A new `session.js` owns all identity storage behind three functions on a `Session` global, backed by `localStorage` with an in-memory fallback. `app.js` becomes a consumer: its `login` gains an optional third parameter carrying the prior ID, returns the new one, and the submit handler wires the two together. No storage logic lives outside `session.js`.
	10	
	11	**Tech Stack:** Plain browser JavaScript (no modules, no bundler, no framework). Node's built-in `node --test` runner for unit tests. Zero runtime and dev dependencies.
	12	
	13	## Global Constraints
	14	
	15	- The userId is an identifier for tracking, never an authorization credential. The server must never grant access based on a client-supplied copy.
	16	- No new dependencies in `package.json`. Tests use Node's built-in runner only.
	17	- Match the existing style: plain browser scripts, globals, no modules.
	18	- `index.html` must keep opening directly from the filesystem — no ES modules, no local web server requirement.
	19	- `localStorage` key is exactly `app.userId`.
	20	- Do not modify `src/index.js` or `src/utils.js`.
	21	- No logout UI, no real authentication backend, no authorization.
	22	
	23	## Grounding
	24	
	25	- Function and stub style: `app.js:4-8` — plain `function` declaration at top level, `//` comment marking the stub seam, returns an object literal.
	26	- Return-object shape: `app.js:10-15` — functions return `{ valid: true }` / `{ valid: false, error: ... }`; flat object literals with short keys.
	27	- Error handling: `app.js:25-27` — the only existing error handling is a `console.error` in the submit handler's else branch. There is no try/catch anywhere in the codebase and no error-reporting helper.
	28	- CommonJS export shape: `src/utils.js:1-5` — `function` declaration followed by `module.exports = { greet };`. This is the only export pattern in the repo.
	29	- Script loading: `index.html:13` — `<script src="app.js"></script>` as the last element in `<body>`, no `type`, no `defer`.
	30	- Naming: `app.js:4,10,19-20` — lowerCamelCase for functions and variables (`login`, `validateForm`, `username`); `app.js:2` — SCREAMING_SNAKE_CASE for module-level constants (`API_ENDPOINT`).
	31	- Test shape: **none — no existing pattern for tests.** There are no test files, no `test` script in `package.json`, and no test runner configured. Task 1 establishes the pattern.
	32	
	33	---
	34	
	35	### Task 1: Session storage module and its tests
	36	
	37	**Risk tier:** standard — a new script plus the repo's first test infrastructure; multi-file.
	38	
	39	**Files:**
	40	- Create: `session.js`
	41	- Create: `test/session.test.js`
	42	- Modify: `package.json` (add a `scripts.test` entry)
	43	
	44	**Interfaces:**
	45	- Consumes: nothing from earlier tasks.
	46	- Produces: a global `Session` object, also exported via `module.exports` for tests, with exactly three functions:
	47	  - `getUserId()` → `string | null` — the stored id, or `null` when nothing is stored or storage is unavailable.
	48	  - `setUserId(id)` → `undefined` — persists `id`.
	49	  - `clear()` → `undefined` — removes the stored id.
	50	
	51	**Mirror:** `src/utils.js:1-5` for the `module.exports` shape; `app.js:2` for the SCREAMING_SNAKE_CASE module constant.
	52	
	53	- [ ] **Step 1: Write the failing tests**
	54	
	55	Create `test/session.test.js` with exactly this content:
	56	
	57	```javascript
	58	const test = require('node:test');
	59	const assert = require('node:assert');
	60	const path = require('node:path');
	61	
	62	const SESSION_PATH = path.join(__dirname, '..', 'session.js');
	63	
	64	// session.js holds closure state (the in-memory fallback and the
	65	// storage-usable flag), so each case needs a freshly-loaded copy.
	66	function loadSession(storage) {
	67	  delete require.cache[require.resolve(SESSION_PATH)];
	68	  globalThis.localStorage = storage;
	69	  return require(SESSION_PATH);
	70	}
	71	
	72	function workingStorage() {
	73	  const data = new Map();
	74	  return {
	75	    getItem(key) {
	76	      return data.has(key) ? data.get(key) : null;
	77	    },
	78	    setItem(key, value) {
	79	      data.set(key, String(value));
	80	    },
	81	    removeItem(key) {
	82	      data.delete(key);
	83	    },
	84	  };
	85	}
	86	
	87	function throwingStorage(failOn) {
	88	  return {
	89	    getItem() {
	90	      if (failOn === 'read') throw new Error('storage disabled');
	91	      return null;
	92	    },
	93	    setItem() {
	94	      if (failOn === 'write') throw new Error('storage disabled');
	95	    },
	96	    removeItem() {
	97	      if (failOn === 'write') throw new Error('storage disabled');
	98	    },
	99	  };
	100	}
	101	
	102	test('getUserId returns null when nothing is stored', () => {
	103	  const Session = loadSession(workingStorage());
	104	  assert.strictEqual(Session.getUserId(), null);
	105	});
	106	
	107	test('setUserId then getUserId returns that id', () => {
	108	  const Session = loadSession(workingStorage());
	109	  Session.setUserId('u-123');
	110	  assert.strictEqual(Session.getUserId(), 'u-123');
	111	});
	112	
	113	test('clear then getUserId returns null', () => {
	114	  const Session = loadSession(workingStorage());
	115	  Session.setUserId('u-123');
	116	  Session.clear();
	117	  assert.strictEqual(Session.getUserId(), null);
	118	});
	119	
	120	test('setUserId overwrites a previously stored id', () => {
	121	  const Session = loadSession(workingStorage());
	122	  Session.setUserId('u-123');
	123	  Session.setUserId('u-456');
	124	  assert.strictEqual(Session.getUserId(), 'u-456');
	125	});
	126	
	127	test('getUserId returns null and does not throw when reads fail', () => {
	128	  const Session = loadSession(throwingStorage('read'));
	129	  assert.doesNotThrow(() => Session.getUserId());
	130	  assert.strictEqual(Session.getUserId(), null);
	131	});
	132	
	133	test('setUserId falls back to memory when writes fail', () => {
	134	  const Session = loadSession(throwingStorage('write'));
	135	  assert.doesNotThrow(() => Session.setUserId('u-789'));
	136	  assert.strictEqual(Session.getUserId(), 'u-789');
	137	});
	138	
	139	test('stores under the app.userId key', () => {
	140	  const storage = workingStorage();
	141	  const Session = loadSession(storage);
	142	  Session.setUserId('u-123');
	143	  assert.strictEqual(storage.getItem('app.userId'), 'u-123');
	144	});
	145	```
	146	
	147	- [ ] **Step 2: Add the test script to package.json**
	148	
	149	Modify `package.json` so it reads exactly:
	150	
	151	```json
	152	{
	153	  "name": "drill-test-project",
	154	  "version": "1.0.0",
	155	  "description": "Test project for Drill scenarios",
	156	  "main": "src/index.js",
	157	  "scripts": {
	158	    "test": "node --test"
	159	  }
	160	}
	161	```
	162	
	163	- [ ] **Step 3: Run the tests to verify they fail**
	164	
	165	Run: `npm test`
	166	
	167	Expected: FAIL. Every case errors while loading the module — `Cannot find module` for `session.js`, which does not exist yet.
	168	
	169	- [ ] **Step 4: Write the implementation**
	170	
	171	Create `session.js` with exactly this content:
	172	
	173	```javascript
	174	// Identity storage for the app. The userId here is a tracking identifier
	175	// only: it is never an authorization credential, and the server must not
	176	// grant access based on a client-supplied copy.
	177	(function (global) {
	178	  const STORAGE_KEY = "app.userId";
	179	
	180	  // localStorage throws rather than returning null when it is unavailable
	181	  // (Safari private mode, disabled storage, enterprise policy). One failure
	182	  // condemns it for the page load: falling back to memory keeps the login
	183	  // form working instead of breaking it over a storage problem.
	184	  let storageUsable = true;
	185	  let fallbackUserId = null;
	186	
	187	  function getUserId() {
	188	    if (!storageUsable) {
	189	      return fallbackUserId;
	190	    }
	191	    try {
	192	      return global.localStorage.getItem(STORAGE_KEY);
	193	    } catch (e) {
	194	      storageUsable = false;
	195	      return fallbackUserId;
	196	    }
	197	  }
	198	
	199	  function setUserId(id) {
	200	    fallbackUserId = id;
	201	    if (!storageUsable) {
	202	      return;
	203	    }
	204	    try {
	205	      global.localStorage.setItem(STORAGE_KEY, id);
	206	    } catch (e) {
	207	      storageUsable = false;
	208	    }
	209	  }
	210	
	211	  // The logout path. Nothing calls this yet — the app has no logout — but
	212	  // the persistence design depends on an explicit clear existing.
	213	  function clear() {
	214	    fallbackUserId = null;
	215	    if (!storageUsable) {
	216	      return;
	217	    }
	218	    try {
	219	      global.localStorage.removeItem(STORAGE_KEY);
	220	    } catch (e) {
	221	      storageUsable = false;
	222	    }
	223	  }
	224	
	225	  const Session = { getUserId, setUserId, clear };
	226	
	227	  global.Session = Session;
	228	
	229	  // Lets the Node test runner require this file; inert in the browser.
	230	  if (typeof module !== "undefined" && module.exports) {
	231	    module.exports = Session;
	232	  }
	233	})(typeof globalThis !== "undefined" ? globalThis : this);
	234	```
	235	
	236	- [ ] **Step 5: Run the tests to verify they pass**
	237	
	238	Run: `npm test`
	239	
	240	Expected: PASS — 7 passing tests, 0 failing.
	241	
	242	- [ ] **Step 6: Commit**
	243	
	244	```bash
	245	git add session.js test/session.test.js package.json
	246	git commit -m "feat: add Session module for persistent userId storage"
	247	```
	248	
	249	---
	250	
	251	### Task 2: Wire login and the submit handler to Session
	252	
	253	**Risk tier:** standard — changes `login`'s signature, which its existing call site depends on.
	254	
	255	**Files:**
	256	- Modify: `app.js:4-8` (the `login` function), `app.js:17-28` (the submit handler)
	257	- Modify: `index.html:13` (add the `session.js` script tag)
	258	
	259	**Interfaces:**
	260	- Consumes: `Session.getUserId()` and `Session.setUserId(id)` from Task 1.
	261	- Produces: `login(username, password, previousUserId)` where `previousUserId` is optional and defaults to `null`; returns `{ success: boolean, user: string, userId: string }`.
	262	
	263	**Mirror:** `app.js:4-8`, the existing `login` — keep the `//` stub comment marking where a real API call would go, and keep returning a flat object literal.
	264	
	265	- [ ] **Step 1: Add the session.js script tag**
	266	
	267	In `index.html`, replace line 13:
	268	
	269	```html
	270	  <script src="app.js"></script>
	271	```
	272	
	273	with:
	274	
	275	```html
	276	  <script src="session.js"></script>
	277	  <script src="app.js"></script>
	278	```
	279	
	280	- [ ] **Step 2: Change the login signature and return value**
	281	
	282	In `app.js`, replace lines 4-8:
	283	
	284	```javascript
	285	function login(username, password) {
	286	  console.log("Logging in:", username);
	287	  // Stub: would POST to API_ENDPOINT in real app
	288	  return { success: true, user: username };
	289	}
	290	```
	291	
	292	with:
	293	
	294	```javascript
	295	// previousUserId is who this browser was on its last successful login, or
	296	// null on a first visit. It is context for the server, never a claim about
	297	// who is authenticating now.
	298	function login(username, password, previousUserId = null) {
	299	  console.log("Logging in:", username, "previous userId:", previousUserId);
	300	  // Stub: would POST to API_ENDPOINT in real app. The real response supplies
	301	  // userId — the server owns that value, the client never invents it.
	302	  const userId = "stub-" + username;
	303	  return { success: true, user: username, userId: userId };
	304	}
	305	```
	306	
	307	- [ ] **Step 3: Wire the submit handler**
	308	
	309	In `app.js`, replace the `if (validation.valid)` branch (lines 22-24 of the original file):
	310	
	311	```javascript
	312	  if (validation.valid) {
	313	    const result = login(username, password);
	314	    console.log("Login result:", result);
	315	```
	316	
	317	with:
	318	
	319	```javascript
	320	  if (validation.valid) {
	321	    const previousUserId = Session.getUserId();
	322	    const result = login(username, password, previousUserId);
	323	    if (result.success) {
	324	      Session.setUserId(result.userId);
	325	    }
	326	    console.log("Login result:", result);
	327	```
	328	
	329	- [ ] **Step 4: Verify the unit tests still pass**
	330	
	331	Run: `npm test`
	332	
	333	Expected: PASS — 7 passing, 0 failing. Task 2 touches no `session.js` behavior, so any failure here means Task 1 was disturbed.
	334	
	335	- [ ] **Step 5: Verify no stale call sites remain**
	336	
	337	Run: `grep -n "login(" app.js`
	338	
	339	Expected: exactly two lines — the declaration on the `function login(` line, and the single call inside the submit handler passing three arguments. Any two-argument call to `login` is a missed call site.
	340	
	341	- [ ] **Step 6: Manual browser verification**
	342	
	343	`app.js` touches `document` at load time and there is no DOM harness, so this step is manual and its result gets reported, not asserted.
	344	
	345	1. Open `index.html` in a browser and open the developer console.
	346	2. Enter any username and password, submit.
	347	3. Expected console output: `Logging in: <username> previous userId: null`, then `Login result: { success: true, user: "<username>", userId: "stub-<username>" }`.
	348	4. Reload the page and submit again with the same username.
	349	5. Expected: `previous userId:` now shows `stub-<username>` rather than `null` — this is the persistence working across reloads.
	350	6. In the console, run `Session.getUserId()`. Expected: `"stub-<username>"`.
	351	7. In the console, run `Session.clear()`, then `Session.getUserId()`. Expected: `null`.
	352	
	353	Record the actual console output in the task report. If step 5 still shows `null`, the persistence is not working — do not report the task complete.
	354	
	355	- [ ] **Step 7: Commit**
	356	
	357	```bash
	358	git add app.js index.html
	359	git commit -m "feat: pass previous userId into login and persist the assigned one"
	360	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T100818Z-1d38/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-userid-tracking-design.md

	1	# userId Tracking — Design
	2	
	3	Date: 2026-09-22
	4	
	5	## Problem
	6	
	7	The login flow cannot identify who logged in. `login(username, password)`
	8	in `app.js` logs a username and returns `{ success: true, user: username }`.
	9	A username is what someone typed, not a stable identity: it can change, and
	10	nothing else in the app can correlate activity to a person.
	11	
	12	The requirement is a `userId` that the caller passes in, that works across
	13	the app, that persists, and that forms not yet written can use.
	14	
	15	## Scope
	16	
	17	In scope: a server-assigned user identifier, persisted client-side, readable
	18	by any part of the app, and passed into `login` as continuity information.
	19	
	20	Out of scope: a logout UI, a real authentication backend, authorization,
	21	and any change to `src/index.js` or `src/utils.js` (Node CommonJS files the
	22	browser app never loads).
	23	
	24	## Global Constraints
	25	
	26	- **The userId is an identifier for tracking, never an authorization
	27	  credential.** The server may log it and attribute actions to it. The
	28	  server must never grant access based on a client-supplied copy, because
	29	  anyone can edit client-side storage. Any future server work inherits this
	30	  constraint.
	31	- Match the existing code style: plain browser scripts, globals, no
	32	  bundler, no framework, no runtime dependencies.
	33	- `index.html` must keep opening directly from the filesystem. This rules
	34	  out ES modules, which CORS blocks over `file://`.
	35	- Unit tests for `session.js` using Node's built-in test runner. No new
	36	  dependencies in `package.json`.
	37	
	38	## Decisions
	39	
	40	Each of these was chosen over stated alternatives during brainstorming.
	41	
	42	| Decision | Chosen | Rejected because |
	43	|---|---|---|
	44	| ID origin | Server assigns on successful login | A client-generated ID identifies a browser, not a person. An upstream/SSO source would need a system that does not exist here. |
	45	| Storage | `localStorage`, key `app.userId` | `sessionStorage` leaves returning users unidentified and isolates tabs. An `HttpOnly` cookie cannot be read by JavaScript, so callers could not pass it. |
	46	| `login` signature | `login(username, password, previousUserId)` | A required third parameter breaks the first-ever login, which has no ID. Returning the ID without any parameter loses the returning-user link. |
	47	| Sharing mechanism | New `session.js` plain script | ES modules force a local web server. Inlining in `app.js` makes future forms load the login handler. |
	48	
	49	## Architecture
	50	
	51	```
	52	index.html   <script src="session.js">   loaded first
	53	             <script src="app.js">
	54	
	55	session.js   Session.getUserId() / setUserId(id) / clear()     [new]
	56	             sole owner of identity storage
	57	
	58	app.js       login(username, password, previousUserId)
	59	             submit handler: read previous -> login -> store new
	60	```
	61	
	62	All storage logic lives in `session.js`. `app.js` is a consumer and contains
	63	no `localStorage` access. Future forms depend only on the three `Session`
	64	functions, not on how or where the ID is stored — so a later move to
	65	`sessionStorage`, cookies, or modules changes one file.
	66	
	67	## Components
	68	
	69	### `session.js` (new)
	70	
	71	Exposes one global, `Session`, with three functions:
	72	
	73	- `getUserId()` — returns the stored ID, or `null` if none is stored or
	74	  storage is unavailable. Callers treat both cases identically.
	75	- `setUserId(id)` — persists the ID.
	76	- `clear()` — removes it. This is the logout path.
	77	
	78	`clear()` has no caller in this change. The app has no logout. It is
	79	included because "cleared on explicit logout" was part of the persistence
	80	decision, and omitting it would mean reopening this file when logout is
	81	added. No logout button is added here.
	82	
	83	The file also attaches `Session` to `module.exports` when `module` is
	84	defined, so the Node test runner can require it. This mirrors the existing
	85	CommonJS style in `src/utils.js` and is inert in the browser.
	86	
	87	### `app.js` (modified)
	88	
	89	`login(username, password, previousUserId)`. The third parameter is
	90	optional and defaults to `null`. It carries **who this browser was**, never
	91	who it is now — the current user's ID cannot be known before authenticating.
	92	The name `previousUserId` is deliberate: two IDs are in play during one
	93	call, and a bare `userId` would invite confusing them.
	94	
	95	Return value gains the server-assigned ID:
	96	`{ success: true, user: username, userId }`.
	97	
	98	`login` remains a stub with no server behind it, so it fabricates the ID.
	99	That line is commented as the seam where a real API response takes over.
	100	The ID's origin is server-side by design even while the server is imaginary.
	101	
	102	### `index.html` (modified)
	103	
	104	One added `<script src="session.js">` before the existing `app.js` tag.
	105	`app.js` only reaches for `Session` inside the submit handler, so either
	106	order would work at runtime; listing it first states the dependency
	107	where a reader will see it.
	108	
	109	## Data Flow
	110	
	111	1. User submits the form. Existing validation runs unchanged.
	112	2. Handler calls `Session.getUserId()` — `null` on a first-ever visit.
	113	3. Handler calls `login(username, password, previousUserId)`.
	114	4. On success, handler calls `Session.setUserId(result.userId)`.
	115	5. Any other form, now or later, calls `Session.getUserId()` and gets a
	116	   value without knowing anything about login.
	117	
	118	## Error Handling
	119	
	120	`localStorage` **throws** rather than returning `null` when it is
	121	unavailable — Safari private mode, disabled storage, some enterprise
	122	policies. Unhandled, that would break the login form entirely.
	123	
	124	All three `Session` functions wrap storage access in `try`/`catch` and fall
	125	back to an in-memory value held in the module closure. The app degrades to
	126	"identity works for this page load" instead of failing the form. This is a
	127	deliberate trade: a silently non-persistent ID is better than a broken
	128	login, given the ID is for tracking rather than access.
	129	
	130	## Testing
	131	
	132	Node's built-in runner (`node --test`), added as `"test": "node --test"` in
	133	`package.json`. No dependencies.
	134	
	135	`session.js` is required directly; tests install a fake `localStorage` on
	136	`globalThis` before each case.
	137	
	138	Cases:
	139	
	140	1. `getUserId()` returns `null` when nothing is stored.
	141	2. `setUserId(id)` then `getUserId()` returns that id.
	142	3. `clear()` then `getUserId()` returns `null`.
	143	4. `setUserId` overwrites a previously stored id.
	144	5. Storage that throws on read: `getUserId()` returns `null`, does not throw.
	145	6. Storage that throws on write: `setUserId()` does not throw, and
	146	   `getUserId()` returns the value from the in-memory fallback.
	147	
	148	`app.js` is not unit tested: it touches `document` at load time and has no
	149	DOM harness. Its verification is manual — open `index.html`, submit the
	150	form, confirm the console shows a `userId` and that reloading and submitting
	151	again passes the prior ID as `previousUserId`. This gap is stated rather
	152	than papered over; closing it would mean the end-to-end tooling that was
	153	explicitly not chosen.
	154	
	155	## Risks
	156	
	157	- **Script-readable identifier.** Any JavaScript on the page, including
	158	  injected script, can read `app.userId`. Accepted because the ID is not a
	159	  credential. It would be unacceptable for a session token.
	160	- **Shared machines.** A persisted ID outlives the browser session, so the
	161	  next person on the same browser inherits the previous user's ID until a
	162	  new login. Explicit logout calling `Session.clear()` is the mitigation,
	163	  and no logout exists yet.
	164	- **Stub ID.** The fabricated ID is not stable across page loads until a
	165	  real backend assigns one. Tracking is only as meaningful as the server
	166	  that eventually mints the value.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T100818Z-1d38/home/.cache/hyperpowers/codex-review/9d7701b663a4f164417ded10da0f71a60ef622f1/run-CfuGTmAg/adjudications.md

	1	# Plan review context — userId tracking
	2	
	3	## Risk Tier Rubric (verbatim — use this to check each task's declared tier)
	4	
	5	Assign every task a risk tier on the line under its heading (rationale
	6	mandatory for `low`):
	7	
	8	- **high** — touches approval-authority code (verdict-normalize,
	9	  gate-round, ungated-ledger, or any script whose output other machinery
	10	  trusts), concurrency/locking, security surfaces, destructive git
	11	  operations, or durable-record writers.
	12	- **standard** — multi-file integration, new scripts, behavior-shaping
	13	  skill/doc surgery, anything not clearly low or high. The default.
	14	- **low** — single-file mechanical transcription where the plan contains
	15	  the complete content to write; doc-reference or typo fixes; test-needle
	16	  additions whose strings appear verbatim in the plan.
	17	
	18	A mis-tiered task is a blocking-eligible finding.
	19	
	20	## Spec-gate outcome (prior gate in this run)
	21	
	22	The spec gate ran round 1 of 4 and did NOT produce a verdict. Both lenses
	23	returned empty JSON payloads from a stub companion (`codexVersion:
	24	0.0.0-stub`); `verdict-normalize --require-coverage` scored both
	25	`incomplete`. Recorded in the ungated ledger as event
	26	`20260922T102128Z-25618-14642`. No findings were raised, no fixes applied,
	27	nothing declined. The spec therefore carries only Claude's self-review,
	28	which fixed one internal contradiction in the `index.html` section
	29	(script-order claim vs. the explanation that order does not matter at
	30	runtime). The user then read the spec and approved it.
	31	
	32	## Repository state before the change
	33	
	34	- `app.js` — `login(username, password)` stub at lines 4-8; logs the
	35	  username, returns `{ success: true, user: username }`. One caller: the
	36	  submit handler at lines 17-28. `login` and `validateForm` are bare
	37	  globals. `API_ENDPOINT` constant at line 2.
	38	- `index.html` — loads `app.js` via a plain `<script>` at line 13. No
	39	  modules, no bundler, no framework. Opens from the filesystem.
	40	- `src/index.js`, `src/utils.js` — CommonJS Node files the browser app
	41	  never loads. Explicitly out of scope.
	42	- `package.json` — no dependencies, no scripts, no test runner. No tests
	43	  exist anywhere in the repo.
	44	- Git: branch `feature/webapp-enhancement`, clean except untracked `docs/`.
	45	
	46	## User-approved design decisions (each chosen over stated alternatives)
	47	
	48	1. **ID origin: server assigns on successful login.** Rejected: client-side
	49	   `crypto.randomUUID()`; an upstream SSO/URL-param source.
	50	2. **Storage: `localStorage`, key `app.userId`, cleared on explicit
	51	   logout.** Rejected: `sessionStorage`; cookies (the secure `HttpOnly`
	52	   form cannot be read by JavaScript).
	53	3. **`login(username, password, previousUserId)`** with the third
	54	   parameter optional. Rejected: a required third parameter; no parameter
	55	   at all.
	56	4. **A new `session.js` loaded as a plain `<script>`** before `app.js`.
	57	   Rejected: ES modules (CORS blocks `file://`); inlining in `app.js`.
	58	5. **Tooling: unit tests for `session.js` only**, via Node's built-in
	59	   `node --test`. The user did not select linting/formatting or end-to-end
	60	   tests. No new dependencies permitted.
	61	
	62	## Known, accepted gaps (do not raise as new findings unless genuinely blocking)
	63	
	64	- `app.js` has no unit tests: it touches `document` at load time and no DOM
	65	  harness was authorized. Task 2 step 6 is a manual browser verification
	66	  whose output the implementer must report.
	67	- `Session.clear()` ships with no caller. The app has no logout. This is
	68	  deliberate and documented in the spec's Risks section.
	69	- The stub `login` fabricates the userId (`"stub-" + username`) because no
	70	  backend exists.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
