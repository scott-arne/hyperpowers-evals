# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180728Z-4d47/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-tracking-id-design.md

	1	# Persistent User Tracking Id — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved in chat, pending written review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The request was "add a `userId` parameter to the login function so we can
	10	track who logged in." Two facts made the literal change the wrong one.
	11	
	12	`login(username, password)` in `app.js` is called from exactly one place, the
	13	form submit handler, which holds only the two form field values. Nothing in
	14	the repository produces a `userId` for a caller to pass in, so a new parameter
	15	would have to be filled with an invented value at its only call site.
	16	
	17	More importantly, the identity is required to "work across the app and
	18	persist, and other forms will need it later." That is not a function
	19	parameter. It is a value that outlives a single call, survives page loads, and
	20	has consumers that do not exist yet — which means it needs an owner, a storage
	21	decision, and a stable interface for those future consumers to read.
	22	
	23	## Goals
	24	
	25	- A stable, opaque identifier for a browser, generated once and persisted
	26	  across logins and browser restarts.
	27	- Readable from anywhere in the app through one documented function, so forms
	28	  unrelated to login can use it without depending on login.
	29	- Present in log output so log lines can be correlated to a returning visitor.
	30	- Impossible for the tracking code to break the login flow.
	31	
	32	## Non-goals
	33	
	34	These are deliberately excluded. Each is a clean addition on top of the
	35	boundary described below, and none earns its keep yet.
	36	
	37	- **Authentication and access control.** The id is descriptive telemetry only.
	38	  It is client-generated and client-stored, so it is trivially forgeable and
	39	  must never gate what a user may see or do.
	40	- **Network transport.** Nothing is sent anywhere. The existing
	41	  `API_ENDPOINT` constant remains an unused stub.
	42	- **An analytics event layer.** No `track()` function, no event schema, no
	43	  sink. Build it when there are real events and a real endpoint.
	44	- **Per-login session ids, logout, or id rotation.** A per-login id can be
	45	  added later as a second field without invalidating anything recorded under
	46	  this one.
	47	- **Changes to `src/`.** `src/index.js` and `src/utils.js` are unrelated
	48	  CommonJS Node code. They are not touched.
	49	
	50	## Global constraints
	51	
	52	- **Unit tests via `node --test`.** Node's built-in runner; no dependencies
	53	  added. The repository stays dependency-free.
	54	- **No linter or formatter.** Declined for now; match the existing file style
	55	  by hand (two-space indent, double-quoted strings, semicolons, as in
	56	  `app.js`).
	57	- **No end-to-end test infrastructure.** Declined as premature for a single
	58	  stub form.
	59	- Because Node unit tests must import the module, and `package.json` has no
	60	  `"type"` field, new ES modules use the `.mjs` extension. Setting
	61	  `"type": "module"` instead would break the CommonJS files in `src/`, which
	62	  are out of scope.
	63	
	64	## Identity semantics
	65	
	66	The id answers "is this the same browser coming back," not "which login
	67	session is this" and not "which human is this."
	68	
	69	- **Opaque.** A UUID. It carries no username, no email, no PII.
	70	- **Stable.** Generated once on first use, then reused indefinitely.
	71	- **Per-browser.** Scoped to one browser profile on one device via
	72	  `localStorage`. Two people sharing a browser share an id; one person on two
	73	  devices has two. This is accepted: the alternative was storing the username,
	74	  which puts PII in storage and in every log line.
	75	- **Lazily created.** No id is generated for a visitor who never triggers a
	76	  call, so merely loading the page does not mint one.
	77	
	78	## Architecture
	79	
	80	### `tracking.mjs` (new, repository root)
	81	
	82	The single owner of the tracking identity and the only code that touches
	83	storage. It sits beside `app.js` in the browser layer rather than in `src/`,
	84	which is unrelated Node code.
	85	
	86	Public interface — one function:
	87	
	88	```js
	89	export function getUserId()
	90	```
	91	
	92	Returns the stable id. Safe to call any number of times from anywhere;
	93	repeated calls return the same value. Never throws.
	94	
	95	Internals:
	96	
	97	- A module-scope memo holds the resolved id. After the first call, later calls
	98	  return it without touching storage.
	99	- Storage key: `app.userId` in `localStorage`.
	100	- Resolution order on first call: memo, then a valid stored value, then
	101	  generate and attempt to persist.
	102	- Id generation: `crypto.randomUUID()`, falling back to hex derived from
	103	  `crypto.getRandomValues` when `randomUUID` is unavailable (it requires a
	104	  secure context, so plain `http://` on a LAN address lacks it).
	105	- Storage is reached through `globalThis.localStorage` rather than a captured
	106	  reference, so tests can substitute a fake before importing the module.
	107	
	108	### `app.js` (modified)
	109	
	110	`login()` keeps its existing signature. It obtains the id itself rather than
	111	receiving it, which is the point of the design: at the moment login runs, the
	112	caller has nothing authoritative to pass.
	113	
	114	```js
	115	import { getUserId } from "./tracking.mjs";
	116	
	117	function login(username, password) {
	118	  const userId = getUserId();
	119	  console.log("Logging in:", username, "userId:", userId);
	120	  // Stub: would POST to API_ENDPOINT in real app
	121	  return { success: true, user: username, userId };
	122	}
	123	```
	124	
	125	`validateForm` and the submit handler are unchanged. The handler's existing
	126	`console.log("Login result:", result)` now carries the id automatically,
	127	because it is a field of the returned object.
	128	
	129	Future forms call `getUserId()` directly. They do not read login's return
	130	value — a form unrelated to authentication should not have to know login
	131	exists.
	132	
	133	### `index.html` (modified)
	134	
	135	One attribute:
	136	
	137	```html
	138	<script src="app.js" type="module"></script>
	139	```
	140	
	141	The tag is already the last element in `<body>` and the form markup is parsed
	142	before it, so the deferred execution that `type="module"` implies changes
	143	nothing observable. Note that ES modules do not load over `file://`; viewing
	144	the page requires a local static server, as any module-based page does.
	145	
	146	### Data flow
	147	
	148	```
	149	form submit
	150	  -> validateForm
	151	  -> login(username, password)
	152	       -> getUserId()
	153	            -> memo hit
	154	            -> else read localStorage["app.userId"]
	155	            -> else generate UUID, write it back, memoize
	156	       -> console.log with userId
	157	       -> return { success, user, userId }
	158	  -> console.log("Login result:", result)
	159	```
	160	
	161	## Error handling
	162	
	163	The governing rule: **telemetry must never break login.** `getUserId()` has no
	164	failure mode that propagates to its caller. It always returns a usable string.
	165	
	166	| Condition | Behavior |
	167	|---|---|
	168	| `localStorage` read throws or is absent | Treat as no stored value; generate one. Wrapped in its own `try`/`catch`. |
	169	| `localStorage` write throws (quota, blocked site data, private mode) | Keep the generated id in the memo and continue. Wrapped separately from the read, because a read can succeed where a write fails. |
	170	| Write failed | Emit a one-time `console.warn` that the id could not be persisted. |
	171	| Stored value is not a non-empty string | Treat as absent and regenerate. |
	172	| `crypto.randomUUID` unavailable | Generate hex from `crypto.getRandomValues`. |
	173	
	174	When persistence fails, the id remains stable for the lifetime of the page but
	175	not across reloads. That degradation is announced rather than silent: without
	176	the warning, every reload would look like a new visitor and the "stable
	177	per-browser" numbers would quietly become meaningless. The warning fires once
	178	per page, not once per call.
	179	
	180	The id itself stays a bare UUID in every case. Tagging non-persistent ids with
	181	a marker prefix was considered and rejected — nothing parses these values yet,
	182	and a format decision baked into recorded log lines is expensive to reverse.
	183	
	184	## Testing
	185	
	186	`node --test`, with the suite in `test/tracking.test.mjs` and a `test` script
	187	added to `package.json`.
	188	
	189	Tests substitute a fake storage object on `globalThis.localStorage` before
	190	importing the module. Because the memo lives in module scope, a test that
	191	needs a fresh module state imports with a cache-busting query
	192	(`await import("../tracking.mjs?case=N")`, relative to `test/`); this also
	193	serves as the simulation of a page reload.
	194	
	195	Cases:
	196	
	197	1. Repeated calls within one module instance return the same id.
	198	2. A fresh module instance with a populated store returns the stored id —
	199	   the id survives a reload.
	200	3. A fresh module instance with an empty store generates an id and writes it
	201	   to the store.
	202	4. Two fresh module instances with independent empty stores produce different
	203	   ids.
	204	5. A store whose `getItem` throws still yields a usable id and does not throw.
	205	6. A store whose `setItem` throws still yields a usable id, does not throw,
	206	   and warns exactly once across repeated calls.
	207	7. A stored value that is an empty string is replaced by a freshly generated
	208	   id.
	209	8. Generated ids match the UUID shape.
	210	
	211	`app.js` is not unit tested: it wires directly to `document` at import time,
	212	and standing up a DOM harness for one stub form is not justified at this size.
	213	The `login()`-returns-`userId` behavior is verified by reading the code during
	214	review; if `app.js` later grows logic worth testing, extracting it from the
	215	DOM wiring is the prerequisite and a separate change.
	216	
	217	## Files touched
	218	
	219	| File | Change |
	220	|---|---|
	221	| `tracking.mjs` | New. Owns id generation, persistence, and the `getUserId()` interface. |
	222	| `app.js` | Add the import; `login()` resolves the id, logs it, and returns it. |
	223	| `index.html` | Add `type="module"` to the existing script tag. |
	224	| `test/tracking.test.mjs` | New. The eight cases above. |
	225	| `package.json` | Add a `scripts.test` entry invoking `node --test`. |
	226	
	227	`src/index.js`, `src/utils.js`, and `README.md` are untouched.
	228	
	229	## Risks and accepted tradeoffs
	230	
	231	- **A client-stored id is forgeable.** Accepted, because the id is telemetry
	232	  only. This is the single most important constraint to preserve: if a later
	233	  change makes an access decision based on this value, that change is a
	234	  security bug, not a feature.
	235	- **Clearing site data resets the id.** A returning visitor who clears storage
	236	  looks new. Inherent to client-side storage; no mitigation is in scope.
	237	- **`.mjs` must be served with a JavaScript MIME type.** Current static
	238	  servers do this; some older ones do not. The alternative — setting
	239	  `"type": "module"` — would break `src/`.
	240	- **Shared browsers conflate users.** Stated under Identity semantics and
	241	  accepted in exchange for storing no PII.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
