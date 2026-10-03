# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214650Z-87d8/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-userid-login.md

	1	# userId on Login Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-10-03-userid-login-design.md`
	6	
	7	**Goal:** `login(username, password, userId)` sends and logs the userId, which persists in localStorage via a shared `Session` script that other forms can reuse.
	8	
	9	**Architecture:** New classic script `session.js` defines a `Session` global (the only code touching `localStorage`), loaded before `app.js`. `app.js` gains the `userId` parameter, validation, and DOM wiring that reads the stored ID or falls back to a new form field, saving it after a successful login. Both scripts end with a guarded `module.exports` so Node tests can load them.
	10	
	11	**Tech Stack:** Plain browser JavaScript (classic `<script>` tags, no build), Node v26 built-in `node:test` / `node:assert`.
	12	
	13	## Global Constraints
	14	
	15	- No build step, no bundler; scripts stay classic `<script src>` tags.
	16	- No new dependencies. Tests use Node's built-in `node:test`.
	17	- `session.js` is the only code that touches `localStorage`.
	18	- The password is never logged.
	19	
	20	## Grounding
	21	
	22	- Login stub shape (log + return object): `app.js:4-8`.
	23	- Error/result shape `{ valid: false, error: "Missing required fields" }`: `app.js:10-15`.
	24	- DOM wiring style (`getElementById`, submit handler, `console.log`/`console.error`): `app.js:17-28`.
	25	- Export pattern `module.exports = { ... }`: `src/utils.js:5`.
	26	- Naming: camelCase functions and `id` attributes in camelCase/kebab-case as in `index.html:8-10` (`login-form`, `username`).
	27	- Tests: `none: no existing test files or runner; this plan introduces node:test under test/`.
	28	- Note: Node v26 defines `globalThis.localStorage` as a configurable getter/setter; tests install fakes with `Object.defineProperty` rather than plain assignment.
	29	
	30	---
	31	
	32	### Task 1: `Session` storage module
	33	
	34	**Risk tier:** standard — new script plus new test infrastructure (`package.json` test script).
	35	
	36	**Files:**
	37	- Create: `session.js`
	38	- Create: `test/session.test.js`
	39	- Modify: `package.json` (add `scripts.test`)
	40	
	41	**Interfaces:**
	42	- Consumes: nothing.
	43	- Produces: global `Session` (browser) / `module.exports = Session` (Node) with
	44	  - `Session.getUserId(): string | null`
	45	  - `Session.setUserId(id: string): void`
	46	  - `Session.clearUserId(): void`
	47	  - storage key `"userId"`.
	48	
	49	**Mirror:** `src/utils.js:1-5` for function style and export line.
	50	
	51	- [ ] **Step 1: Add the test script to `package.json`**
	52	
	53	Replace the file with:
	54	
	55	```json
	56	{
	57	  "name": "drill-test-project",
	58	  "version": "1.0.0",
	59	  "description": "Test project for Drill scenarios",
	60	  "main": "src/index.js",
	61	  "scripts": {
	62	    "test": "node --test"
	63	  }
	64	}
	65	```
	66	
	67	- [ ] **Step 2: Write the failing tests** — create `test/session.test.js`:
	68	
	69	```js
	70	const test = require("node:test");
	71	const assert = require("node:assert");
	72	
	73	function installStorage(storage) {
	74	  Object.defineProperty(globalThis, "localStorage", {
	75	    value: storage,
	76	    configurable: true,
	77	    writable: true,
	78	  });
	79	}
	80	
	81	function fakeStorage() {
	82	  const data = new Map();
	83	  return {
	84	    getItem: (key) => (data.has(key) ? data.get(key) : null),
	85	    setItem: (key, value) => data.set(key, String(value)),
	86	    removeItem: (key) => data.delete(key),
	87	  };
	88	}
	89	
	90	function throwingStorage() {
	91	  const blocked = () => {
	92	    throw new Error("storage blocked");
	93	  };
	94	  return { getItem: blocked, setItem: blocked, removeItem: blocked };
	95	}
	96	
	97	const Session = require("../session.js");
	98	
	99	test.beforeEach(() => installStorage(fakeStorage()));
	100	
	101	test("getUserId returns null when nothing is stored", () => {
	102	  assert.strictEqual(Session.getUserId(), null);
	103	});
	104	
	105	test("setUserId stores a trimmed id that getUserId returns", () => {
	106	  Session.setUserId("  u-42  ");
	107	  assert.strictEqual(Session.getUserId(), "u-42");
	108	  assert.strictEqual(globalThis.localStorage.getItem("userId"), "u-42");
	109	});
	110	
	111	test("setUserId ignores empty and whitespace-only ids", () => {
	112	  Session.setUserId("u-1");
	113	  Session.setUserId("   ");
	114	  Session.setUserId("");
	115	  assert.strictEqual(Session.getUserId(), "u-1");
	116	});
	117	
	118	test("clearUserId removes the stored id", () => {
	119	  Session.setUserId("u-42");
	120	  Session.clearUserId();
	121	  assert.strictEqual(Session.getUserId(), null);
	122	});
	123	
	124	test("throwing storage degrades to nothing stored", () => {
	125	  installStorage(throwingStorage());
	126	  assert.strictEqual(Session.getUserId(), null);
	127	  assert.doesNotThrow(() => Session.setUserId("u-42"));
	128	  assert.doesNotThrow(() => Session.clearUserId());
	129	});
	130	```
	131	
	132	- [ ] **Step 3: Run tests to verify they fail**
	133	
	134	Run: `npm test`
	135	Expected: FAIL with `Cannot find module '../session.js'`.
	136	
	137	- [ ] **Step 4: Write the implementation** — create `session.js`:
	138	
	139	```js
	140	// Shared user-session state. Load this script before any script that uses `Session`.
	141	const Session = (() => {
	142	  const KEY = "userId";
	143	
	144	  function getUserId() {
	145	    try {
	146	      return globalThis.localStorage.getItem(KEY);
	147	    } catch (e) {
	148	      return null;
	149	    }
	150	  }
	151	
	152	  function setUserId(id) {
	153	    const trimmed = String(id ?? "").trim();
	154	    if (!trimmed) return;
	155	    try {
	156	      globalThis.localStorage.setItem(KEY, trimmed);
	157	    } catch (e) {
	158	      // Storage unavailable: the user will be asked for their ID again next time.
	159	    }
	160	  }
	161	
	162	  function clearUserId() {
	163	    try {
	164	      globalThis.localStorage.removeItem(KEY);
	165	    } catch (e) {
	166	      // Storage unavailable: nothing to clear.
	167	    }
	168	  }
	169	
	170	  return { getUserId, setUserId, clearUserId };
	171	})();
	172	
	173	if (typeof module !== "undefined") module.exports = Session;
	174	```
	175	
	176	- [ ] **Step 5: Run tests to verify they pass**
	177	
	178	Run: `npm test`
	179	Expected: PASS, 5 tests.
	180	
	181	- [ ] **Step 6: Commit**
	182	
	183	```bash
	184	git add package.json session.js test/session.test.js
	185	git commit -m "feat: add Session module for persisted userId"
	186	```
	187	
	188	---
	189	
	190	### Task 2: `login` takes `userId`; form reads/stores it
	191	
	192	**Risk tier:** standard — multi-file integration (`app.js`, `index.html`) with UI wiring.
	193	
	194	**Files:**
	195	- Modify: `app.js` (whole file, currently lines 1-28)
	196	- Modify: `index.html:8-13`
	197	- Create: `test/app.test.js`
	198	
	199	**Interfaces:**
	200	- Consumes: `Session.getUserId()`, `Session.setUserId(id)`, `Session.clearUserId()` from Task 1.
	201	- Produces:
	202	  - `login(username: string, password: string, userId: string): { success: boolean, user: string, userId: string }`
	203	  - `validateForm({ username, password, userId }): { valid: true } | { valid: false, error: "Missing required fields" }`
	204	  - Node export `module.exports = { login, validateForm }`.
	205	  - DOM ids: `userId-entry`, `userId`, `userId-known`, `userId-display`, `userId-clear`.
	206	
	207	**Mirror:** `app.js:4-28` for log/return shape, error shape, and handler style.
	208	
	209	- [ ] **Step 1: Write the failing tests** — create `test/app.test.js`:
	210	
	211	```js
	212	const test = require("node:test");
	213	const assert = require("node:assert");
	214	const { login, validateForm } = require("../app.js");
	215	
	216	test("validateForm accepts username, password, and userId", () => {
	217	  assert.deepStrictEqual(
	218	    validateForm({ username: "alice", password: "s3cret", userId: "u-42" }),
	219	    { valid: true }
	220	  );
	221	});
	222	
	223	test("validateForm rejects a missing userId", () => {
	224	  assert.deepStrictEqual(
	225	    validateForm({ username: "alice", password: "s3cret" }),
	226	    { valid: false, error: "Missing required fields" }
	227	  );
	228	});
	229	
	230	test("validateForm rejects a whitespace-only userId", () => {
	231	  assert.deepStrictEqual(
	232	    validateForm({ username: "alice", password: "s3cret", userId: "   " }),
	233	    { valid: false, error: "Missing required fields" }
	234	  );
	235	});
	236	
	237	test("login returns the userId and logs it without the password", (t) => {
	238	  const logs = [];
	239	  t.mock.method(console, "log", (...args) => logs.push(args.join(" ")));
	240	
	241	  const result = login("alice", "s3cret", "u-42");
	242	
	243	  assert.deepStrictEqual(result, { success: true, user: "alice", userId: "u-42" });
	244	  assert.ok(logs.some((line) => line.includes("u-42")), "userId is logged");
	245	  assert.ok(logs.every((line) => !line.includes("s3cret")), "password is never logged");
	246	});
	247	```
	248	
	249	- [ ] **Step 2: Run tests to verify they fail**
	250	
	251	Run: `npm test`
	252	Expected: FAIL — `app.js` throws `ReferenceError: document is not defined` on load.
	253	
	254	- [ ] **Step 3: Write the implementation** — replace `app.js` with:
	255	
	256	```js
	257	// Simple webapp with login form handling
	258	const API_ENDPOINT = "https://api.example.com/login";
	259	
	260	function login(username, password, userId) {
	261	  const payload = { username, password, userId };
	262	  console.log("Logging in:", username, "userId:", userId);
	263	  // Stub: would POST payload to API_ENDPOINT in real app
	264	  return { success: true, user: payload.username, userId: payload.userId };
	265	}
	266	
	267	function validateForm(formData) {
	268	  const required = ["username", "password", "userId"];
	269	  if (required.some((field) => !String(formData[field] ?? "").trim())) {
	270	    return { valid: false, error: "Missing required fields" };
	271	  }
	272	  return { valid: true };
	273	}
	274	
	275	if (typeof document !== "undefined") {
	276	  const userIdInput = document.getElementById("userId");
	277	  const userIdEntry = document.getElementById("userId-entry");
	278	  const userIdKnown = document.getElementById("userId-known");
	279	  const userIdDisplay = document.getElementById("userId-display");
	280	
	281	  const renderUserId = () => {
	282	    const storedId = Session.getUserId();
	283	    userIdEntry.hidden = storedId !== null;
	284	    userIdKnown.hidden = storedId === null;
	285	    userIdDisplay.textContent = storedId ?? "";
	286	  };
	287	
	288	  document.getElementById("userId-clear").addEventListener("click", (e) => {
	289	    e.preventDefault();
	290	    Session.clearUserId();
	291	    userIdInput.value = "";
	292	    renderUserId();
	293	  });
	294	
	295	  document.getElementById("login-form").addEventListener("submit", (e) => {
	296	    e.preventDefault();
	297	    const username = document.getElementById("username").value;
	298	    const password = document.getElementById("password").value;
	299	    const userId = Session.getUserId() ?? userIdInput.value.trim();
	300	    const validation = validateForm({ username, password, userId });
	301	    if (validation.valid) {
	302	      const result = login(username, password, userId);
	303	      console.log("Login result:", result);
	304	      if (result.success) {
	305	        Session.setUserId(userId);
	306	        renderUserId();
	307	      }
	308	    } else {
	309	      console.error("Validation error:", validation.error);
	310	    }
	311	  });
	312	
	313	  renderUserId();
	314	}
	315	
	316	if (typeof module !== "undefined") module.exports = { login, validateForm };
	317	```
	318	
	319	- [ ] **Step 4: Run tests to verify they pass**
	320	
	321	Run: `npm test`
	322	Expected: PASS, 9 tests (5 session + 4 app).
	323	
	324	- [ ] **Step 5: Update `index.html`** — replace lines 8-14 (form through script tag) with:
	325	
	326	```html
	327	  <form id="login-form">
	328	    <input type="text" id="username" placeholder="Username" />
	329	    <input type="password" id="password" placeholder="Password" />
	330	    <div id="userId-entry">
	331	      <input type="text" id="userId" placeholder="User ID" />
	332	    </div>
	333	    <div id="userId-known" hidden>
	334	      Logged in as <span id="userId-display"></span> — <a href="#" id="userId-clear">not you?</a>
	335	    </div>
	336	    <button type="submit">Log In</button>
	337	  </form>
	338	  <script src="session.js"></script>
	339	  <script src="app.js"></script>
	340	```
	341	
	342	- [ ] **Step 6: Manual browser check**
	343	
	344	Open `index.html` in a browser with DevTools open, then:
	345	1. Run `localStorage.clear()` in the console and reload → the "User ID" field is visible; "Logged in as" is hidden.
	346	2. Submit with username, password, and user ID `u-42` → console shows `Logging in: <username> userId: u-42` and the result object; no password in the console; the UI switches to "Logged in as u-42".
	347	3. Reload → field stays hidden, "Logged in as u-42" shown; submitting with username/password logs `userId: u-42`.
	348	4. Click "not you?" → field reappears, empty; `localStorage.getItem("userId")` is `null`.
	349	5. Submit with the user ID field empty → console shows `Validation error: Missing required fields`; nothing stored.
	350	
	351	- [ ] **Step 7: Run full test suite again**
	352	
	353	Run: `npm test`
	354	Expected: PASS, 9 tests.
	355	
	356	- [ ] **Step 8: Commit**
	357	
	358	```bash
	359	git add app.js index.html test/app.test.js
	360	git commit -m "feat: pass persisted userId to login for tracking"
	361	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214650Z-87d8/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-userid-login-design.md

	1	# userId on Login — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Approved in brainstorming; pending written-spec review
	5	
	6	## Goal
	7	
	8	Add a `userId` parameter to `login()` so the app can track who logged in. The
	9	userId must persist across visits and be available to other forms added later.
	10	
	11	## Decisions
	12	
	13	| Question | Decision |
	14	|---|---|
	15	| How does `login` get the userId? | As a third parameter: `login(username, password, userId)` |
	16	| Where does the caller get it? | Persisted storage; first-time users enter it in a new form field |
	17	| Where does it persist? | `localStorage`, key `userId`, with a "not you?" control to clear it |
	18	| What does "track" mean? | Include `userId` in the login request payload and `console.log` it |
	19	| Code structure | New classic script `session.js` exposing a `Session` global, loaded before `app.js` |
	20	
	21	## Global Constraints
	22	
	23	- No build step, no bundler; scripts stay classic `<script src>` tags.
	24	- No new dependencies. Tests use Node's built-in `node:test`.
	25	- `session.js` is the only code that touches `localStorage`.
	26	- The password is never logged.
	27	
	28	## Components
	29	
	30	### `session.js` (new)
	31	
	32	Classic script defining one global, `Session`. A header comment states that it
	33	must be loaded before any script that uses it.
	34	
	35	- `Session.getUserId()` → stored string, or `null` if absent or if
	36	  `localStorage` access throws.
	37	- `Session.setUserId(id)` → trims `id`; ignores empty or whitespace-only values;
	38	  otherwise writes it. Swallows storage errors.
	39	- `Session.clearUserId()` → removes the key. Swallows storage errors.
	40	
	41	Ends with `if (typeof module !== "undefined") module.exports = Session;` so Node
	42	tests can load it. `Session` reads `localStorage` from the global scope at call
	43	time, so tests can install a fake `globalThis.localStorage`.
	44	
	45	### `index.html`
	46	
	47	- Adds `<script src="session.js"></script>` before `app.js`.
	48	- Adds a container `#userId-entry` with `<input type="text" id="userId" placeholder="User ID" />`.
	49	- Adds a container `#userId-known` with `Logged in as <span id="userId-display"></span> — <a href="#" id="userId-clear">not you?</a>`.
	50	- Exactly one of the two containers is visible: `#userId-known` when an ID is
	51	  stored, `#userId-entry` otherwise (via the `hidden` attribute).
	52	
	53	### `app.js`
	54	
	55	- `login(username, password, userId)`:
	56	  - builds payload `{ username, password, userId }` for the eventual POST to
	57	    `API_ENDPOINT` (still a stub);
	58	  - logs `"Logging in:", username, "userId:", userId` (never the password);
	59	  - returns `{ success: true, user: username, userId }`.
	60	- `validateForm(formData)` requires `username`, `password`, and `userId`;
	61	  values are trimmed first, so whitespace-only counts as missing. Missing any
	62	  → `{ valid: false, error: "Missing required fields" }`.
	63	- DOM wiring runs only when `document` exists (guard so Node can load the file):
	64	  - on load, render the `userId` UI from `Session.getUserId()`;
	65	  - "not you?" click → `preventDefault`, `Session.clearUserId()`, re-render;
	66	  - submit → `userId = Session.getUserId() ?? userIdInput.value.trim()`;
	67	    validate; call `login(username, password, userId)`; on `success`, call
	68	    `Session.setUserId(userId)` and re-render.
	69	- Ends with guarded `module.exports = { login, validateForm }`.
	70	
	71	## Data Flow
	72	
	73	1. First visit: no stored ID → field shown → user enters ID → login succeeds →
	74	   ID saved → UI shows "Logged in as {id}".
	75	2. Later visits: stored ID → field hidden → stored ID passed to `login`.
	76	3. "Not you?": ID cleared → field shown again.
	77	
	78	## Error Handling
	79	
	80	- `localStorage` unavailable or throwing: `Session` degrades to "nothing stored";
	81	  the field appears every time; login still works.
	82	- Missing or whitespace-only `userId`: validation error, same message as other
	83	  missing fields.
	84	- Failed login: ID is not saved.
	85	- `session.js` loaded out of order: `ReferenceError` on `Session`; prevented by
	86	  documented load order, not by defensive code.
	87	
	88	## Testing
	89	
	90	- Add `"scripts": { "test": "node --test" }` to `package.json`.
	91	- `test/session.test.js`: get/set/clear against a fake `localStorage`; trimming
	92	  and empty-value rejection; throwing storage returns `null` / does not throw.
	93	- `test/app.test.js`: `validateForm` with and without `userId` (including
	94	  whitespace); `login` returns `userId`; `login` never logs the password
	95	  (capture `console.log`).
	96	- Manual browser check: first visit shows field; after login, reload shows
	97	  "Logged in as…"; "not you?" restores the field.
	98	
	99	## Out of Scope
	100	
	101	- Real network POST to `API_ENDPOINT` (remains a stub).
	102	- Server-side verification that `userId` matches the authenticated user.
	103	  Assumption: the backend will validate the client-supplied `userId`; validate
	104	  via backend owner before relying on it for audit.
	105	- Wiring other forms to `Session` (they will adopt it when built).


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214650Z-87d8/home/.cache/hyperpowers/codex-review/d8f52cee1bc5f0b4c48c36fd404ef7b32f2cbfd8/run-uX8szeVw/adjudications.md

	1	Spec gate: Codex review incomplete (empty output); spec approved by user.
	2	Risk Tier Rubric (verbatim):
	3	- **high** — touches approval-authority code (verdict-normalize, gate-round, ungated-ledger, or any script whose output other machinery trusts), concurrency/locking, security surfaces, destructive git operations, or durable-record writers.
	4	- **standard** — multi-file integration, new scripts, behavior-shaping skill/doc surgery, anything not clearly low or high. The default.
	5	- **low** — single-file mechanical transcription where the plan contains the complete content to write; doc-reference or typo fixes; test-needle additions whose strings appear verbatim in the plan.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
