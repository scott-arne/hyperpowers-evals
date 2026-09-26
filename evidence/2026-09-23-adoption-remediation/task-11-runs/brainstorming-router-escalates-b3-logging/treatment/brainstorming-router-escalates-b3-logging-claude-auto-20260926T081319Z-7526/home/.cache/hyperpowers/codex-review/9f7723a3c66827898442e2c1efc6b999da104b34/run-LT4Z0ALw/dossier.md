# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260926T081319Z-7526/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-logging-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. Diagnostics today are three ad-hoc
	9	`console.*` calls in `app.js` and one in `src/index.js`. In production a
	10	browser `console.log` is invisible to the team, so failures that users hit are
	11	not observable at all. Uncaught exceptions produce no record anywhere.
	12	
	13	One of those existing calls, `app.js:5`, logs a username from the login form.
	14	Any logging design here has to treat credential exposure as a first-class
	15	constraint rather than an afterthought.
	16	
	17	## Goals
	18	
	19	- One logging API serving both the browser app and the Node entry point, with
	20	  a single record format.
	21	- Production browser failures, including uncaught ones, reach a destination
	22	  the team can search.
	23	- Credentials and user-supplied PII cannot reach the log destination.
	24	- The logger cannot break the app it instruments.
	25	
	26	## Non-Goals
	27	
	28	- Metrics, tracing, or performance monitoring. Logging only.
	29	- Durable client-side log storage that survives a session.
	30	- Automatic instrumentation of network calls or user interactions.
	31	- Log analysis, alerting, or dashboards beyond what the chosen vendor offers.
	32	
	33	## Global Constraints
	34	
	35	These apply to every task in the resulting implementation plan.
	36	
	37	- **Module system:** native ES modules. `package.json` gets `"type":
	38	  "module"`, `index.html` uses `<script type="module">`, and the existing
	39	  CommonJS in `src/index.js` and `src/utils.js` is converted.
	40	- **No bundler, no build step.** Source runs directly in both runtimes.
	41	- **Zero runtime dependencies.** The vendor is reached over `fetch` against
	42	  its HTTP ingest API, not via its browser SDK.
	43	- **Tooling, set up before implementation:** ESLint + Prettier for
	44	  lint/format, `node:test` for unit tests. No end-to-end test infrastructure.
	45	- **The logger never throws into application code.**
	46	
	47	## Decisions
	48	
	49	| Decision | Choice | Rationale |
	50	|---|---|---|
	51	| Scope | Both apps, shared core | One record format across runtimes; avoids two divergent loggers |
	52	| Destination | Hosted vendor behind a sink interface | Real visibility without building a log service; swappable later |
	53	| Redaction | Default-deny allowlist + free-text scrubber | Allowlist cannot leak unanticipated fields; scrubber covers strings |
	54	| Capture | Explicit API + global error handlers | Catches unanticipated crashes without wrapping `fetch` |
	55	| Correlation | Anonymous session ID + opt-in `setUser` | Threads a session without sending PII by default |
	56	| Vendor integration | HTTP ingest over `fetch`, no SDK | SDKs assume a bundler and add declined auto-instrumentation |
	57	
	58	### Rejected alternatives
	59	
	60	- **Own collector endpoint.** No backend exists in this repo; building and
	61	  operating one is out of scope for the current goal. The sink interface keeps
	62	  this available later as a one-file change.
	63	- **Browser-local buffer only.** Pull-not-push; gives no visibility into
	64	  failures that nobody reports, which is the case the request is about.
	65	- **Redaction denylist.** Fails open. Any newly added sensitive field leaks
	66	  silently until someone remembers to list it.
	67	- **Auto-instrumentation of `fetch`/XHR.** Multiplies volume and cost, and
	68	  routes request bodies — including this app's login POST — back through the
	69	  logger after the design deliberately removed them.
	70	- **Persistent device ID.** Durable individual tracking; needs consent review
	71	  and is not required for the debugging cases in scope.
	72	
	73	## Architecture
	74	
	75	```
	76	src/logging/
	77	  index.js       createLogger(config) -> { debug, info, warn, error, setUser }
	78	  record.js      builds the canonical record
	79	  redact.js      allowlist filter + free-text scrubber
	80	  session.js     session-ID generation and storage
	81	  sinks/
	82	    console.js   dev sink, pretty output
	83	    stdout.js    Node: one JSON object per line
	84	    http.js      Browser: batched POST to vendor ingest
	85	  handlers.js    installs global error handlers for the current runtime
	86	  browser.js     assembles core + http sink + browser handlers
	87	  node.js        assembles core + stdout sink + Node handlers
	88	```
	89	
	90	The core has no knowledge of destinations. A sink is `{ write(record) }` and
	91	nothing more. That single-method interface is what makes the vendor
	92	replaceable and what makes the batching logic testable without a network.
	93	
	94	Sink selection: `node.js` always uses `stdout.js`. `browser.js` uses
	95	`http.js` in production and `console.js` in development, chosen by the same
	96	configuration that sets the level. The console sink exists so local
	97	development does not require a vendor key.
	98	
	99	Each module has one job: `redact.js` decides what may be recorded, `record.js`
	100	decides the shape, a sink decides where it goes, `handlers.js` decides what
	101	gets captured automatically. None of them needs another's internals.
	102	
	103	### Configuration
	104	
	105	```js
	106	createLogger({ level, release, endpoint, apiKey, allowlist, sink })
	107	```
	108	
	109	A single object at construction. No module-level globals, no ambient state,
	110	so tests construct independent loggers.
	111	
	112	## Record Format
	113	
	114	```js
	115	{
	116	  ts:        "2026-09-26T08:13:19.412Z",  // ISO 8601, UTC
	117	  level:     "error",                      // debug | info | warn | error
	118	  message:   "Login request failed",       // scrubbed free text
	119	  fields:    { },                          // allowlisted structured data
	120	  sessionId: "0f3c...",                    // always present
	121	  userId:    "u_8821",                     // only after setUser()
	122	  runtime:   "browser" | "node",
	123	  release:   "1.0.0",                      // from package.json version
	124	  err:       { name, message, stack }      // error records only; scrubbed
	125	}
	126	```
	127	
	128	`release` is included so regressions can be tied to a version. Without it,
	129	"this started failing on Tuesday" is unanswerable.
	130	
	131	## Levels
	132	
	133	Four levels, ordered `debug < info < warn < error`, with a configurable
	134	threshold.
	135	
	136	- Browser: `warn` in production, `debug` in development. The higher production
	137	  default is a cost control — every browser record is a network call to a
	138	  metered vendor.
	139	- Node: read from `LOG_LEVEL`, defaulting to `info`. Node records are lines on
	140	  stdout and cost nothing.
	141	
	142	Suppression happens before the record is constructed, so a filtered `debug`
	143	call costs one comparison.
	144	
	145	## Redaction
	146	
	147	Two stages, applied in order. Neither is optional.
	148	
	149	### Stage 1 — allowlist over `fields`
	150	
	151	A configured set of permitted key names. Keys not in the set are **dropped,
	152	not masked** — they never enter the record. Nested objects are walked under
	153	the same rule.
	154	
	155	Starting allowlist: `event`, `durationMs`, `statusCode`, `route`,
	156	`errorCode`, `attemptCount`.
	157	
	158	`username` is deliberately absent. It is user-supplied PII bound for a
	159	third-party processor. The supported way to identify a user is `setUser()`
	160	with an opaque internal ID.
	161	
	162	### Stage 2 — scrubber over free text
	163	
	164	Applied to `message`, `err.message`, and `err.stack`. Pattern-based
	165	replacement with `[REDACTED]` for:
	166	
	167	- `password=`, `token=`, `authorization:` key-value forms
	168	- bearer tokens
	169	- JWT-shaped strings
	170	- long high-entropy hex and base64 runs
	171	
	172	This stage is heuristic: it will miss some secrets and over-redact others.
	173	That limitation is why stage 1 is default-deny rather than relying on stage 2.
	174	It exists because a developer will eventually interpolate a secret into a
	175	message string, where an allowlist has no visibility.
	176	
	177	## Correlation
	178	
	179	- **Session ID:** a random UUID per browser session (`sessionStorage`) or per
	180	  Node process run. Attached to every record. No personal data.
	181	- **`setUser(opaqueId)`:** optional, called after successful login with an
	182	  internal user ID. Never the username or email from the login form. The hook
	183	  can remain uncalled until privacy sign-off lands; building it does not
	184	  commit to sending user IDs.
	185	
	186	## Delivery
	187	
	188	### Browser transport
	189	
	190	- Batch and flush at **20 records** or **5 seconds**, whichever is first.
	191	- `error` records flush immediately; they are the ones that must survive a tab
	192	  close.
	193	- Queue capped at **100 records**. Past the cap, drop oldest and carry a
	194	  `droppedCount` on the next batch. A bounded queue is required so an error
	195	  loop in the app cannot grow memory without limit.
	196	- Flush on `visibilitychange` → `hidden` via `navigator.sendBeacon`, falling
	197	  back to `fetch` with `keepalive: true`. `unload` is unreliable on mobile.
	198	- **Retry:** one retry on network failure or 5xx after a short backoff, then
	199	  drop the batch. No `localStorage` spooling — persisting records to the
	200	  user's disk reopens the privacy exposure this design closes, for reliability
	201	  diagnostics do not need.
	202	
	203	### Node sink
	204	
	205	One JSON object per line to stdout; `error` to stderr. Synchronous,
	206	unbatched, no transport. Process supervision collects it.
	207	
	208	### API key exposure
	209	
	210	The browser's vendor `apiKey` ships in client-side JavaScript and is readable
	211	by anyone. This is inherent to browser telemetry and cannot be designed away.
	212	Requirement on vendor selection: the key must be **ingest-scoped, write-only,
	213	and rotatable**. A vendor that cannot issue such a key is disqualified.
	214	
	215	## Global Error Handlers
	216	
	217	Installed explicitly by `browser.js` / `node.js`, never as an import side
	218	effect. Implicit installation makes tests order-dependent and surprises
	219	anything importing the core.
	220	
	221	| Runtime | Hooks | Behavior |
	222	|---|---|---|
	223	| Browser | `window.onerror`, `unhandledrejection` | Log at `error` with scrubbed stack, then re-dispatch to any previously registered handler |
	224	| Node | `uncaughtException`, `unhandledRejection` | Log at `error`, flush synchronously, then preserve default exit behavior |
	225	
	226	The Node handler must not swallow `uncaughtException`. Doing so converts a
	227	crash into a zombie process.
	228	
	229	## Failure Behavior
	230	
	231	The logger never throws into application code. Sink errors, network failures,
	232	and malformed records are swallowed, with at most one `console.warn` per
	233	session. Logging is diagnostic infrastructure; a broken logger must not become
	234	the outage.
	235	
	236	## Testing
	237	
	238	Unit tests with `node:test`. Coverage is weighted toward expensive failures,
	239	not spread evenly.
	240	
	241	- **`redact.js` — heaviest coverage.** Allowlist drops unknown keys including
	242	  nested ones and keeps permitted ones; scrubber catches every secret pattern
	243	  in `message`, `err.message`, and `err.stack`. Includes an explicit
	244	  regression test asserting that a record built from the login form's
	245	  `{ username, password }` contains neither value anywhere in its serialized
	246	  output. This test is written first and carries a comment explaining why it
	247	  exists: it is the assertion that must fail before credentials could reach
	248	  the vendor.
	249	- **`record.js`** — record shape, required fields present, `userId` absent
	250	  until `setUser`, level-threshold suppression.
	251	- **Sinks** — a fake `{ write }` sink verifies batching at 20, the 5-second
	252	  timer, immediate `error` flush, the 100-record cap and `droppedCount`, and
	253	  single-retry-then-drop. No network in tests.
	254	- **Handlers** — installed handlers log and delegate; the Node path preserves
	255	  default exit behavior.
	256	- **Out of scope for unit tests:** real vendor delivery. Verified once by hand
	257	  against a staging project.
	258	
	259	## Migration of Existing Call Sites
	260	
	261	| Location | Current | Becomes |
	262	|---|---|---|
	263	| `app.js:5` | `console.log("Logging in:", username)` | `log.info("login attempt", { event: "login_submit" })` — username dropped |
	264	| `app.js:24` | `console.log("Login result:", result)` | `log.info("login result", { event: "login_result" })` — `login()` is currently a stub returning `{ success, user }`; no `statusCode` exists to log until it makes a real request |
	265	| `app.js:26` | `console.error("Validation error:", ...)` | `log.warn("validation failed", { event: "validation_failed", errorCode })` |
	266	| `src/index.js:4` | `console.log(greet('world'))` | unchanged — program output, not a log record |
	267	
	268	The last row is a distinction worth preserving: `greet` output is the
	269	program's purpose, not diagnostics, and routing it through the logger would be
	270	wrong.
	271	
	272	## Rollout
	273	
	274	Three independently revertible steps.
	275	
	276	1. Land `src/logging/` with its full test suite and no callers. No app
	277	   behavior changes.
	278	2. Convert `src/` and `index.html` to ESM; wire `node.js` into
	279	   `src/index.js`. Node first: no vendor, no network, no privacy surface, so
	280	   the core is proven with the smallest blast radius.
	281	3. Wire `browser.js` into `app.js`, replacing the three `console.*` calls,
	282	   with `level: "warn"` and the vendor key configured.
	283	
	284	## Open Items
	285	
	286	- **Vendor not yet selected.** The design is vendor-agnostic by construction,
	287	  so this does not block the spec or steps 1 and 2. Step 3 cannot start until
	288	  a vendor is named.
	289	- *Assumption:* the chosen vendor offers a write-only, rotatable ingest key
	290	  and an HTTP ingest endpoint usable without its SDK. Validate against vendor
	291	  documentation before step 3. If false, the no-SDK decision must be
	292	  revisited, which would also reopen the no-bundler constraint.
	293	- *Assumption:* sending anonymous session IDs and opaque user IDs to a
	294	  third-party processor is acceptable under applicable privacy obligations.
	295	  Validate with the owner of that sign-off before step 3. Steps 1 and 2 do not
	296	  depend on it, so the review can run in parallel.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260926T081319Z-7526/home/.cache/hyperpowers/codex-review/9f7723a3c66827898442e2c1efc6b999da104b34/run-LT4Z0ALw/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-26)
	2	
	3	Original user request, verbatim:
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	Repository state at design time (this is the whole repo):
	8	
	9	- `index.html` — login form, loads `app.js` via a classic `<script src>` tag
	10	- `app.js` — login/validate handlers; three ad-hoc `console.*` calls, one of
	11	  which logs the username from the login form
	12	- `src/index.js`, `src/utils.js` — CommonJS Node entry point and a `greet` util
	13	- `package.json` — no dependencies, no scripts, no test setup
	14	- `README.md` — three lines
	15	
	16	Decisions the user explicitly chose during brainstorming. These are settled;
	17	findings should evaluate the spec against them rather than relitigate them.
	18	
	19	1. **Scope** — both apps, one shared core. (Alternatives offered and declined:
	20	   browser only; Node only.)
	21	2. **Destination** — hosted vendor service behind a swappable sink interface.
	22	   (Declined: own collector endpoint, because no backend exists in this repo;
	23	   browser-local buffer only, because it is pull-not-push.)
	24	3. **Redaction** — default-deny allowlist over structured fields, plus a
	25	   scrubber over free-text messages and stack traces. (Declined: strict
	26	   allowlist with no scrubber; redaction denylist, because it fails open.)
	27	4. **Capture** — explicit logger API plus global error handlers only.
	28	   (Declined: explicit calls only, because uncaught errors would go
	29	   unrecorded; auto-instrumentation of fetch/XHR, because it would route the
	30	   login POST body back through the logger.)
	31	5. **Correlation** — anonymous per-session UUID on every record, plus an
	32	   opt-in `setUser(opaqueId)` hook. (Declined: session ID alone; persistent
	33	   device ID, which needs consent review.)
	34	6. **Module system** — convert both sides to native ES modules, no bundler, no
	35	   build step, zero runtime dependencies. Approved by the user as Section 1.
	36	7. **Vendor integration** — reach the vendor's HTTP ingest API over `fetch`
	37	   rather than installing its browser SDK. Approved with the stated cost:
	38	   loss of source-map-aware stack traces and SDK release tracking.
	39	8. **Tooling** — ESLint + Prettier, and `node:test` for unit tests. End-to-end
	40	   test infrastructure explicitly declined by the user.
	41	9. **Dropping `username` from logs** — the user explicitly approved that the
	42	   username is not logged and is not on the field allowlist.
	43	
	44	The user approved Sections 1 through 4 of the design in sequence before the
	45	spec was written.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
