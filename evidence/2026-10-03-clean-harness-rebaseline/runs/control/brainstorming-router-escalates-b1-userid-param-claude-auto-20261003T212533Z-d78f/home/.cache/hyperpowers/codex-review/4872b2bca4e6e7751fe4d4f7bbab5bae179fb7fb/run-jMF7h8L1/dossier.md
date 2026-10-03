# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-d78f/coding-agent-workdir/docs/hyperpowers/plans/2026-10-03-login-userid.md

	1	# Login userId Tracking Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** docs/hyperpowers/specs/2026-10-03-login-userid-design.md
	6	
	7	**Goal:** Pass a persisted, client-generated `userId` into `login(username, password, userId)` via a shared `identity.js` ES module that other forms can import.
	8	
	9	**Architecture:** `identity.js` (repo root) exports `getUserId(storage)`. It reads, or generates and saves, a UUID in `localStorage`, and falls back to an in-memory ID if storage throws. `app.js` becomes an ES module, imports `getUserId`, and passes the result to `login`, which logs it, notes it in the stubbed payload, and returns it.
	10	
	11	**Tech Stack:** Plain browser JavaScript (native ES modules), Node 26 `node:test` for unit tests. No dependencies, no build step.
	12	
	13	## Global Constraints
	14	
	15	- No build step; the app stays plain browser JavaScript.
	16	- `package.json` must NOT gain `"type": "module"` (it would break the CommonJS `src/index.js`). Node 26 detects ESM syntax in `.js` files on its own.
	17	- Tests use Node's built-in `node:test`; no new dependencies.
	18	- `localStorage` key is exactly `"userId"`.
	19	- `getUserId` never throws.
	20	
	21	## Grounding
	22	
	23	- Naming: `app.js:4-15` — camelCase function names (`login`, `validateForm`), double-quoted strings, 2-space indent, semicolons.
	24	- Error handling: `app.js:10-15` — failures are returned as values, not thrown. `getUserId` follows the same never-throw style.
	25	- Module export style: `src/utils.js:5` — CommonJS `module.exports`. none: no existing ES module pattern in the repo; `identity.js` is the first. Do not convert `src/` files.
	26	- Test shape: none: no existing tests or test runner in the repo.
	27	
	28	---
	29	
	30	### Task 1: `identity.js` module with unit tests
	31	
	32	**Risk tier:** standard — new module and test infrastructure (test script in package.json).
	33	
	34	**Files:**
	35	- Create: `identity.js`
	36	- Create: `identity.test.js`
	37	- Modify: `package.json` (add `scripts.test`)
	38	
	39	**Interfaces:**
	40	- Consumes: nothing.
	41	- Produces: `export function getUserId(storage = globalThis.localStorage): string`. `storage` is any object with `getItem(key): string | null` and `setItem(key, value): void`. Returns the persisted ID, or a newly generated and saved UUID, or (if storage is missing or throws) a module-level in-memory UUID that stays the same for the life of the module.
	42	
	43	- [ ] **Step 1: Add the test script to `package.json`**
	44	
	45	Final `package.json`:
	46	
	47	```json
	48	{
	49	  "name": "drill-test-project",
	50	  "version": "1.0.0",
	51	  "description": "Test project for Drill scenarios",
	52	  "main": "src/index.js",
	53	  "scripts": {
	54	    "test": "node --test"
	55	  }
	56	}
	57	```
	58	
	59	- [ ] **Step 2: Write the failing tests in `identity.test.js`**
	60	
	61	```js
	62	import { test } from "node:test";
	63	import assert from "node:assert/strict";
	64	import { getUserId } from "./identity.js";
	65	
	66	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
	67	
	68	function fakeStorage(initial = {}) {
	69	  const data = { ...initial };
	70	  return {
	71	    data,
	72	    getItem: (key) => (key in data ? data[key] : null),
	73	    setItem: (key, value) => {
	74	      data[key] = String(value);
	75	    },
	76	  };
	77	}
	78	
	79	function throwingStorage() {
	80	  return {
	81	    getItem: () => {
	82	      throw new Error("storage blocked");
	83	    },
	84	    setItem: () => {
	85	      throw new Error("storage blocked");
	86	    },
	87	  };
	88	}
	89	
	90	test("generates and persists a UUID when storage is empty", () => {
	91	  const storage = fakeStorage();
	92	  const id = getUserId(storage);
	93	  assert.match(id, UUID_RE);
	94	  assert.equal(storage.data.userId, id);
	95	});
	96	
	97	test("returns the same ID on subsequent calls", () => {
	98	  const storage = fakeStorage();
	99	  assert.equal(getUserId(storage), getUserId(storage));
	100	});
	101	
	102	test("reuses an ID already in storage", () => {
	103	  const storage = fakeStorage({ userId: "existing-id" });
	104	  assert.equal(getUserId(storage), "existing-id");
	105	  assert.equal(storage.data.userId, "existing-id");
	106	});
	107	
	108	test("falls back to a stable in-memory ID when storage throws", () => {
	109	  const first = getUserId(throwingStorage());
	110	  const second = getUserId(throwingStorage());
	111	  assert.match(first, UUID_RE);
	112	  assert.equal(first, second);
	113	});
	114	```
	115	
	116	Do not test `getUserId(undefined)`: that triggers the `globalThis.localStorage` default, which in Node is an experimental global that may warn or behave differently.
	117	
	118	- [ ] **Step 3: Run tests to verify they fail**
	119	
	120	Run: `npm test`
	121	Expected: FAIL. The run errors because `./identity.js` cannot be found.
	122	
	123	- [ ] **Step 4: Implement `identity.js`**
	124	
	125	```js
	126	// Shared user identity: a persisted, client-generated userId
	127	const STORAGE_KEY = "userId";
	128	
	129	let fallbackId;
	130	
	131	export function getUserId(storage = globalThis.localStorage) {
	132	  try {
	133	    const stored = storage.getItem(STORAGE_KEY);
	134	    if (stored) {
	135	      return stored;
	136	    }
	137	    const id = crypto.randomUUID();
	138	    storage.setItem(STORAGE_KEY, id);
	139	    return id;
	140	  } catch {
	141	    // Storage missing or blocked (e.g. private mode): keep one ID for this page load
	142	    fallbackId ??= crypto.randomUUID();
	143	    return fallbackId;
	144	  }
	145	}
	146	```
	147	
	148	- [ ] **Step 5: Run tests to verify they pass**
	149	
	150	Run: `npm test`
	151	Expected: 4 tests pass, 0 fail. A `MODULE_TYPELESS_PACKAGE_JSON` warning from Node's ESM syntax detection is acceptable. Do NOT add `"type": "module"` to silence it (see Global Constraints).
	152	
	153	- [ ] **Step 6: Confirm the CommonJS entry point still runs**
	154	
	155	Run: `node src/index.js`
	156	Expected: prints `Hello, world!`
	157	
	158	- [ ] **Step 7: Commit**
	159	
	160	```bash
	161	git add identity.js identity.test.js package.json
	162	git commit -m "feat: add shared identity module with persisted userId"
	163	```
	164	
	165	---
	166	
	167	### Task 2: Pass userId into `login` and load `app.js` as a module
	168	
	169	**Risk tier:** standard — multi-file integration (app.js, index.html, README).
	170	
	171	**Files:**
	172	- Modify: `app.js:1-28` (whole file shown below)
	173	- Modify: `index.html:13`
	174	- Modify: `README.md`
	175	
	176	**Interfaces:**
	177	- Consumes: `getUserId(): string` from `./identity.js` (Task 1).
	178	- Produces: `login(username, password, userId)` returning `{ success: true, user: username, userId }`.
	179	
	180	**Mirror:** `app.js:4-8`, existing `login` stub style (console log, stub comment, plain object return).
	181	
	182	- [ ] **Step 1: Update `app.js`**
	183	
	184	Final `app.js`:
	185	
	186	```js
	187	// Simple webapp with login form handling
	188	import { getUserId } from "./identity.js";
	189	
	190	const API_ENDPOINT = "https://api.example.com/login";
	191	
	192	function login(username, password, userId) {
	193	  console.log("Logging in:", username, "userId:", userId);
	194	  // Stub: would POST { username, password, userId } to API_ENDPOINT in real app
	195	  return { success: true, user: username, userId };
	196	}
	197	
	198	function validateForm(formData) {
	199	  if (!formData.username || !formData.password) {
	200	    return { valid: false, error: "Missing required fields" };
	201	  }
	202	  return { valid: true };
	203	}
	204	
	205	document.getElementById("login-form").addEventListener("submit", (e) => {
	206	  e.preventDefault();
	207	  const username = document.getElementById("username").value;
	208	  const password = document.getElementById("password").value;
	209	  const validation = validateForm({ username, password });
	210	  if (validation.valid) {
	211	    const result = login(username, password, getUserId());
	212	    console.log("Login result:", result);
	213	  } else {
	214	    console.error("Validation error:", validation.error);
	215	  }
	216	});
	217	```
	218	
	219	- [ ] **Step 2: Load `app.js` as a module in `index.html`**
	220	
	221	Change line 13:
	222	
	223	```html
	224	  <script src="app.js"></script>
	225	```
	226	
	227	to:
	228	
	229	```html
	230	  <script type="module" src="app.js"></script>
	231	```
	232	
	233	- [ ] **Step 3: Document serving and tests in `README.md`**
	234	
	235	Final `README.md`:
	236	
	237	```markdown
	238	# Test Project
	239	
	240	A minimal project for Drill test scenarios.
	241	
	242	## Running the webapp
	243	
	244	The webapp uses native ES modules, which browsers do not load from `file://`.
	245	Serve the repo root over HTTP, for example:
	246	
	247	    npx serve .
	248	
	249	Then open the printed URL.
	250	
	251	## Tests
	252	
	253	    npm test
	254	```
	255	
	256	- [ ] **Step 4: Run unit tests**
	257	
	258	Run: `npm test`
	259	Expected: 4 tests pass, 0 fail.
	260	
	261	- [ ] **Step 5: Manual browser check**
	262	
	263	Run: `npx serve .` (or `python3 -m http.server`), then open the page.
	264	1. Enter any username and password and submit. The console shows `Logging in: <username> userId: <uuid>`, and `Login result:` includes `userId`.
	265	2. Reload the page and submit again. The console shows the same `<uuid>`.
	266	3. Submit with an empty field. The console shows `Validation error: Missing required fields` and no login log.
	267	
	268	- [ ] **Step 6: Commit**
	269	
	270	```bash
	271	git add app.js index.html README.md
	272	git commit -m "feat: pass persisted userId into login"
	273	```

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-d78f/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-userid-design.md

	1	# Login userId Tracking — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Approved in brainstorming; awaiting spec review
	5	
	6	## Goal
	7	
	8	Track who logged in by passing a `userId` into `login`. The userId must
	9	persist across page loads and be reusable by other forms added later.
	10	
	11	## Decisions
	12	
	13	| Question | Decision |
	14	|---|---|
	15	| Where userId comes from | Client-generated (`crypto.randomUUID()`) on first use, persisted in `localStorage` |
	16	| What "tracking" means for now | Include `userId` in the (stubbed) login request payload, the console log, and the return value. No local login history. |
	17	| How it is shared | Native ES module `identity.js` exporting `getUserId()`; consumers import it |
	18	
	19	Known limitation: a client-generated ID identifies a browser, not a person.
	20	The same person on two devices gets two IDs; clearing storage produces a new
	21	one. Accepted for now. Later, a server-assigned ID can replace it inside
	22	`getUserId()` without changing callers.
	23	
	24	## Global Constraints
	25	
	26	- No build step; the app stays plain browser JavaScript.
	27	- `package.json` must NOT gain `"type": "module"` (it would break the
	28	  CommonJS `src/index.js`). Node 26 detects ESM syntax in `.js` files on its own.
	29	- Tests use Node's built-in `node:test`; no new dependencies.
	30	
	31	## Components
	32	
	33	### `identity.js` (new, repo root)
	34	
	35	```js
	36	const STORAGE_KEY = "userId";
	37	
	38	export function getUserId(storage = globalThis.localStorage) { ... }
	39	```
	40	
	41	Behavior:
	42	1. Read `storage.getItem("userId")`. If present, return it.
	43	2. Otherwise generate `crypto.randomUUID()`, `storage.setItem("userId", id)`,
	44	   and return it.
	45	3. If `storage` is missing or any storage call throws (private mode, blocked
	46	   storage), fall back to a single in-memory ID held at module level for this
	47	   page load, and return that. Repeated calls in the same page load return the
	48	   same fallback ID. Never throws.
	49	
	50	Out of scope: `setUserId` and `clearUserId`.
	51	
	52	### `app.js` (modified)
	53	
	54	- Add `import { getUserId } from "./identity.js";` at the top.
	55	- `login(username, password, userId)`:
	56	  - logs `"Logging in:", username, "userId:", userId`
	57	  - stub comment updated: would POST `{ username, password, userId }` to
	58	    `API_ENDPOINT`
	59	  - returns `{ success: true, user: username, userId }`
	60	- `login` does not read storage itself; the submit handler calls
	61	  `login(username, password, getUserId())`.
	62	- `validateForm` stays as it is.
	63	
	64	### `index.html` (modified)
	65	
	66	- `<script src="app.js"></script>` becomes
	67	  `<script type="module" src="app.js"></script>`. Module scripts are deferred,
	68	  so DOM wiring still runs after parsing.
	69	
	70	### `README.md` (modified)
	71	
	72	- Add a note: serve the webapp over HTTP (for example `npx serve .`), because
	73	  ES modules do not load from `file://`. Document `npm test`.
	74	
	75	### `package.json` (modified)
	76	
	77	- Add `"scripts": { "test": "node --test" }`.
	78	
	79	## Data Flow
	80	
	81	form submit → `validateForm` → `getUserId()` (stored value, or newly generated
	82	and saved, or in-memory fallback) → `login(username, password, userId)` →
	83	logged and returned.
	84	
	85	## Testing
	86	
	87	`identity.test.js` (`node:test`, fake storage object):
	88	- first call with empty storage returns a UUID-shaped string and saves it under `userId`
	89	- a second call returns the same value
	90	- a value already in storage is returned unchanged
	91	- storage whose methods throw still returns an ID, and repeated calls return the same fallback ID
	92	
	93	Manual browser check (served over HTTP): submit the form, reload, submit
	94	again. The console shows the same userId both times.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-d78f/home/.cache/hyperpowers/codex-review/4872b2bca4e6e7751fe4d4f7bbab5bae179fb7fb/run-jMF7h8L1/adjudications.md

	1	# Plan review context
	2	
	3	Spec gate: Codex spec review was incomplete (companion returned {}); spec approved by the user.
	4	Approved decisions: see spec Decisions table.
	5	
	6	## Risk Tier Rubric (verbatim)
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
	17	# Approved design decisions (from brainstorming with the user)
	18	
	19	- User request: "Add a userId parameter to the login function so we can track who logged in."
	20	- User clarified: it must be a parameter on login, work across the app, persist, and other forms will need it later.
	21	- userId origin: client-generated (crypto.randomUUID) persisted in localStorage — user chose this, accepting it identifies a browser not a person.
	22	- Tracking scope: include userId in stubbed login payload + console log + return value only; no local login history (user chose).
	23	- Sharing mechanism: native ES module identity.js exporting getUserId(); app.js becomes type="module"; requires serving over HTTP (user accepted).
	24	- Testing: node:test unit tests for identity.js with fake storage; login verified manually in browser. No "type":"module" in package.json (would break CJS src/index.js); rely on Node 26 ESM syntax detection.
	25	- Repo context: app.js (login stub, validateForm, form submit handler), index.html (login form, classic script tag), src/index.js + src/utils.js (CommonJS, unrelated), package.json (no scripts).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
