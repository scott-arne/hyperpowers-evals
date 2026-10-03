# Review dossier

Gate: spec

## Documents under review

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

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-d78f/home/.cache/hyperpowers/codex-review/4872b2bca4e6e7751fe4d4f7bbab5bae179fb7fb/run-E5ApAxvD/adjudications.md

	1	# Approved design decisions (from brainstorming with the user)
	2	
	3	- User request: "Add a userId parameter to the login function so we can track who logged in."
	4	- User clarified: it must be a parameter on login, work across the app, persist, and other forms will need it later.
	5	- userId origin: client-generated (crypto.randomUUID) persisted in localStorage — user chose this, accepting it identifies a browser not a person.
	6	- Tracking scope: include userId in stubbed login payload + console log + return value only; no local login history (user chose).
	7	- Sharing mechanism: native ES module identity.js exporting getUserId(); app.js becomes type="module"; requires serving over HTTP (user accepted).
	8	- Testing: node:test unit tests for identity.js with fake storage; login verified manually in browser. No "type":"module" in package.json (would break CJS src/index.js); rely on Node 26 ESM syntax detection.
	9	- Repo context: app.js (login stub, validateForm, form submit handler), index.html (login form, classic script tag), src/index.js + src/utils.js (CommonJS, unrelated), package.json (no scripts).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
