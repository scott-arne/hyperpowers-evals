# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T104833Z-2892/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The application has no logging. It has five ad-hoc `console` calls, four of
	9	them in `app.js`, which vanish when the page closes and are never seen by
	10	anyone but the user who happened to have devtools open. There is no way to
	11	find out what happened during a production failure.
	12	
	13	A secondary problem is already present in that code: `app.js` logs the
	14	submitted username on every login attempt, and logs the full `login()` result
	15	object, which also contains the username. Any logging subsystem that persists
	16	records inherits this leak unless it actively prevents it.
	17	
	18	## Goals
	19	
	20	- One logging API used by both halves of the application.
	21	- Log records persist beyond the life of a page load or process.
	22	- Sensitive data cannot reach a persisted record through ordinary use of the
	23	  API.
	24	- Log verbosity can be raised for an affected user or process without a
	25	  deploy.
	26	- Unhandled errors are captured, not only paths someone remembered to
	27	  instrument.
	28	
	29	## Non-goals
	30	
	31	- No log ingest backend. Browser logs stay on the user's device until the user
	32	  or support exports them.
	33	- No third-party error-reporting service.
	34	- No migration of the repository to ES modules.
	35	- No change to application behaviour beyond logging and error capture.
	36	
	37	## Decisions
	38	
	39	These were settled during brainstorming and are fixed inputs to the plan.
	40	
	41	| Decision | Choice | Rejected alternatives |
	42	|---|---|---|
	43	| Scope | Both the browser half and the Node half | Node-only; browser-only |
	44	| Browser persistence | On-device IndexedDB buffer plus manual export | First-party ingest endpoint; third-party SDK |
	45	| Redaction model | Allow-list | Deny-list; no structured redaction |
	46	| Architecture | Shared core with pluggable sinks, dual CommonJS/browser-global export | ESM everywhere; two independent loggers |
	47	| Tooling added | `node:test` unit tests; ESLint + Prettier | End-to-end tests; no tooling |
	48	
	49	### Why a shared core rather than two loggers
	50	
	51	The allow-list is safety-critical code. Two copies drift, and the failure mode
	52	of drift is a field that is redacted on one side and not the other. One core
	53	file, consumed by both halves, is the only shape that makes that impossible.
	54	
	55	### Why not ESM
	56	
	57	Converting `src/` off CommonJS and restructuring `app.js` into a module would
	58	mix unrelated, hard-to-revert changes into a logging change. The dual-export
	59	shim is mildly dated but confines the awkwardness to one file, and migrating
	60	later touches only that file.
	61	
	62	## Architecture
	63	
	64	```
	65	                    src/logging/core.js
	66	         (levels, record shape, redaction, sink dispatch)
	67	                            |
	68	        +-------------------+--------------------+
	69	        |                   |                    |
	70	  sink-file.js        sink-idb.js          sink-console.js
	71	  (Node: NDJSON       (Browser: IndexedDB   (both: dev echo)
	72	   + rotation)         ring + export)
	73	```
	74	
	75	`core.js` ends with a dual-export footer: `module.exports` when `module` is
	76	defined, otherwise `window.AppLog`. `index.html` loads `core.js` and
	77	`sink-idb.js` with plain `<script>` tags before `app.js`. Node code uses
	78	`require('./logging/core')`.
	79	
	80	The core knows nothing about where records go. A sink is a function taking one
	81	finished record; sinks are registered with `AppLog.addSink(fn)`.
	82	
	83	### Global constraints
	84	
	85	- No runtime dependencies. ESLint and Prettier are dev dependencies only.
	86	- No build step. `index.html` must keep working as plain script tags.
	87	- `node:test` is the test runner, which requires Node 18+; add an `engines`
	88	  field to `package.json`, currently absent.
	89	- A logging failure must never propagate into application code. Every sink
	90	  write is wrapped; a failing sink is disabled after repeated failures rather
	91	  than throwing.
	92	
	93	## Component: the logging API
	94	
	95	```js
	96	AppLog.info("login.attempt", { usernameLength: 8 });
	97	AppLog.error("login.failed", { reason: "bad_credentials", statusCode: 401 });
	98	```
	99	
	100	A call takes a stable dotted event name and a flat context object. There is no
	101	free-text message parameter, and this is load-bearing: an allow-list is
	102	defeated by a single `log.info("Logging in: " + username)`, so the API offers
	103	no way to write one. Event names double as grep keys across both halves.
	104	
	105	Levels, in order: `debug`, `info`, `warn`, `error`. Calls below the active
	106	level are discarded before redaction runs.
	107	
	108	### Level control at runtime
	109	
	110	- Node: `APP_LOG_LEVEL` environment variable, default `info`.
	111	- Browser: `localStorage['applog.level']`, default `info`.
	112	
	113	This is what makes the subsystem useful for production debugging: support can
	114	raise one user to `debug` without a deploy.
	115	
	116	## Component: record shape
	117	
	118	```json
	119	{
	120	  "ts": "2026-09-17T10:48:33.123Z",
	121	  "level": "error",
	122	  "event": "login.failed",
	123	  "src": "browser",
	124	  "session": "a3f9c1",
	125	  "ctx": { "reason": "bad_credentials" }
	126	}
	127	```
	128	
	129	`src` is `"browser"` or `"node"`. `session` is a random identifier generated
	130	once per page load or process start, so an exported dump can be read as one
	131	user's sequence of events. Records are serialised as NDJSON: one JSON object
	132	per line, in both sinks, so the two can be concatenated and read together.
	133	
	134	## Component: redaction
	135	
	136	A single registry of allowed field names lives in `src/logging/allowlist.js`
	137	and is applied to every `ctx` object before a record reaches any sink. Three
	138	rules, applied in order:
	139	
	140	1. **Key check.** A key not in the registry is retained with its value
	141	   replaced by `"[redacted]"`. The key is kept deliberately: a reader can see
	142	   that a field was dropped rather than assume it was never sent.
	143	2. **Scalar check.** Only `string`, `number`, `boolean`, and `null` values are
	144	   recorded. Any object or array becomes `"[redacted:object]"` even under an
	145	   allow-listed key. This blocks spreading a whole form payload, request, or
	146	   result object into a log.
	147	3. **Truncation.** Strings longer than 200 characters are truncated, with the
	148	   truncation marked.
	149	
	150	The rules are intentionally strict and mechanical so they can be exhaustively
	151	unit-tested and so no judgement is required at a call site. Adding a new
	152	loggable field is a one-line registry entry, which is the intended friction:
	153	it makes "should this be in a log file?" an explicit decision made once.
	154	
	155	The initial registry contains only fields the instrumented call sites need —
	156	`reason`, `statusCode`, `durationMs`, `success`, `usernameLength`, `valid`,
	157	`errorName`, `errorMessage`, `url`, `lineNumber`. Notably absent: `username`,
	158	`password`, and any whole-object field.
	159	
	160	## Component: Node file sink
	161	
	162	Appends NDJSON to `logs/app.log`, overridable with `APP_LOG_FILE`. Rotation is
	163	size-based: when the file exceeds 5 MB it is renamed to `app.log.1`, existing
	164	numbered files shift up, and three rotated files are kept. Writes are
	165	synchronous appends, which is acceptable at this application's volume and
	166	avoids losing buffered records on an abrupt exit.
	167	
	168	## Component: console sink
	169	
	170	Shared by both halves and registered in addition to the persisting sink. It
	171	echoes `warn` and `error` records only, so operators watching a terminal and
	172	developers with devtools open still see problems without the noise of every
	173	`info` record. It writes the same NDJSON record, not a reformatted line, so
	174	what is seen matches what is stored.
	175	
	176	## Component: browser IndexedDB sink
	177	
	178	A single object store with an auto-incrementing key, used as a capped ring
	179	buffer of 2000 entries. Trimming runs every 50 writes rather than on every
	180	write, to avoid a count query per log call. Writes are asynchronous and fully
	181	wrapped; a failure falls back to `console` and never surfaces to the caller.
	182	
	183	`AppLog.exportLogs()` reads the store, serialises it as NDJSON, and triggers a
	184	download named `applog-<timestamp>.ndjson`. It is reachable as
	185	`window.AppLog.exportLogs()` so support can walk a user through running it in
	186	the browser console.
	187	
	188	**Known limitation.** IndexedDB is per-origin and per-profile, browsers evict
	189	it under storage pressure, and private windows discard it on close. On-device
	190	persistence is best-effort. This is an accepted consequence of keeping logs off
	191	the network; a network sink can be added later as an additional sink without
	192	changing the core, the API, or the redaction rules.
	193	
	194	## Changes to existing code
	195	
	196	`app.js`:
	197	
	198	- `console.log("Logging in:", username)` becomes
	199	  `AppLog.info("login.attempt", { usernameLength: username.length })`. The
	200	  username is not allow-listed and must not be logged.
	201	- `console.log("Login result:", result)` becomes
	202	  `AppLog.info("login.result", { success: result.success })`. Passing `result`
	203	  itself would reintroduce the username.
	204	- `console.error("Validation error:", ...)` becomes
	205	  `AppLog.warn("login.validation_failed", { reason: validation.error })`.
	206	- New `window.addEventListener("error", ...)` and `"unhandledrejection"`
	207	  handlers reporting `errorName`, `errorMessage`, `url`, `lineNumber`.
	208	
	209	`src/index.js`:
	210	
	211	- `console.log(greet('world'))` becomes a logged event alongside the existing
	212	  output; the program's stdout behaviour is unchanged.
	213	- New `process.on("uncaughtException")` and `"unhandledRejection"` handlers.
	214	
	215	`index.html`: two `<script>` tags for `core.js` and `sink-idb.js`, ordered
	216	before `app.js`.
	217	
	218	`package.json`: `engines`, dev dependencies, and `test`, `lint`, and `format`
	219	scripts.
	220	
	221	The global error handlers are the part most likely to pay for this work.
	222	Instrumented call sites only cover failures someone anticipated; the handlers
	223	cover the rest.
	224	
	225	## Testing
	226	
	227	Unit tests with `node:test`, covering the logic that has consequences:
	228	
	229	- Redaction: an allow-listed scalar passes through; a non-allow-listed key is
	230	  replaced while its key is retained; an object under an allow-listed key is
	231	  replaced; a long string is truncated; nested structures cannot smuggle a
	232	  value through.
	233	- Level filtering: calls below the active level produce no record; the
	234	  environment variable and `localStorage` overrides are honoured.
	235	- Record shape: required fields present, `ts` is ISO-8601, `session` is stable
	236	  within a run.
	237	- File sink: rotation triggers at the threshold, old files shift, the retention
	238	  count holds.
	239	- Sink isolation: a sink that throws does not propagate to the caller.
	240	
	241	The IndexedDB sink is kept deliberately thin and is not unit-tested, since
	242	exercising it would require a browser environment that this repository has no
	243	harness for. Its serialisation and trimming decisions live in the core where
	244	they are testable. End-to-end coverage of the real login page and export flow
	245	was considered and deliberately deferred.
	246	
	247	## Risks and assumptions
	248	
	249	- *Assumption: the Node half runs somewhere with a writable working directory.*
	250	  Validate by confirming the deployment target before implementing the file
	251	  sink; if it is read-only, `APP_LOG_FILE` plus a stdout-only fallback covers
	252	  it.
	253	- On-device browser persistence gives no automatic visibility. If the bugs
	254	  being chased are ones users do not report, this design will not surface them
	255	  and a network sink becomes necessary. That was an accepted trade.
	256	- The strict allow-list will occasionally hide a field someone wanted. This is
	257	  the intended direction for the failure to point.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T104833Z-2892/home/.cache/hyperpowers/codex-review/bb84adcceb55ed50fe9b2e30eb401eeb6522f61b/run-uk6C5LAS/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	Original request, verbatim: "Add logging to the app so we can debug production
	4	issues." Follow-up, verbatim: "Yes, it should work across the app. And yes, logs
	5	should persist."
	6	
	7	These were each presented with alternatives and explicitly chosen by the human
	8	partner. They are settled inputs, not open questions. A finding that re-opens a
	9	locked decision is out of scope unless it identifies a blocking defect in the
	10	decision as specified.
	11	
	12	1. **Scope: both halves.** The logger serves the browser half (`app.js`,
	13	   `index.html`) and the Node half (`src/index.js`, `src/utils.js`).
	14	   Rejected: Node-only, browser-only.
	15	
	16	2. **Browser persistence: on-device IndexedDB buffer plus manual export.**
	17	   Rejected: a first-party ingest endpoint; a third-party error-reporting SDK.
	18	   The human partner was told explicitly that this yields no automatic
	19	   visibility into users who do not report problems, and accepted that trade.
	20	
	21	3. **Redaction: allow-list.** Only declared fields are recorded. Rejected:
	22	   deny-list; no structured redaction.
	23	
	24	4. **Architecture: shared core with pluggable sinks**, dual
	25	   CommonJS/browser-global export, no build step, no runtime dependencies.
	26	   Rejected: converting the repo to ESM; two independent per-half loggers.
	27	
	28	5. **Tooling: `node:test` unit tests plus ESLint and Prettier.** Rejected:
	29	   end-to-end browser tests (deliberately deferred); adding no tooling.
	30	
	31	The design as presented in chat and approved ("looks good, go ahead") also
	32	included: no free-text message parameter in the API; the three redaction rules
	33	(key allow-list, scalars only, 200-char truncation); runtime level control via
	34	`APP_LOG_LEVEL` and `localStorage['applog.level']`; global unhandled-error
	35	capture on both sides; and rewriting the existing `app.js` call sites so the
	36	username is no longer logged.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
