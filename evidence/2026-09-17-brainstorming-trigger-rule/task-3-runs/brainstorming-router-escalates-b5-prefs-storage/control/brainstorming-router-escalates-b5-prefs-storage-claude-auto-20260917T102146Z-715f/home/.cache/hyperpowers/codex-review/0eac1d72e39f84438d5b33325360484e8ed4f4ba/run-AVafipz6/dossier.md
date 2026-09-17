# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T102146Z-715f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved in chat, pending spec review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The app has no way to remember anything between visits. `index.html` and
	10	`app.js` implement a login form whose `login()` is a stub; there is no
	11	storage, no settings, and no configuration module anywhere in the repo. Any
	12	future feature that wants to remember a user choice has nowhere to put it,
	13	and would invent its own `localStorage` key on the spot.
	14	
	15	This spec defines a preferences store: a small, generic key/value module that
	16	persists user settings in the browser across sessions, with an interface that
	17	can later be pointed at a server without changing its callers.
	18	
	19	## Scope
	20	
	21	In scope:
	22	
	23	- A generic, schema-free key/value preferences store with an async API.
	24	- A swappable storage-adapter seam, with a `localStorage` adapter and an
	25	  in-memory adapter.
	26	- Per-user namespacing, with an anonymous namespace before login.
	27	- Graceful degradation when browser storage is unavailable or full.
	28	- One real consumer: remembering the last username and pre-filling the login
	29	  field.
	30	- Unit-test infrastructure using Node's built-in test runner.
	31	
	32	Out of scope:
	33	
	34	- Any server-side or account-scoped storage. The adapter seam exists so this
	35	  can be added later; no backend work happens here.
	36	- Real authentication or session persistence. `login()` remains a stub.
	37	- A settings UI. Callers define their own preference keys as they need them.
	38	- Cross-tab change subscriptions or a reactive event bus.
	39	- Linting and formatting tooling (explicitly deferred).
	40	- Any change to `src/index.js` or `src/utils.js`, which are unrelated Node
	41	  code.
	42	
	43	## Decisions
	44	
	45	Each of the following was chosen explicitly during brainstorming; the
	46	rationale is recorded because the alternatives are all defensible.
	47	
	48	**Generic key/value store, no fixed schema.** The app has no settings today,
	49	so enumerating them would be guesswork. Callers own their own keys.
	50	
	51	**Device-scoped `localStorage`, behind an async interface.** The async
	52	signature is the expensive thing to retrofit — it changes every call site —
	53	so it is paid for now, while the adapter seam itself is small. Chosen over
	54	synchronous `localStorage` (cheaper today, costs a full call-site sweep
	55	later) and over a server backend (no backend, session, or auth exists).
	56	
	57	**Per-username namespaces, anonymous before login.** A server preferences
	58	API is inherently per-account, so a store with no identity would mismatch
	59	the adapter swap it was designed to enable. Also avoids users of a shared
	60	browser inheriting each other's settings.
	61	
	62	**One JSON document per namespace, not one key per preference.** A document
	63	gives whole-namespace reads in a single parse, an obvious versioning hook,
	64	and a shape that maps onto a future `GET`/`PATCH` API. Per-key storage was
	65	rejected because reading a whole namespace would mean prefix-scanning every
	66	key in `localStorage`. The document's known weakness — lost updates across
	67	tabs — is addressed by read-modify-write (below).
	68	
	69	**Never throw on environment failure; expose `isPersistent()`.** A theme
	70	that fails to save must not break a login form. The flag preserves the
	71	information so a UI can warn, without forcing every caller into a `catch`.
	72	
	73	**ES modules.** Native imports, no build step, and Node's test runner can
	74	import the same files the browser does. Accepted cost: `index.html` must be
	75	served over HTTP; opening it via `file://` no longer works.
	76	
	77	**Anonymous and logged-in preferences stay separate.** Auto-merging on login
	78	requires a conflict policy with no evidence behind it. `all()` plus `set()`
	79	makes a caller-side merge simple if one is ever wanted.
	80	
	81	## Architecture
	82	
	83	Three new files, browser-only:
	84	
	85	| File | Responsibility |
	86	|---|---|
	87	| `src/prefs/store.js` | Public API, namespacing, defaults, read-modify-write, versioning, adapter selection and fallback |
	88	| `src/prefs/local-storage-adapter.js` | Serialize to and from `window.localStorage`; detect unusable storage |
	89	| `src/prefs/memory-adapter.js` | Per-page in-memory storage; the degraded fallback and the test double |
	90	
	91	Plus `src/prefs/package.json` containing exactly `{"type": "module"}`. This
	92	scopes ESM to this directory so Node parses these files as modules, without
	93	adding a top-level `"type": "module"` that would break the CommonJS
	94	`src/index.js` and `src/utils.js`.
	95	
	96	### Adapter interface
	97	
	98	The entire contract a future backend must satisfy:
	99	
	100	```js
	101	{
	102	  async load(namespace) -> object | null,   // the stored document, or null
	103	  async save(namespace, doc) -> void
	104	}
	105	```
	106	
	107	Two methods suffice because the store always reads and writes whole
	108	documents. Both are async so a network-backed adapter needs no signature
	109	change.
	110	
	111	### Public API
	112	
	113	```js
	114	const prefs = createPreferences();            // selects the best available adapter
	115	const prefs = createPreferences({ adapter }); // or inject one (tests)
	116	prefs.setUser(username);             // null/omitted -> anonymous namespace
	117	await prefs.get(name, fallback);     // fallback returned when unset
	118	await prefs.set(name, value);
	119	await prefs.remove(name);
	120	await prefs.all();                   // whole namespace as a plain object
	121	prefs.isPersistent();                // false once degraded to memory
	122	```
	123	
	124	`isPersistent()` is synchronous: it describes the environment, not stored
	125	state, and a UI deciding whether to show a "settings won't be saved" warning
	126	should not have to await it.
	127	
	128	`createPreferences` takes an optional `{ adapter }`. When omitted it probes
	129	the environment and selects the `localStorage` or memory adapter; when
	130	supplied it uses that adapter as-is and skips the probe. This is how the
	131	tests drive the store without a browser.
	132	
	133	### Storage layout
	134	
	135	- Key: `prefs:anon`, or `prefs:user:<encodeURIComponent(username)>`. The
	136	  encoding prevents usernames containing `:` from colliding across
	137	  namespaces.
	138	- Value: `JSON.stringify({ v: 1, values: { … } })`.
	139	- The version lives in the document rather than the key so a future
	140	  migration can read old data and upgrade it in place.
	141	- Preference values are anything `JSON.stringify` round-trips.
	142	
	143	### Data flow
	144	
	145	`set(name, value)`:
	146	
	147	1. `adapter.load(namespace)` — re-read immediately before writing.
	148	2. Parse; on failure or `null`, start from an empty document.
	149	3. Apply the change to `values`.
	150	4. `adapter.save(namespace, doc)`.
	151	
	152	Step 1 on every write is what makes the document layout safe across tabs.
	153	Without it, a tab holding a stale document erases changes another tab made
	154	in the meantime. Under `localStorage` the underlying read is synchronous, so
	155	the cost is negligible.
	156	
	157	`get(name, fallback)` loads the document and returns `values[name]` when the
	158	key is present, otherwise `fallback`. A stored value of `null` is a real
	159	value and is returned as-is; only an absent key yields the fallback.
	160	
	161	## Error handling
	162	
	163	The store distinguishes environment failures from programmer errors.
	164	
	165	**Environment failures never throw:**
	166	
	167	- *Storage unavailable* — at construction, the store writes, reads, and
	168	  deletes a sentinel key inside a `try`. If that throws (private mode,
	169	  storage disabled) or the API is missing, it uses the memory adapter and
	170	  `isPersistent()` returns `false`.
	171	- *Quota exceeded on write* — the store switches to the memory adapter for
	172	  the remainder of the page, `isPersistent()` becomes `false`, and the
	173	  operation still resolves. The value stays readable for this page; it will
	174	  not survive a reload.
	175	- *Corrupt document* — a parse failure is treated as an empty namespace with
	176	  a `console.warn`. The corrupt value is overwritten by the next write.
	177	
	178	**Programmer errors reject:** `set()` with `undefined`, a function, or a
	179	non-string/empty `name`. These are bugs in calling code; swallowing them
	180	would mean a value silently never persists with nothing to debug.
	181	
	182	**Version rules:** a document whose `v` is lower than the current version
	183	runs through migrations (none exist at v1). A document with an unrecognized
	184	or newer `v` is treated as empty, and the next write overwrites it.
	185	
	186	## Integration
	187	
	188	`app.js` changes in three places:
	189	
	190	1. Import `createPreferences` and construct the store at module scope.
	191	2. On page load, `await prefs.get('lastUsername', '')` and, when non-empty,
	192	   pre-fill `#username`.
	193	3. In the submit handler, after a successful `login()`, first
	194	   `await prefs.set('lastUsername', username)` — still in the anonymous
	195	   namespace — and only then `prefs.setUser(username)`. The order matters:
	196	   reversing it would write `lastUsername` into the per-user namespace,
	197	   where the login form cannot read it before the user has logged in.
	198	
	199	`index.html` changes in one place: `<script src="app.js">` becomes
	200	`<script type="module" src="app.js">`.
	201	
	202	`package.json` gains `"scripts": { "test": "node --test" }`. No
	203	dependencies are added.
	204	
	205	`src/index.js` and `src/utils.js` are not touched.
	206	
	207	The last username is written to the *anonymous* namespace, because it must
	208	be readable before anyone has logged in. This is intentional and is the one
	209	preference that is deliberately not per-user.
	210	
	211	## Testing
	212	
	213	Node's built-in `node:test` and `node:assert`, run with `npm test`. No
	214	dependencies, consistent with the repo's current zero-dependency state.
	215	
	216	Store logic, against the memory adapter (no browser needed):
	217	
	218	- `get` returns the fallback for an unset key, and a stored `null` as `null`.
	219	- `set` then `get` round-trips strings, numbers, booleans, arrays, objects.
	220	- `remove` deletes a key; `get` then returns the fallback.
	221	- `all` returns the whole namespace and reflects writes and removals.
	222	- Values written under one username are invisible under another and under
	223	  the anonymous namespace.
	224	- `setUser` switches namespaces without losing the previous one's values.
	225	- A concurrent-write simulation: mutate the document behind the store's back
	226	  between its load and save, and assert the foreign change survives — this
	227	  is the read-modify-write guarantee.
	228	- `set` rejects for `undefined`, a function, and an invalid name.
	229	- A document with an unrecognized `v` reads as empty.
	230	
	231	`localStorage` adapter, against a fake:
	232	
	233	- Round-trips a document through a minimal fake `localStorage`.
	234	- Writes under the expected key, including a username needing encoding.
	235	- A fake whose `setItem` throws a quota error causes fallback to memory,
	236	  `isPersistent() === false`, and no rejection.
	237	- A fake whose constructor probe throws selects the memory adapter from the
	238	  start.
	239	- Malformed JSON in storage reads as an empty namespace.
	240	
	241	Not covered by automated tests: real-browser reload behavior. Verified
	242	manually by serving the directory, logging in, reloading, and confirming the
	243	username pre-fills.
	244	
	245	## Known limitations
	246	
	247	- **Persistence is per logged-in session, not per reload.** The app has no
	248	  session persistence, so after a refresh the user is anonymous again and
	249	  sees the anonymous namespace until they log in again — at which point
	250	  their preferences reappear. Fixing this properly requires real auth, which
	251	  is out of scope.
	252	- **Preferences are device-scoped.** They do not follow a user to another
	253	  browser or machine until a server adapter exists.
	254	- **`localStorage` is readable by any script on the origin.** Nothing
	255	  secret belongs in preferences; this store must never hold credentials or
	256	  tokens.
	257	- **`file://` no longer works** for opening `index.html`, a consequence of
	258	  ES modules. Any static server works.
	259	
	260	## Assumptions
	261	
	262	- Assumption: the target browsers support ES modules and `localStorage`
	263	  natively (no transpilation or polyfill expected). Validate by confirming
	264	  the intended browser support baseline with the project owner before
	265	  release; the fallback path already covers `localStorage` being absent.
	266	- Assumption: no future requirement will need preferences larger than the
	267	  ~5MB `localStorage` origin budget. Validate by reviewing when the first
	268	  large preference value is proposed; the quota path degrades safely in the
	269	  meantime.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
