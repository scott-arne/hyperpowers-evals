# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T113359Z-3245/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-browser-logging-design.md

	1	# Browser Logging Subsystem — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (sections 1-3), pending spec review
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. What exists is three ad-hoc calls in
	9	`app.js`: a `console.log` of the username inside `login()`, a `console.log` of
	10	the login result at the call site, and a `console.error` for validation
	11	failure. There are no levels, no way to raise verbosity on a user's machine, no
	12	redaction policy, and no capture of uncaught errors. When a user reports a
	13	login failure in production there is nothing to read.
	14	
	15	The app is a static page: `index.html` loads `app.js` through a plain
	16	`<script src>` tag. There is no build step, no bundler, no server-side
	17	component, and no runtime dependencies.
	18	
	19	## Decisions
	20	
	21	These were settled with the human partner during brainstorming and constrain
	22	everything below.
	23	
	24	1. **Destination: console, with a transport seam.** Logs print to the browser
	25	   console. A named extension point exists so remote shipping can be added
	26	   later without changing call sites. No remote endpoint and no third-party
	27	   service (Sentry or equivalent) in this work.
	28	2. **Scope: browser only.** `index.html` and `app.js`. The Node entry point
	29	   `src/index.js` is out of scope and keeps its current `console.log`. No
	30	   module-format decision is forced and no build step is introduced.
	31	3. **Redaction: deny-list by key name**, applied to a structured metadata
	32	   object.
	33	4. **Username is logged in cleartext.** It is the correlation handle between a
	34	   user's bug report and a log line. This is a deliberate choice, recorded
	35	   here rather than inherited by accident from the current code.
	36	5. **Level control: `localStorage`, with a URL parameter as the hand-off.**
	37	   Default `info`; `?logLevel=` writes into `localStorage` so raised verbosity
	38	   survives reloads during a reproduction.
	39	6. **Testing: `node:test` with a `node:vm` sandbox.** No new dependencies.
	40	
	41	## Architecture
	42	
	43	### New file: `logger.js`
	44	
	45	Repo root, loaded by `index.html` via a `<script src="logger.js">` tag placed
	46	before the existing `app.js` tag. It defines a single global, `window.log`.
	47	
	48	### Interface
	49	
	50	```
	51	log.debug(message, meta?)
	52	log.info(message, meta?)
	53	log.warn(message, meta?)
	54	log.error(message, meta?)
	55	log.dump()
	56	log.clear()
	57	log.transport        // null by default; assignable
	58	```
	59	
	60	The four level methods take exactly two arguments and are never variadic. That
	61	constraint is load-bearing rather than stylistic: redaction can only inspect a
	62	structured object, so a `console.log`-style variadic signature would make the
	63	deny-list unenforceable.
	64	
	65	A record is:
	66	
	67	```
	68	{ ts, level, message, meta }
	69	```
	70	
	71	`ts` is an ISO-8601 string. Timestamps keep entries correlatable when a user
	72	pastes them out of order or from more than one tab.
	73	
	74	### Level resolution (at load)
	75	
	76	1. Read `logLevel` from `location.search`. If present and one of `debug`,
	77	   `info`, `warn`, `error`, write it to `localStorage` under `app.logLevel`.
	78	2. Read `app.logLevel` from `localStorage`.
	79	3. Fall back to `info` when absent or invalid.
	80	
	81	Invalid values fall back rather than throw. Ordering is
	82	`debug < info < warn < error`; a record prints when its level is at or above
	83	the resolved threshold.
	84	
	85	### Redaction
	86	
	87	Runs at **record** time, before the entry enters the buffer — not at print
	88	time. Unprinted buffered entries would otherwise retain sensitive values.
	89	
	90	The redactor walks `meta`, its nested plain objects, and arrays, replacing any
	91	value whose key matches (case-insensitive) `password`, `passwd`, `token`,
	92	`secret`, `auth`, or `apiKey` with the string `[redacted]`. Matching is on the
	93	exact key name, not a substring. It tracks visited objects and substitutes
	94	`[circular]` for a repeat rather than recursing forever. It produces a new
	95	object; the caller's `meta` is never mutated.
	96	
	97	It does **not** scan the `message` string. That is a known and accepted blind
	98	spot; the governing rule is *identifiers in the message, data in `meta`*.
	99	
	100	The deny-list is fail-open by construction: a sensitive field whose key nobody
	101	added to the list is logged in full. This was chosen over an allow-list because
	102	an allow-list forces a decision at every call site, and that friction gets
	103	routed around by stuffing data into the message string — which no key-based
	104	scheme can see.
	105	
	106	### Ring buffer
	107	
	108	A fixed 200-entry array with a wrapping write index. Every call records
	109	unconditionally; the level threshold gates only whether the record also prints.
	110	
	111	- `log.dump()` returns the retained records in chronological order and prints
	112	  them as one block — a single paste for the user, a single read for the
	113	  maintainer.
	114	- `log.clear()` empties the buffer so a user can reset before a clean
	115	  reproduction.
	116	
	117	The buffer is the reason console-only logging is usable for bugs that cannot be
	118	reproduced on demand: the detail is already captured when the user makes
	119	contact, rather than requiring them to have raised the level before the bug
	120	occurred.
	121	
	122	### Transport seam
	123	
	124	`log.transport` is `null` by default. When assigned a function, it receives
	125	every record after redaction — including records below the print threshold,
	126	matching what the buffer retains. A transport that wants less is responsible
	127	for its own filtering; the seam's job is to expose everything the logger knows,
	128	since a remote collector generally wants more detail than a console does. The
	129	call is wrapped in `try/catch`; a transport that throws is disabled after its
	130	first failure and reported once at `warn`. This is the whole extension point
	131	for future remote shipping.
	132	
	133	## Instrumentation
	134	
	135	Six call sites in `app.js`, replacing the three existing ad-hoc calls:
	136	
	137	| Point | Level | Meta |
	138	|---|---|---|
	139	| Submit handler entry | `debug` | `{ username }` |
	140	| Validation failed | `warn` | `{ username, error }` |
	141	| Validation passed | `debug` | `{ username }` |
	142	| `login()` entry | `info` | `{ username, endpoint: API_ENDPOINT }` |
	143	| `login()` returning | `info` | `{ username, success }` |
	144	| `login()` threw | `error` | `{ username, error: err.message }` |
	145	
	146	`password` is never passed to the logger. The deny-list is the second layer,
	147	for the case where someone later passes a whole form object: the first layer is
	148	discipline and the second is code.
	149	
	150	The `login()` call in the submit handler gains a `try/catch`. `login()` is
	151	currently a stub that cannot throw, so the error row is presently unreachable —
	152	it exists because the handler has no failure path at all today, and a rejected
	153	login would otherwise surface as an unhandled rejection with no log line.
	154	
	155	This also gives `API_ENDPOINT` — currently declared and unused — its first real
	156	use.
	157	
	158	### Global handlers
	159	
	160	`logger.js` registers `window.addEventListener('error', ...)` and
	161	`window.addEventListener('unhandledrejection', ...)`. Both log at `error` with
	162	the message, source location, and stack where available. These catch failures
	163	nobody thought to instrument, which is why explicit call sites were chosen over
	164	intercepting `console`.
	165	
	166	## Error handling
	167	
	168	The logger must never break the page it exists to debug. Every path either
	169	produces a record or produces nothing, and never propagates.
	170	
	171	- **`localStorage` throws.** Access fails in sandboxed contexts, including
	172	  `file://` in some browsers and older Safari private mode. Since this is a
	173	  static page with no server, `file://` is a realistic way it gets opened. Both
	174	  the read and the write are wrapped; on failure the level falls back to
	175	  `info`.
	176	- **Unserializable or circular `meta`.** Handled by the redactor's visited-set,
	177	  which emits `[circular]`.
	178	- **A throwing transport.** Caught, disabled after first failure, reported once
	179	  at `warn`. A broken log shipper degrades to local logging rather than taking
	180	  down the login form.
	181	
	182	## Rejected alternatives
	183	
	184	- **Intercepting `console`.** Monkeypatching `console.log/warn/error` would
	185	  need no call-site changes and would catch code written later. Rejected on two
	186	  counts: intercepted calls are variadic positional arguments, so the chosen
	187	  deny-list redaction has no structured payload to walk; and every devtools log
	188	  line would attribute to `logger.js` instead of its real source, which is
	189	  worse for the debugging this exists to support.
	190	- **Allow-list redaction.** Fails closed and is genuinely safer, but adds a
	191	  decision at every log call. See the redaction section for why that friction
	192	  is self-defeating.
	193	- **Remote shipping or a third-party service now.** No collector exists, the
	194	  repo has no privacy or retention position, and it currently has zero runtime
	195	  dependencies. The transport seam makes this a contained follow-up.
	196	- **A dual-format module or a build step** so `src/index.js` could share the
	197	  logger. `src/index.js` is a `greet('world')` stub with no production role;
	198	  instrumenting it would force a module-format decision the repo is not ready
	199	  to make.
	200	
	201	## Testing
	202	
	203	`node:test` (built into Node, no install) loads `logger.js` with `readFileSync`
	204	and evaluates it in a `node:vm` context holding fake `window`, `localStorage`,
	205	and `console` objects. Assertions run against the fake console and the values
	206	returned by `dump()`. This tests the real file rather than a copy.
	207	
	208	Coverage:
	209	
	210	- Level resolution: default, valid `localStorage` value, valid URL parameter,
	211	  invalid values falling back, the URL parameter persisting to `localStorage`.
	212	- Threshold filtering: records below threshold are buffered but not printed.
	213	- Redaction: each deny-listed key, nested objects, case-insensitive matching,
	214	  circular references, redaction applied before buffering.
	215	- Ring buffer: wraparound at 200, chronological order from `dump()`, `clear()`.
	216	- Transport: invoked with redacted records, a throwing transport is caught and
	217	  disabled.
	218	- Resilience: a `localStorage` that throws on read and on write.
	219	
	220	A `test` script is added to `package.json`. The DOM wiring in `app.js` is not
	221	unit-tested; it is verified by opening the page and exercising the form.
	222	
	223	## Out of scope
	224	
	225	- Any remote log destination, collector, or third-party service.
	226	- Logging in `src/index.js` or `src/utils.js`.
	227	- A build step, bundler, linter, or formatter.
	228	- End-to-end browser tests.
	229	- Making `login()` perform a real network request.
	230	
	231	## Global constraints
	232	
	233	- No new runtime dependencies. No new devDependencies.
	234	- No build step.
	235	- Unit tests via `node:test` accompany the logger.
	236	- The logger never throws into calling code.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T113359Z-3245/home/.cache/hyperpowers/codex-review/56716478980554b5e5ce587bf2e68e225d80eab1/run-nDKtdfgd/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	"Add logging to the app so we can debug production issues."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where do the logs need to end up for you to debug a production issue?**
	10	   Answer: Console output, with a seam in the module where a remote transport
	11	   could be added later. Not shipping to a remote endpoint now; not adopting a
	12	   third-party service (Sentry etc.) now.
	13	
	14	2. **What scope should the logger cover?**
	15	   Answer: The browser app only (`index.html` + `app.js`). The Node entry point
	16	   (`src/index.js`) is out of scope and keeps its current bare `console.log`.
	17	
	18	3. **How should the logger handle sensitive data?**
	19	   Answer: Redact by deny-list on key name (password / token / secret style
	20	   keys).
	21	
	22	4. **Should the username be logged?**
	23	   Answer: Yes, log the username in cleartext — it is the correlation handle
	24	   for tying a user's bug report to a log line. This is a deliberate, recorded
	25	   choice.
	26	
	27	5. **How should the log level be controlled at runtime?**
	28	   Answer: Default level `info`, overridable via `localStorage`, with a URL
	29	   query parameter accepted as a convenience that writes into `localStorage`
	30	   so raised verbosity survives page reloads during a reproduction.
	31	
	32	## Codebase facts
	33	
	34	Repository is tiny. Complete file list (excluding `.git`):
	35	
	36	```
	37	index.html
	38	README.md
	39	package.json
	40	app.js
	41	src/index.js
	42	src/utils.js
	43	```
	44	
	45	### `package.json` (complete)
	46	
	47	```json
	48	{
	49	  "name": "drill-test-project",
	50	  "version": "1.0.0",
	51	  "description": "Test project for Drill scenarios",
	52	  "main": "src/index.js"
	53	}
	54	```
	55	
	56	No dependencies. No devDependencies. No `scripts` block. No test runner, no
	57	linter, no formatter, no bundler, no build step of any kind configured.
	58	
	59	### `index.html` (complete)
	60	
	61	```html
	62	<!DOCTYPE html>
	63	<html>
	64	<head>
	65	  <title>Simple Webapp</title>
	66	</head>
	67	<body>
	68	  <h1>Login</h1>
	69	  <form id="login-form">
	70	    <input type="text" id="username" placeholder="Username" />
	71	    <input type="password" id="password" placeholder="Password" />
	72	    <button type="submit">Log In</button>
	73	  </form>
	74	  <script src="app.js"></script>
	75	</body>
	76	</html>
	77	```
	78	
	79	`app.js` is loaded by a plain `<script src>` tag. There is no `type="module"`,
	80	no import map, and no bundler.
	81	
	82	### `app.js` (complete)
	83	
	84	```js
	85	// Simple webapp with login form handling
	86	const API_ENDPOINT = "https://api.example.com/login";
	87	
	88	function login(username, password) {
	89	  console.log("Logging in:", username);
	90	  // Stub: would POST to API_ENDPOINT in real app
	91	  return { success: true, user: username };
	92	}
	93	
	94	function validateForm(formData) {
	95	  if (!formData.username || !formData.password) {
	96	    return { valid: false, error: "Missing required fields" };
	97	  }
	98	  return { valid: true };
	99	}
	100	
	101	document.getElementById("login-form").addEventListener("submit", (e) => {
	102	  e.preventDefault();
	103	  const username = document.getElementById("username").value;
	104	  const password = document.getElementById("password").value;
	105	  const validation = validateForm({ username, password });
	106	  if (validation.valid) {
	107	    const result = login(username, password);
	108	    console.log("Login result:", result);
	109	  } else {
	110	    console.error("Validation error:", validation.error);
	111	  }
	112	});
	113	```
	114	
	115	Notes on current state:
	116	- `login()` is a stub; it performs no network call. `API_ENDPOINT` is declared
	117	  but unused.
	118	- Logging today is three ad-hoc calls: `console.log` of the username inside
	119	  `login()`, `console.log` of the login result at the call site, and
	120	  `console.error` of the validation error.
	121	- The plaintext password is held in a local variable in the submit handler, one
	122	  line away from the existing log calls.
	123	- All functions and the submit handler live in the single top-level script
	124	  scope; nothing is exported and there is no module system in the browser path.
	125	
	126	### `src/index.js` (complete)
	127	
	128	```js
	129	const { greet } = require('./utils');
	130	
	131	function main() {
	132	  console.log(greet('world'));
	133	}
	134	
	135	main();
	136	```
	137	
	138	### `src/utils.js` (complete)
	139	
	140	```js
	141	function greet(name) {
	142	  return `Hello, ${name}!`;
	143	}
	144	
	145	module.exports = { greet };
	146	```
	147	
	148	`src/` uses CommonJS. The browser path does not. The two currently share no
	149	code.
	150	
	151	### Git
	152	
	153	Branch `feature/webapp-enhancement`, clean working tree. Recent commits:
	154	`Add simple webapp fixture`, `add entry point`, `add utils module`,
	155	`initial commit`.
	156	
	157	## Constraints
	158	
	159	- No build step exists and introducing one was explicitly rejected in the scope
	160	  answer.
	161	- The repository currently has zero runtime dependencies; adding a third-party
	162	  logging service was explicitly rejected.
	163	- There is no environment concept (no dev/prod distinction available at
	164	  runtime) because there is no build and no server-rendered configuration.
	165	- The app is a static page opened directly; there is no server-side component
	166	  in the repository.
	167	
	168	## What to produce
	169	
	170	Independent approaches for how to structure browser-side logging for this
	171	codebase under the answers and constraints above: how the logging code is
	172	organized, how it is wired into the existing page and submit flow, how the
	173	level threshold and redaction are applied, and where the future remote
	174	transport attaches.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
