# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T113136Z-6165/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module for API Endpoint Configuration
	2	
	3	Date: 2026-09-17
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	The API endpoint is a hardcoded literal in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing and committing source.
	15	There is no place for environment-specific configuration to live, and no
	16	mechanism for selecting between environments.
	17	
	18	## Goal
	19	
	20	Move the endpoint into a dedicated settings module that resolves the correct API
	21	base URL for the environment the page is being served from, so switching
	22	environments requires no code change.
	23	
	24	## Non-goals
	25	
	26	- Implementing the actual network call. `login()` stays a stub; only the
	27	  configuration moves.
	28	- Introducing a bundler, transpiler, or any build step.
	29	- Adding configuration for the Node code in `src/`, which has none today.
	30	- Authentication, secrets, or anything beyond the endpoint base URL.
	31	
	32	## Global constraints
	33	
	34	- **No new dependencies.** `package.json` stays at zero dependencies and zero
	35	  devDependencies. No linter, formatter, or test runner is added as part of this
	36	  work (explicit decision, 2026-09-17).
	37	- **No build step.** The page must remain openable directly from the filesystem
	38	  (`file://`), which rules out ES modules and `require()` in browser code.
	39	- Changes stay focused on moving the configuration; no unrelated refactoring of
	40	  `app.js`, `src/`, or `index.html`.
	41	
	42	## Design decisions
	43	
	44	Each of these was decided with the human partner during brainstorming.
	45	
	46	| Decision | Choice | Rejected alternatives |
	47	|---|---|---|
	48	| Environment selection | Hostname detection at runtime | Hand-edited `ENV` constant (switching still requires a commit); build-time injection (requires a toolchain) |
	49	| Module wiring | Second `<script>` tag exposing a global | ES modules (breaks `file://`); CommonJS in `src/` (browser cannot load it without a bundler) |
	50	| Config shape | Base URL per environment, `loginUrl` derived | Full endpoint URL per environment (repeats hosts once a second endpoint exists) |
	51	| Unknown hostname | Fall back to production | Fall back to local; throw |
	52	| Environments covered | local, staging, production | local + production only |
	53	| Tooling | None added | Unit tests; lint + format |
	54	
	55	## Architecture
	56	
	57	### New file: `settings.js` (repo root)
	58	
	59	Placed at the root beside `app.js`, because `index.html` resolves script `src`
	60	attributes relative to itself.
	61	
	62	An IIFE that publishes a single global. Structure:
	63	
	64	```js
	65	// Environment-specific API configuration. Selection is by hostname so a deploy
	66	// needs no code change; an unrecognized host is treated as production.
	67	(function (global) {
	68	  const ENVIRONMENTS = {
	69	    local:      { apiBaseUrl: "http://localhost:3000" },
	70	    staging:    { apiBaseUrl: "https://api-staging.example.com" },
	71	    production: { apiBaseUrl: "https://api.example.com" },
	72	  };
	73	
	74	  const HOSTNAME_ENVIRONMENTS = {
	75	    "localhost":           "local",
	76	    "127.0.0.1":           "local",
	77	    "staging.example.com": "staging",
	78	  };
	79	
	80	  const name = HOSTNAME_ENVIRONMENTS[global.location.hostname] || "production";
	81	  const { apiBaseUrl } = ENVIRONMENTS[name];
	82	
	83	  global.AppSettings = { environment: name, apiBaseUrl, loginUrl: `${apiBaseUrl}/login` };
	84	})(window);
	85	```
	86	
	87	Two maps rather than one, on purpose: hostnames are deployment facts that change
	88	frequently and many-to-one onto environments (`localhost` and `127.0.0.1`
	89	already both mean local), while the environment set is stable.
	90	
	91	### Public interface
	92	
	93	`window.AppSettings`, with three properties:
	94	
	95	- `environment` — the resolved environment name (`"local" | "staging" | "production"`).
	96	  Exposed so the active environment can be logged or displayed.
	97	- `apiBaseUrl` — the API origin for that environment, no trailing slash.
	98	- `loginUrl` — `apiBaseUrl` + `/login`; the direct replacement for the old
	99	  `API_ENDPOINT` constant.
	100	
	101	Consumers read `AppSettings` and never reconstruct URLs from `apiBaseUrl`
	102	themselves; a second endpoint is added as another derived property here.
	103	
	104	### Changes to existing files
	105	
	106	**`index.html`** — add the settings script immediately before the existing one:
	107	
	108	```html
	109	  <script src="settings.js"></script>
	110	  <script src="app.js"></script>
	111	```
	112	
	113	Order is load-bearing: `settings.js` must run first.
	114	
	115	**`app.js`** — remove the `API_ENDPOINT` declaration (line 2). In `login()`,
	116	replace the comment-only reference with a real read, so the module has an actual
	117	consumer and the resolved environment is visible while developing:
	118	
	119	```js
	120	function login(username, password) {
	121	  // Stub: would POST to AppSettings.loginUrl in a real app.
	122	  console.log("Logging in:", username, "via", AppSettings.loginUrl);
	123	  return { success: true, user: username };
	124	}
	125	```
	126	
	127	No other behavior in `app.js` changes.
	128	
	129	## Data flow
	130	
	131	1. The browser parses `index.html` and executes `settings.js`, which reads
	132	   `window.location.hostname` and sets `window.AppSettings`.
	133	2. `app.js` executes and registers the submit handler. It does not read settings
	134	   at this point.
	135	3. On form submit, `login()` reads `AppSettings.loginUrl`.
	136	
	137	Settings are resolved once at page load and are not reactive; the hostname
	138	cannot change without a navigation.
	139	
	140	## Error handling and failure modes
	141	
	142	- **Unrecognized hostname** — resolves to production. This is the accepted
	143	  behavior, and it carries a known cost: a staging or preview host that is
	144	  missing from `HOSTNAME_ENVIRONMENTS` will silently use the production API.
	145	  Adding a new deployment host therefore requires a matching map entry.
	146	- **`settings.js` missing or loaded after `app.js`** — `AppSettings` is
	147	  undefined and `login()` throws a `ReferenceError` on submit rather than at
	148	  page load. This is the accepted cost of global-plus-script-tag wiring; the ES
	149	  module alternative would have surfaced it at load time. Mitigation is limited
	150	  to keeping the two tags adjacent in `index.html`.
	151	- **Unknown environment name in the map** — not reachable: every value in
	152	  `HOSTNAME_ENVIRONMENTS`, plus the `"production"` default, must be a key of
	153	  `ENVIRONMENTS`. Keeping that true is a maintenance invariant of the file, not
	154	  a runtime check.
	155	
	156	No new failure mode reaches the user, because no network call exists yet.
	157	
	158	## Assumptions to validate
	159	
	160	- Assumption: staging is served from `staging.example.com` and its API is
	161	  `https://api-staging.example.com`; validate by confirming the real staging
	162	  hostnames with the human partner before or at implementation.
	163	- Assumption: local development serves the API at `http://localhost:3000`;
	164	  validate the same way.
	165	- Assumption: production continues to serve the API at `https://api.example.com`,
	166	  carried over unchanged from the current `API_ENDPOINT`; validate by reading the
	167	  existing value, which this design preserves exactly.
	168	
	169	Placeholder hostnames are safe to ship in the sense that the production value is
	170	unchanged from today and the others only affect hosts that are not yet real.
	171	
	172	## Verification
	173	
	174	No automated tests, per the tooling decision. Manual verification:
	175	
	176	1. Open `index.html` from the filesystem. `file://` has an empty hostname, so it
	177	   falls through to production. In the console, `AppSettings` shows
	178	   `environment: "production"` and `loginUrl: "https://api.example.com/login"` —
	179	   identical to the value `API_ENDPOINT` held before this change.
	180	2. Submit the form with both fields filled. The log line names the login URL and
	181	   no error is thrown.
	182	3. Submit with a field empty. The existing validation error still appears,
	183	   unchanged.
	184	4. Serve the directory over `http://localhost:<port>` and reload. `AppSettings`
	185	   now reports `environment: "local"` and the localhost base URL, demonstrating
	186	   that environment selection works without a code change.
	187	
	188	## Future work
	189	
	190	Explicitly out of scope, recorded so the shape is not designed against by accident:
	191	
	192	- A real `fetch` in `login()` will be the first genuine consumer of `loginUrl`.
	193	- Further endpoints are added as derived properties on `AppSettings`, not by
	194	  building URLs at call sites.
	195	- If a build step is ever adopted, `settings.js` converts to an ES module and the
	196	  hostname map can be replaced by injected values; nothing in this design blocks
	197	  that.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T113136Z-6165/home/.cache/hyperpowers/codex-review/b4bac2b2af029fdc3257d8416d98b508ff1985bc/run-180v2iO2/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	"Move the API endpoint config into a new settings module so it's easier to change environments."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Q: How should the app decide which environment's API endpoint to use?**
	10	   (options offered: hostname detection; hand-edited constant; build-time injection)
	11	   **A: Hostname detection** — the settings module maps `location.hostname` to a base URL.
	12	
	13	2. **Q: How should the settings module be wired into the page?**
	14	   (options offered: second `<script>` tag exposing a global; ES modules with `type="module"`; CommonJS in `src/`)
	15	   **A: Second `<script>` tag exposing a global**, loaded before `app.js`. Rationale given: preserves zero-build setup and keeps `file://` working.
	16	
	17	3. **Q: What shape should the settings map take?**
	18	   (options offered: base URL per environment with a derived login path; full endpoint URL per environment)
	19	   **A: Base URL per environment, with a derived `loginUrl`.**
	20	
	21	4. **Q: What should happen when the hostname matches no known environment?**
	22	   (options offered: fall back to production; fall back to local/dev; throw)
	23	   **A: Fall back to production.**
	24	
	25	5. **Q: Which environments should the map cover?**
	26	   (options offered: local + staging + production; local + production; user supplies the list)
	27	   **A: local + staging + production.** Real hostnames are not yet known and will be
	28	   placeholders flagged as assumptions to confirm.
	29	
	30	## Codebase facts
	31	
	32	Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`, `src/`.
	33	Git branch `feature/webapp-enhancement`, working tree clean. 4 commits total.
	34	
	35	### `app.js` (29 lines, browser, classic script — no module syntax)
	36	
	37	```js
	38	// Simple webapp with login form handling
	39	const API_ENDPOINT = "https://api.example.com/login";
	40	
	41	function login(username, password) {
	42	  console.log("Logging in:", username);
	43	  // Stub: would POST to API_ENDPOINT in real app
	44	  return { success: true, user: username };
	45	}
	46	
	47	function validateForm(formData) {
	48	  if (!formData.username || !formData.password) {
	49	    return { valid: false, error: "Missing required fields" };
	50	  }
	51	  return { valid: true };
	52	}
	53	
	54	document.getElementById("login-form").addEventListener("submit", (e) => {
	55	  e.preventDefault();
	56	  const username = document.getElementById("username").value;
	57	  const password = document.getElementById("password").value;
	58	  const validation = validateForm({ username, password });
	59	  if (validation.valid) {
	60	    const result = login(username, password);
	61	    console.log("Login result:", result);
	62	  } else {
	63	    console.error("Validation error:", validation.error);
	64	  }
	65	});
	66	```
	67	
	68	Note: `API_ENDPOINT` is declared but never actually referenced in executable code —
	69	`login()` is a stub that only mentions it in a comment.
	70	
	71	### `index.html` (15 lines)
	72	
	73	Loads the script as a classic script, not a module:
	74	
	75	```html
	76	  <script src="app.js"></script>
	77	```
	78	
	79	### `package.json`
	80	
	81	```json
	82	{
	83	  "name": "drill-test-project",
	84	  "version": "1.0.0",
	85	  "description": "Test project for Drill scenarios",
	86	  "main": "src/index.js"
	87	}
	88	```
	89	
	90	No dependencies, no devDependencies, no scripts. No bundler, no build step, no
	91	linter or formatter config, no test runner, no CI config anywhere in the repo.
	92	
	93	### `src/index.js` and `src/utils.js` (CommonJS, Node — unrelated to the page)
	94	
	95	```js
	96	// src/index.js
	97	const { greet } = require('./utils');
	98	function main() { console.log(greet('world')); }
	99	main();
	100	
	101	// src/utils.js
	102	function greet(name) { return `Hello, ${name}!`; }
	103	module.exports = { greet };
	104	```
	105	
	106	Neither file contains API or endpoint configuration. Nothing in `src/` is loaded
	107	by `index.html`.
	108	
	109	### Constraints
	110	
	111	- There is no existing test suite and no established testing pattern in the repo.
	112	- The repo has two disjoint module worlds: a classic-script browser page and a
	113	  CommonJS Node entry point.
	114	- Project conventions in effect: make focused minimal changes, no broad refactors,
	115	  match existing style, no extraneous Markdown files.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
