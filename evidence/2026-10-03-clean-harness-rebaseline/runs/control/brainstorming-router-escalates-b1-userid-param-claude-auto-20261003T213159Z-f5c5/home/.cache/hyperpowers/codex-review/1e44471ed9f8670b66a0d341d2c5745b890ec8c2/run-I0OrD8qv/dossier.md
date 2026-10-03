# Review dossier

Gate: spec

## Documents under review

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

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213159Z-f5c5/home/.cache/hyperpowers/codex-review/1e44471ed9f8670b66a0d341d2c5745b890ec8c2/run-I0OrD8qv/approved-design.md

	1	# Approved design decisions (from user conversation, 2026-10-03)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User accepted recommendation: userId comes from login()'s (server/stub) result, not as a caller-supplied param; signature unchanged.
	4	- User: "It should work across the app and persist; other forms will need it later." -> reclassified architectural.
	5	- Persistence: localStorage, wrapped in a session module (setUser/getUser/clear).
	6	- Module format: browser ES modules (<script type="module">), no build step.
	7	- Tooling: unit tests via node:test only (no lint, no E2E).
	8	- Out of scope: logout UI, expiry, other forms.
	9	- Note: extraction of login() into auth.js was added during spec writing for testability; not yet explicitly approved by user.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
