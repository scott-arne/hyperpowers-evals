# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T223901Z-636f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-session-identity-design.md

	1	# Session Identity Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Investigation showed the request could not be taken
	10	literally: no `userId` exists anywhere in the repository, and the only caller
	11	of `login()` has no identifier to pass. Clarification established the real
	12	requirement — an identity, established at login, that persists across page
	13	loads and is readable by forms that do not exist yet.
	14	
	15	That is a shared subsystem rather than a parameter. This spec describes it.
	16	
	17	## Decisions
	18	
	19	Each of these was chosen by the human partner during brainstorming.
	20	
	21	| Decision | Choice | Rejected alternatives |
	22	|---|---|---|
	23	| What persists | A durable client-side identity (session) | Server-side audit trail of login events; both, staged |
	24	| Source of the id | Server-issued; the stub fabricates the response shape until `API_ENDPOINT` is real | Client-generated UUID; reuse `username` as the id |
	25	| Lifetime | `localStorage` — survives browser restart, shared across tabs | `sessionStorage`; `localStorage` with an expiry stamp |
	26	| Structure | Session store with an injected storage backend, plus the repo's first unit tests | A plain `Session` global; converting the app to ES modules |
	27	| `login()` async | Becomes `async` now, while there is a single caller | Stay synchronous and take the break later |
	28	| Tooling | Unit tests only (`node:test`) | Lint/format; end-to-end tests |
	29	
	30	## Scope
	31	
	32	In scope: `session.js` (new), `app.js`, `index.html`, `package.json`, and a
	33	unit test file.
	34	
	35	Explicitly out of scope:
	36	
	37	- **A logout control.** The app has none today. The design exposes `clear()`
	38	  so logout is a one-line wiring job later, but no UI is added. Consequence
	39	  of pairing this with `localStorage`: a stored identity persists until it is
	40	  cleared by hand.
	41	- **The real network call.** `API_ENDPOINT` stays unused; `login()` keeps a
	42	  stub body. Only its shape changes, so the body can be swapped without
	43	  touching callers.
	44	- **Converting the app to ES modules**, and any change to `src/`, which is an
	45	  unrelated CommonJS module not loaded by the page.
	46	
	47	## Architecture
	48	
	49	### `session.js` (new)
	50	
	51	A factory over an injected storage object:
	52	
	53	```js
	54	function createSession(storage) {
	55	  return { setUser, getUser, getUserId, clear };
	56	}
	57	```
	58	
	59	- **Storage key:** one key, `"app.session"`, holding JSON
	60	  `{ userId, username }`. A single key means a write cannot half-succeed and
	61	  leave a `userId` without its `username`.
	62	- **Injected storage:** production passes `window.localStorage`; tests pass a
	63	  plain object exposing `getItem`/`setItem`/`removeItem`. This seam is what
	64	  makes the module testable without a DOM, and it reduces a future
	65	  `localStorage` -> `sessionStorage` change to one call site.
	66	- **Where the instance is constructed:** `session.js` exposes only the
	67	  `createSession` factory and never references `window` or `localStorage`
	68	  itself. `app.js` owns the single instance:
	69	  `const session = createSession(window.localStorage);`. Keeping the browser
	70	  globals out of `session.js` is what lets the tests load it in Node without
	71	  a DOM.
	72	- **Dual export:** the file defines the `createSession` browser global *and*
	73	  `module.exports = { createSession }` under a
	74	  `typeof module !== "undefined"` guard. A classic `<script>` cannot be
	75	  `require`d, so without this the tests cannot reach the module. CommonJS
	76	  matches `src/`, keeping one module system in the repo.
	77	- **Read-through:** `getUserId()` reads storage on each call rather than
	78	  caching. A cached copy would go stale across tabs, defeating the reason
	79	  `localStorage` was chosen.
	80	
	81	### `app.js` (modified)
	82	
	83	- `login` becomes `async` and returns `{ success, user, userId }`. The stub
	84	  resolves immediately. When the endpoint becomes real, only the body
	85	  changes.
	86	- The submit handler becomes `async`, `await`s `login`, and on success calls
	87	  `session.setUser({ userId, username })`.
	88	- **`login()`'s parameter list does not change.** It remains
	89	  `login(username, password)`. The identifier flows out of the function, not
	90	  into it, because only the server knows it. This is the design's deliberate
	91	  departure from the original request's wording.
	92	
	93	### `index.html` (modified)
	94	
	95	Add `<script src="session.js"></script>` before `app.js`.
	96	
	97	### `package.json` (modified)
	98	
	99	Add `"scripts": { "test": "node --test" }`. No dependencies.
	100	
	101	## Data flow
	102	
	103	```
	104	submit -> validateForm -> await login(username, password)
	105	       -> { success: true, user, userId }
	106	       -> session.setUser({ userId, username })
	107	       -> localStorage["app.session"] = '{"userId":"...","username":"..."}'
	108	
	109	later form -> session.getUserId() -> "..."
	110	```
	111	
	112	## Error handling
	113	
	114	1. **Storage throws.** `localStorage` is not always writable: private
	115	   browsing modes have historically thrown on `setItem`, disabled site data
	116	   throws on access, and quota errors exist. Every storage call is wrapped;
	117	   on failure the session degrades to an in-memory object for the life of the
	118	   page and logs once. The app keeps working; the identity simply does not
	119	   survive a reload. Letting the error propagate would break login on a
	120	   browser setting the user chose.
	121	2. **Corrupt stored JSON.** `getUser()` parses inside a try/catch. A parse
	122	   failure clears the bad key and returns `null`, so one bad write cannot
	123	   wedge the app permanently.
	124	3. **Response carries no `userId`.** Write nothing and log a warning. A
	125	   stored `{ userId: undefined }` would make `getUserId()` return a value
	126	   that is falsy but present, which is an expensive class of bug.
	127	4. **`login()` rejects.** The handler wraps the `await` in try/catch, logs,
	128	   and writes no session.
	129	5. **`success: false`.** No session write. Only a successful login
	130	   establishes identity.
	131	
	132	## Reading contract
	133	
	134	`getUserId()` returns `string | null`. Never `undefined`, never throws.
	135	Callers branch on `null` for "nobody is logged in." The contract is
	136	deliberately boring so that forms written later need no knowledge of storage.
	137	
	138	## Testing
	139	
	140	Runner: `node:test` via `node --test`. No dependencies.
	141	
	142	Test double: a plain object over a `Map` implementing
	143	`getItem`/`setItem`/`removeItem`, plus a variant whose `setItem` throws, to
	144	drive the degradation path.
	145	
	146	| Test | Asserts |
	147	|---|---|
	148	| round-trip | `setUser` then `getUserId()` returns the id |
	149	| empty session | `getUserId()` on fresh storage returns `null` |
	150	| `clear()` | after clear, `getUserId()` is `null` and the key is removed |
	151	| corrupt JSON | bad stored value -> `getUserId()` is `null`, key cleared |
	152	| throwing storage | `setUser` does not throw; `getUserId()` still returns the id in-page |
	153	| missing userId | `setUser({ username })` writes nothing; `getUserId()` is `null` |
	154	| one key | only `"app.session"` is ever written |
	155	
	156	Written test-first; each test fails before its behavior exists.
	157	
	158	**Not covered:** the form submit path, the `await` in the handler, and
	159	`index.html` script ordering. These require a browser or a DOM harness, which
	160	was declined. `app.js` is kept as a thin wiring layer precisely so that what
	161	is untested is also trivial.
	162	
	163	## Assumptions
	164	
	165	- Assumption: the eventual `POST` to `API_ENDPOINT` will return a `userId`
	166	  field in its response body; validate via the endpoint's API contract once
	167	  it exists. If it returns a differently-named field, only the stub body and
	168	  one destructure change.
	169	- Assumption: forms added later run on the same origin, so they share the
	170	  `localStorage` partition; validate by confirming new pages are served from
	171	  the same origin as `index.html`.
	172	
	173	## Risks
	174	
	175	- The identity is client-side and therefore user-editable. It is suitable for
	176	  "which user is this" in the UI, and unsuitable for authorization decisions.
	177	  Anything security-sensitive must be decided server-side.
	178	- With no logout control and `localStorage` lifetime, a shared machine
	179	  retains the previous user's identity indefinitely.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T223901Z-636f/home/.cache/hyperpowers/codex-review/e7416a43ab6b3b1771acf90c046430bf23690c1c/run-SgK1DGmy/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	The request was escalated during brainstorming: bounded -> architectural, after
	8	the human partner said the identity "should work across the app and persist;
	9	other forms will need it later."
	10	
	11	Decisions the human partner explicitly approved, in order:
	12	
	13	1. **What persists:** a durable client-side identity (session), NOT a
	14	   server-side audit trail of login events, and not both staged.
	15	2. **Source of the id:** server-issued. `login()` returns it; the stub
	16	   fabricates that response shape until `API_ENDPOINT` is real. Rejected:
	17	   client-generated UUID; reusing `username` as the id.
	18	3. **Lifetime:** `localStorage` (persistent across browser restart, shared
	19	   across tabs). Rejected: `sessionStorage`; `localStorage` with an expiry
	20	   stamp.
	21	4. **Structure:** approach C — a session store with an injected storage
	22	   backend plus the repo's first unit tests. Rejected: approach A, a plain
	23	   `Session` global; approach B, converting the app to ES modules.
	24	5. **`login()` async:** becomes `async` now, while there is a single caller,
	25	   rather than taking the break later when `API_ENDPOINT` becomes real.
	26	6. **Tooling:** unit tests only (`node:test`). The human partner explicitly
	27	   declined lint/format and end-to-end tests.
	28	7. **Section 1 (architecture and components):** approved as presented,
	29	   including the explicitly out-of-scope logout control.
	30	8. **Section 2 (data flow and error handling):** approved as presented,
	31	   including the in-memory degradation on storage failure.
	32	9. **Section 3 (testing):** approved as presented, including the stated
	33	   coverage gap around the DOM submit path.
	34	
	35	Codebase facts the spec was written against:
	36	
	37	- Repo contains `README.md`, `app.js`, `index.html`, `package.json`,
	38	  `src/index.js`, `src/utils.js`. Branch `feature/webapp-enhancement`.
	39	- `package.json` has no dependencies, no devDependencies, no scripts.
	40	- `app.js` is a classic browser script (globals, no module system) loaded by
	41	  `index.html` via `<script src="app.js">` with no `type="module"`.
	42	- `login(username, password)` is synchronous, logs the username, and returns
	43	  `{ success: true, user: username }` from a stub body. `API_ENDPOINT` is
	44	  declared but unused. It has exactly one caller, `app.js` line 23.
	45	- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node module not
	46	  loaded by the page.
	47	- No session, storage, auth, routing, state-management, or logout code exists
	48	  anywhere in the repo.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
