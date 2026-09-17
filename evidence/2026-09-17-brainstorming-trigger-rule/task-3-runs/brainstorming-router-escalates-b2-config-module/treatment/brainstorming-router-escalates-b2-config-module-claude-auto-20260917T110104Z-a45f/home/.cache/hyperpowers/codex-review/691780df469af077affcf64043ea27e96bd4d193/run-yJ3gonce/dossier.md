# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T110104Z-a45f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved (design), not yet implemented
	5	
	6	## Problem
	7	
	8	The webapp's API endpoint is a bare constant at the top of `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different backend means editing that line, and there is
	15	no record of what the other environments' URLs are. The goal is to make
	16	switching environments a single, obvious change in a dedicated module.
	17	
	18	A relevant detail found while reading the code: `API_ENDPOINT` is never
	19	referenced by executable code. It appears only inside a comment in `login()`
	20	(`// Stub: would POST to API_ENDPOINT in real app`). Today it is documentation,
	21	not a dependency, which is why the move is behavior-neutral.
	22	
	23	## Decisions
	24	
	25	Two forks were resolved with the project owner before design:
	26	
	27	1. **Environment selection: an environment map plus one switch.** `settings.js`
	28	   declares `development`, `staging`, and `production` blocks; a single `ENV`
	29	   constant selects one. Rejected: a single editable constant (does not improve
	30	   on the status quo) and hostname auto-detection (implicit mapping, hard to
	31	   override locally). Auto-detection can be layered on this shape later without
	32	   reshaping the module.
	33	2. **Consumption: ES modules.** `settings.js` uses `export`, `app.js` uses
	34	   `import`, and `index.html` loads `app.js` with `type="module"`. Rejected: a
	35	   classic script assigning a global (makes `<script>` ordering load-bearing and
	36	   provides no real module boundary). CommonJS was never viable — browsers
	37	   cannot `require` without a bundler, and this repo has no build step.
	38	
	39	The accepted cost of decision 2: ES modules are blocked by CORS over `file://`,
	40	so the page must be served over HTTP after this change.
	41	
	42	## Design
	43	
	44	### New file: `settings.js`
	45	
	46	Lives at the repository root beside `app.js`. `src/` holds unrelated CommonJS
	47	Node code and is not touched.
	48	
	49	```js
	50	// Environment configuration. Change ENV to point the app at a different backend.
	51	const ENV = "production";
	52	
	53	const ENVIRONMENTS = {
	54	  development: { apiBaseUrl: "http://localhost:3000" },
	55	  staging:     { apiBaseUrl: "https://staging-api.example.com" },
	56	  production:  { apiBaseUrl: "https://api.example.com" },
	57	};
	58	
	59	const current = ENVIRONMENTS[ENV];
	60	
	61	export const settings = {
	62	  env: ENV,
	63	  apiBaseUrl: current.apiBaseUrl,
	64	  loginEndpoint: `${current.apiBaseUrl}/login`,
	65	};
	66	```
	67	
	68	Environments differ by host, not by path, so each block declares only a base URL
	69	and the endpoint is derived from it. Exactly one endpoint is derived, because the
	70	app has exactly one. No route registry.
	71	
	72	### `app.js`
	73	
	74	- Remove the `API_ENDPOINT` constant.
	75	- Add `import { settings } from "./settings.js";` at the top.
	76	- In `login()`, replace the comment-only reference with a line that exercises the
	77	  import: `console.log("Would POST to:", settings.loginEndpoint);`. This keeps
	78	  the stub honest and avoids leaving an unused import behind.
	79	
	80	No other change to `app.js`. Form handling, validation, and the `login()` return
	81	value are untouched.
	82	
	83	### `index.html`
	84	
	85	`<script src="app.js"></script>` becomes
	86	`<script type="module" src="app.js"></script>`. Module scripts are deferred, so
	87	the top-level `document.getElementById("login-form")` listener registration still
	88	runs after the form is parsed.
	89	
	90	### `README.md`
	91	
	92	Add two short notes: how to switch environments (edit `ENV` in `settings.js`),
	93	and that the page must now be served over HTTP (for example
	94	`python3 -m http.server`) because `file://` no longer works with module scripts.
	95	
	96	## Behavior
	97	
	98	`ENV` defaults to `production`, resolving `loginEndpoint` to
	99	`https://api.example.com/login` — identical to the current hardcoded value. This
	100	change is a pure refactor; no runtime behavior differs.
	101	
	102	## Assumptions
	103	
	104	- Assumption: the development base URL is `http://localhost:3000` and the staging
	105	  base URL is `https://staging-api.example.com`. Only the production URL is
	106	  recoverable from the existing code; these two are placeholders. Validate by
	107	  confirming the real URLs with the project owner and substituting them before or
	108	  immediately after implementation.
	109	
	110	## Out of Scope
	111	
	112	- Wiring a real `fetch` call. `login()` remains a stub.
	113	- Sharing settings with `src/index.js` / `src/utils.js`, which are unrelated Node
	114	  CommonJS code.
	115	- Hostname-based environment auto-detection.
	116	- Tooling. The project owner chose not to add linting, formatting, or a test
	117	  runner as part of this change; the repo has none today.
	118	
	119	## Verification
	120	
	121	No test runner, linter, or dependencies exist in this repo, and none are being
	122	added. Verification is manual:
	123	
	124	1. Serve the repository root over HTTP.
	125	2. Load `index.html`; confirm no module-loading or console errors.
	126	3. Submit the form with both fields filled; confirm the console logs
	127	   `Would POST to: https://api.example.com/login`.
	128	4. Submit with a field empty; confirm the existing validation error still logs.
	129	5. Change `ENV` to `development`, reload, and confirm the logged endpoint follows.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
