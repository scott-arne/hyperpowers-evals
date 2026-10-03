# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214114Z-fdaa/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-login-session.md

	1	# Login Session Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** docs/hyperpowers/specs/2026-10-03-login-session-design.md
	6	
	7	**Goal:** Track who logged in by returning a `userId` from `login()` and persisting the logged-in user in a reusable client-side session module.
	8	
	9	**Architecture:** A new ES module `session.js` is the sole owner of `localStorage` session state (`saveSession` / `getCurrentUser` / `clearSession`). `app.js` becomes an ES module that saves the session after a successful login and exports `logout()`. `index.html` loads `app.js` with `type="module"`.
	10	
	11	**Tech Stack:** Vanilla browser JavaScript (ES modules), `localStorage`, Node built-in test runner (`node --test`).
	12	
	13	## Global Constraints
	14	
	15	- Tests use Node's built-in runner (`node --test`), no dependencies.
	16	- No linting/formatting setup.
	17	- `package.json` keeps its current (CommonJS) type; `src/` is untouched.
	18	- The page must be served over HTTP (ES modules do not load from `file://`).
	19	- `login(username, password)` keeps its signature — no `userId` parameter.
	20	- Placeholder `userId` is `"user-" + username`, commented as a placeholder for the server-issued ID.
	21	- No logout button; `logout()` is exported only.
	22	
	23	## Grounding
	24	
	25	- Naming: `app.js:4-15` — camelCase function declarations (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
	26	- Result objects / error handling: `app.js:10-15` returns plain result objects (`{ valid: false, error: ... }`) rather than throwing; `app.js:26` reports problems with `console.error`.
	27	- Module exports: none: no existing ES-module pattern (`src/utils.js:5` uses CommonJS `module.exports`, which is the Node side and must not be imitated in browser code).
	28	- Test shape: none: no existing tests or test runner in the repo.
	29	
	30	Notes verified on local Node v26.10.0:
	31	- A `.mjs` file can `import` an ESM-syntax `.js` file without `"type": "module"` (module syntax detection).
	32	- Node defines `globalThis.localStorage` as a configurable getter with no setter; plain assignment throws in ESM. Tests MUST install the stub with `Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true })`.
	33	
	34	---
	35	
	36	### Task 1: Session module with tests
	37	
	38	**Risk tier:** standard — new module that other forms will depend on, plus test infrastructure.
	39	
	40	**Files:**
	41	- Create: `session.js`
	42	- Create: `test/session.test.mjs`
	43	- Modify: `package.json` (add `scripts.test`)
	44	
	45	**Interfaces:**
	46	- Consumes: nothing.
	47	- Produces (`session.js`, ES module named exports):
	48	  - `saveSession({ userId, username }) → boolean` — throws `Error("saveSession requires a userId")` if `userId` is falsy; returns `true` on success, `false` if storage throws.
	49	  - `getCurrentUser() → { userId: string, username: string, loggedInAt: string } | null`
	50	  - `clearSession() → void`
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
	70	Create `test/session.test.mjs`:
	71	
	72	```js
	73	import { test, beforeEach, afterEach, mock } from "node:test";
	74	import assert from "node:assert/strict";
	75	import { saveSession, getCurrentUser, clearSession } from "../session.js";
	76	
	77	function createStorage() {
	78	  const data = new Map();
	79	  return {
	80	    getItem: (key) => (data.has(key) ? data.get(key) : null),
	81	    setItem: (key, value) => data.set(key, String(value)),
	82	    removeItem: (key) => data.delete(key),
	83	  };
	84	}
	85	
	86	function installStorage(storage) {
	87	  // Node defines localStorage as a getter-only global; assignment would throw.
	88	  Object.defineProperty(globalThis, "localStorage", {
	89	    value: storage,
	90	    configurable: true,
	91	    writable: true,
	92	  });
	93	}
	94	
	95	beforeEach(() => {
	96	  installStorage(createStorage());
	97	  mock.method(console, "error", () => {});
	98	});
	99	
	100	afterEach(() => {
	101	  mock.restoreAll();
	102	});
	103	
	104	test("saveSession then getCurrentUser returns the saved user", () => {
	105	  assert.equal(saveSession({ userId: "user-alice", username: "alice" }), true);
	106	  const user = getCurrentUser();
	107	  assert.equal(user.userId, "user-alice");
	108	  assert.equal(user.username, "alice");
	109	  assert.equal(new Date(user.loggedInAt).toISOString(), user.loggedInAt);
	110	});
	111	
	112	test("getCurrentUser returns null when no session exists", () => {
	113	  assert.equal(getCurrentUser(), null);
	114	});
	115	
	116	test("getCurrentUser returns null on corrupt JSON", () => {
	117	  localStorage.setItem("session", "{not json");
	118	  assert.equal(getCurrentUser(), null);
	119	});
	120	
	121	test("getCurrentUser returns null when stored object lacks userId", () => {
	122	  localStorage.setItem("session", JSON.stringify({ username: "alice" }));
	123	  assert.equal(getCurrentUser(), null);
	124	});
	125	
	126	test("clearSession removes the session", () => {
	127	  saveSession({ userId: "user-alice", username: "alice" });
	128	  clearSession();
	129	  assert.equal(getCurrentUser(), null);
	130	});
	131	
	132	test("saveSession throws when userId is missing", () => {
	133	  assert.throws(() => saveSession({ username: "alice" }), /requires a userId/);
	134	});
	135	
	136	test("saveSession returns false when storage setItem throws", () => {
	137	  installStorage({
	138	    ...createStorage(),
	139	    setItem: () => {
	140	      throw new Error("QuotaExceededError");
	141	    },
	142	  });
	143	  assert.equal(saveSession({ userId: "user-alice", username: "alice" }), false);
	144	  assert.equal(console.error.mock.callCount(), 1);
	145	});
	146	
	147	test("getCurrentUser returns null when storage getItem throws", () => {
	148	  installStorage({
	149	    ...createStorage(),
	150	    getItem: () => {
	151	      throw new Error("SecurityError");
	152	    },
	153	  });
	154	  assert.equal(getCurrentUser(), null);
	155	});
	156	```
	157	
	158	- [ ] **Step 3: Run tests to verify they fail**
	159	
	160	Run: `npm test`
	161	Expected: FAIL — module not found for `../session.js`.
	162	
	163	- [ ] **Step 4: Write the implementation**
	164	
	165	Create `session.js`:
	166	
	167	```js
	168	// Client-side login session, persisted in localStorage until logout.
	169	const SESSION_KEY = "session";
	170	
	171	export function saveSession({ userId, username }) {
	172	  if (!userId) {
	173	    throw new Error("saveSession requires a userId");
	174	  }
	175	  const session = { userId, username, loggedInAt: new Date().toISOString() };
	176	  try {
	177	    globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	178	    return true;
	179	  } catch (err) {
	180	    console.error("Could not save session:", err);
	181	    return false;
	182	  }
	183	}
	184	
	185	export function getCurrentUser() {
	186	  try {
	187	    const raw = globalThis.localStorage.getItem(SESSION_KEY);
	188	    if (!raw) {
	189	      return null;
	190	    }
	191	    const session = JSON.parse(raw);
	192	    return session && session.userId ? session : null;
	193	  } catch {
	194	    return null;
	195	  }
	196	}
	197	
	198	export function clearSession() {
	199	  try {
	200	    globalThis.localStorage.removeItem(SESSION_KEY);
	201	  } catch (err) {
	202	    console.error("Could not clear session:", err);
	203	  }
	204	}
	205	```
	206	
	207	- [ ] **Step 5: Run tests to verify they pass**
	208	
	209	Run: `npm test`
	210	Expected: 8 tests pass, 0 fail.
	211	
	212	- [ ] **Step 6: Commit**
	213	
	214	```bash
	215	git add session.js test/session.test.mjs package.json
	216	git commit -m "feat: add localStorage-backed session module"
	217	```
	218	
	219	---
	220	
	221	### Task 2: Wire login to the session
	222	
	223	**Risk tier:** standard — multi-file integration (`app.js`, `index.html`) verified manually in a browser.
	224	
	225	**Files:**
	226	- Modify: `app.js:1-28` (whole file)
	227	- Modify: `index.html:13`
	228	
	229	**Interfaces:**
	230	- Consumes: `saveSession({ userId, username }) → boolean`, `clearSession() → void` from `./session.js` (Task 1).
	231	- Produces:
	232	  - `login(username, password) → { success: boolean, user: string, userId: string }` (module-private, unchanged signature)
	233	  - `export function logout() → void`
	234	
	235	**Mirror:** `app.js:4-8`, keep the existing stub style and comment voice.
	236	
	237	- [ ] **Step 1: Rewrite `app.js`**
	238	
	239	Replace the file contents with:
	240	
	241	```js
	242	// Simple webapp with login form handling
	243	import { saveSession, clearSession } from "./session.js";
	244	
	245	const API_ENDPOINT = "https://api.example.com/login";
	246	
	247	function login(username, password) {
	248	  console.log("Logging in:", username);
	249	  // Stub: would POST to API_ENDPOINT in real app.
	250	  // Placeholder userId until the server issues real IDs.
	251	  return { success: true, user: username, userId: "user-" + username };
	252	}
	253	
	254	export function logout() {
	255	  clearSession();
	256	}
	257	
	258	function validateForm(formData) {
	259	  if (!formData.username || !formData.password) {
	260	    return { valid: false, error: "Missing required fields" };
	261	  }
	262	  return { valid: true };
	263	}
	264	
	265	document.getElementById("login-form").addEventListener("submit", (e) => {
	266	  e.preventDefault();
	267	  const username = document.getElementById("username").value;
	268	  const password = document.getElementById("password").value;
	269	  const validation = validateForm({ username, password });
	270	  if (validation.valid) {
	271	    const result = login(username, password);
	272	    console.log("Login result:", result);
	273	    if (result.success) {
	274	      saveSession({ userId: result.userId, username: result.user });
	275	    }
	276	  } else {
	277	    console.error("Validation error:", validation.error);
	278	  }
	279	});
	280	```
	281	
	282	- [ ] **Step 2: Load `app.js` as a module**
	283	
	284	In `index.html`, change:
	285	
	286	```html
	287	  <script src="app.js"></script>
	288	```
	289	
	290	to:
	291	
	292	```html
	293	  <script type="module" src="app.js"></script>
	294	```
	295	
	296	- [ ] **Step 3: Syntax-check and re-run unit tests**
	297	
	298	Run: `node --check app.js && npm test`
	299	Expected: no syntax errors; 8 tests pass.
	300	
	301	- [ ] **Step 4: Manual browser verification**
	302	
	303	Run: `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`.
	304	1. Submit with username `alice`, password `x`.
	305	   Expected: console shows `Login result: {success: true, user: "alice", userId: "user-alice"}`; DevTools → Application → Local Storage shows key `session` with `{"userId":"user-alice","username":"alice","loggedInAt":"<ISO>"}`.
	306	2. Reload the page. Expected: `session` key still present.
	307	3. In the console run `(await import("./session.js")).getCurrentUser()`. Expected: the saved object.
	308	4. Run `(await import("./app.js")).logout()` then step 3 again. Expected: `null`.
	309	   (Re-importing `app.js` returns the cached module; it does not re-attach the listener.)
	310	5. Submit with an empty password. Expected: `Validation error: Missing required fields`; `session` unchanged.
	311	
	312	Stop the server afterwards.
	313	
	314	- [ ] **Step 5: Commit**
	315	
	316	```bash
	317	git add app.js index.html
	318	git commit -m "feat: return userId from login and persist session"
	319	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214114Z-fdaa/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-session-design.md

	1	# Login Session Design
	2	
	3	Date: 2026-10-03
	4	Status: Draft — awaiting user review
	5	
	6	## Goal
	7	
	8	Track who logged in, and make the logged-in user available across the app
	9	(persisting across reloads) so future forms can read it.
	10	
	11	## Decisions
	12	
	13	- **userId comes from the login result, not an input parameter.** The client
	14	  does not know a user's ID before authenticating; accepting it as input would
	15	  let any caller assert any identity. `login(username, password)` keeps its
	16	  signature and returns `userId`.
	17	- **Persistence is a client-side session** in `localStorage`, lasting until
	18	  logout. No server-side login history.
	19	- **Sharing is via an ES module** (`session.js`), loaded with
	20	  `<script type="module">`.
	21	- **Placeholder userId:** until a real API exists, the `login()` stub derives
	22	  `userId` as `"user-" + username`, marked with a comment as a placeholder for
	23	  the server-issued ID.
	24	- **No logout button** for now; `logout()` is exported for future use.
	25	
	26	## Global Constraints
	27	
	28	- Tests use Node's built-in runner (`node --test`), no dependencies.
	29	- No linting/formatting setup.
	30	- `package.json` keeps its current (CommonJS) type; `src/` is untouched.
	31	- The page must be served over HTTP (ES modules do not load from `file://`).
	32	
	33	## Components
	34	
	35	### `session.js` (new) — sole owner of session storage
	36	
	37	```js
	38	const SESSION_KEY = "session";
	39	
	40	export function saveSession({ userId, username })
	41	export function getCurrentUser()
	42	export function clearSession()
	43	```
	44	
	45	- Stored value: JSON `{ userId, username, loggedInAt }` under `SESSION_KEY`,
	46	  where `loggedInAt` is an ISO-8601 timestamp set at save time.
	47	- `saveSession`:
	48	  - throws `Error` if `userId` is missing (programming error);
	49	  - returns `true` on success;
	50	  - if `localStorage` throws (unavailable, quota), logs via `console.error`
	51	    and returns `false`.
	52	- `getCurrentUser`: returns the stored object, or `null` if the key is absent,
	53	  the JSON is invalid, the object lacks `userId`, or storage throws.
	54	- `clearSession`: removes the key; swallows storage errors (logs via
	55	  `console.error`).
	56	- No DOM dependencies; reads `globalThis.localStorage` at call time so tests
	57	  can supply a stub.
	58	
	59	### `app.js` (modified)
	60	
	61	- Becomes an ES module; imports `saveSession`, `clearSession` from
	62	  `./session.js`.
	63	- `login(username, password)` returns `{ success, user, userId }`.
	64	- Submit handler: on `result.success`, calls
	65	  `saveSession({ userId: result.userId, username: result.user })`. Nothing is
	66	  saved on failure.
	67	- `export function logout()` calls `clearSession()`.
	68	
	69	### `index.html` (modified)
	70	
	71	- `<script type="module" src="app.js"></script>`.
	72	
	73	## Data Flow
	74	
	75	1. Submit → `validateForm` → `login(username, password)` →
	76	   `{ success, user, userId }`.
	77	2. On success → `saveSession(...)` writes `{ userId, username, loggedInAt }`.
	78	3. Other forms: `import { getCurrentUser } from "./session.js"` → object or
	79	   `null`.
	80	
	81	## Testing
	82	
	83	`test/session.test.mjs`, run with `npm test` (`"test": "node --test"` added to
	84	`package.json` scripts). Uses an in-memory `localStorage` stub on `globalThis`.
	85	
	86	Cases:
	87	- save then `getCurrentUser` returns `userId`, `username`, and a valid ISO
	88	  `loggedInAt`;
	89	- `getCurrentUser` returns `null` when empty;
	90	- returns `null` on corrupt JSON;
	91	- returns `null` when the stored object lacks `userId`;
	92	- `clearSession` removes the session;
	93	- `saveSession` throws when `userId` is missing;
	94	- `saveSession` returns `false` (no throw) when storage `setItem` throws;
	95	- `getCurrentUser` returns `null` when storage `getItem` throws.
	96	
	97	The `app.js` submit flow is verified manually in a browser (no e2e harness).
	98	
	99	Assumption: Node imports the ESM-syntax `session.js` from a `.mjs` test without
	100	`"type": "module"` via module syntax detection (Node ≥ 22.12), validate via
	101	running `npm test` — confirmed working on local Node v26.10.0.
	102	
	103	## Out of Scope
	104	
	105	- Server-side login history / audit trail.
	106	- Logout button or other UI changes.
	107	- Real API integration and real user IDs.
	108	- Linting, formatting, e2e tests.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214114Z-fdaa/home/.cache/hyperpowers/codex-review/ad83d0235acd95d716c9540a62d2e4a28bc270bb/run-WGWLlT38/adjudications.md

	1	# Context for plan review
	2	Spec-gate: Codex review was INCOMPLETE (stub companion returned {}); spec approved by user.
	3	
	4	## Risk Tier Rubric (verbatim)
	5	- **high** — touches approval-authority code (verdict-normalize, gate-round, ungated-ledger, or any script whose output other machinery trusts), concurrency/locking, security surfaces, destructive git operations, or durable-record writers.
	6	- **standard** — multi-file integration, new scripts, behavior-shaping skill/doc surgery, anything not clearly low or high. The default.
	7	- **low** — single-file mechanical transcription where the plan contains the complete content to write; doc-reference or typo fixes; test-needle additions whose strings appear verbatim in the plan.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
