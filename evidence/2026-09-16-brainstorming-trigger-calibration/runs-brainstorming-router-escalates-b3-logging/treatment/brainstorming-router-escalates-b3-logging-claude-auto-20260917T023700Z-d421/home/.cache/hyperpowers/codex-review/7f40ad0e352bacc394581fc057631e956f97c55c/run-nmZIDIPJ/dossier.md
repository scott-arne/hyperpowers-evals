# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T023700Z-d421/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-browser-logging-design.md

	1	# Browser Logging Subsystem — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The browser app (`index.html` + `app.js`) has no observability. Its only
	9	instrumentation is four ad-hoc `console.log` / `console.error` calls, which stay
	10	on the user's machine. When a login fails in production there is no way to learn
	11	that it happened, let alone why.
	12	
	13	This design adds a logging subsystem to the browser app that ships failure
	14	context to an endpoint the team controls, without putting credentials or account
	15	identifiers into the log store.
	16	
	17	## Scope
	18	
	19	**In scope:** `index.html`, `app.js`, a new `logger.mjs`, a new
	20	`test/logger.test.mjs`, and `package.json`.
	21	
	22	**Out of scope:** `src/index.js` and `src/utils.js`. That half of the repo is a
	23	Node hello-world with no production deployment and therefore no production
	24	issues to debug. Building a shared browser/Node logging abstraction for a
	25	six-line consumer that does not exist yet is generality with no payer. If `src/`
	26	later grows a real workload, retrofitting it against a proven browser logger is
	27	cheaper than designing a seam for it now.
	28	
	29	**Also out of scope:** the receiving endpoint itself. This design produces a
	30	client that POSTs to a configurable URL. Standing up and operating the receiver
	31	is separate work.
	32	
	33	## Decisions Already Made
	34	
	35	These were settled during brainstorming and are inputs to the design, not open
	36	questions:
	37	
	38	| Decision | Choice | Rejected alternatives |
	39	|---|---|---|
	40	| Coverage | Browser app only | Node entry only; both via a shared module |
	41	| Destination | Team's own HTTP endpoint, configurable URL | Third-party service (Sentry etc.); structured console only |
	42	| Sensitive data | Allowlist — fails closed | Denylist/scrub; convention only |
	43	| User identity | Per-session random correlation ID | Hashed username; raw username |
	44	| Capture | Uncaught errors, unhandled rejections, plus login-flow breadcrumbs | Errors only; verbose with level filter |
	45	| Data model | Black-box recorder — breadcrumbs ring-buffered, shipped only with an error | Buffered log stream; immediate per-record POST |
	46	| Denominator | Session-summary record on `pagehide` | Nothing for clean sessions |
	47	| Tooling | `node --test` unit tests only | Lint/format (Biome or ESLint+Prettier); end-to-end; fuzz |
	48	
	49	## Global Constraints
	50	
	51	- **Zero dependencies, runtime and dev.** The self-hosted endpoint and
	52	  `node --test` were both chosen to preserve this. No package may be added
	53	  without revisiting this constraint explicitly.
	54	- **The logger must never break the app.** Any failure inside logging is
	55	  contained; it never propagates to a caller and never blocks the login flow.
	56	- **No secret or account identifier may reach a record.** This is enforced
	57	  structurally by the allowlist, not by convention.
	58	- All new code is ES modules.
	59	
	60	## Architecture
	61	
	62	### The core/browser split
	63	
	64	`logger.mjs` exports a browser-agnostic core plus a thin browser binding.
	65	
	66	The core (`createLogger`) touches no globals: no `window`, no `fetch`, no
	67	`Date`, no `crypto`. It receives what it needs through config — `transport`,
	68	`now`, `idGen`. The browser binding (`installBrowserHandlers`) supplies the real
	69	implementations and registers event listeners.
	70	
	71	Rationale: there is no bundler and no DOM in the test environment. A logger that
	72	reaches for `window` directly can only be exercised in a real browser, which in
	73	a project with no end-to-end infrastructure means it is not exercised at all.
	74	The injected seams cost a few lines and make every rule in this document
	75	verifiable under `node --test`.
	76	
	77	### Module loading
	78	
	79	`index.html` changes from `<script src="app.js">` to
	80	`<script type="module" src="app.js">`, and `app.js` imports from `./logger.mjs`.
	81	
	82	Tradeoff accepted: ES modules are fetched under CORS rules, so opening
	83	`index.html` directly via a `file://` URL will stop working. The page must be
	84	served over HTTP. The rejected alternative — a second classic `<script>` tag
	85	exporting a global — avoids that, but leaves the logger unimportable from Node
	86	tests, which forfeits the entire testing approach above.
	87	
	88	### Why the `.mjs` extension
	89	
	90	`node --test` must parse the logger as an ES module. `package.json` has no
	91	`"type"` field, so Node treats a `.js` file as CommonJS. The `.mjs` extension
	92	makes it ESM to Node without any `package.json` change.
	93	
	94	The rejected alternative was adding `"type": "module"` to `package.json`. That
	95	works for the logger but reclassifies *every* `.js` file in the project,
	96	breaking `src/index.js` and `src/utils.js` — both CommonJS — and forcing them to
	97	be renamed to `.cjs`. That is a change to the half of the repo this design
	98	explicitly excludes, incurred for nothing but a file-extension detail. The
	99	browser is indifferent to the extension, so `.mjs` costs nothing and keeps the
	100	blast radius inside the browser app.
	101	
	102	## Components
	103	
	104	### `logger.mjs` (new)
	105	
	106	`createLogger(config) -> logger`
	107	
	108	Config keys, all with defaults except `endpoint` and `transport`:
	109	
	110	| Key | Default | Purpose |
	111	|---|---|---|
	112	| `endpoint` | — | URL records are POSTed to |
	113	| `transport` | — | `(url, body) -> void`; injected for testability |
	114	| `maxBreadcrumbs` | 20 | Ring buffer capacity |
	115	| `maxEnvelopes` | 10 | Per-session cap on envelopes shipped |
	116	| `maxStringLength` | 512 | Per-value string truncation bound |
	117	| `now` | — | `() -> number`; injected clock |
	118	| `idGen` | — | `() -> string`; injected correlation-ID source |
	119	
	120	Instance methods:
	121	
	122	- `breadcrumb(event, fields)` — sanitizes `fields`, pushes onto the ring buffer.
	123	  Never touches the network.
	124	- `error(event, fields)` — sanitizes `fields`, builds an envelope from the ring
	125	  buffer plus this error, ships it.
	126	- `sessionSummary()` — builds and ships the summary record.
	127	
	128	`installBrowserHandlers(logger)` — registers `error`, `unhandledrejection`, and
	129	`pagehide` listeners, and supplies the default transport (`navigator.sendBeacon`
	130	first, `fetch(url, {keepalive: true})` as fallback).
	131	
	132	### `app.js` (modified)
	133	
	134	The four existing `console.*` calls are replaced by logger calls, and
	135	breadcrumbs are added at the three interesting points of the login flow. The
	136	submit handler is restructured so that the password value is never passed to a
	137	logging call site — `validateForm` already returns a verdict rather than the
	138	data, so the handler logs the verdict.
	139	
	140	This is defense in depth. The allowlist is the guarantee; not handing the
	141	sanitizer a secret in the first place is the cheaper habit and the one that
	142	survives a future refactor of the allowlist.
	143	
	144	### `test/logger.test.mjs` (new)
	145	
	146	Unit tests under `node --test`. See Testing below.
	147	
	148	### `package.json` (modified)
	149	
	150	One addition: `"scripts": { "test": "node --test" }`. No `"type"` field, no
	151	dependencies, no devDependencies. `"main"` is untouched.
	152	
	153	## Data Model
	154	
	155	### Sanitized field record
	156	
	157	Every `fields` object passed to `breadcrumb` or `error` goes through one
	158	sanitizer before it can reach a record.
	159	
	160	`ALLOWED_FIELDS` is a module-level set:
	161	
	162	```
	163	event, level, ok, reason, status, field, durationMs,
	164	errorName, errorMessage, stack, url, line, col
	165	```
	166	
	167	Explicitly absent: `username`, `password`, `email`.
	168	
	169	Three rules, applied in order:
	170	
	171	1. **Key allowlist.** A key not in `ALLOWED_FIELDS` is dropped.
	172	2. **Primitives only.** A value passes only if it is a string, number, boolean,
	173	   or null. Objects, arrays, and functions are dropped *even under an allowed
	174	   key*. Without this rule, a single
	175	   `logger.error("login.failed", {reason: formState})` serializes the entire
	176	   form — password included — under a perfectly legitimate key name.
	177	3. **String truncation.** Strings longer than `maxStringLength` are truncated,
	178	   bounding record size and limiting the blast radius of anything that does slip
	179	   through.
	180	
	181	Every dropped key or value increments `droppedFieldCount` on the record. This
	182	records *that* something was suppressed without the record containing *what*.
	183	
	184	### Breadcrumb
	185	
	186	```
	187	{ t: <ms since logger creation>, event: <string>, ...sanitized fields, droppedFieldCount? }
	188	```
	189	
	190	### Envelope (shipped on error)
	191	
	192	```
	193	{
	194	  kind: "error",
	195	  correlationId: <string>,
	196	  sentAt: <epoch ms>,
	197	  error: { event, errorName, errorMessage, stack, url, line, col, ...sanitized },
	198	  breadcrumbs: [ <breadcrumb>, ... ],   // oldest first
	199	  meta: { userAgent, url }
	200	}
	201	```
	202	
	203	### Session summary (shipped on `pagehide`)
	204	
	205	```
	206	{
	207	  kind: "session-summary",
	208	  correlationId: <string>,
	209	  sentAt: <epoch ms>,
	210	  counts: { attempts, failures, envelopesSent, envelopesDropped }
	211	}
	212	```
	213	
	214	Purpose: the black-box model ships nothing for a clean session, which would
	215	leave failure counts without a denominator. This record supplies the
	216	denominator — rates become computable — without shipping healthy-session
	217	breadcrumb detail.
	218	
	219	## Data Flow
	220	
	221	1. Page load → `createLogger` → correlation ID from `crypto.randomUUID()`, one
	222	   per page session. `installBrowserHandlers` binds listeners.
	223	2. Form submit → breadcrumb `form.validate` with `{ok, field}`. `field` names
	224	   which input was missing; its value is never included.
	225	3. Validation passed → breadcrumb `login.attempt`. No username.
	226	4. `login()` returns → breadcrumb `login.result` with `{ok, status, durationMs}`.
	227	   `login()` throws → `logger.error`.
	228	5. Any error — explicit, uncaught, or unhandled rejection — builds an envelope
	229	   from the current ring buffer plus the error, and ships it.
	230	6. `pagehide` → `sessionSummary()` via `sendBeacon`.
	231	
	232	## Error Handling (of the logger itself)
	233	
	234	The governing rule: a login form that breaks because telemetry hiccuped is
	235	strictly worse than no telemetry.
	236	
	237	- **Contained throws.** Every public method is wrapped so an internal throw is
	238	  swallowed. At most one `console.warn` per session reports that logging is
	239	  degraded; after that it goes quiet rather than flooding the console someone
	240	  would be reading.
	241	- **Recursion guard.** `installBrowserHandlers` binds `window.onerror`, and the
	242	  transport can throw. Unguarded, a failing POST raises an error, which fires
	243	  the handler, which builds an envelope, which POSTs, which throws — a tight
	244	  spiral in the user's browser triggered by nothing more than an unreachable
	245	  endpoint. A re-entrancy flag around the ship path breaks it.
	246	- **Envelope cap.** `maxEnvelopes` (default 10) per session. An error inside a
	247	  render loop can produce thousands of errors per second; uncapped, the app's
	248	  own users become a load test against the log endpoint. Past the cap, records
	249	  are counted rather than sent, and the session summary reports
	250	  `envelopesDropped` so truncation is visible rather than silent.
	251	- **Fire-and-forget transport, no retry.** A retry queue implies persistence,
	252	  backoff, and duplicate suppression — real machinery for marginal gain when the
	253	  signal of interest is "this session broke," not "every byte arrived." Failed
	254	  sends are counted, never re-queued, never thrown.
	255	
	256	## Testing
	257	
	258	`node --test`, tests in `test/logger.test.mjs`, run via `npm test`. The injected
	259	`transport` / `now` / `idGen` seams mean all of these run headless, with no DOM
	260	and no network.
	261	
	262	Sanitizer (the security control — these are the ones that matter most):
	263	
	264	1. A key not in `ALLOWED_FIELDS` is dropped, and `droppedFieldCount` reflects it.
	265	2. A nested object under an *allowed* key is dropped — the password-in-a-blob
	266	   case.
	267	3. A `password` key never appears in a serialized record.
	268	4. A string longer than `maxStringLength` is truncated.
	269	
	270	Ring buffer and envelopes:
	271	
	272	5. The ring buffer caps at `maxBreadcrumbs` and evicts oldest-first.
	273	6. One error produces exactly one envelope, containing the preceding breadcrumbs
	274	   in order, oldest first.
	275	7. Breadcrumbs are not transmitted when no error occurs.
	276	
	277	Resilience:
	278	
	279	8. A throwing transport does not propagate to the caller.
	280	9. A throwing transport does not trigger another envelope (recursion guard).
	281	10. The envelope cap holds; `envelopesDropped` counts the suppressed ones.
	282	
	283	Summary:
	284	
	285	11. Session-summary counts match the events that occurred.
	286	
	287	An untested security control is a hope, which is why items 1–4 are non-optional.
	288	
	289	## Assumptions
	290	
	291	- Assumption: the team has, or will stand up, an HTTP endpoint able to receive
	292	  these POSTs before the logger is deployed. Validate by confirming the receiver
	293	  URL exists prior to enabling a non-empty `endpoint` in production. If no
	294	  receiver materializes, this work ships logging that reaches nobody.
	295	- Assumption: the app is served over HTTP rather than opened from disk, so ES
	296	  module loading works. Validate by loading `index.html` through the project's
	297	  normal serving path during implementation.
	298	- Assumption: target browsers support `crypto.randomUUID` and
	299	  `navigator.sendBeacon`. Validate against the project's browser support matrix;
	300	  if `crypto.randomUUID` is unavailable, `idGen` is already an injected seam and
	301	  can fall back to a random-string generator without touching the core.
	302	
	303	## Out of Scope / Explicitly Not Doing
	304	
	305	- Log levels beyond the breadcrumb/error distinction. The black-box model makes
	306	  a severity threshold redundant: breadcrumbs are already only shipped alongside
	307	  an error.
	308	- Retry, offline queueing, or persistence across page loads.
	309	- Sampling. At the expected volume of a single login form, shipping every
	310	  failure is affordable.
	311	- Source-map resolution of stack traces. Records carry raw stacks; symbolication
	312	  is the receiver's concern.
	313	- Any change whatsoever to `src/index.js` / `src/utils.js`. The `.mjs`
	314	  extension choice above exists specifically to keep them untouched.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T023700Z-d421/home/.cache/hyperpowers/codex-review/7f40ad0e352bacc394581fc057631e956f97c55c/run-5Lf79kBn/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Which part of the repo should the logging cover?**
	10	   Answer: Browser app only (`app.js` / `index.html`). Not the Node entry point.
	11	
	12	2. **Where should browser logs actually land?**
	13	   Answer: Their own endpoint — batch and POST records to a configurable URL.
	14	   Not a third-party service; not console-only.
	15	
	16	3. **How should the logger prevent credentials and PII from reaching the log store?**
	17	   Answer: Allowlist — only pre-declared fields serialize; everything else is
	18	   dropped before it can reach a record. Fails closed.
	19	
	20	4. **How should a user be identified in log records?**
	21	   Answer: Per-session random correlation ID. Not a hashed username, not the
	22	   raw username.
	23	
	24	5. **What should the logger capture?**
	25	   Answer: Uncaught errors and unhandled rejections, plus key login-flow
	26	   breadcrumb events (validation outcome, login attempt, API result).
	27	
	28	## Codebase facts
	29	
	30	Repository is tiny. Full file list (excluding `.git`):
	31	
	32	- `index.html`
	33	- `README.md`
	34	- `package.json`
	35	- `app.js`
	36	- `src/index.js`
	37	- `src/utils.js`
	38	
	39	### `package.json` (complete)
	40	
	41	```json
	42	{
	43	  "name": "drill-test-project",
	44	  "version": "1.0.0",
	45	  "description": "Test project for Drill scenarios",
	46	  "main": "src/index.js"
	47	}
	48	```
	49	
	50	No dependencies. No devDependencies. No `scripts` block. No test runner, no
	51	linter, no formatter, no bundler, no build step of any kind configured.
	52	
	53	### `index.html` (complete)
	54	
	55	```html
	56	<!DOCTYPE html>
	57	<html>
	58	<head>
	59	  <title>Simple Webapp</title>
	60	</head>
	61	<body>
	62	  <h1>Login</h1>
	63	  <form id="login-form">
	64	    <input type="text" id="username" placeholder="Username" />
	65	    <input type="password" id="password" placeholder="Password" />
	66	    <button type="submit">Log In</button>
	67	  </form>
	68	  <script src="app.js"></script>
	69	</body>
	70	</html>
	71	```
	72	
	73	Note: `app.js` is loaded as a classic (non-module) script tag. There is no
	74	bundler, so any multi-file solution must either add more `<script>` tags, or
	75	switch to `<script type="module">`, or introduce a build step.
	76	
	77	### `app.js` (complete)
	78	
	79	```js
	80	// Simple webapp with login form handling
	81	const API_ENDPOINT = "https://api.example.com/login";
	82	
	83	function login(username, password) {
	84	  console.log("Logging in:", username);
	85	  // Stub: would POST to API_ENDPOINT in real app
	86	  return { success: true, user: username };
	87	}
	88	
	89	function validateForm(formData) {
	90	  if (!formData.username || !formData.password) {
	91	    return { valid: false, error: "Missing required fields" };
	92	  }
	93	  return { valid: true };
	94	}
	95	
	96	document.getElementById("login-form").addEventListener("submit", (e) => {
	97	  e.preventDefault();
	98	  const username = document.getElementById("username").value;
	99	  const password = document.getElementById("password").value;
	100	  const validation = validateForm({ username, password });
	101	  if (validation.valid) {
	102	    const result = login(username, password);
	103	    console.log("Login result:", result);
	104	  } else {
	105	    console.error("Validation error:", validation.error);
	106	  }
	107	});
	108	```
	109	
	110	Facts about the existing code that constrain the design:
	111	
	112	- `login()` is a stub. It never performs a network call; `API_ENDPOINT` is
	113	  referenced only in a comment. There is no real async path today, but a real
	114	  one is the obvious near-future change.
	115	- `login()` currently logs the raw username via `console.log`.
	116	- The submit handler reads a password value into a local variable and passes it
	117	  into `validateForm`.
	118	- All existing observability is four ad-hoc `console.log` / `console.error`
	119	  calls. There is no logging module, no levels, no timestamps, no record shape.
	120	- Everything is in module-level function declarations in one file; nothing is
	121	  exported.
	122	
	123	### `src/index.js` and `src/utils.js`
	124	
	125	CommonJS Node hello-world (`require('./utils')`, `module.exports`). Out of
	126	scope per answer 1, but note the repo therefore already mixes a CommonJS Node
	127	half with a classic-script browser half.
	128	
	129	### Git
	130	
	131	Branch `feature/webapp-enhancement`, clean tree. Recent commits: "Add simple
	132	webapp fixture", "add entry point", "add utils module", "initial commit".
	133	
	134	## Constraints
	135	
	136	- Zero runtime dependencies is the current posture and the human partner chose
	137	  the self-hosted endpoint partly to preserve it.
	138	- The receiving endpoint does not exist in this repo; its URL must be
	139	  configurable rather than hardcoded.
	140	- Browser environment: page can be closed or navigated away at any moment, the
	141	  network can fail, and the endpoint can be unreachable or rate-limiting.
	142	- The allowlist guarantee must be structural, not conventional — a future
	143	  careless call site must not be able to introduce a new field into a shipped
	144	  record.
	145	
	146	## What to produce
	147	
	148	Propose 2-3 genuinely different architectures for this browser logging
	149	subsystem — different in module/transport/buffering shape and in the data
	150	model of what is retained and shipped, not variations of one shape. Consider
	151	at minimum: how records are buffered and when they are flushed, what happens
	152	to breadcrumbs that precede an error, behavior on page unload, failure and
	153	back-pressure handling, how the allowlist is enforced, and how the thing is
	154	tested given there is no test infrastructure today.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
