# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T111009Z-82a9/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	
	5	## Problem
	6	
	7	`app.js` hard-codes the API endpoint as a top-level constant:
	8	
	9	```js
	10	const API_ENDPOINT = "https://api.example.com/login";
	11	```
	12	
	13	Switching the webapp between environments therefore means editing application
	14	code. The goal is to move endpoint configuration into a dedicated settings
	15	module so the environment in use is resolved rather than hand-edited.
	16	
	17	## Context
	18	
	19	The repository contains two unrelated trees:
	20	
	21	- `index.html` + `app.js` — a browser webapp. `app.js` is loaded by a plain
	22	  `<script src="app.js">` tag. There is no bundler, no `type="module"`, and no
	23	  build step; the page can be opened directly from the filesystem.
	24	- `src/index.js` + `src/utils.js` — a CommonJS Node entry point unrelated to the
	25	  webapp. It contains no endpoint configuration.
	26	
	27	`package.json` declares no dependencies, no build script, and no test runner.
	28	
	29	## Decisions
	30	
	31	Each of the following was chosen explicitly during brainstorming.
	32	
	33	| Decision | Choice | Rationale |
	34	|---|---|---|
	35	| Environment selection | Runtime detection from `location.hostname` | Delivers "easier to change environments" without introducing a build pipeline to a static site. |
	36	| Module delivery | Plain script exposing a global | Matches the repo's existing no-tooling pattern and preserves the `file://` workflow, which ES modules would break. |
	37	| Endpoint representation | Base URL plus endpoint paths | Changing environments edits one host rather than one full URL per endpoint. |
	38	| Environments | `development`, `production` | Two are needed today. The table accepts more without structural change. |
	39	| Tooling | None added | The project has no test, lint, or build tooling; the change is verified in the browser. |
	40	
	41	## Design
	42	
	43	### New file: `settings.js` (repository root)
	44	
	45	Root placement, alongside `app.js`, because the file is loaded by `index.html`.
	46	`src/` is the disconnected CommonJS tree and is not involved.
	47	
	48	The module is an IIFE that builds an environment table, resolves the active
	49	environment from the hostname, and publishes a single global `APP_SETTINGS`:
	50	
	51	```js
	52	(function (global) {
	53	  const ENVIRONMENTS = {
	54	    development: { apiBaseUrl: "http://localhost:3000" },
	55	    production:  { apiBaseUrl: "https://api.example.com" },
	56	  };
	57	
	58	  // An empty hostname means the page was opened over file://, which is local
	59	  // development.
	60	  const DEVELOPMENT_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]", ""];
	61	
	62	  function detectEnvironment(hostname) {
	63	    return DEVELOPMENT_HOSTNAMES.includes(hostname) ? "development" : "production";
	64	  }
	65	
	66	  const environment = detectEnvironment(global.location.hostname);
	67	  const { apiBaseUrl } = ENVIRONMENTS[environment];
	68	
	69	  global.APP_SETTINGS = {
	70	    environment,
	71	    apiBaseUrl,
	72	    endpoints: { login: `${apiBaseUrl}/login` },
	73	  };
	74	})(window);
	75	```
	76	
	77	`APP_SETTINGS.environment` is exposed alongside the URLs so callers can branch
	78	on the environment (for example, to gate debug logging) without re-deriving it
	79	from the hostname.
	80	
	81	### Modified: `app.js`
	82	
	83	- Remove the `API_ENDPOINT` constant.
	84	- `login()` reads `APP_SETTINGS.endpoints.login` into a local. The function
	85	  remains a stub that performs no network call; reading the value makes the
	86	  dependency real code rather than a comment, so the module is genuinely
	87	  exercised at runtime.
	88	- `login()` guards against a missing `APP_SETTINGS` and throws a message naming
	89	  the cause, so a misordered or omitted script tag surfaces as a readable error
	90	  instead of a property read on `undefined`.
	91	
	92	### Modified: `index.html`
	93	
	94	Add `<script src="settings.js"></script>` immediately before the existing
	95	`app.js` script tag. Load order matters: `settings.js` must define the global
	96	before `app.js` executes.
	97	
	98	## Error handling
	99	
	100	- **Unknown hostname.** Any hostname not in `DEVELOPMENT_HOSTNAMES` resolves to
	101	  `production`. Failing closed to the real API is safer than a deployed page
	102	  silently addressing `localhost`.
	103	- **Missing settings global.** `login()` throws an explicit error naming
	104	  `settings.js` and the required script order.
	105	
	106	## Non-goals
	107	
	108	- No bundler, `.env` file, or build-time injection.
	109	- No ES module conversion of `app.js` or `index.html`.
	110	- No changes to `src/index.js` or `src/utils.js`.
	111	- No real network call in `login()`; it stays a stub.
	112	- No test, lint, or formatting tooling.
	113	
	114	## Verification
	115	
	116	No automated tests: the repository has no test runner and none is being added.
	117	Verification is manual, in the browser.
	118	
	119	1. Open `index.html` from the filesystem. `APP_SETTINGS.environment` is
	120	   `development` and `APP_SETTINGS.endpoints.login` is
	121	   `http://localhost:3000/login`.
	122	2. Serve the directory over `http://localhost:8000` (for example with
	123	   `python3 -m http.server`). The resolved environment is still `development`.
	124	3. Serve the directory over a non-loopback hostname (for example the machine's
	125	   LAN name or `127.0.0.1.nip.io`) and confirm `APP_SETTINGS.environment` is
	126	   `production` and the endpoint is `https://api.example.com/login`. This
	127	   exercises the fail-closed default without needing a deployment.
	128	4. Submit the login form with both fields filled and confirm the logged endpoint
	129	   matches the resolved environment.
	130	
	131	Assumption: the development API runs at `http://localhost:3000`, validate via
	132	confirming the port against the API service before the change is relied upon.
	133	Only the table entry changes if it differs.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T111009Z-82a9/home/.cache/hyperpowers/codex-review/d6af95dd63cc29d1d1921149a6dc7ae121eee37e/run-lyIRYejO/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Decisions the human partner made explicitly during brainstorming. These are
	9	settled; do not re-open them as findings unless they are internally
	10	contradictory or unbuildable as specified.
	11	
	12	1. **Environment selection: runtime detection from `location.hostname`.**
	13	   Chosen over hand-editing a constant and over build-time injection. Rejected
	14	   build-time injection specifically because it would introduce a bundler and a
	15	   dependency tree to a project that currently has none and is opened as a
	16	   static file.
	17	
	18	2. **Module delivery: plain script exposing a global**, loaded by its own
	19	   `<script>` tag before `app.js`. Chosen over ES modules because `type="module"`
	20	   is blocked over `file://` by CORS, and preserving the double-click-to-open
	21	   workflow was judged worth more than removing one global.
	22	
	23	3. **Environments: `development` and `production` only.** `development` =
	24	   `http://localhost:3000` (port is an assumption flagged in the spec),
	25	   `production` = `https://api.example.com` (the host from the current
	26	   hard-coded constant).
	27	
	28	4. **Tooling: none added.** The human partner explicitly declined unit tests
	29	   (`node:test`) and lint/format tooling for this change, choosing manual
	30	   browser verification. The project today has no test runner, no lint config,
	31	   no build step, and no dependencies. Absence of automated tests is therefore a
	32	   recorded decision, not an oversight.
	33	
	34	5. **Scope: the webapp only.** `src/index.js` and `src/utils.js` are a
	35	   disconnected CommonJS Node tree with no endpoint configuration and are out of
	36	   scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
