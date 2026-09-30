# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-f6f1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-persistent-user-identity-design.md

	1	# Persistent User Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp needs to track who logged in. The request arrived as "add a
	9	`userId` parameter to the `login` function", but the identifier is
	10	server-issued, must persist across browser restarts, and will be consumed by
	11	forms that do not exist yet. That is shared identity state, not a function
	12	parameter.
	13	
	14	## Why `login()` gains no parameter
	15	
	16	`login(username, password)` is called from exactly one place, the submit
	17	handler in `app.js`, which holds only the username and password the user
	18	typed. Nothing in the repo produces a `userId` before login runs.
	19	
	20	Because the identifier is issued by the server, it flows *out* of `login`,
	21	not in. A `userId` parameter would require the caller to already know the
	22	answer `login` exists to provide. The signature is therefore unchanged; the
	23	identifier arrives in the return value and is persisted from there.
	24	
	25	## Decisions
	26	
	27	| Decision | Choice | Rationale |
	28	|---|---|---|
	29	| ID origin | Server-issued | Authoritative identity. A client-minted UUID identifies a browser, not a person, and is editable via devtools. |
	30	| Persistence | `localStorage` | Survives browser restarts and is shared across tabs, which is what "persists" requires here. |
	31	| Shedding the identity | `clearUserId()` ships with the change | `localStorage` outlives the visit, so on a shared machine the previous user's id is present at the next visit. The capability to clear must exist from the start, not be retrofitted. |
	32	| Stored contents | `userId` only | No password, no auth token. An identifier in `localStorage` is low-stakes; a credential there is a security decision with a much higher cost of being wrong. |
	33	| Code sharing | ES modules | Future consumers depend on this layer; implicit global load-order is where that turns into bugs. |
	34	| Module location | Repo root, not `src/` | `src/` is CommonJS Node code and `package.json` declares no `"type"`. An ES module there creates a module-system collision for no benefit. |
	35	| Tooling | `node:test` unit tests only | Preserves the repo's zero-dependency property. Linting rejected as not worth the first dependencies for ~60 lines. |
	36	
	37	## Architecture
	38	
	39	### New: `session.js` (repo root)
	40	
	41	Sole owner of persisted identity. Exports exactly:
	42	
	43	- `USER_ID_KEY` — the storage key constant, so no consumer hardcodes the string
	44	- `getUserId()` → stored id, or `null`
	45	- `setUserId(id)` → persists the id
	46	- `clearUserId()` → removes it
	47	
	48	Every `localStorage` access is wrapped in `try`/`catch` with an in-memory
	49	fallback. Safari private mode and storage-disabled browsers throw on access
	50	rather than returning `null`; an identity layer that propagates that
	51	exception would take the login flow down with it.
	52	
	53	`session.js` resolves `globalThis.localStorage` at call time rather than
	54	capturing a reference at import. This is a deliberate testability
	55	constraint: it is what lets a test substitute a throwing stub to exercise
	56	the fallback path.
	57	
	58	### Changed: `app.js`
	59	
	60	Becomes an ES module. Three changes:
	61	
	62	1. Imports `setUserId` from `session.js`.
	63	2. The stub `login()` returns `{ success, user, userId }`. The existing
	64	   `user` field is retained — the addition is purely additive and cannot
	65	   break an unseen reader. `userId` is marked in a comment as the field the
	66	   real API will supply.
	67	3. On successful login the submit handler calls `setUserId(result.userId)`
	68	   and logs the userId as the record of who logged in.
	69	
	70	### Changed: `index.html`
	71	
	72	One attribute: `<script type="module" src="app.js">`.
	73	
	74	**Consequence:** `type="module"` is fetched under CORS rules, so
	75	`index.html` no longer works when opened directly as a `file://` URL. The
	76	page must be served (e.g. `python3 -m http.server`). This was raised and
	77	accepted during design.
	78	
	79	### Not touched
	80	
	81	`src/index.js`, `src/utils.js`, `README.md`, `package.json` (no dependencies
	82	are added).
	83	
	84	## Error handling
	85	
	86	- **No `userId` in the login response:** nothing is stored, a warning is
	87	  logged. `login`'s success/failure reporting is unchanged.
	88	- **`localStorage` unavailable or throwing:** degrade to the in-memory
	89	  fallback silently.
	90	
	91	Neither case can break the form submission path.
	92	
	93	## Testing
	94	
	95	`node:test`, built in, zero dependencies, native ESM support. Coverage for
	96	`session.js`:
	97	
	98	- round-trip: `setUserId` then `getUserId` returns the id
	99	- empty: `getUserId` returns `null` when nothing is stored
	100	- clear: `clearUserId` removes a stored id
	101	- fallback: with a `localStorage` stub that throws, `setUserId` /
	102	  `getUserId` still round-trip in memory and no exception escapes
	103	
	104	Tests define `globalThis.localStorage` themselves, since Node does not
	105	provide one.
	106	
	107	## Out of scope
	108	
	109	- A logout button in the UI. `clearUserId()` ships; the button waits for an
	110	  actual logout flow to design.
	111	- Replacing the stub `login()` with a real `fetch` to `API_ENDPOINT`. The
	112	  response shape is designed so only the call itself changes later.
	113	- Storing a session or auth token. If that requirement arrives, the storage
	114	  boundary must be revisited before reusing this module — a credential does
	115	  not belong in the same low-stakes store as an identifier.
	116	- Linting and formatting infrastructure.
	117	- End-to-end and fuzz testing.
	118	
	119	## Assumptions
	120	
	121	- Assumption: the real login API will return a stable, server-issued user
	122	  identifier in its response body; validate via the API contract once the
	123	  backend exists.
	124	- Assumption: no consumer outside this repo reads `login()`'s return value
	125	  in a way that a purely additive field would disturb; validate via the
	126	  additive-only change itself, which is safe under either answer.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
