# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-8d07/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-tracking-id-design.md

	1	# Login Tracking ID — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved in chat, pending spec review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." The repo has no user identifier. `index.html` collects only a
	10	username and a password, and `login` in `app.js` is a stub that logs the
	11	username and returns a literal. There was nothing to pass as `userId`.
	12	
	13	Clarification established that the intended value is a **client-generated
	14	correlation ID** that persists across page loads, so that login attempts from
	15	the same browser can be linked — including first attempts and failed attempts,
	16	which occur before any account is known.
	17	
	18	## Decisions
	19	
	20	Each of these was decided explicitly; they are requirements, not inferences.
	21	
	22	| Decision | Choice | Rejected alternatives |
	23	|---|---|---|
	24	| What `userId` is | Client-generated correlation ID | The username (redundant); a server-returned database key (would be a return value, not a parameter) |
	25	| Lifetime | Persistent in `localStorage` | Ephemeral per-attempt |
	26	| Scope | Browser-scoped, with an explicit reset | Never-reset browser ID; account-scoped ID |
	27	| Storage unavailable | Pass explicit `null` | In-memory substitute ID; blocking the login attempt |
	28	| Code location | `src/tracking.js`, dual-mode module | Inline in `app.js`; separate browser-global file |
	29	| Tooling | `node --test`, zero dependencies | No tooling; ESLint + Prettier |
	30	| `crypto.randomUUID` unavailable | `Math.random` fallback | Return `null` |
	31	
	32	### Privacy posture
	33	
	34	A durable browser-scoped identifier sent with every login attempt is a tracking
	35	identifier. Two properties bound it deliberately:
	36	
	37	- **It resets.** `clearTrackingId()` exists so the identifier does not
	38	  accumulate history indefinitely. See the known gap below.
	39	- **It is never invented.** When storage is unavailable, the value is `null`.
	40	  No identifier is fabricated for users who have disabled storage, and no
	41	  ephemeral value is passed off as a durable one.
	42	
	43	The ID is written to the browser console by `login`'s existing log statement.
	44	This is acceptable for an opaque UUID and is called out so it is a known
	45	property rather than a surprise.
	46	
	47	## Architecture
	48	
	49	### New module: `src/tracking.js`
	50	
	51	Owns the identifier. Knows nothing about forms, authentication, or `login`.
	52	
	53	```js
	54	const STORAGE_KEY = "login.trackingId";
	55	
	56	function createTracker({ storage, generateId }) {
	57	  return {
	58	    getTrackingId() { /* ... */ },   // string | null
	59	    clearTrackingId() { /* ... */ }, // void
	60	  };
	61	}
	62	```
	63	
	64	A **factory** plus a **default instance** bound to the real `localStorage` and
	65	the real generator. `app.js` consumes the default instance; tests call the
	66	factory with injected stubs. This injection seam is what makes the storage
	67	failure paths testable.
	68	
	69	### Dual-mode export
	70	
	71	`app.js` is browser-global script code with no module system; `src/` is
	72	CommonJS. The module must serve both. The default instance is constructed once
	73	at module scope and its two methods are what both export paths expose:
	74	
	75	```js
	76	const defaultTracker = createTracker({
	77	  storage: resolveStorage(),   // null when localStorage access throws
	78	  generateId: defaultGenerateId,
	79	});
	80	const { getTrackingId, clearTrackingId } = defaultTracker;
	81	
	82	if (typeof module !== "undefined" && module.exports) {
	83	  module.exports = { createTracker, STORAGE_KEY, getTrackingId, clearTrackingId };
	84	} else {
	85	  globalThis.LoginTracking = { getTrackingId, clearTrackingId };
	86	}
	87	```
	88	
	89	`createTracker` must therefore accept a `storage` of `null` (the
	90	storage-unavailable case resolved at construction time) in addition to a
	91	storage object whose methods throw at call time. Both yield `null` from
	92	`getTrackingId()`. Because the methods are destructured off the instance, they
	93	must not depend on `this`.
	94	
	95	Public surface: `getTrackingId(): string | null` and `clearTrackingId(): void`.
	96	
	97	### ID generation
	98	
	99	Prefer `crypto.randomUUID()`. It is defined only in a secure context —
	100	`file://` qualifies in Chrome and Firefox, plain `http://` on a non-localhost
	101	host does not. When it is unavailable, fall back to a `Math.random`-based
	102	identifier and persist it normally.
	103	
	104	The fallback carries a comment stating that this value is a correlation ID and
	105	must never be used as a secret or for authorization. The risk being mitigated
	106	is not weak randomness — a correlation ID needs collision resistance, not
	107	unpredictability — but a future reader mistaking it for a token.
	108	
	109	## Data flow
	110	
	111	`index.html` loads the module before the app:
	112	
	113	```html
	114	<script src="src/tracking.js"></script>
	115	<script src="app.js"></script>
	116	```
	117	
	118	The submit handler, after validation passes:
	119	
	120	```js
	121	const userId = LoginTracking.getTrackingId();
	122	const result = login(username, password, userId);
	123	```
	124	
	125	`login` becomes:
	126	
	127	```js
	128	function login(username, password, userId = null) { /* ... */ }
	129	```
	130	
	131	The `= null` default is deliberate: a future call site that omits the argument
	132	receives the same honest `null` as a storage failure, keeping "no ID" a single
	133	value rather than splitting it across `null` and `undefined`.
	134	
	135	`login` adds `userId` to its returned object, so the existing
	136	`console.log("Login result:", result)` surfaces it without new logging code.
	137	
	138	## Error handling
	139	
	140	`getTrackingId()` and `clearTrackingId()` never throw and never block a login
	141	attempt.
	142	
	143	| Condition | Result |
	144	|---|---|
	145	| `localStorage` access throws at resolve time (disabled, private browsing) | `storage` is `null`; `getTrackingId()` returns `null` |
	146	| `storage` method throws at call time | `null` |
	147	| No stored value | generate, persist, return it |
	148	| `setItem` throws (quota exceeded) | `null` — not the unpersisted ID |
	149	| Stored value is empty or whitespace | treat as absent, regenerate |
	150	| `crypto.randomUUID` undefined | `Math.random` fallback, then persist |
	151	
	152	The quota row applies the same principle as the storage-unavailable decision: a
	153	generated-but-unpersisted ID would look durable without being durable, which is
	154	the failure mode that in-memory substitution was rejected for.
	155	
	156	## Testing
	157	
	158	`node --test` (built into Node 18+). `package.json` gains
	159	`"scripts": { "test": "node --test" }` and no dependencies.
	160	
	161	Tests in `src/tracking.test.js`, driving `createTracker` with stub storage:
	162	
	163	1. Empty storage: generates, persists, returns an ID
	164	2. Second call returns the same ID (durability guarantee)
	165	3. `getItem` throws: returns `null`
	166	4. `setItem` throws: returns `null`, nothing cached in memory
	167	5. `clearTrackingId()` removes the key; next call returns a different ID
	168	   (reset guarantee)
	169	6. Empty stored string is treated as absent
	170	7. Injected non-crypto generator still persists and round-trips
	171	8. `storage: null` at construction: `getTrackingId()` returns `null` and
	172	   `clearTrackingId()` is a no-op that does not throw
	173	
	174	**Untested, by decision:** the `index.html` script tag, script load order, and
	175	the `app.js` handler wiring. There is no DOM harness and jsdom is not being
	176	added for a fixture this size. These three are verified manually. The tested
	177	surface is `src/tracking.js`, which is where the durability, reset, and
	178	null-on-failure guarantees live.
	179	
	180	## Known gaps
	181	
	182	- **`clearTrackingId()` has no caller.** The app has no logout. Adding one is
	183	  out of scope. The reset path must be wired when a logout is introduced;
	184	  until then the identifier is reset-capable but never actually reset.
	185	- **Script load order is uncoupled.** `index.html` must load
	186	  `src/tracking.js` before `app.js`. Reordering the tags breaks the feature
	187	  silently. Without a module system there is no way to enforce this.
	188	
	189	## Out of scope
	190	
	191	- Adding a logout control
	192	- Sending the ID to `API_ENDPOINT` (`login` remains a stub)
	193	- Consent gating for the tracking identifier
	194	- Linting and formatting tooling
	195	- Any change to `src/index.js` or `src/utils.js`


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-8d07/home/.cache/hyperpowers/codex-review/4d8919acb0cf673d91c55490ea32727a616ef855/run-7nrdfbxJ/adjudications.md

	1	# Approved design decisions (adjudications)
	2	
	3	Original user request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	The following were decided by the human partner during brainstorming and are
	8	**settled**. They are requirements for the spec, not open questions. Do not
	9	raise findings that merely re-litigate a decision listed here; do raise a
	10	finding if the spec is internally inconsistent with one of them.
	11	
	12	1. **What `userId` is:** a client-generated correlation ID. Explicitly NOT the
	13	   username, and explicitly NOT a server-returned database key.
	14	2. **Lifetime:** persistent across page loads, stored in `localStorage`.
	15	   Ephemeral per-attempt was offered and rejected.
	16	3. **Scope:** browser-scoped with an explicit reset. Account-scoped was
	17	   rejected (unavailable on first/failed attempts). Never-reset was rejected
	18	   (unbounded cross-account linking).
	19	4. **Storage unavailable:** pass explicit `null`. An in-memory substitute ID
	20	   was offered and rejected on the grounds that it looks durable without being
	21	   durable. Blocking the login attempt was rejected outright.
	22	5. **Code location:** approach C — `src/tracking.js` as a dual-mode module
	23	   (CommonJS export plus browser-global fallback) with injectable storage.
	24	   Inline-in-`app.js` and a plain browser-global file were both rejected
	25	   because neither is testable.
	26	6. **Tooling:** a unit test runner only — `node --test`, zero dependencies.
	27	   Lint/format tooling was explicitly declined.
	28	7. **`crypto.randomUUID` unavailable (insecure origin):** fall back to a
	29	   `Math.random`-based ID and persist it normally. Returning `null` in that
	30	   case was offered and rejected.
	31	8. **Sections 1 and 2 of the design** (module/API surface; integration, error
	32	   handling, testing) were each presented in chat and approved without
	33	   revision.
	34	
	35	Known scope boundaries the human partner accepted:
	36	
	37	- No logout control is being added, so `clearTrackingId()` will have no caller.
	38	- The `index.html` script tag, script load order, and `app.js` handler wiring
	39	  are manually verified only; no DOM harness is being added.
	40	
	41	Process note for the reviewer: an earlier Codex approach-gate call in this same
	42	brainstorm returned an empty payload, so no Codex-originated approaches are
	43	reflected in this spec.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
