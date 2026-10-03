# Review dossier

Gate: spec

## Documents under review

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

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213044Z-a0a1/home/.cache/hyperpowers/codex-review/aa5e3ce8533331dd6dfa9a8e7659899558ab7538/run-5uU5PeTZ/decisions.md

	1	# Approved design decisions (from chat with user, 2026-10-03)
	2	- User originally asked: "Add a userId parameter to the login function so we can track who logged in."
	3	- User chose: userId is an INPUT parameter to login() (over returning it from login or using username).
	4	- User: source should "work across the app and persist; other forms will need it later too."
	5	- User chose: userId is a client-generated tracking ID (not a backend account ID).
	6	- User chose: tracking = include in console log and returned result; real API POST is out of scope.
	7	- User approved: new classic script user-id.js exposing global getUserId(), localStorage persistence, in-memory fallback; Node built-in test runner tests.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
