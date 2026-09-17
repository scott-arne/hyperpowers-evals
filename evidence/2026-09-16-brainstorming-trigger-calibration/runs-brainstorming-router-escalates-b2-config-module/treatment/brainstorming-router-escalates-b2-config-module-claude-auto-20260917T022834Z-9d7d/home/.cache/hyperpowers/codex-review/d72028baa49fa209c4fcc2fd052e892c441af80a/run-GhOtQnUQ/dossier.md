# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T022834Z-9d7d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-api-settings-module-design.md

	1	# API Settings Module — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The API endpoint is a bare constant in application code:
	9	
	10	```js
	11	// app.js:2
	12	const API_ENDPOINT = "https://api.example.com/login";
	13	```
	14	
	15	Changing environments therefore means editing application logic, and the value
	16	is embedded in the same file as DOM wiring and form validation. There is no
	17	place for a second endpoint to go, and no way to point the app at a development
	18	API without a code edit that must be reverted before shipping.
	19	
	20	## Goal
	21	
	22	Move endpoint configuration into a dedicated settings module so that switching
	23	environments requires no edit to application code, and so that adding a second
	24	endpoint touches one place.
	25	
	26	## Current State
	27	
	28	- `app.js` — browser script holding `API_ENDPOINT`, `login()`, `validateForm()`,
	29	  and the submit handler. `API_ENDPOINT` is currently unreferenced; `login()` is
	30	  a stub that logs and returns a canned success object.
	31	- `index.html:13` — loads `app.js` as a classic `<script>`. No `type="module"`.
	32	- `src/index.js`, `src/utils.js` — CommonJS, Node-side. Never executed in the
	33	  browser and unrelated to the API endpoint.
	34	- `package.json` — no dependencies, no scripts. No bundler, linter, or test
	35	  runner exists in the repository.
	36	
	37	The browser side has no module system at all. That is the reason this is a new
	38	module rather than a moved constant.
	39	
	40	## Decisions
	41	
	42	Each was settled during brainstorming; the rejected alternatives are recorded
	43	because the reasoning matters more than the outcome.
	44	
	45	### Environment selection: hostname detection
	46	
	47	`settings.js` reads `window.location.hostname` at load and resolves the
	48	environment itself.
	49	
	50	- Rejected — injected config script: requires deploy-time placement of a
	51	  per-environment file and a second script tag.
	52	- Rejected — build-time substitution: introduces a bundler and a build step to a
	53	  repository with zero dependencies.
	54	
	55	Consequence: every environment's base URL ships to the browser. Acceptable here
	56	because API base URLs are not secrets. Moving to an injected config script later
	57	is a small, localized edit if that changes.
	58	
	59	### Module style: native ES modules
	60	
	61	`index.html` uses `<script type="module">`; `app.js` imports from `settings.js`.
	62	
	63	- Rejected — global namespace object (`window.AppSettings`): a global with
	64	  silent load-order coupling, and not meaningfully a module.
	65	
	66	Consequence: ES modules are blocked by CORS over `file://`, so the page must be
	67	opened through a local HTTP server (for example `python3 -m http.server`) rather
	68	than by opening the file directly. This is a workflow change, not a code
	69	constraint.
	70	
	71	### Configuration shape: base URL plus derived paths
	72	
	73	Settings expose `apiBaseUrl` and an `endpoints` map built from it.
	74	
	75	- Rejected — full URLs per endpoint: repeats the host across every endpoint in
	76	  every environment, making a host change an N x M edit.
	77	
	78	## Design
	79	
	80	### New file: `settings.js` (repository root)
	81	
	82	Placed beside `app.js`, not in `src/`. `src/` is CommonJS and Node-side; putting
	83	browser ES modules there would mix two module systems in one directory.
	84	
	85	Structure:
	86	
	87	- `ENVIRONMENTS` — map of environment name to `{ apiBaseUrl }`. Two entries:
	88	  `development` and `production`.
	89	- `DEV_HOSTNAMES` — the set of hostnames treated as development:
	90	  `localhost`, `127.0.0.1`, `[::1]`.
	91	- `resolveEnvironmentName(hostname)` — exported pure function returning
	92	  `"development"` when the hostname is in `DEV_HOSTNAMES`, otherwise
	93	  `"production"`. Exported separately so it can be exercised without a browser.
	94	- `settings` — the exported frozen object:
	95	  `{ environment, apiBaseUrl, endpoints: { login } }`, where
	96	  `endpoints.login` is `` `${apiBaseUrl}/login` ``. Frozen with `Object.freeze`
	97	  so callers cannot mutate shared configuration at runtime.
	98	
	99	### Changes to `app.js`
	100	
	101	- Remove `const API_ENDPOINT`.
	102	- Add `import { settings } from "./settings.js";` at the top.
	103	- Update the stub comment in `login()` to reference `settings.endpoints.login`.
	104	
	105	No behavior changes. `login()` remains a stub; this design does not introduce a
	106	network call.
	107	
	108	### Changes to `index.html`
	109	
	110	Line 13 becomes `<script type="module" src="app.js"></script>`.
	111	
	112	Note that module scripts are deferred, so the submit-handler registration in
	113	`app.js` runs after the document is parsed. The current code registers the
	114	handler at top level and relies on the script tag sitting after the form; under
	115	`type="module"` that ordering remains satisfied, so no restructuring is needed.
	116	
	117	### Not in scope
	118	
	119	`src/index.js` and `src/utils.js` are untouched. They do not reference the API
	120	endpoint, and converting them would be unrelated refactoring.
	121	
	122	## Error Handling
	123	
	124	An unrecognized hostname falls back to `production`.
	125	
	126	This is a deliberate asymmetry. An unknown host is far more likely to be a real
	127	deployment than an unconfigured dev machine, and pointing a real user's login at
	128	a development API is the worse of the two failures. The accepted cost is that a
	129	mistyped development hostname degrades silently to production rather than
	130	raising an error.
	131	
	132	`ENVIRONMENTS` lookups cannot miss, because `resolveEnvironmentName` returns only
	133	keys that exist in the map.
	134	
	135	## Testing
	136	
	137	The repository has no test runner and no established testing pattern, and the
	138	decision during brainstorming was not to add one as part of this change.
	139	
	140	Verification is therefore by inspection plus a manual check:
	141	
	142	1. Serve the directory over HTTP and load `index.html`.
	143	2. Confirm the form still submits and logs a validation error when fields are
	144	   empty and a login result when they are filled.
	145	3. Confirm `settings.environment` resolves to `development` when served from
	146	   `localhost`.
	147	
	148	Any report on this work must state plainly that no automated tests were run,
	149	because none exist.
	150	
	151	If a test runner is added later, `resolveEnvironmentName` is the natural first
	152	target: it is pure, takes a string, and returns a string.
	153	
	154	## Assumptions
	155	
	156	- Assumption: `https://api.dev.example.com` is a placeholder for the real
	157	  development API host; validate by confirming the actual host with the
	158	  repository owner and substituting it before this ships.
	159	- Assumption: `https://api.example.com` remains the correct production base URL;
	160	  validate by confirming that the existing `API_ENDPOINT` value is current.
	161	- Assumption: no deployment currently opens `index.html` over `file://`;
	162	  validate by confirming the page is always served over HTTP.
	163	
	164	## Global Constraints
	165	
	166	- No new dependencies. The repository stays zero-dependency.
	167	- No linter, formatter, or test infrastructure is added by this work.
	168	- `src/` is not modified.
	169	- Match existing style: two-space indentation, double-quoted strings, semicolons.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T022834Z-9d7d/home/.cache/hyperpowers/codex-review/d72028baa49fa209c4fcc2fd052e892c441af80a/run-GhOtQnUQ/adjudications.md

	1	# Approved Design Decisions (brainstorming, 2026-09-16)
	2	
	3	## Original request (verbatim)
	4	
	5	"Move the API endpoint config into a new settings module so it's easier to change environments."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **How should the app pick which environment's API endpoint to use at runtime?**
	10	   Options presented: hostname detection / injected config script / build-time substitution.
	11	   **Answer: hostname detection.**
	12	
	13	2. **How should app.js consume the new settings module?**
	14	   Options presented: native ES modules / global namespace object.
	15	   **Answer: native ES modules.**
	16	
	17	3. **What shape should the settings module expose?**
	18	   Options presented: base URL plus paths / full URLs per endpoint.
	19	   **Answer: base URL plus paths.**
	20	
	21	4. **Does this design look right to proceed with?**
	22	   **Answer: approved as described.**
	23	
	24	5. **Set up any tooling now (lint, test infrastructure)?**
	25	   **Answer: nothing for now.** The repository stays zero-dependency with no
	26	   test runner and no linter. This is an explicit decision, not an oversight.
	27	
	28	## Codebase facts
	29	
	30	- `app.js:2` holds `const API_ENDPOINT = "https://api.example.com/login";`, currently unreferenced.
	31	- `app.js` also holds `login()` (a stub), `validateForm()`, and a submit handler registered at top level.
	32	- `index.html:13` is `<script src="app.js"></script>` — a classic script, not a module.
	33	- `src/index.js` and `src/utils.js` are CommonJS, Node-side, unrelated to the endpoint.
	34	- `package.json` has no dependencies and no scripts. No bundler, linter, or test runner exists.
	35	
	36	## Decisions that are settled and NOT open for re-litigation
	37	
	38	The three design forks above were presented to the human partner with tradeoffs
	39	and explicitly chosen. Findings that merely prefer a different option among
	40	those already-rejected alternatives are out of scope; findings that identify a
	41	genuine defect in the chosen design are in scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
