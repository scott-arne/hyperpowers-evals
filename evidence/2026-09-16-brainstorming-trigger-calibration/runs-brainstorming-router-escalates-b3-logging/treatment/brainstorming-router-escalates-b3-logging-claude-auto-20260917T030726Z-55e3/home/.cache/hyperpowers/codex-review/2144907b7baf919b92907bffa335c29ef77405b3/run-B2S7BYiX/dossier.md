# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T030726Z-55e3/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-16
	4	Status: approved design, not yet implemented
	5	Repository: drill-test-project, branch `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The application has no logging. It has scattered `console` calls that are
	10	visible only in the devtools of whoever happens to be looking, and only on code
	11	paths someone already anticipated. Production failures — a TypeError in an event
	12	handler, an unhandled promise rejection — produce nothing anyone will ever see.
	13	
	14	Two of the existing calls are also actively harmful. `app.js` logs the username
	15	in plaintext on every login attempt, and logs the whole login result object,
	16	which contains the username again.
	17	
	18	The goal is a logging subsystem that (a) covers every runtime the application
	19	runs in, (b) delivers browser-side records to a server so production failures
	20	are visible, (c) cannot leak credentials, and (d) captures failures nobody
	21	predicted.
	22	
	23	## Decisions
	24	
	25	Settled with the human partner during brainstorming:
	26	
	27	| Decision | Choice |
	28	|---|---|
	29	| Surface | Both runtimes — browser and Node — over a shared core |
	30	| Browser log destination | App-owned `POST` endpoint; console by default, remote enabled by config |
	31	| Redaction | Deny-by-default allowlist at the remote boundary |
	32	| Capture | Global error handlers plus converted explicit call sites |
	33	| Architecture | Pure shared core plus per-runtime adapters |
	34	| Error text on the wire | `errorName`, `errorMessage`, and `stack`, each truncated |
	35	| Send failure | One retry, then drop; nothing persisted on the user's device |
	36	| Tooling | Unit tests via `node:test`; no linter, no e2e, no property tests |
	37	
	38	## Global Constraints
	39	
	40	These apply to every task in the implementation plan.
	41	
	42	- **Zero runtime dependencies.** `package.json` currently has none. This change
	43	  adds none, in either `dependencies` or `devDependencies`.
	44	- **No build step and no bundler.** The browser loads plain `<script>` tags.
	45	- **No module-system migration.** `src/index.js` and `src/utils.js` stay
	46	  CommonJS; `app.js` stays a global script. Files that must work in both
	47	  runtimes use a dual-export footer (see "Dual-export footer").
	48	- **Tests use `node:test` and `node:assert` only**, run via `npm test`.
	49	- **Logging must never break the application.** Any failure inside the logging
	50	  subsystem is contained and swallowed at the boundary. A broken transport, an
	51	  unreachable endpoint, or a serialization error must not propagate into
	52	  application code. The one deliberate exception is Node's
	53	  `uncaughtException` handler (see "Capture").
	54	
	55	## Architecture
	56	
	57	Four files under `src/logger/`, with a strictly one-way dependency chain:
	58	
	59	```
	60	redact.js   (no dependencies)
	61	   ^
	62	core.js     (depends on redact)
	63	   ^
	64	browser.js / node.js   (depend on core; one is loaded per runtime)
	65	```
	66	
	67	That direction is the point of the design. It lets `redact.js` — the piece whose
	68	failure mode is a credential leak — be tested as a pure function with no DOM, no
	69	network, and no application.
	70	
	71	### `src/logger/redact.js`
	72	
	73	Exports `ALLOWED_CTX_FIELDS` and `redact(ctx)`.
	74	
	75	`redact` walks only the **top level** of `ctx` and keeps only keys present in
	76	the allowlist. Every other key is dropped regardless of its name.
	77	
	78	Initial allowlist: `action`, `component`, `code`, `status`, `field`,
	79	`durationMs`, `attempt`, `errorName`, `errorMessage`, `stack`.
	80	
	81	Value coercion:
	82	
	83	- Strings: truncated to 512 characters.
	84	- Numbers, booleans, `null`: passed through unchanged.
	85	- Everything else (objects, arrays, functions, symbols, `undefined`):
	86	  replaced with the literal `"[dropped:object]"`.
	87	
	88	Nested structures are **not** recursed into. This is deliberate: a recursive
	89	walk is exactly how a password at `formData.fields[2].value` would reach the
	90	wire under a key that looks innocuous. Deep context is not worth that risk.
	91	
	92	The count of dropped keys is written to `ctx._dropped` when it is non-zero, so
	93	the logs themselves show that redaction fired. Dropped key *names* are not
	94	recorded.
	95	
	96	### `src/logger/core.js`
	97	
	98	Exports `createLogger({ level, transports, runtime, session })`, returning an
	99	object with `debug`, `info`, `warn`, and `error` methods, each with the
	100	signature `(msg, ctx)`.
	101	
	102	Responsibilities, all pure apart from calling transports:
	103	
	104	1. Filter by configured level (`debug` < `info` < `warn` < `error`).
	105	2. Assemble the record (see "Record format").
	106	3. Pass the unredacted record to transports marked `local`, and the redacted
	107	   record to transports marked `remote`.
	108	4. Wrap every transport invocation so a throwing transport is caught and
	109	   discarded rather than propagating into the caller.
	110	
	111	Each transport is an object `{ scope, send }` where `scope` is the string
	112	`"local"` or `"remote"` and `send(record)` delivers it. `core.js` computes the
	113	redacted record at most once per log call, and only when at least one `remote`
	114	transport is registered.
	115	
	116	`core.js` references no globals: no `window`, no `document`, no `process`, no
	117	`fetch`. Anything runtime-specific arrives as a parameter.
	118	
	119	### `src/logger/browser.js`
	120	
	121	Exports `initLogger(config)` where `config` is
	122	`{ endpoint, level, remote, window: win, fetch: fetchImpl }` — the last two
	123	injectable so the adapter is testable without a DOM.
	124	
	125	Responsibilities: create or read the session ID, construct the console and HTTP
	126	transports, call `createLogger`, install the global error handlers, and return
	127	the logger. `remote` defaults to `false`, so the HTTP transport is inert until
	128	an endpoint is configured — the repository has no confirmed backend today.
	129	
	130	### `src/logger/node.js`
	131	
	132	Exports `initLogger(config)` with the same shape, reading defaults from
	133	`LOG_LEVEL` and `LOG_ENDPOINT` environment variables, installing the stdout
	134	transport and the `process` error handlers.
	135	
	136	### Dual-export footer
	137	
	138	Each of the four files ends with:
	139	
	140	```js
	141	if (typeof module !== "undefined" && module.exports) {
	142	  module.exports = { /* ... */ };
	143	} else {
	144	  window.AppLogger = Object.assign(window.AppLogger || {}, { /* ... */ });
	145	}
	146	```
	147	
	148	This is the entire compatibility mechanism. It is dated-looking but it is six
	149	lines, adds no dependency, and preserves `file://` loading of `index.html`,
	150	which native ESM would break.
	151	
	152	## Record Format
	153	
	154	Versioned from the first record, because the server will store and query these
	155	and the format is the expensive thing to change later.
	156	
	157	```json
	158	{
	159	  "v": 1,
	160	  "ts": "2026-09-16T21:04:18.412Z",
	161	  "level": "error",
	162	  "msg": "login request failed",
	163	  "runtime": "browser",
	164	  "session": "9f3c1a7e2b8d4506",
	165	  "ctx": { "action": "login", "code": "ETIMEDOUT" }
	166	}
	167	```
	168	
	169	- `v` — schema version, integer, currently `1`.
	170	- `ts` — ISO 8601 UTC timestamp.
	171	- `level` — one of `debug`, `info`, `warn`, `error`.
	172	- `msg` — **always a developer-authored string literal.** Never interpolated,
	173	  never containing variable data. This is a hard rule, not a convention: the
	174	  allowlist governs `ctx` only, so `log.error(\`login failed for ${username}\`)`
	175	  bypasses redaction entirely. Code review must reject template literals in
	176	  `msg`.
	177	- `runtime` — `"browser"` or `"node"`.
	178	- `session` — correlation ID (see below).
	179	- `ctx` — the only allowlist-governed field; all variable data goes here.
	180	
	181	### Session correlation
	182	
	183	A 16-hex-character random ID, generated via `crypto.getRandomValues` in the
	184	browser and `crypto.randomBytes` in Node, stored in `sessionStorage` on the
	185	browser side so a user's sequence of failures within a tab can be followed.
	186	
	187	It resets when the tab closes, is never sent to the login endpoint, and is never
	188	associated with a username. It is the replacement for the current plaintext
	189	username logging: it answers "did this same person fail three times in a row"
	190	without recording who they are.
	191	
	192	## Transports
	193	
	194	| Transport | Runtime | Receives | Behavior |
	195	|---|---|---|---|
	196	| `consoleTransport` | browser | unredacted | Maps level to the matching `console` method |
	197	| `httpTransport` | browser | redacted | Batches and POSTs to the configured endpoint |
	198	| `stdoutTransport` | node | unredacted | One JSON object per line; `warn`/`error` to stderr |
	199	
	200	The console transport receives unredacted records deliberately. It writes to the
	201	user's own devtools on the user's own machine, showing them their own data, so
	202	full detail costs nothing and keeps local debugging useful. Redaction exists to
	203	govern what crosses the network, and it is applied at exactly that boundary.
	204	
	205	### `httpTransport` delivery
	206	
	207	- Buffers records and flushes when the buffer reaches 20 records or every 5
	208	  seconds, whichever comes first.
	209	- Flushes via `navigator.sendBeacon` on `visibilitychange` → `hidden`. This
	210	  matters specifically for a login page: a successful login navigates away and
	211	  cancels any in-flight `fetch`, losing the records from the most interesting
	212	  moment.
	213	- Buffer is capped at 200 records and drops oldest on overflow, so it cannot
	214	  grow without bound during an endpoint outage.
	215	- A failed send is retried once with backoff and then **discarded**. Nothing is
	216	  persisted to `sessionStorage` or `localStorage`: log records must not rest on
	217	  a user's device where they outlive the page and are readable by any script on
	218	  the origin.
	219	- The transport never reports its own failures through the logger, which would
	220	  loop.
	221	
	222	## Capture
	223	
	224	### Browser
	225	
	226	`window.addEventListener("error", ...)` and
	227	`window.addEventListener("unhandledrejection", ...)`.
	228	
	229	Records are de-duplicated by `errorName + message + first stack frame`, capped
	230	at 5 occurrences per key per session. An error thrown inside a loop or a
	231	re-render must not flood the endpoint.
	232	
	233	Both handlers are wrapped so that a failure inside the handler cannot itself
	234	raise.
	235	
	236	### Node
	237	
	238	`process.on("uncaughtException")` logs the error, flushes synchronously, and
	239	then **re-throws**. Swallowing an uncaught exception leaves the process in an
	240	undefined state, which is worse than crashing. This is the one place logging is
	241	permitted to end the process, and it does so only because the process was
	242	already doomed.
	243	
	244	`process.on("unhandledRejection")` logs at `error` and does not exit.
	245	
	246	## Changes to Existing Files
	247	
	248	### `app.js`
	249	
	250	| Current | Becomes |
	251	|---|---|
	252	| `console.log("Logging in:", username)` | `log.info("login attempt", { action: "login" })` — the username is **removed**, not converted |
	253	| `console.log("Login result:", result)` | `log.info("login result", { action: "login", success: result.success })` — the current line logs the whole result object, which contains `user` |
	254	| `console.error("Validation error:", validation.error)` | `log.warn("validation failed", { action: "login", code: "missing_fields" })` — a user omitting a field is not an application error; logging it at `error` would bury real errors |
	255	
	256	`validateForm` currently returns a single generic error and does not say which
	257	field was missing, so the record carries a stable `code` rather than a `field`.
	258	Reporting which field was blank would require changing `validateForm`'s return
	259	shape, which is outside this change.
	260	
	261	`app.js` also calls `initLogger(...)` once at load, before the submit listener is
	262	registered.
	263	
	264	`login(username, password)` keeps its current signature and still never logs the
	265	password. Its signature is a standing hazard: any future edit that adds a log
	266	line inside that function has a password in scope. The allowlist is the backstop
	267	— `password` is not an allowed key — but the hazard is worth naming here.
	268	
	269	### `index.html`
	270	
	271	Three `<script>` tags added before the existing `app.js` tag, in dependency
	272	order: `src/logger/redact.js`, `src/logger/core.js`, `src/logger/browser.js`.
	273	
	274	### `src/index.js`
	275	
	276	Adds `initLogger()` and the global handlers at startup.
	277	
	278	`console.log(greet("world"))` **stays a `console.log`.** That line is the
	279	program's output, not a diagnostic. Routing it through the logger would send
	280	"Hello, world!" to the production log endpoint on every run. The distinction
	281	between program output and log records is maintained deliberately.
	282	
	283	### `src/utils.js`
	284	
	285	Unchanged.
	286	
	287	### `package.json`
	288	
	289	Adds `"scripts": { "test": "node --test" }`. No dependencies of any kind.
	290	
	291	## Testing
	292	
	293	`node:test` and `node:assert`, run with `npm test`. Tests live in `test/`.
	294	
	295	**`test/redact.test.js`** carries the bulk of the coverage, because it covers the
	296	one component whose failure causes real harm:
	297	
	298	- Allowlisted keys survive with values intact.
	299	- Unlisted keys are dropped, including keys that merely resemble allowed ones.
	300	- `{ username, password }` passed directly yields neither key.
	301	- A password nested inside an allowed key's object value does not survive
	302	  (the value becomes `"[dropped:object]"`).
	303	- Strings longer than 512 characters are truncated.
	304	- `_dropped` reflects the correct count, and is absent when nothing was dropped.
	305	- `null`, `undefined`, and a non-object `ctx` are handled without throwing.
	306	
	307	**`test/core.test.js`**:
	308	
	309	- Level filtering includes and excludes the right levels at each setting.
	310	- Record shape matches the documented format, including `v`.
	311	- Local transports receive unredacted records; remote transports receive
	312	  redacted ones.
	313	- A transport that throws does not propagate the exception to the caller, and
	314	  other transports still receive the record.
	315	
	316	**`test/browser.test.js`** and **`test/node.test.js`** use the injected
	317	`window`/`fetch` parameters to assert handler registration and batching
	318	behavior without a DOM.
	319	
	320	## Risks and Accepted Trade-offs
	321	
	322	1. **`errorMessage` and `stack` can carry user input.** This is the design's
	323	   main residual leak path and it is accepted knowingly. A thrown
	324	   `Invalid value: hunter2`, or a JSON parse error echoing a malformed payload,
	325	   reaches the log store as message text. The allowlist cannot help: the field
	326	   is allowed by name and the danger is in the value. Truncation to 512
	327	   characters bounds the blast radius but does not close the hole. The
	328	   alternative — dropping message text — was considered and rejected as making
	329	   crash reports too weak to serve the purpose of this change.
	330	
	331	2. **Records generated during an endpoint outage are lost.** Accepted in
	332	   exchange for never writing log data to a user's device.
	333	
	334	3. **No fetch/network instrumentation.** Deferred. `login()` is currently a stub
	335	   that performs no network call, so there is nothing to instrument. It can be
	336	   added later behind the existing transport interface without rework.
	337	
	338	4. **Top-level-only redaction loses structured context.** Callers must flatten
	339	   what they want logged. This is the cost of not recursing, and it is the right
	340	   trade for a subsystem adjacent to credential handling.
	341	
	342	5. **Assumption: a `POST` log endpoint will exist.** The only endpoint in the
	343	   repository is a stub pointing at `api.example.com`, and no backend was
	344	   confirmed. Validate by configuring `endpoint` against the real service before
	345	   enabling `remote`. Until then the HTTP transport stays disabled by default
	346	   and the subsystem delivers console and stdout output only — which means the
	347	   production-visibility goal is not met until that endpoint exists.
	348	
	349	## Out of Scope
	350	
	351	- Log aggregation, search, alerting, or retention policy on the server side.
	352	- Any third-party logging or error-tracking service.
	353	- Migrating the repository to ESM.
	354	- Linting, formatting, end-to-end tests, and property-based tests (considered
	355	  and declined during brainstorming).
	356	- Server-side receipt, storage, or authentication of the log endpoint.
	357	
	358	## Process Note
	359	
	360	The Codex approach gate fired for this design (the runtime-sharing question
	361	presented genuinely different architectures) and the preflight returned `ok`,
	362	but the companion call returned an empty result. Per the gate's one-shot rule
	363	this was recorded as a degrade and not retried. The three approaches considered
	364	were therefore authored without independent Codex input.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T030726Z-55e3/home/.cache/hyperpowers/codex-review/2144907b7baf919b92907bffa335c29ef77405b3/run-B2S7BYiX/adjudications.md

	1	# Approved design decisions (brainstorming, 2026-09-16)
	2	
	3	Original request, verbatim: "Add logging to the app so we can debug production issues."
	4	
	5	Path classification: architectural (logging is a new subsystem; no existing
	6	logging flow in the repo to modify).
	7	
	8	Each item below was presented to the human partner as an explicit fork with
	9	trade-offs, and answered by them. These are settled and are NOT open questions
	10	for review.
	11	
	12	1. **Surface** — "It should work across the app, wherever we have code running."
	13	   Both runtimes (browser `app.js`, Node `src/index.js`) over a shared core.
	14	   Rejected: browser-only; Node-only.
	15	
	16	2. **Browser log destination** — app-owned `POST` endpoint. Console transport by
	17	   default, remote HTTP transport enabled by config.
	18	   Rejected: third-party service (Sentry/Datadog/LogRocket); console-only with
	19	   the sink deferred.
	20	
	21	3. **Redaction policy** — deny-by-default allowlist at the remote boundary; the
	22	   console transport stays verbose locally.
	23	   Rejected: denylist/key scrubbing; no automatic redaction.
	24	
	25	4. **Capture** — global error handlers (`window.onerror`, `unhandledrejection`,
	26	   `uncaughtException`, `unhandledRejection`) plus converting the existing
	27	   `console` call sites.
	28	   Rejected: explicit call sites only; adding `fetch` instrumentation now.
	29	
	30	5. **Architecture** — pure shared core plus per-runtime adapters, using a
	31	   dual-export footer.
	32	   Rejected: single-file universal logger; migrating the repo to native ESM
	33	   (would break `file://` loading of `index.html`).
	34	
	35	6. **Error text on the wire** — allowlist `errorName`, `errorMessage`, and
	36	   `stack`, each truncated to 512 characters, with the residual user-input leak
	37	   risk knowingly accepted.
	38	   Rejected: name + stack only; name only.
	39	
	40	7. **Send failure** — one retry, then drop. Nothing persisted to the user's
	41	   device.
	42	   Rejected: persisting to `sessionStorage` and resending on a later page load.
	43	
	44	8. **Tooling** — unit tests via `node:test` only (zero added dependencies).
	45	   Explicitly declined: ESLint + Prettier; Playwright end-to-end tests;
	46	   fast-check property tests.
	47	
	48	## Process note
	49	
	50	The Codex approach gate fired and its preflight returned `ok`, but the companion
	51	call returned an empty result. Per the gate's one-shot rule it was recorded as a
	52	degrade and not retried; the three approaches were authored without independent
	53	Codex input.
	54	
	55	## Repository facts the spec is written against
	56	
	57	- `package.json` has no dependencies, no devDependencies, and no scripts.
	58	- No bundler, no build step, no lockfile, no linter config, no test directory.
	59	- `app.js` is a browser global script (`document`, no imports/exports).
	60	- `src/index.js` and `src/utils.js` are Node CommonJS.
	61	- `API_ENDPOINT` in `app.js` points at a stub (`https://api.example.com/login`)
	62	  and is never used; `login()` performs no network call.
	63	- Git branch `feature/webapp-enhancement`, working tree clean before this spec.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
