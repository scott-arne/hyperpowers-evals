# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260926T081249Z-169d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The login API endpoint is a hardcoded constant at the top of `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application code.
	15	There is nowhere to put a second environment's URL, and nowhere to put a
	16	second piece of configuration.
	17	
	18	## Goal
	19	
	20	Move the endpoint configuration out of `app.js` into a dedicated settings
	21	module, so switching environments does not require editing application logic,
	22	and so later configuration has an established home.
	23	
	24	## Non-goals
	25	
	26	- No change to login behavior. `login()` is a stub that logs and returns a
	27	  canned result; this work does not make it issue a real request.
	28	- No build tooling, bundler, package manager dependency, or test
	29	  infrastructure. The repository has none today and gains none here.
	30	- No changes to `src/index.js` or `src/utils.js`. That is a separate
	31	  CommonJS Node area unrelated to the browser page.
	32	
	33	## Constraints
	34	
	35	- `index.html` loads `app.js` as a classic script (`<script src="app.js">`).
	36	  There is no module system in the browser and no build step.
	37	- `index.html` must remain openable directly from disk over `file://`. This
	38	  is what rules out ES modules, which are fetched under CORS rules and fail
	39	  on `file://`.
	40	- The repository is zero-dependency. It stays that way.
	41	
	42	## Global Constraints
	43	
	44	- **Tooling:** none added. No linter, no formatter, no unit-test runner, no
	45	  end-to-end tests. Verification is manual (see Testing).
	46	- **Style:** match the existing browser-side code — `const` plus plain
	47	  function declarations, no framework, no transpilation, no classes.
	48	
	49	## Design
	50	
	51	### New file: `settings.js`
	52	
	53	A new file at the repository root, alongside `app.js`. The root is the
	54	browser-side area of this repo; `src/` is the unrelated Node area.
	55	
	56	`settings.js` has one responsibility: resolve the current environment from
	57	the page's hostname and publish the resulting configuration as a frozen
	58	global.
	59	
	60	Structure:
	61	
	62	```js
	63	const ENVIRONMENTS = {
	64	  dev:     { apiBaseUrl: "<DEV_BASE_URL>" },
	65	  staging: { apiBaseUrl: "<STAGING_BASE_URL>" },
	66	  prod:    { apiBaseUrl: "https://api.example.com" },
	67	};
	68	
	69	const HOSTNAME_ENVIRONMENTS = {
	70	  "localhost": "dev",
	71	  "127.0.0.1": "dev",
	72	  "<STAGING_HOSTNAME>": "staging",
	73	};
	74	
	75	function resolveEnvironment(hostname) {
	76	  return HOSTNAME_ENVIRONMENTS[hostname] || "prod";
	77	}
	78	
	79	const environment = resolveEnvironment(window.location.hostname);
	80	window.SETTINGS = Object.freeze({
	81	  environment: environment,
	82	  apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
	83	});
	84	```
	85	
	86	`resolveEnvironment` takes the hostname as a parameter rather than reading
	87	`window.location` internally. The mapping is the only logic in the file, and
	88	taking the hostname as an argument keeps it inspectable and independently
	89	callable; it costs nothing over reading the global inline.
	90	
	91	`Object.freeze` prevents a later script from mutating configuration out from
	92	under the application.
	93	
	94	### Unresolved values
	95	
	96	Three values are not yet known and are written above as placeholders. They
	97	must be supplied before implementation:
	98	
	99	- `Assumption: the staging hostname is unknown; validate by asking the
	100	  repository owner before implementation.`
	101	- `Assumption: the dev API base URL is unknown; validate by asking the
	102	  repository owner before implementation.`
	103	- `Assumption: the staging API base URL is unknown; validate by asking the
	104	  repository owner before implementation.`
	105	
	106	Only the production URL is carried over from existing code and is therefore
	107	known: `https://api.example.com`.
	108	
	109	### Configuration shape
	110	
	111	Each environment holds a base URL (`apiBaseUrl`), not a complete endpoint
	112	URL. Callers append their own path. Adding a second endpoint is then a
	113	one-line change at the call site rather than one new entry per environment.
	114	
	115	The existing constant bakes the path in (`.../login`). Splitting it means the
	116	`/login` path moves into `app.js`, where the login call lives.
	117	
	118	### Loading
	119	
	120	`index.html` gains exactly one line, immediately above the existing `app.js`
	121	tag:
	122	
	123	```html
	124	<script src="settings.js"></script>
	125	<script src="app.js"></script>
	126	```
	127	
	128	Both are classic scripts, so the browser executes them in document order.
	129	`window.SETTINGS` is therefore assigned before `app.js` runs.
	130	
	131	This global-script approach was chosen over ES modules specifically to
	132	preserve `file://` loading, and because it matches the style already in
	133	`app.js`.
	134	
	135	### Changes to `app.js`
	136	
	137	- Delete the `API_ENDPOINT` constant.
	138	- In `login()`, build the URL where it is used:
	139	  `window.SETTINGS.apiBaseUrl + "/login"`.
	140	- Add a guard at the top of `login()` that throws `new Error("settings.js
	141	  must be loaded before app.js")` when `window.SETTINGS` is undefined. The
	142	  check lives in `login()` rather than at file scope so that loading `app.js`
	143	  alone does not throw during page parse.
	144	
	145	Because `login()` is a stub, this is a structural change with no observable
	146	runtime difference today.
	147	
	148	## Data flow
	149	
	150	1. Browser parses `index.html`.
	151	2. `settings.js` executes: reads `window.location.hostname`, resolves the
	152	   environment, assigns frozen `window.SETTINGS`.
	153	3. `app.js` executes: registers the submit handler.
	154	4. On submit, `login()` reads `window.SETTINGS.apiBaseUrl` and composes the
	155	   endpoint URL.
	156	
	157	Configuration is read at call time rather than captured at load time, so
	158	nothing depends on module-level evaluation order beyond the script tags.
	159	
	160	## Error handling
	161	
	162	| Case | Behavior | Rationale |
	163	|---|---|---|
	164	| Hostname not in the map | Resolves to `prod` | Any host not named here is a real deployment. Prod is also the endpoint the app used before this change, so a forgotten map entry degrades to "works, points at prod" rather than "broken". |
	165	| `window.SETTINGS` absent | `login()` throws `Error("settings.js must be loaded before app.js")` | Someone reordering or dropping the script tag should get a clear failure, not a request to `undefined/login`. |
	166	| Config mutated at runtime | Prevented by `Object.freeze` | Configuration should not be rewritable by unrelated code. |
	167	
	168	## Testing
	169	
	170	No test infrastructure is added; this was an explicit decision, not an
	171	oversight. Verification is manual:
	172	
	173	1. Open `index.html` from disk (`file://`) and confirm in the console that
	174	   `window.SETTINGS` is defined and `environment` is `"prod"` (a `file://`
	175	   page has an empty hostname, which is not in the map and so falls back).
	176	2. Serve the directory on `localhost` and confirm `environment` is `"dev"`
	177	   and `apiBaseUrl` is the dev URL.
	178	3. Submit the login form in both cases and confirm the existing console
	179	   output is unchanged.
	180	
	181	## Files touched
	182	
	183	| File | Change |
	184	|---|---|
	185	| `settings.js` | New |
	186	| `index.html` | One added `<script>` line |
	187	| `app.js` | Constant removed; URL composed in `login()`; missing-settings guard |
	188	| `src/*`, `package.json`, `README.md` | Untouched |
	189	
	190	## Rejected alternatives
	191	
	192	- **Build-time injection of the endpoint.** The conventional answer, but it
	193	  requires adding a bundler and build step to a repository that has neither,
	194	  and it ends the ability to open `index.html` directly.
	195	- **A single hand-edited `ACTIVE_ENV` constant.** Simpler, but the switch
	196	  stays manual and a wrong value can be committed. Hostname detection makes
	197	  the switch automatic at no extra cost.
	198	- **ES modules.** The better long-term boundary, but `type="module"` breaks
	199	  `file://` loading. Worth doing deliberately as its own change, not as a
	200	  side effect of relocating a constant.
	201	- **Full endpoint URLs per environment.** Readable, but each new endpoint
	202	  would have to be added once per environment.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260926T081249Z-169d/home/.cache/hyperpowers/codex-review/5cffcd1a25df8582411e02b16507ed0d77136f9f/run-QTPvLn6L/adjudications.md

	1	# Approved design decisions (from brainstorming, 2026-09-26)
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Four forks were presented to the user in chat with trade-offs; the user chose
	9	each option below explicitly. These are settled decisions, not open questions.
	10	Do not re-litigate them; review the spec for whether it implements them
	11	completely and consistently.
	12	
	13	1. **Environment selection: hostname detection.**
	14	   Chosen over (a) a hand-edited `ACTIVE_ENV` constant and (b) build-time
	15	   injection. Build-time injection was rejected because the repository has no
	16	   bundler or build step and adding one was out of scope.
	17	
	18	2. **Module loading: classic script tag exposing a global.**
	19	   Chosen over ES modules. ES modules were rejected specifically because
	20	   `type="module"` is fetched under CORS rules and would break opening
	21	   `index.html` over `file://`, which the user wanted preserved.
	22	
	23	3. **Config shape: base URL per environment, paths appended by callers.**
	24	   Chosen over storing complete endpoint URLs per environment.
	25	
	26	4. **Environments: dev + staging + prod.**
	27	
	28	5. **Tooling: none added.**
	29	   The user was explicitly offered unit tests (zero-dep `node:test`) and
	30	   eslint+prettier, and declined both. The repository is zero-dependency and
	31	   stays that way. Verification is manual. Absence of automated tests is a
	32	   recorded decision, not an oversight — do not raise it as a blocking
	33	   finding.
	34	
	35	## Known-open items (already flagged to the user)
	36	
	37	Three values are genuinely unknown and are written in the spec as explicit
	38	`Assumption: ... validate by asking the repository owner` lines: the staging
	39	hostname, the dev API base URL, and the staging API base URL. The user will
	40	supply these at spec review. Flag them only if the spec handles them
	41	inconsistently.
	42	
	43	## Repository context
	44	
	45	- `index.html` loads `app.js` via a plain `<script src="app.js">`.
	46	- `app.js` holds `const API_ENDPOINT = "https://api.example.com/login";` and a
	47	  stubbed `login()` that only logs — it issues no real HTTP request today.
	48	- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node area and
	49	  are out of scope.
	50	- `package.json` has no dependencies and no scripts.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
