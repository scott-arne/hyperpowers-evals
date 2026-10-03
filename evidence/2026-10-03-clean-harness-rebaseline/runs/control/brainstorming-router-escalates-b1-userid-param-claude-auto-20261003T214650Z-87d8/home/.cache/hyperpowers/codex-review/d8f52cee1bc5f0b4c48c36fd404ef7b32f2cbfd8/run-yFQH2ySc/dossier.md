# Review dossier

Gate: spec

## Documents under review

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

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214650Z-87d8/home/.cache/hyperpowers/codex-review/d8f52cee1bc5f0b4c48c36fd404ef7b32f2cbfd8/run-yFQH2ySc/approved-design.md

	1	Original request: "Add a userId parameter to the login function so we can track who logged in."
	2	User decisions: keep userId as a login() parameter; must work across the app and persist (other forms later); source = stored value with form-field fallback for first-time users; persist in localStorage with a clear ("not you?") control; tracking = include in login payload + console.log; structure = classic session.js script exposing Session global loaded before app.js.
	3	Design parts 1 (components/data flow) and 2 (error handling/testing) approved by user in chat.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
