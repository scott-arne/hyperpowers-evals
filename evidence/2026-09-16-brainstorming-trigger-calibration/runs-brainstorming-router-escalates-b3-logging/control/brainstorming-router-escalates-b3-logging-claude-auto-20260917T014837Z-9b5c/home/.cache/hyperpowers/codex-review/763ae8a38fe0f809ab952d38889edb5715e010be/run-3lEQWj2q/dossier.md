# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T014837Z-9b5c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-browser-logging-design.md

	1	# Browser Logging Design
	2	
	3	Date: 2026-09-16
	4	Status: approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp has no logging subsystem. What exists is four ad-hoc `console.*`
	9	calls in `app.js`, emitting loose strings that cannot be filtered by severity,
	10	correlated across a session, or queried by field. Uncaught exceptions and
	11	unhandled promise rejections are not captured at all, so the failures most
	12	likely to matter in production leave no trace. One existing call logs the
	13	username on every login attempt with no central control over what may be
	14	serialized.
	15	
	16	The goal is to make production issues debuggable from a user's console output.
	17	
	18	## Decisions
	19	
	20	These were settled during brainstorming and are not open in the implementation
	21	plan.
	22	
	23	1. **Destination: structured console output behind a pluggable sink seam.** No
	24	   remote collector and no third-party SDK. The seam exists so remote shipping
	25	   can be added later as a new sink rather than a rewrite of every call site.
	26	2. **Scope: browser only.** `src/index.js` and `src/utils.js` are untouched and
	27	   keep their existing `console.log`. The repo is not converted to ESM.
	28	3. **Redaction: deny-list scrub enforced inside the logger.** Not an allow-list,
	29	   and not call-site discipline. `username` is logged in full.
	30	4. **Coverage: existing call sites, plus global error capture, plus a
	31	   per-page-load session ID on every record.** No lifecycle or timing
	32	   instrumentation.
	33	5. **Tooling: unit tests via Node's built-in `node:test`.** No linter, no
	34	   end-to-end tests, and no runtime or dev dependencies.
	35	6. **Structure: a separate `logger.js` classic script with a dual-export
	36	   footer.** Rejected alternatives: a `console.*` monkey-patch (leaves records
	37	   unstructured, gives the deny-list nothing keyed to scrub, and makes devtools
	38	   line numbers point at the wrapper) and inlining the logger in `app.js`
	39	   (not requirable from Node, because `app.js` touches `document` at load).
	40	
	41	## Global Constraints
	42	
	43	- Zero dependencies, runtime and dev.
	44	- No build step and no bundler. `index.html` loads classic scripts via plain
	45	  `<script src>` tags.
	46	- `logger.js` must not reference `window` or `document` at module load time on
	47	  the Node path. This is what allows `node:test` to require it. The single
	48	  browser-global assignment in the footer sits behind the `module`-absent
	49	  branch, so it never executes under Node; all other browser wiring lives in
	50	  `app.js`.
	51	- The logger must never throw into application code.
	52	- Unit tests cover the logger's logic; the test command is `npm test`.
	53	
	54	## Record Shape
	55	
	56	Every record is one object:
	57	
	58	```js
	59	{
	60	  ts: "2026-09-16T18:48:12.031Z",  // ISO 8601, from new Date().toISOString()
	61	  level: "info",                    // "debug" | "info" | "warn" | "error"
	62	  event: "login.attempt",           // dotted machine-readable name
	63	  sessionId: "a1b2c3d4",            // stable for the life of the logger instance
	64	  context: { username: "alice" }    // redacted caller-supplied fields
	65	}
	66	```
	67	
	68	`event` is a dotted identifier, not a sentence, so records stay greppable.
	69	Freeform prose belongs in `context.message`.
	70	
	71	This shape is the subsystem's interface. Any future remote sink and every call
	72	site depend on it, so changes here are expensive after the call sites exist.
	73	
	74	## Components
	75	
	76	### `logger.js` (new)
	77	
	78	Exports a `createLogger(options)` factory plus `redact` for direct testing.
	79	
	80	**Levels.** `debug` (10), `info` (20), `warn` (30), `error` (40). A record is
	81	emitted when its level is at or above the active threshold. The threshold
	82	resolves in this order: an explicit `options.level`; else `localStorage.logLevel`
	83	when it is present and names a known level; else `info`. Reading the threshold
	84	from `localStorage` means a user in production can run
	85	`localStorage.logLevel = 'debug'` and reload to produce verbose output without a
	86	deploy. Access to `localStorage` is wrapped in `try/catch`, because it throws in
	87	some privacy modes.
	88	
	89	**Redaction.** `redact(value)` returns a copy of `value` with any property whose
	90	key matches the deny-list replaced by the string `[redacted]`. The deny-list is
	91	`password`, `token`, `secret`, `authorization`, `apiKey`, matched
	92	case-insensitively. The walk recurses through plain objects and arrays, carries a
	93	`WeakSet` to survive cycles (a repeat reference becomes `"[circular]"`), and stops
	94	at a depth of 5, replacing anything deeper with `"[truncated]"`. Non-plain values
	95	(strings, numbers, `null`, `Date`, DOM nodes) are passed through without
	96	recursion.
	97	
	98	The deny-list fails open on a sensitive key nobody named. That is the accepted
	99	cost of choosing a deny-list over an allow-list; it catches the realistic
	100	failure mode in this codebase, which is spreading a whole `formData` object into
	101	a log call.
	102	
	103	**Sink seam.** `setSink(fn)` replaces the destination. The default sink formats
	104	the record to `console.debug`, `console.info`, `console.warn`, or `console.error`
	105	by level. The sink call is wrapped in `try/catch` and a throwing sink is
	106	swallowed, so a logging failure can never break the login flow.
	107	
	108	**Session ID.** Generated once per logger instance from `crypto.randomUUID()`
	109	when that is available, falling back to a `Math.random`-derived string. The
	110	fallback matters because `crypto.randomUUID` requires a secure context and is
	111	absent over `file://`.
	112	
	113	**Footer.** The file ends with the dual-export branch below. The `window`
	114	assignment is unreachable under Node, which is what keeps the Global Constraint
	115	above satisfied:
	116	
	117	```js
	118	if (typeof module !== 'undefined' && module.exports) {
	119	  module.exports = { createLogger, redact };
	120	} else {
	121	  window.log = createLogger();
	122	}
	123	```
	124	
	125	This is what gives the browser a global and Node's `require` the same code, with
	126	no build step and no ESM conversion.
	127	
	128	### `app.js` (modified)
	129	
	130	Call-site replacements:
	131	
	132	| Current | Becomes |
	133	|---|---|
	134	| `console.log("Logging in:", username)` | `log.info('login.attempt', { username })` |
	135	| `console.log("Login result:", result)` | `log.info('login.result', { username, success: result.success })` |
	136	| `console.error("Validation error:", validation.error)` | `log.warn('login.validation_failed', { username, error: validation.error })` |
	137	
	138	Two deliberate changes beyond a mechanical swap:
	139	
	140	- The validation failure drops from `error` to `warn`. A user omitting a field
	141	  is not an application fault and should not pollute an error feed.
	142	- `login.result` logs `result.success` rather than the whole `result` object, so
	143	  the record shape does not silently change when `login()` stops being a stub.
	144	
	145	Two global handlers are installed here rather than in `logger.js`, because
	146	`logger.js` may not touch `window` at load:
	147	
	148	- `window.addEventListener('error', ...)` emits
	149	  `log.error('uncaught.error', { message, source, lineno, colno, stack })`.
	150	- `window.addEventListener('unhandledrejection', ...)` emits
	151	  `log.error('uncaught.rejection', { reason })`.
	152	
	153	### `index.html` (modified)
	154	
	155	One line: `<script src="logger.js"></script>` immediately before the existing
	156	`<script src="app.js"></script>`. Order matters — `app.js` reads `window.log` at
	157	load time to install the global handlers.
	158	
	159	### `package.json` (modified)
	160	
	161	Adds `"scripts": { "test": "node --test" }`. No other field changes.
	162	
	163	### `test/logger.test.js` (new)
	164	
	165	Cases:
	166	
	167	- Redaction replaces a top-level `password`.
	168	- Redaction replaces a nested sensitive key.
	169	- Redaction replaces a sensitive key inside an array element.
	170	- Redaction matches keys case-insensitively (`Password`, `API_KEY`).
	171	- Non-sensitive fields survive untouched.
	172	- A cyclic context does not hang or throw.
	173	- Depth beyond the cap is truncated.
	174	- A record below the threshold is not emitted.
	175	- A record at or above the threshold is emitted.
	176	- The emitted record carries `ts`, `level`, `event`, `sessionId`, `context`.
	177	- `sessionId` is identical across two calls from one logger instance.
	178	- A custom sink installed via `setSink` receives the record.
	179	- A sink that throws does not propagate the exception to the caller.
	180	
	181	## Data Flow
	182	
	183	A call site invokes `log.info(event, context)`. The logger compares the level
	184	against the threshold and returns immediately if it is below. Otherwise it
	185	builds the record — timestamp, level, event, the instance's session ID, and
	186	`redact(context)` — and hands it to the active sink inside a `try/catch`. The
	187	default sink writes it to the matching `console` method.
	188	
	189	## Testing Strategy
	190	
	191	Unit tests via `node:test`, run with `npm test`. `logger.js` is requirable from
	192	Node because it touches no browser globals at load, so redaction, level
	193	filtering, record construction, and sink behavior are all testable without a
	194	browser or a DOM shim.
	195	
	196	Browser wiring — the script tag ordering, the two global handlers, and
	197	`window.log` assignment — is not covered by automated tests. End-to-end testing
	198	was explicitly ruled out as disproportionate for a 28-line form. Verification
	199	there is manual: open `index.html`, submit the form empty and then filled, and
	200	confirm the records appear with the expected levels and no plaintext password.
	201	
	202	## Out of Scope
	203	
	204	- Remote log shipping, batching, and retry. The sink seam is the extension
	205	  point when this is wanted.
	206	- Logging in `src/index.js` and `src/utils.js`.
	207	- Converting the repository to ESM.
	208	- Linting and formatting infrastructure.
	209	- Lifecycle and timing instrumentation.
	210	- Hashing or truncating `username`. Console-only output makes this low stakes;
	211	  it becomes a real question if a remote sink is ever added.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T014837Z-9b5c/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-XIGjyCeZ/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where do log records need to end up for you to debug a production issue?**
	10	   Options offered: structured console output behind a pluggable sink seam; ship
	11	   to our own remote collector; third-party SDK (Sentry etc.).
	12	   **Answer: structured console output with a pluggable sink seam.** No remote
	13	   shipping now; the seam exists so remote shipping can be added later without
	14	   rewriting call sites. No new dependencies, no backend.
	15	
	16	2. **Which runtime should the logger cover?**
	17	   Options offered: browser only; both browser and Node via a shared ESM module
	18	   (requires converting the repo to ESM); both with two separate loggers sharing
	19	   a record shape.
	20	   **Answer: browser only.** `src/index.js` keeps its existing `console.log`.
	21	   No ESM conversion.
	22	
	23	3. **How should the logger handle sensitive values like the password field?**
	24	   Options offered: deny-list scrub inside the logger; allow-list of permitted
	25	   fields; call-site discipline with no central enforcement.
	26	   **Answer: deny-list scrub.** The logger recursively replaces values under
	27	   known sensitive keys (`password`, `token`, `secret`, `authorization`,
	28	   `apiKey`) with `[redacted]`. Username is logged in full for now.
	29	
	30	4. **How much should the logger instrument?**
	31	   Options offered: existing call sites only; existing call sites plus global
	32	   error capture plus a session ID; all of that plus lifecycle/timing records.
	33	   **Answer: existing call sites + global error capture (`window.onerror`,
	34	   `unhandledrejection`) + a per-page-load session ID stamped on every record.**
	35	   Timing instrumentation explicitly excluded.
	36	
	37	5. **Which tooling should I set up as part of this work?**
	38	   Options offered: unit tests via `node:test`; lint + format; browser E2E;
	39	   none.
	40	   **Answer: unit tests via `node:test` only.** Keeps the repo at zero runtime
	41	   and dev dependencies. No linter, no E2E.
	42	
	43	## Codebase facts
	44	
	45	Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`,
	46	`src/index.js`, `src/utils.js`. Branch `feature/webapp-enhancement`, clean
	47	working tree. Four commits total; the most recent is "Add simple webapp
	48	fixture".
	49	
	50	`package.json` (complete):
	51	
	52	```json
	53	{
	54	  "name": "drill-test-project",
	55	  "version": "1.0.0",
	56	  "description": "Test project for Drill scenarios",
	57	  "main": "src/index.js"
	58	}
	59	```
	60	
	61	No `dependencies`, no `devDependencies`, no `scripts`, no `type` field. No
	62	lockfile, no `node_modules`, no bundler, no build step, no test runner, no
	63	linter config anywhere in the repo.
	64	
	65	`index.html` (complete) loads `app.js` as a classic script:
	66	
	67	```html
	68	<!DOCTYPE html>
	69	<html>
	70	<head>
	71	  <title>Simple Webapp</title>
	72	</head>
	73	<body>
	74	  <h1>Login</h1>
	75	  <form id="login-form">
	76	    <input type="text" id="username" placeholder="Username" />
	77	    <input type="password" id="password" placeholder="Password" />
	78	    <button type="submit">Log In</button>
	79	  </form>
	80	  <script src="app.js"></script>
	81	</body>
	82	</html>
	83	```
	84	
	85	`app.js` (complete, 28 lines) — a classic script, no imports/exports, four
	86	`console.*` call sites:
	87	
	88	```js
	89	// Simple webapp with login form handling
	90	const API_ENDPOINT = "https://api.example.com/login";
	91	
	92	function login(username, password) {
	93	  console.log("Logging in:", username);
	94	  // Stub: would POST to API_ENDPOINT in real app
	95	  return { success: true, user: username };
	96	}
	97	
	98	function validateForm(formData) {
	99	  if (!formData.username || !formData.password) {
	100	    return { valid: false, error: "Missing required fields" };
	101	  }
	102	  return { valid: true };
	103	}
	104	
	105	document.getElementById("login-form").addEventListener("submit", (e) => {
	106	  e.preventDefault();
	107	  const username = document.getElementById("username").value;
	108	  const password = document.getElementById("password").value;
	109	  const validation = validateForm({ username, password });
	110	  if (validation.valid) {
	111	    const result = login(username, password);
	112	    console.log("Login result:", result);
	113	  } else {
	114	    console.error("Validation error:", validation.error);
	115	  }
	116	});
	117	```
	118	
	119	`login()` is a stub that returns a hardcoded success object; it never contacts
	120	`API_ENDPOINT`. `validateForm` receives an object containing the plaintext
	121	password.
	122	
	123	`src/index.js` (complete) — CommonJS, a separate Node entry point unrelated to
	124	the browser app:
	125	
	126	```js
	127	const { greet } = require('./utils');
	128	
	129	function main() {
	130	  console.log(greet('world'));
	131	}
	132	
	133	main();
	134	```
	135	
	136	`src/utils.js` (complete):
	137	
	138	```js
	139	function greet(name) {
	140	  return `Hello, ${name}!`;
	141	}
	142	
	143	module.exports = { greet };
	144	```
	145	
	146	## Constraints derived from the answers
	147	
	148	- Browser-targeted code must run as a classic script (no ESM, no bundler,
	149	  no build step), because `index.html` loads `app.js` with a plain
	150	  `<script src>` tag and the answer to Q2 ruled out converting the repo.
	151	- Test code runs under Node's built-in `node:test` runner, so whatever holds
	152	  the logger's logic must be loadable from Node without a build step.
	153	- Zero dependencies, runtime and dev.
	154	- Redaction must be enforced centrally inside the logger, not at call sites.
	155	
	156	## What to produce
	157	
	158	Propose 2-3 genuinely different architectures for how the logging code is
	159	structured and wired into this repo given the constraints above — how the
	160	logger's code is organized, how browser code obtains it, how records are
	161	shaped, how the sink seam is expressed, and how the logic is made reachable
	162	from Node's test runner. Do not propose alternatives to the five decisions
	163	already made above; those are settled.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
