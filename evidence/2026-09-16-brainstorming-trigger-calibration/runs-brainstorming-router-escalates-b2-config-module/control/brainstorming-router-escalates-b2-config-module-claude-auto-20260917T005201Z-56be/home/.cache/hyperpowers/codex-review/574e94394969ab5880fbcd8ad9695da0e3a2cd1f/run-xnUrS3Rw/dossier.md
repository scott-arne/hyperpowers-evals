# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T005201Z-56be/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	The browser app hardcodes its API endpoint at `app.js:2`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application
	15	source. There is no place for environment-specific configuration to
	16	live, so every future configurable value would repeat the same problem.
	17	
	18	## Goal
	19	
	20	Move the API endpoint into a dedicated settings module that selects
	21	values by environment, so switching environments requires no source
	22	edit.
	23	
	24	Non-goals: build tooling, a deploy pipeline, configuration for the
	25	`src/` Node code, or any change to login/validation behavior.
	26	
	27	## Context
	28	
	29	The repository contains two unrelated bodies of code:
	30	
	31	- **Browser app** (root): `index.html` loads `app.js` as a classic
	32	  script. No bundler, no `type="module"`, no dependencies.
	33	- **Node code** (`src/`): `index.js` and `src/utils.js`, CommonJS,
	34	  with no API endpoint and no relationship to the browser app.
	35	
	36	This design touches only the browser app. `src/` is out of scope.
	37	
	38	`package.json` declares no `"type"` field, so Node treats `.js` files
	39	as CommonJS. This is what makes the dual-mode export below work with
	40	no tooling.
	41	
	42	## Decisions
	43	
	44	Three forks were considered and resolved before design:
	45	
	46	1. **Environment selection: hostname detection.** `settings.js` maps
	47	   `window.location.hostname` to an environment at load time.
	48	   Rejected: an explicit `window.APP_ENV` flag set in `index.html`
	49	   (requires a per-environment edit, which is the problem being
	50	   solved); build-time substitution (correct for a real pipeline, but
	51	   introduces tooling this repo does not have).
	52	
	53	2. **Module interface: a frozen global.** `settings.js` loads before
	54	   `app.js` via a second `<script>` tag and publishes
	55	   `window.AppSettings`. Rejected: ES modules, which would impose a
	56	   proper module boundary but break `file://` loading, turning "open
	57	   `index.html`" into "run a local HTTP server".
	58	
	59	3. **Environment scope: local, staging, production.** Smaller tables
	60	   were available; three covers the normal development loop and each
	61	   additional environment is a two-line change.
	62	
	63	## Architecture
	64	
	65	### New file: `settings.js` (repository root)
	66	
	67	Sits alongside `app.js`. Structure:
	68	
	69	```js
	70	(function () {
	71	  "use strict";
	72	
	73	  var ENVIRONMENTS = {
	74	    local:      { apiBaseUrl: "http://localhost:3000" },
	75	    staging:    { apiBaseUrl: "https://api-staging.example.com" },
	76	    production: { apiBaseUrl: "https://api.example.com" },
	77	  };
	78	
	79	  var LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", ""];
	80	  var STAGING_HOSTNAMES = ["staging.example.com"];
	81	
	82	  function detectEnvironment(hostname) { /* ... */ }
	83	  function buildSettings(hostname) { /* ... */ }
	84	
	85	  if (typeof module !== "undefined" && module.exports) {
	86	    module.exports = { ENVIRONMENTS, detectEnvironment, buildSettings };
	87	  }
	88	  if (typeof window !== "undefined") {
	89	    window.AppSettings = buildSettings(window.location.hostname);
	90	  }
	91	})();
	92	```
	93	
	94	**Public surface (browser):** `window.AppSettings`, frozen via
	95	`Object.freeze`, with three properties:
	96	
	97	| Property | Type | Description |
	98	|---|---|---|
	99	| `environment` | string | `"local"`, `"staging"`, or `"production"` |
	100	| `apiBaseUrl` | string | Origin for the selected environment |
	101	| `loginEndpoint` | string | `apiBaseUrl + "/login"` |
	102	
	103	**Public surface (Node, for tests only):** `ENVIRONMENTS`,
	104	`detectEnvironment(hostname)`, `buildSettings(hostname)`.
	105	
	106	The object is frozen so configuration cannot be mutated at runtime by
	107	downstream code.
	108	
	109	### Data model: base URLs, not full endpoints
	110	
	111	The environment table stores an origin per environment; endpoint paths
	112	are derived. The path `/login` is identical across environments — only
	113	the host varies. Storing full URLs per environment would require
	114	editing three entries whenever a path changes, and such tables drift
	115	out of sync.
	116	
	117	### Dual-mode export
	118	
	119	The `module`/`window` sniff exists solely so `detectEnvironment()` is
	120	reachable from `node:test`. A browser IIFE that assigns to `window`
	121	cannot be `require`d. The considered alternative was extracting
	122	`detectEnvironment` into its own file to keep the browser file pure;
	123	that was rejected as a two-file settings layer in a four-file
	124	repository. The boilerplate is the cheaper cost.
	125	
	126	### Changes to existing files
	127	
	128	**`app.js`** — line 2 becomes:
	129	
	130	```js
	131	const API_ENDPOINT = window.AppSettings.loginEndpoint;
	132	```
	133	
	134	plus the load-order guard described under Error Handling. The local
	135	name `API_ENDPOINT` is retained, so `login()`, `validateForm()`, and
	136	the submit handler are unchanged.
	137	
	138	**`index.html`** — one added line, before the existing `app.js` tag:
	139	
	140	```html
	141	<script src="settings.js"></script>
	142	<script src="app.js"></script>
	143	```
	144	
	145	Load order is a hard contract of the global approach. The guard below
	146	makes a violation fail loudly rather than silently.
	147	
	148	**`package.json`** — add:
	149	
	150	```json
	151	"scripts": { "test": "node --test" }
	152	```
	153	
	154	## Data flow
	155	
	156	1. Browser parses `index.html` and executes `settings.js`.
	157	2. `settings.js` reads `window.location.hostname`.
	158	3. `detectEnvironment()` maps the hostname to an environment name.
	159	4. `buildSettings()` looks up the origin and derives `loginEndpoint`.
	160	5. `window.AppSettings` is frozen and published.
	161	6. `app.js` executes, asserts `window.AppSettings` exists, and reads
	162	   `loginEndpoint` into `API_ENDPOINT`.
	163	
	164	## Error handling
	165	
	166	**Unknown hostname falls back to production.** A hostname matching
	167	neither the local nor the staging list resolves to `production`
	168	instead of throwing. Preview deploys and unfamiliar hosts should get a
	169	working page rather than a blank one.
	170	
	171	The accepted risk: a mistyped staging hostname silently talks to
	172	production. This is mitigated by exposing `AppSettings.environment`, so
	173	the resolved environment is inspectable rather than hidden, and is
	174	covered by an explicit test.
	175	
	176	**Missing settings fails loudly.** If `settings.js` did not load,
	177	`app.js` throws at load time:
	178	
	179	```js
	180	if (!window.AppSettings) {
	181	  throw new Error("settings.js must be loaded before app.js");
	182	}
	183	```
	184	
	185	Letting `undefined` propagate would defer the failure to the first
	186	login attempt and surface it as a confusing URL error. A configuration
	187	fault should break at load.
	188	
	189	## Testing
	190	
	191	Runner: `node:test` (ships with Node; adds no dependencies).
	192	Location: `test/settings.test.js`. Command: `npm test`.
	193	
	194	`detectEnvironment(hostname)` is a pure function and carries all the
	195	branching logic, so it takes the bulk of coverage:
	196	
	197	| Case | Input | Expected |
	198	|---|---|---|
	199	| Local by name | `"localhost"` | `"local"` |
	200	| Local by loopback IP | `"127.0.0.1"` | `"local"` |
	201	| Local via `file://` | `""` | `"local"` |
	202	| Staging | `"staging.example.com"` | `"staging"` |
	203	| Production | `"app.example.com"` | `"production"` |
	204	| Unknown host fallback | `"preview-7.vercel.app"` | `"production"` |
	205	
	206	`buildSettings(hostname)` adds two cases: `loginEndpoint` is the
	207	environment's `apiBaseUrl` plus `/login`, and the returned object is
	208	frozen.
	209	
	210	The browser wiring (script order, the `app.js` guard) is not
	211	unit-tested — it requires a DOM harness this repo has no tooling for.
	212	It is verified manually: load `index.html` and confirm
	213	`AppSettings.environment` reads `local`.
	214	
	215	## Assumptions
	216	
	217	- Assumption: the staging site is served from `staging.example.com`
	218	  and its API is `https://api-staging.example.com`; validate by
	219	  confirming the real staging hostnames with the repository owner
	220	  before implementation.
	221	- Assumption: the local API listens on `http://localhost:3000`;
	222	  validate by confirming the local development port with the
	223	  repository owner before implementation.
	224	
	225	Both values are isolated to the `ENVIRONMENTS` and `STAGING_HOSTNAMES`
	226	tables, so correcting them is a one-line edit in each case.
	227	
	228	Confirmed, not assumed: the production endpoint
	229	`https://api.example.com/login`, taken from the existing `app.js:2`.
	230	
	231	## Global constraints
	232	
	233	- No new runtime dependencies. `package.json` stays dependency-free;
	234	  `node:test` is built in.
	235	- No linter or formatter is configured; match the existing file style
	236	  (two-space indent, double-quoted strings, semicolons).
	237	- `src/index.js` and `src/utils.js` are not modified.
	238	- Login and validation behavior is unchanged; this is a
	239	  configuration-location change, not a behavior change.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T005201Z-56be/home/.cache/hyperpowers/codex-review/574e94394969ab5880fbcd8ad9695da0e3a2cd1f/run-xnUrS3Rw/approved-design.md

	1	# Approved design context — settings module
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier
	6	> to change environments.
	7	
	8	## Repository state at design time
	9	
	10	- `app.js` (repo root): classic browser script loaded by `index.html` via
	11	  `<script src="app.js">`. No bundler, no `type="module"`. Line 2 holds
	12	  `const API_ENDPOINT = "https://api.example.com/login";`. Also defines
	13	  `login()`, `validateForm()`, and a submit handler.
	14	- `index.html`: minimal login form, loads `app.js` only.
	15	- `src/index.js`, `src/utils.js`: unrelated CommonJS Node code, no API
	16	  endpoint.
	17	- `package.json`: no dependencies, no `"type"` field, no scripts.
	18	- No linter, no test runner, no build step.
	19	
	20	## Decisions the user explicitly approved during brainstorming
	21	
	22	Each was presented as an explicit fork with alternatives and tradeoffs;
	23	the user chose the option marked CHOSEN.
	24	
	25	1. **Environment selection**
	26	   - CHOSEN: hostname detection — `settings.js` maps
	27	     `window.location.hostname` to an environment at load.
	28	   - Rejected: explicit `window.APP_ENV` flag set in `index.html`.
	29	   - Rejected: build/deploy-time substitution (would introduce tooling
	30	     the repo does not have).
	31	
	32	2. **Module interface**
	33	   - CHOSEN: frozen global — `settings.js` loads via a second `<script>`
	34	     before `app.js` and publishes `window.AppSettings`.
	35	   - Rejected: ES modules (would break `file://` loading and require a
	36	     local HTTP server).
	37	
	38	3. **Environment scope**
	39	   - CHOSEN: three environments — local, staging, production.
	40	   - Rejected: local+production only; production only.
	41	
	42	4. **Tooling**
	43	   - CHOSEN: add unit tests via `node:test` (zero dependencies).
	44	   - Rejected: ESLint + Prettier.
	45	   - Rejected: no tooling at all.
	46	
	47	5. **Dual-mode export** (consequence of 2 + 4, surfaced and approved)
	48	   - `settings.js` exports via `module.exports` under Node and assigns
	49	     `window.AppSettings` under a browser, so `detectEnvironment()` is
	50	     testable from `node:test`.
	51	   - Rejected: splitting `detectEnvironment` into a separate file to keep
	52	     the browser file pure (two-file settings layer in a four-file repo).
	53	
	54	## Known open values
	55	
	56	The staging hostnames and the local API port are invented placeholders,
	57	recorded in the spec's Assumptions section with a validation method. The
	58	production endpoint is confirmed from the existing `app.js:2`.
	59	
	60	## Scope boundaries the user approved
	61	
	62	- `src/index.js` and `src/utils.js` are not modified.
	63	- No new runtime dependencies.
	64	- Login and validation behavior is unchanged.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
