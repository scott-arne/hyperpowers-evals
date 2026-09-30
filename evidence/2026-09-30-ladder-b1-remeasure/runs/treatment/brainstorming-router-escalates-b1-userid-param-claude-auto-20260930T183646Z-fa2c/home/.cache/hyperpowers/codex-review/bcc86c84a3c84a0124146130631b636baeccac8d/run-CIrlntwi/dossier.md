# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183646Z-fa2c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-persistent-user-id-design.md

	1	# Persistent User ID — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	`login()` in `app.js` takes `username` and `password` and logs the username.
	9	There is no way to attribute a login to a stable identity, and no identity
	10	value exists anywhere in the app: the form collects only username and
	11	password, and the `login()` stub returns nothing that identifies a user.
	12	
	13	The requirement is a real user ID that works across the app, persists, and is
	14	available to forms that do not exist yet. That is an identity layer, not a
	15	parameter — there is currently no module, no storage, and no session handling
	16	for such a value to live in.
	17	
	18	## Scope
	19	
	20	In scope:
	21	
	22	- A shared identity module that mints, persists, and exposes a user ID.
	23	- A third `userId` parameter on `login()`, supplied by its caller.
	24	- Unit-test infrastructure, and tests for the identity module.
	25	
	26	Out of scope:
	27	
	28	- Server-side authentication. `login()` remains a stub; see Layering.
	29	- Any change to `src/index.js` or `src/utils.js`. They are an unrelated
	30	  CommonJS demo and stay as they are.
	31	- A logout flow. `clearUserId()` exists for a future one to call, but no UI
	32	  invokes it in this change.
	33	- New form fields. `userId` is not user input.
	34	
	35	## Decisions
	36	
	37	Each of these was chosen explicitly during brainstorming.
	38	
	39	| Decision | Choice | Why |
	40	|---|---|---|
	41	| ID authority | Browser-minted, layered for a future server ID | No backend is in scope, but the design must not need a rewrite when one arrives. |
	42	| Module wiring | Native ES modules, no build step | Makes per-form imports pleasant with zero dependencies. A bundler is not justified by one module. |
	43	| Persistence | `localStorage`, indefinite | Matches "persists"; survives restarts and is shared across tabs. |
	44	| Interface | Explicit `userId` parameter on `login()` | Keeps `login()` a pure function of its inputs, testable without browser storage. |
	45	| Tooling | Unit tests only | The mint-once and storage-failure paths are the real logic. Lint and e2e were declined. |
	46	
	47	## Architecture
	48	
	49	### New module: `identity.js`
	50	
	51	The only code in the app that knows where the ID is stored.
	52	
	53	```js
	54	export function getUserId()    // current ID; mints and persists on first call
	55	export function clearUserId()  // remove the stored ID
	56	```
	57	
	58	- Storage key: `webapp.userId`.
	59	- Value: `crypto.randomUUID()` prefixed with `anon-`, e.g.
	60	  `anon-9f1c...`.
	61	- `getUserId()` is idempotent: the second call in a page returns the same
	62	  value as the first, and a reload returns the value from storage rather than
	63	  minting a new one.
	64	
	65	The `anon-` prefix is a load-bearing convention, not decoration. It makes a
	66	browser-minted ID visibly distinguishable from a server-issued one so that no
	67	consumer, log, or future backend mistakes an unauthenticated identifier for an
	68	authenticated one.
	69	
	70	### Layering
	71	
	72	The indirection through `getUserId()` is what makes the anonymous ID
	73	replaceable. When server-side authentication is added:
	74	
	75	1. A `setUserId(id)` is added to `identity.js`, writing the server-issued ID
	76	   over the stored anonymous one.
	77	2. The authenticated login response calls it.
	78	3. Every consumer continues to call `getUserId()` and does not change.
	79	
	80	`setUserId()` is deliberately **not** implemented now. Nothing can call it
	81	until a backend exists, and the seam that makes it cheap to add is the module
	82	boundary, which this design already establishes.
	83	
	84	### Changes to `app.js`
	85	
	86	```js
	87	function login(username, password, userId) {
	88	  console.log("Logging in:", username, "userId:", userId);
	89	  return { success: true, user: username, userId };
	90	}
	91	```
	92	
	93	- The submit handler supplies the value:
	94	  `login(username, password, getUserId())`.
	95	- `app.js` gains `import { getUserId } from "./identity.js";`.
	96	- `validateForm` is unchanged. `userId` is not user input and is not form data
	97	  to validate.
	98	
	99	### Changes to `index.html`
	100	
	101	- `<script src="app.js">` becomes `<script src="app.js" type="module">`.
	102	- No new form fields.
	103	
	104	## Breaking changes
	105	
	106	`login()` gains a required third parameter. The single in-repo caller
	107	(`app.js`, submit handler) is updated in the same change, so nothing in this
	108	repository breaks.
	109	
	110	Assumption: no code outside this repository calls `login()`. Validate by
	111	confirming with the requester before implementation; the function is a
	112	browser-local stub with no exports, so external callers are unlikely.
	113	
	114	## Operational change
	115	
	116	ES modules do not load over the `file://` protocol. Opening the app becomes:
	117	
	118	```
	119	python3 -m http.server
	120	```
	121	
	122	then browsing to the served `index.html`, rather than double-clicking the
	123	file. This is a direct consequence of the module-wiring decision and is
	124	accepted.
	125	
	126	## Error handling
	127	
	128	`localStorage` access throws in Safari private browsing, when storage is
	129	disabled by policy, and on quota exhaustion.
	130	
	131	`getUserId()` catches these, falls back to an in-memory ID that lives for the
	132	page's lifetime, and emits a single `console.warn`. Login continues to work;
	133	only persistence degrades. The fallback ID uses the same `anon-` prefix, so
	134	consumers cannot tell the difference and do not need to.
	135	
	136	`clearUserId()` is likewise non-throwing: if storage is unavailable it clears
	137	the in-memory value and returns.
	138	
	139	## Testing
	140	
	141	The repository currently has no test runner, no dependencies, and no scripts.
	142	
	143	Runner: Node's built-in `node:test` with `node:assert`, run via
	144	`npm test` → `node --test`. This adds zero dependencies, which keeps the
	145	repository's existing zero-dependency posture, and it supports ES modules
	146	natively.
	147	
	148	`identity.js` reads `globalThis.localStorage`, so tests install a fake storage
	149	object on `globalThis` rather than requiring a DOM. Cases to cover:
	150	
	151	1. First call mints an ID, and it is prefixed `anon-`.
	152	2. Second call returns the same ID without minting a new one.
	153	3. With storage pre-populated before the first `getUserId()` call, the stored
	154	   ID is returned rather than a newly minted one.
	155	4. `clearUserId()` removes the value; the next `getUserId()` mints a new,
	156	   different one.
	157	5. When storage throws on read, `getUserId()` returns a usable ID and does not
	158	   propagate the error.
	159	6. When storage throws on write, `getUserId()` returns a usable ID and is
	160	   still idempotent within the page.
	161	
	162	`login()` is a stub with no logic worth testing beyond passing `userId`
	163	through to its return value; one test covers that.
	164	
	165	`app.js` wiring and `index.html` are not unit-tested. End-to-end testing was
	166	declined for this change.
	167	
	168	## Files touched
	169	
	170	| File | Change |
	171	|---|---|
	172	| `identity.js` | New. The identity module. |
	173	| `app.js` | `login()` signature, call site, import. |
	174	| `index.html` | `type="module"` on the script tag. |
	175	| `package.json` | Add `test` script. |
	176	| `test/identity.test.js` | New. Unit tests. |


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183646Z-fa2c/home/.cache/hyperpowers/codex-review/bcc86c84a3c84a0124146130631b636baeccac8d/run-CIrlntwi/approved-design-context.md

	1	# Approved design context — decisions made with the human partner
	2	
	3	Original user request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Clarification given by the user when asked where the userId value should come
	8	from:
	9	
	10	> It should be a real user ID that works across the app and persists; other
	11	> forms will need it later too.
	12	
	13	That answer upgraded the task from a bounded change to an architectural one:
	14	the repository has no identity layer, no storage, and no session handling.
	15	
	16	## Decisions explicitly approved by the user
	17	
	18	1. **ID authority — frontend-only, layered.** No backend is in scope. The
	19	   browser mints an anonymous persistent ID, designed so a server-issued real
	20	   ID can replace it later without rewriting consumers. The user rejected
	21	   "real backend auth", "frontend-only simple (no migration path)", and
	22	   "backend exists already".
	23	2. **Module wiring — native ES modules, no build step.** The user rejected a
	24	   `window` global and rejected adding a bundler. The user was told and
	25	   accepted that ES modules do not load over `file://`, so the app must be
	26	   served over http.
	27	3. **Persistence — `localStorage`, indefinite.** The user rejected
	28	   `sessionStorage` (per tab) and a cookie with an explicit expiry.
	29	4. **Tooling — unit tests only.** The user selected unit-test infrastructure
	30	   and did NOT select lint+format or end-to-end tests. The repository
	31	   currently has no test runner, no dependencies, and no scripts.
	32	5. **Design approved as presented**, including: an explicit third `userId`
	33	   parameter on `login()` rather than `login()` reading the module itself;
	34	   the `anon-` prefix convention as the layering seam; `setUserId()` left
	35	   unimplemented under YAGNI; `validateForm` untouched; no new form fields;
	36	   silent in-memory fallback plus one `console.warn` when `localStorage`
	37	   throws.
	38	
	39	## Repository facts the reviewer should not have to rediscover
	40	
	41	- `app.js` — browser script loaded by a bare `<script src>`; contains
	42	  `login(username, password)` (a stub that logs and returns
	43	  `{ success: true, user: username }`), `validateForm`, and a submit handler
	44	  that is the function's only caller.
	45	- `index.html` — a form with exactly two inputs, `username` and `password`.
	46	- `src/index.js` and `src/utils.js` — an unrelated CommonJS `greet()` demo,
	47	  disconnected from `app.js`. Explicitly out of scope.
	48	- `package.json` — no dependencies, no scripts, no test runner, no linter.
	49	- Node v26.10.0 is available on the host.
	50	- There is no backend and no authentication anywhere in the repository.
	51	
	52	## Known open point
	53	
	54	The spec records an assumption that no code outside this repository calls
	55	`login()`. It is a browser-local function with no exports.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
