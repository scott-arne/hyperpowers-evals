# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213515Z-bf9f/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-user-tracking-design.md

	1	# Login User Tracking — Design
	2	
	3	Date: 2026-10-03
	4	Status: Approved design, pending spec review
	5	
	6	## Goal
	7	
	8	Record who logged in, and make the logged-in user's `userId` available to
	9	other parts of the app (other forms, added later) for the lifetime of the
	10	browser tab.
	11	
	12	## Decisions
	13	
	14	- **Source of `userId`:** returned by `login()` (i.e. the server response),
	15	  not passed in by the caller. A client-supplied ID would be spoofable and
	16	  the client does not know the ID before authenticating.
	17	  `login(username, password)` keeps its current signature.
	18	- **Persistence:** `sessionStorage` — survives reloads, cleared when the tab
	19	  closes.
	20	- **Tracking scope:** store the current user, plus emit a login event.
	21	  No logout in this version.
	22	- **Packaging:** plain browser script exposing a single `Session` global,
	23	  loaded before `app.js`. No build step, no ES modules (they do not load over
	24	  `file://`).
	25	
	26	## Components
	27	
	28	### `session.js` (new, repo root next to `app.js`)
	29	
	30	Defines a global `Session` object:
	31	
	32	| Function | Behavior |
	33	|----------|----------|
	34	| `setUser({ userId, username })` | Writes `JSON.stringify({ userId, username })` to `sessionStorage` under key `"session.user"`. |
	35	| `getUser()` | Returns `{ userId, username }`, or `null` if the key is absent, the JSON is invalid, or storage throws. |
	36	| `getUserId()` | Returns `getUser()?.userId ?? null`. |
	37	| `recordLogin({ userId, username })` | Emits `{ type: "login", userId, username, timestamp }` where `timestamp` is an ISO-8601 string from `new Date().toISOString()`. Current sink: `console.log("Login event:", event)`, with a comment marking where a real tracking POST would go. Returns the event object (for testing). |
	38	
	39	At the bottom, a guard exports the object for Node tests without affecting
	40	the browser:
	41	
	42	```js
	43	if (typeof module !== "undefined" && module.exports) {
	44	  module.exports = Session;
	45	}
	46	```
	47	
	48	`Session` reads `sessionStorage` from the global scope at call time (not at
	49	load time), so tests can install an in-memory stand-in on `globalThis`
	50	before calling functions.
	51	
	52	### `app.js` (changed)
	53	
	54	- `login(username, password)` stub returns
	55	  `{ success: true, user: username, userId: "user-" + username }`.
	56	  The placeholder `userId` stands in for a server-issued ID.
	57	- In the submit handler, after `login()`: if `result.success` and
	58	  `result.userId` are truthy, call
	59	  `Session.setUser({ userId: result.userId, username: result.user })`
	60	  then `Session.recordLogin(...)` with the same object. Otherwise do not
	61	  touch the session.
	62	
	63	### `index.html` (changed)
	64	
	65	Add `<script src="session.js"></script>` immediately before
	66	`<script src="app.js"></script>`.
	67	
	68	## Data Flow
	69	
	70	submit → `validateForm` → `login()` → (stubbed server) returns `userId` →
	71	`Session.setUser` → `Session.recordLogin` → later consumers call
	72	`Session.getUserId()`.
	73	
	74	## Error Handling
	75	
	76	- `setUser`: wraps the storage write in `try/catch`; on failure logs with
	77	  `console.error` and returns without throwing. Login still succeeds —
	78	  tracking is best-effort.
	79	- `getUser`: returns `null` on missing key, invalid JSON, or storage throwing.
	80	- `recordLogin`: never throws; it does not depend on storage.
	81	- Failed login (`success: false`) or missing `userId`: no session write, no
	82	  event.
	83	
	84	## Testing
	85	
	86	- New `test/session.test.js` using `node:test` and `node:assert`, with an
	87	  in-memory `sessionStorage` stand-in installed on `globalThis` per test.
	88	- Cases:
	89	  1. `setUser` then `getUser` / `getUserId` round-trip.
	90	  2. Empty storage → `getUser()` and `getUserId()` return `null`.
	91	  3. Corrupted JSON under `"session.user"` → `getUser()` returns `null`.
	92	  4. Storage whose `setItem`/`getItem` throw → `setUser` does not throw;
	93	     `getUser` returns `null`.
	94	  5. `recordLogin` returns an event with `type: "login"`, the given
	95	     `userId`/`username`, and a valid ISO-8601 `timestamp`.
	96	- `package.json` gains `"scripts": { "test": "node --test" }`. No
	97	  dependencies added.
	98	- `app.js` DOM wiring is verified manually in a browser (submit form, check
	99	  console for the login event and `sessionStorage["session.user"]`). No DOM
	100	  test harness in this scope.
	101	
	102	## Out of Scope
	103	
	104	- `logout()` / clearing the session.
	105	- Real backend calls (login or tracking POST).
	106	- Converting the app to ES modules or adding a bundler.
	107	- Consuming `Session` from other forms (they do not exist yet).


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213515Z-bf9f/home/.cache/hyperpowers/codex-review/e255db239c1bb2b58ef7d6d4b13fc6fb26896c44/run-6MxiGSDK/approved-design.md

	1	# Approved design decisions (from user, 2026-10-03)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User: userId source is Claude's call; it must work across the app, persist, and other forms will need it later.
	4	- Chosen: userId comes from login() result (server-issued), not a caller-supplied parameter.
	5	- Persistence: sessionStorage (until tab closes).
	6	- Tracking scope: store current user + emit a stubbed login event. No logout.
	7	- Packaging: plain-script `Session` global in session.js loaded before app.js; no build, no ES modules.
	8	- Section 1 (components/data flow) and Section 2 (error handling/testing) approved by user.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
