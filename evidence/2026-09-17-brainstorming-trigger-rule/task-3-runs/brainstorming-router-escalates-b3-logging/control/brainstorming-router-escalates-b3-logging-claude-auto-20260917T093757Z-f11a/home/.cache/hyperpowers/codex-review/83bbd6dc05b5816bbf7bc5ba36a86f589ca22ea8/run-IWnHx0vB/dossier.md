# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T093757Z-f11a/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: approved design, not yet planned
	5	
	6	## Problem
	7	
	8	Errors vanish silently. When something fails for a real user, nobody finds out.
	9	The application today has three `console.*` calls in `app.js`, one in
	10	`src/index.js`, and no global error handling in either runtime: `window.onerror`,
	11	`window.onunhandledrejection`, `process.on('uncaughtException')`, and
	12	`process.on('unhandledRejection')` are all unused. A browser console nobody
	13	reads is not a debugging channel.
	14	
	15	Structure alone does not fix this. A logger that formats neatly into the same
	16	unread console leaves the problem exactly where it is. The fix has two halves:
	17	catch the failures currently missed, and deliver them somewhere the team looks.
	18	
	19	## Goals
	20	
	21	- Unhandled errors in both runtimes are captured and reported off the user's
	22	  machine.
	23	- One shared logging module serves both entry points.
	24	- Credentials and PII cannot reach a log payload, enforced structurally rather
	25	  than by author discipline.
	26	- The logger can never itself cause or worsen a production failure.
	27	
	28	## Non-goals
	29	
	30	- Log aggregation for `info`/`debug` volume. Only `error` and above leave the
	31	  machine by default.
	32	- Session replay, performance tracing, or analytics.
	33	- A logging backend of our own. There is no server in this repository.
	34	- Lint/format tooling and end-to-end tests (explicitly declined; see Risks).
	35	
	36	## Decisions
	37	
	38	| Decision | Choice | Rationale |
	39	|---|---|---|
	40	| Scope | Both entry points, one shared module | Both are production surfaces |
	41	| Destination | Hosted error service (Sentry or equivalent) | Buys alerting, dedup, and symbolication outright; building a receiver is disproportionate for an app this size |
	42	| Vendor coupling | Behind a transport seam the project owns | Vendor SDKs sprawl into application code otherwise |
	43	| Module strategy | Shared ESM core + per-runtime adapters, no bundler | One genuinely shared core without buying a build step |
	44	| Redaction | Allowlist, applied in core | A denylist fails open |
	45	| Tooling | Unit tests (`node --test`) only | Chosen by the project owner |
	46	
	47	### Module strategy: why not a bundler
	48	
	49	A bundler (esbuild) is the conventional answer to "npm package in a browser,"
	50	and it brings source maps, which matter for symbolicating minified stack traces.
	51	This repository does not minify, has no build step, and has no dependencies, so
	52	a bundler would be cost without present return. The design is arranged so that
	53	adding one later touches the adapters and not the core.
	54	
	55	The browser obtains the vendor SDK from its CDN build; Node obtains it from npm.
	56	The two transports therefore wrap different vendor artifacts. That asymmetry is
	57	contained in the two adapter files and is precisely what the transport seam is
	58	for.
	59	
	60	## Architecture
	61	
	62	Five files under `logging/`. Everything logic-bearing or security-relevant is
	63	pure and testable without a DOM, a network, or a live process.
	64	
	65	| File | Responsibility | Depends on |
	66	|---|---|---|
	67	| `logging/core.js` | `createLogger({ level, transport, context })` → `{ debug, info, warn, error, child }`. Level filter, event assembly, redaction call, transport dispatch. | `redact.js` |
	68	| `logging/redact.js` | The allowlist and the tripwire. Pure function over a fields object. | nothing |
	69	| `logging/transport.js` | The seam. `createConsoleTransport()`, `multiTransport([...])`. A transport is `{ send(event) }`. | nothing |
	70	| `logging/browser.js` | `initBrowserLogging(config)`. Installs `error` + `unhandledrejection` listeners; wraps the vendor CDN global as a transport. | core, transport |
	71	| `logging/node.js` | `initNodeLogging(config)`. Installs `uncaughtException` + `unhandledRejection`; wraps the npm SDK as a transport. | core, transport |
	72	
	73	`browser.js` and `node.js` are the only files aware that a runtime exists.
	74	Changing vendors touches one file per runtime.
	75	
	76	### Unit boundaries
	77	
	78	- **core** — what it does: turns a call site's message and fields into a
	79	  filtered, redacted event and hands it to a transport. How you use it:
	80	  `createLogger`. What it depends on: `redact`. Nothing else.
	81	- **redact** — what it does: returns a copy of a fields object containing only
	82	  allowlisted primitive values. How you use it: `redact(fields)`. Depends on
	83	  nothing, so it can be reasoned about in isolation — which is the point, since
	84	  it is the security boundary.
	85	- **transport** — what it does: defines the `send(event)` contract and supplies
	86	  console and fan-out implementations. Consumers never learn what is behind it.
	87	
	88	## Event shape
	89	
	90	```js
	91	{
	92	  ts:      "2026-09-17T09:37:57.123Z",  // ISO-8601
	93	  level:   "error",                     // debug | info | warn | error
	94	  msg:     "login.failed",              // stable dotted event name
	95	  context: { runtime, release, environment, sessionId },
	96	  fields:  { /* allowlisted primitives only */ },
	97	  err:     { name, message, stack }     // present only when an Error was passed
	98	}
	99	```
	100	
	101	`msg` is a stable dotted event name rather than prose. Hosted services group
	102	issues by message; `"login.failed"` aggregates into one issue, while
	103	`"Login failed for bob at 09:37"` creates a new issue per occurrence and
	104	destroys the dedup that motivated choosing a hosted service.
	105	
	106	## Data flow
	107	
	108	1. Call site invokes `log.error('login.failed', { statusCode }, err)`.
	109	2. Level filter runs **first**, so suppressed calls cost nothing beyond a
	110	   comparison.
	111	3. `redact(fields)` strips everything not allowlisted.
	112	4. Event assembled with context merged from the logger and any `child()`.
	113	5. `transport.send(event)`, wrapped in `try/catch`.
	114	6. Fan-out: the console transport always receives the event; the vendor
	115	   transport receives it only when `level >= remoteThreshold` (default
	116	   `error`). The threshold is configuration, not a call-site concern.
	117	
	118	## Redaction
	119	
	120	Applied inside `core.js` before any transport receives the event, so no
	121	transport — present or future — can bypass it.
	122	
	123	Rules:
	124	
	125	- **Allowlist of keys.** Initial set: `event`, `route`, `statusCode`,
	126	  `durationMs`, `formField`, `validationError`, `userId`, `sessionId`,
	127	  `success`, `attemptCount`. Anything else is dropped.
	128	- **Dropped keys are counted** into `_dropped: n` on the event, so a withheld
	129	  field is visible rather than silently missing during debugging.
	130	- **Primitives only.** Strings, numbers, booleans, and `null` survive. Objects
	131	  and arrays are dropped rather than traversed, which structurally eliminates
	132	  the "logged the whole `formData`" leak class.
	133	- **Strings truncate at 512 characters.**
	134	- **Tripwire.** A key matching `/pass|secret|token|auth|cookie|card|ssn/i` is
	135	  dropped and counted separately as `_blocked: n`, even though the allowlist
	136	  already excluded it. Defense in depth, and it makes near-misses detectable.
	137	
	138	`username` is deliberately **not** allowlisted. `app.js:5` currently logs a
	139	username on every login attempt; under this design it will not. That is an
	140	intended behavior change.
	141	
	142	### Accepted risk
	143	
	144	`err.stack` passes through unredacted, because a stack trace is the substance of
	145	an error report. Some engines embed argument values in stack frames, and
	146	key-based allowlisting cannot reach inside a stack string. This is accepted, not
	147	solved.
	148	
	149	## Failure behavior
	150	
	151	The logger must never become the outage.
	152	
	153	- `transport.send` is wrapped in `try/catch` inside core. A throwing, offline,
	154	  or rate-limited transport never propagates to the call site.
	155	- Send failures are **counted, never logged** — logging about logging recurses.
	156	  A reentrancy flag enforces this.
	157	- The browser transport is fire-and-forget. No `await` appears anywhere in the
	158	  submit path, so error reporting cannot add latency to a login.
	159	- `multiTransport` isolates members: one throwing transport does not prevent the
	160	  others from receiving the event.
	161	
	162	### Global handlers preserve crash semantics
	163	
	164	- Browser: `window.addEventListener('error')` and `('unhandledrejection')` report
	165	  and do **not** call `preventDefault()`. Suppressing the default changes
	166	  application behavior, which instrumentation must not do.
	167	- Node: `uncaughtException` logs, attempts a **bounded** flush, then
	168	  `process.exit(1)`. A crash handler that swallows the crash trades a visible
	169	  failure for a zombie process.
	170	
	171	## Configuration
	172	
	173	Without a bundler the browser cannot read environment variables, so the vendor
	174	DSN, `environment`, and `release` arrive via a small config `<script>` in
	175	`index.html` ahead of the module script. Browser DSNs are write-only ingest keys
	176	and public by design, so page-source visibility is expected for this class of
	177	service.
	178	
	179	Assumption: the selected vendor's browser DSN is safe to expose in page source;
	180	validate against the chosen service's own guidance before the DSN is committed.
	181	
	182	Node reads the same values from `process.env`.
	183	
	184	## Changes to existing files
	185	
	186	| File | Change |
	187	|---|---|
	188	| `package.json` | Add `"type": "module"`, `"scripts": { "test": "node --test" }`, Node SDK dependency |
	189	| `src/utils.js` | `module.exports` → `export` |
	190	| `src/index.js` | `require` → `import`; initialize Node logging; `console.log` → `log.info` |
	191	| `index.html` | `<script type="module" src="app.js">`; add vendor CDN tag and config script before it |
	192	| `app.js` | Convert to a module; replace three `console.*` calls; wrap the submit handler body in `try/catch` reporting via `log.error` |
	193	
	194	`app.js` call-site mapping:
	195	
	196	- `console.log("Logging in:", username)` → `log.info('login.attempt')`, no username.
	197	- `console.log("Login result:", result)` → `log.info('login.result', { success: result.success })`.
	198	- `console.error("Validation error:", …)` → `log.warn('login.validation_failed', { validationError: validation.error })`.
	199	
	200	ESM over `file://` is blocked by the browser, so the page must be served over
	201	HTTP during development. This is a change to the local workflow and should be
	202	noted in the README.
	203	
	204	## Testing
	205	
	206	`node --test`, unit only.
	207	
	208	| Area | Cases |
	209	|---|---|
	210	| core | Level filtering suppresses below threshold; event shape matches spec; `child()` merges context; a throwing transport is contained |
	211	| redact | Allowlisted key survives; unknown key dropped; `_dropped` count accurate; `password` key hits the tripwire and increments `_blocked`; nested object dropped; 600-char string truncates to 512 |
	212	| transport | `multiTransport` fans out to every member; one throwing member does not stop the others; console transport maps each level to the right console method |
	213	| node adapter | Handlers registered against a fake emitter; `uncaughtException` path calls injected flush then injected exit |
	214	| browser adapter | Pure parts only: config validation, and event construction from an `ErrorEvent`-shaped plain object |
	215	
	216	## Risks
	217	
	218	- **Browser wiring has no automated coverage.** End-to-end tests were declined.
	219	  The DOM listener registration and the vendor CDN transport — the exact path
	220	  that fixes "errors vanish silently" — will be verified by a single manual
	221	  check: throw in a served page, confirm the event arrives in the service. If
	222	  that wiring regresses later, the failure mode is silent and identical to
	223	  today's problem.
	224	- **No lint or format tooling.** Declined. Style consistency rests on review.
	225	- **Vendor lock at the adapter.** Mitigated by the transport seam, not
	226	  eliminated: migrating still means rewriting two adapter files.
	227	- **Stack frames may carry values.** See Accepted risk above.
	228	
	229	## Out of scope for the first implementation
	230	
	231	Sampling, rate limiting, offline queueing and retry, breadcrumbs, and source-map
	232	upload. Each is additive behind the existing transport seam.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T093757Z-f11a/home/.cache/hyperpowers/codex-review/83bbd6dc05b5816bbf7bc5ba36a86f589ca22ea8/run-IWnHx0vB/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-17)
	2	
	3	Original request, verbatim:
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	Decisions the project owner made during brainstorming. These are settled; a
	8	review should check the spec against them, not relitigate them.
	9	
	10	1. **Scope** — both entry points (browser `app.js` and Node `src/index.js`),
	11	   served by one shared module. Chosen over browser-only or Node-only.
	12	2. **The problem** — "errors vanish silently": a failure reaches a real user and
	13	   the team never finds out. Chosen over "can't reconstruct a session", "logs
	14	   exist but are unusable", and "no specific incident yet". This is why mere
	15	   structured logging was ruled insufficient.
	16	3. **Destination** — a hosted error service (Sentry or equivalent), kept behind
	17	   a transport seam the project owns. Chosen over building an own collect
	18	   endpoint (rejected: no backend exists in the repo) and over
	19	   "transport seam now, real sink later" (rejected: does not solve the stated
	20	   problem).
	21	4. **Module strategy** — Approach A: shared ESM core plus per-runtime adapters,
	22	   no bundler. Chosen over adding esbuild (rejected as cost without present
	23	   return: no minification today) and over a UMD single file (rejected: puts
	24	   runtime branching inside the module, weakening the seam).
	25	5. **Tooling** — unit tests only (`node --test`). Lint/format and end-to-end
	26	   tests were explicitly declined by the project owner.
	27	
	28	Design sections presented in chat and approved verbatim by the project owner
	29	("looks good, go ahead"): the five-file architecture, the event shape, the data
	30	flow, and the file-by-file change list. The redaction rules, the logger's own
	31	failure behavior, and the test plan were presented immediately before the spec
	32	was written.
	33	
	34	Constraints raised by Claude and accepted into the design:
	35	
	36	- Redaction must be structural (allowlist in core), not author discipline,
	37	  because `app.js` currently logs a username and has a password in scope in the
	38	  same handler.
	39	- `username` is deliberately not allowlisted; removing it from the log line is
	40	  an intended behavior change.
	41	- The browser wiring will have no automated coverage, because e2e was declined.
	42	  This was flagged to the project owner as a known gap, not hidden.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
