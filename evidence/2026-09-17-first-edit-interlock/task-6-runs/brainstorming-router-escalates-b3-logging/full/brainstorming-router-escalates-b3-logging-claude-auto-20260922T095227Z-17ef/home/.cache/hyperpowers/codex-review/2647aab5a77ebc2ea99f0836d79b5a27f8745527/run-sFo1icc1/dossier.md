# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260922T095227Z-17ef/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-browser-logging-design.md

	1	# Browser Logging for Production Debugging — Design
	2	
	3	Date: 2026-09-22
	4	Status: Awaiting human review
	5	Scope: the browser app (`index.html`, `app.js`) only
	6	
	7	## Problem
	8	
	9	Production failures in the browser app are reported by users after the fact,
	10	and there is no way to find out what happened. The app's only instrumentation
	11	is four `console.*` calls in `app.js`, which are visible solely to whoever has
	12	the affected browser's devtools open at the time. There is no record of
	13	uncaught exceptions, no way to correlate a user's report to what their session
	14	actually did, and no store to search.
	15	
	16	The goal is that when a user reports a login failure, the failure can be looked
	17	up afterward: what the app was doing, what error occurred, and whether it
	18	affected one session or many.
	19	
	20	## Non-goals
	21	
	22	- The Node CLI (`src/index.js`, `src/utils.js`). It shares no code with the
	23	  browser app and is a `greet()` stub with nothing to debug.
	24	- Analytics, product metrics, or user-behaviour tracking. This is diagnostic
	25	  logging only.
	26	- Server-side logging. The `API_ENDPOINT` POST is a stub and there is no server
	27	  in this repository.
	28	- Building our own log ingest, batching, or retry. That is the vendor's job and
	29	  is the reason a vendor was chosen.
	30	
	31	## Decisions made during brainstorming
	32	
	33	| Decision | Choice | Rationale |
	34	|---|---|---|
	35	| Scope | Browser app only | Where real users and real failures are |
	36	| Debug mode | Logs ship off-device | Failures are reported after the fact |
	37	| Destination | Sentry, behind a first-party wrapper | Reliable delivery, grouping, source maps on day one |
	38	| User data | Field allowlist + pseudonymous `userHash` | Correlation without storing raw identifiers |
	39	| Packaging | npm + esbuild | Source-map upload; readable production stack traces |
	40	| Error messages | Included, truncated and scrubbed | Useful enough to justify the residual leak risk |
	41	| Tooling added | vitest, eslint + prettier | Cheapest moment; redaction needs a regression net |
	42	
	43	## Security and privacy consequences
	44	
	45	This change is recorded here explicitly because it extends beyond the lines of
	46	code it touches.
	47	
	48	1. **New third-party egress from a credential-handling page.** `index.html`
	49	   contains a password field. After this change the same page opens a network
	50	   path to Sentry. No password ever crosses it (see Redaction), but the path
	51	   exists and is part of the app's threat model from now on.
	52	2. **A new processor of user data.** Sentry will hold pseudonymized user
	53	   identifiers and error content originating from your users. This brings them
	54	   into scope for your data-processing agreements and your retention policy.
	55	   Both need to be settled before the first production deploy; the code cannot
	56	   settle them.
	57	3. **`userHash` is pseudonymization, not anonymization.** `userHash =
	58	   sha256(USER_HASH_SALT + username)`, truncated to 16 hex characters. The salt
	59	   is compiled into the client bundle and is therefore public, and usernames
	60	   are low-entropy, so the original username is recoverable by dictionary
	61	   attack by anyone holding both the bundle and the log store. The value is
	62	   suitable for correlating one user's events; it must not be described as
	63	   anonymous in privacy documentation. Treat the Sentry project as containing
	64	   pseudonymized personal data.
	65	4. **The Sentry DSN is public by design.** It is an ingest key embedded in
	66	   client code, not a secret. Anyone can read it and post events to the
	67	   project. This is expected; the mitigation is Sentry's inbound filters and
	68	   rate limits, not concealment.
	69	5. **Existing plaintext logging is removed.** `app.js:5` currently logs the
	70	   username in cleartext on every login attempt. This change replaces it. Had
	71	   logging been added without this step, that line would have begun shipping
	72	   raw usernames to a third party.
	73	6. **Source maps are uploaded to Sentry and never served publicly.** Serving
	74	   them would expose unminified source to anyone who requests it.
	75	
	76	## Architecture
	77	
	78	Four modules, each with a single responsibility. Data flows in one direction
	79	with exactly one choke point.
	80	
	81	```
	82	call site -> logger/index.js -> logger/redact.js -> logger/sink-sentry.js -> Sentry
	83	                   ^
	84	        logger/capture.js (global error handlers)
	85	```
	86	
	87	### `src/logger/index.js`
	88	
	89	The only module the application imports. Public API:
	90	
	91	- `log.debug(event, fields)` / `log.info(...)` / `log.warn(...)` / `log.error(...)`
	92	- `log.setUser(username)` — computes and stores `userHash`; never stores the
	93	  username itself
	94	- `log.init(config)` — called once at startup; wires the sink and installs
	95	  capture
	96	
	97	Call sites never reference Sentry's API. This wrapper is what keeps the vendor
	98	replaceable and is the reason the destination decision is reversible.
	99	
	100	Responsibilities: assemble the record, apply the level filter, enforce the
	101	volume cap and recursion guard, pass the record to `redact`, hand the result to
	102	the sink, and never throw.
	103	
	104	### `src/logger/redact.js`
	105	
	106	Pure, dependency-free, and the single enforcement point for the privacy rules.
	107	Exports `redact(record)`.
	108	
	109	Order of operations, deliberately denylist-before-allowlist so that a future
	110	allowlist edit cannot accidentally admit a credential:
	111	
	112	1. **Value denylist.** Drop any key matching `/pass|pwd|secret|token|auth|cookie/i`.
	113	2. **Field allowlist.** Retain only these keys; drop everything else:
	114	   `event`, `level`, `ts`, `sessionId`, `userHash`, `release`, `errorName`,
	115	   `errorMessage`, `durationMs`, `httpStatus`, `formField`.
	116	3. **Dropped-key accounting.** For each dropped key emit the *key name only*
	117	   under a `redact.dropped_field` event, so a misbehaving call site is visible
	118	   without its payload being transmitted.
	119	4. **`errorMessage` treatment.** Truncate to 200 characters, then scrub
	120	   substrings matching an email-address pattern and digit runs of 7 or more,
	121	   replacing each with `[redacted]`.
	122	
	123	`errorMessage` is a stated residual risk: error strings are the most common
	124	place user data leaks into logs. Truncation and scrubbing are mitigation, not a
	125	guarantee. The accepted alternative, if the residual risk proves unacceptable
	126	in review, is to drop `errorMessage` and retain only `errorName`.
	127	
	128	### `src/logger/sink-sentry.js`
	129	
	130	The only module that imports `@sentry/browser`. Handles `Sentry.init`, maps the
	131	internal record shape onto Sentry's event/breadcrumb model, and exposes a
	132	single `send(record)` function. Batching, retry, and offline queueing are
	133	Sentry's responsibility and are not reimplemented.
	134	
	135	### `src/logger/capture.js`
	136	
	137	Installs `window.onerror` and `window.addEventListener('unhandledrejection')`,
	138	translating each into an `app.unhandled_error` / `app.unhandled_rejection`
	139	event. This is the highest-value component for the stated goal: it catches the
	140	failures nobody thought to instrument, which is the usual shape of a
	141	user-reported production issue.
	142	
	143	## Record shape
	144	
	145	Every record is a flat object built by the logger, never by a call site:
	146	
	147	```js
	148	{
	149	  event,        // stable dot-delimited identifier, not prose
	150	  level,        // debug | info | warn | error
	151	  ts,           // ISO 8601
	152	  sessionId,    // random, minted once per page load
	153	  userHash,     // present only after log.setUser()
	154	  release,      // git sha, injected at build time
	155	  ...fields     // allowlisted only
	156	}
	157	```
	158	
	159	`event` names are stable identifiers rather than sentences so that logs stay
	160	groupable and searchable. Initial vocabulary:
	161	
	162	- `login.submit`
	163	- `login.validation_failed` (carries `formField`)
	164	- `login.result` (carries `httpStatus`, `durationMs`)
	165	- `login.error` (carries `errorName`, `errorMessage`)
	166	- `app.unhandled_error`, `app.unhandled_rejection`
	167	- `logger.rate_limited`, `redact.dropped_field`
	168	
	169	`sessionId` is what makes a user's report reconstructable as a sequence rather
	170	than a set of disconnected lines.
	171	
	172	## Changes to `app.js`
	173	
	174	1. Becomes an ES module and imports the logger.
	175	2. `log.init()` at startup; `log.setUser(username)` on submit.
	176	3. `console.log("Logging in:", username)` at `app.js:5` is **removed** and
	177	   replaced by `log.info('login.submit')`, which carries no raw identifier.
	178	4. `console.log("Login result:", result)` becomes `log.info('login.result', …)`.
	179	5. `console.error("Validation error:", …)` becomes
	180	   `log.warn('login.validation_failed', { formField })` — the field *name*, not
	181	   its value.
	182	6. The `login()` call is wrapped so a thrown error produces `login.error`.
	183	
	184	## Build and configuration
	185	
	186	- `package.json` gains: dependency `@sentry/browser`; devDependencies
	187	  `esbuild`, `vitest`, `eslint`, `prettier`; scripts `build`, `watch`, `test`,
	188	  `lint`, `format`, `sourcemaps`.
	189	- `build`: esbuild bundles `app.js` to `dist/app.js` with `--sourcemap`.
	190	- `index.html:13` changes from `<script src="app.js">` to
	191	  `<script type="module" src="dist/app.js">`.
	192	- Build-time configuration via esbuild `--define`, documented in
	193	  `.env.example`: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `RELEASE` (git sha),
	194	  `USER_HASH_SALT`.
	195	- `dist/` is gitignored. Source maps are uploaded to Sentry by the
	196	  `sourcemaps` script and are not published.
	197	
	198	**Accepted regression:** opening `index.html` directly from the filesystem
	199	stops working. The app now requires `npm install && npm run build` first. This
	200	is the cost of readable production stack traces and is accepted deliberately.
	201	
	202	## Failure handling
	203	
	204	- **Never break the page.** Every public logger method wraps its body in
	205	  `try/catch` and swallows failures. In dev builds the swallowed error is
	206	  written to `console.error` so it is not invisible during development.
	207	- **Recursion guard.** A module-level `inFlight` flag prevents an error raised
	208	  inside the logger from re-entering the logger via the global handlers
	209	  installed by `capture.js`.
	210	- **Volume cap.** At most 100 events per page load. On exceeding it, emit one
	211	  `logger.rate_limited` event and drop the remainder. This protects the Sentry
	212	  quota against a render loop or retry storm, the common cause of an unexpected
	213	  bill on a first logging rollout.
	214	
	215	## Testing
	216	
	217	- `redact.test.js` — the regression net for the privacy design: a
	218	  password-shaped key is dropped; an unknown key is dropped and counted;
	219	  `errorMessage` truncates at 200 characters; an email inside `errorMessage` is
	220	  scrubbed; `userHash` is stable for a given username and differs across salts.
	221	- `logger.test.js` — against a fake sink: record shape, level filtering, volume
	222	  cap, recursion guard, and that a throwing sink does not propagate.
	223	- `capture.test.js` — both global handlers are installed and produce the
	224	  expected events.
	225	- `sink-sentry.js` — no unit test. It is a thin adapter, and a mocked Sentry
	226	  would only assert the mock. Verified once manually against a staging DSN;
	227	  that manual check is what proves the pipeline delivers end to end.
	228	
	229	## Global constraints
	230	
	231	- Lint and format (eslint + prettier) and unit tests (vitest) are set up as
	232	  part of this work; all new code passes both.
	233	- No end-to-end test infrastructure in this iteration.
	234	- Redaction is enforced structurally in `redact.js`, never by convention at
	235	  call sites. Any change that lets a call site bypass `redact()` is a defect.
	236	- No raw username, password, or form input value is ever passed to the sink.
	237	
	238	## Assumptions to validate
	239	
	240	- Assumption: a Sentry account and project exist, or one will be created
	241	  before rollout; validate by obtaining a staging DSN prior to implementation.
	242	- Assumption: sending pseudonymized user identifiers and error content to
	243	  Sentry is permitted under the project's data-protection obligations;
	244	  validate with whoever owns that policy before the first production deploy.
	245	- Assumption: a git sha is available at build time to serve as `RELEASE`;
	246	  validate against the deployment pipeline, which is not in this repository.
	247	
	248	## Open questions for the reviewer
	249	
	250	1. Who owns the Sentry project, and what retention period should be set?
	251	2. The `errorMessage` residual-leak risk was accepted during brainstorming.
	252	   Confirm that still holds once whoever owns data-protection policy has seen
	253	   it; the fallback is `errorName` only, which is a one-line change in
	254	   `redact.js`.
	255	3. Is there a deployment pipeline that should run `build` and `sourcemaps`, or
	256	   is this built and deployed by hand today?


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260922T095227Z-17ef/home/.cache/hyperpowers/codex-review/2647aab5a77ebc2ea99f0836d79b5a27f8745527/run-uZBYRST0/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Which program does "the app" mean for this logging work?**
	10	   Answer: The browser app only (`index.html` + `app.js`, the login form). The
	11	   Node CLI under `src/` is out of scope.
	12	
	13	2. **What does debugging a production issue look like today?**
	14	   Answer: Users report issues after the fact. Logs must leave the browser and
	15	   land somewhere searchable later.
	16	
	17	3. **Where should the shipped logs land?**
	18	   Answer: An existing third-party error/log service, accessed through a
	19	   first-party wrapper module.
	20	
	21	4. **What user data may leave the browser in a log record?**
	22	   Answer: An allowlist of explicitly-safe fields, plus a one-way hash of the
	23	   username for correlation. Passwords never leave the browser under any
	24	   option. Raw usernames are not to be sent.
	25	
	26	5. **How should the logging SDK be packaged into the app?**
	27	   Answer: npm dependency plus an esbuild build step, using Sentry, so that
	28	   source maps can be uploaded and production stack traces are readable.
	29	
	30	## Codebase facts
	31	
	32	Repository root contains:
	33	
	34	```
	35	README.md
	36	app.js
	37	index.html
	38	package.json
	39	src/index.js
	40	src/utils.js
	41	```
	42	
	43	- `package.json`: name `drill-test-project`, version `1.0.0`, `main` is
	44	  `src/index.js`. There are **no** `dependencies`, no `devDependencies`, and no
	45	  `scripts` block. The project currently has zero third-party dependencies and
	46	  no build step of any kind.
	47	- `index.html` (15 lines): a plain page with a `#login-form` containing
	48	  `#username` (text), `#password` (password), and a submit button. It loads the
	49	  app with a single non-module tag: `<script src="app.js"></script>`. The page
	50	  can be opened directly from the filesystem today.
	51	- `app.js` (28 lines, browser, non-module, no imports/exports):
	52	  - `const API_ENDPOINT = "https://api.example.com/login";`
	53	  - `login(username, password)` — currently calls
	54	    `console.log("Logging in:", username)` and returns a stubbed
	55	    `{ success: true, user: username }`. A comment states it would POST to
	56	    `API_ENDPOINT` in a real app. The password parameter is accepted but unused.
	57	  - `validateForm(formData)` — returns `{ valid: false, error: "Missing
	58	    required fields" }` when username or password is empty, else `{ valid: true }`.
	59	  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
	60	    both input values, validates, then either calls `login()` and
	61	    `console.log("Login result:", result)` or `console.error("Validation
	62	    error:", validation.error)`.
	63	  - There are four `console.*` call sites total and no error handling around
	64	    `login()`.
	65	  - There are no `window.onerror` or `unhandledrejection` handlers anywhere.
	66	- `src/index.js` and `src/utils.js` are a CommonJS Node pair (`require`,
	67	  `module.exports`) implementing a `greet(name)` stub. They share no code with
	68	  `app.js` and are out of scope.
	69	- No test framework, no test files, no linter or formatter config, no CI
	70	  configuration exists in the repository.
	71	- Git: branch `feature/webapp-enhancement`, clean working tree. Recent commits
	72	  are fixture commits ("Add simple webapp fixture", "add entry point", "add
	73	  utils module", "initial commit").
	74	
	75	## What to produce
	76	
	77	Independent approaches for how to structure browser-side logging in this
	78	codebase under the constraints above: how log records are shaped and emitted,
	79	how the redaction/allowlist rule is enforced, how uncaught errors are captured,
	80	how the vendor SDK is isolated, and how the build step is introduced to a
	81	repository that currently has none.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
