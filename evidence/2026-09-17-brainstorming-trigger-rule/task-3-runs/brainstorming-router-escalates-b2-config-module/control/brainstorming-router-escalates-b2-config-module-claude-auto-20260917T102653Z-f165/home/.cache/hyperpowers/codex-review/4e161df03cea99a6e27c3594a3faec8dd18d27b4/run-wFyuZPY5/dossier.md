# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T102653Z-f165/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The login API endpoint is hard-coded as a module-level constant in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the page at a different environment means editing application code.
	15	There is no configuration seam, and nothing in the repository establishes where
	16	configuration should live.
	17	
	18	## Goal
	19	
	20	Move the API endpoint into a dedicated settings module so that switching
	21	environments requires no change to application logic, and so that later
	22	configuration values have an obvious home.
	23	
	24	Non-goals: authentication changes, an actual network call (the `login` function
	25	remains a stub), configuration for the `src/` Node entry point, and any
	26	secrets handling.
	27	
	28	## Decisions
	29	
	30	Each of the following was chosen explicitly during brainstorming.
	31	
	32	### Environment selection: hostname detection
	33	
	34	`settings.js` maps `window.location.hostname` to a named environment. No file
	35	edit or build step is needed to switch environments.
	36	
	37	Rejected: hand-editing a single value (dev and production values then conflict
	38	in version control); build-time injection (introduces a build toolchain and a
	39	package manager to a repository that has neither, and is not cheap to undo).
	40	
	41	Accepted consequence: every environment's API URL is present in the file served
	42	to the browser. These are public endpoint URLs, not secrets, so this is
	43	acceptable.
	44	
	45	### Module wiring: ES modules
	46	
	47	`settings.js` uses `export`; `app.js` uses `import`; `index.html` loads the app
	48	with `<script type="module">`.
	49	
	50	Rejected: a second `<script>` tag assigning `window.SETTINGS`, which keeps
	51	`file://` loading working but relies on a global and on script ordering in the
	52	HTML.
	53	
	54	Accepted consequence: ES modules are blocked over `file://`, so opening
	55	`index.html` by double-clicking it no longer works. The page must be served,
	56	for example with `python3 -m http.server`. This is the one user-visible
	57	behavior change in the whole change set.
	58	
	59	### Module system: the repository becomes ESM
	60	
	61	`package.json` gains `"type": "module"`. `src/utils.js` and `src/index.js`
	62	convert from CommonJS to ESM (roughly four lines across the two files).
	63	
	64	This is required, not cosmetic: without `"type": "module"`, Node parses every
	65	`.js` file as CommonJS, so `node --test` would hit the `export` keyword in
	66	`settings.js` and throw a `SyntaxError`. The pure environment-resolution
	67	function would be untestable.
	68	
	69	Rejected: naming the file `settings.mjs` (Node would accept it, but browsers
	70	depend on the server's `Content-Type` header, and some static servers do not
	71	map `.mjs` to a JavaScript MIME type, which would break page loading);
	72	shipping without unit tests (leaves the hostname map and the fallback path
	73	unverified).
	74	
	75	Accepted consequence: `src/utils.js` and `src/index.js` are edited even though
	76	they are outside the literal scope of the request. They have no other
	77	consumers. This cost was raised explicitly and accepted.
	78	
	79	### Configuration shape: base URL, not full endpoint URL
	80	
	81	Each environment stores `apiBaseUrl`. The `/login` path is appended by the
	82	caller, because the host varies per environment and the path does not.
	83	
	84	### Unknown hostname falls back to production
	85	
	86	`settingsFor()` returns the production settings for any hostname not in the
	87	map, silently.
	88	
	89	Rejected: throwing on an unrecognized hostname. That surfaces a misconfigured
	90	deployment loudly but takes the entire login page down over a configuration
	91	miss.
	92	
	93	### Tooling: no linter or formatter
	94	
	95	The repository has no `node_modules` and no install step. `node --test` is
	96	built into Node and adds no dependency. ESLint and Prettier were considered and
	97	declined for now.
	98	
	99	## Design
	100	
	101	### New file: `settings.js` (repository root)
	102	
	103	Placed beside `app.js` rather than in `src/`. `src/` is the Node entry point
	104	tree; keeping an ES module for the browser in the same directory as CommonJS
	105	Node files invites confusion about which module system a `.js` file uses.
	106	
	107	Structure:
	108	
	109	- `ENVIRONMENTS` — a map from environment name (`local`, `staging`,
	110	  `production`) to a settings object containing `apiBaseUrl`.
	111	- `HOSTNAME_ENVIRONMENTS` — a map from hostname to environment name, covering
	112	  `localhost`, `127.0.0.1` (both `local`), and `staging.example.com`.
	113	- `settingsFor(hostname)` — exported pure function returning the settings
	114	  object for a hostname, defaulting to production. Takes the hostname as a
	115	  parameter and reads no globals, so it is testable under Node without a DOM.
	116	- `settings` — exported convenience binding, `settingsFor(window.location.hostname)`.
	117	
	118	Environment values:
	119	
	120	| Environment | Hostnames | `apiBaseUrl` |
	121	|---|---|---|
	122	| `local` | `localhost`, `127.0.0.1` | `http://localhost:3000` |
	123	| `staging` | `staging.example.com` | `https://staging-api.example.com` |
	124	| `production` | any other hostname | `https://api.example.com` |
	125	
	126	Assumption: the local and staging URLs are placeholders. The production value
	127	preserves the host from the current hard-coded `API_ENDPOINT`. Validate by
	128	confirming the real hostnames and URLs with the repository owner before or
	129	shortly after implementation; they are single-line edits in one file.
	130	
	131	### Changed file: `app.js`
	132	
	133	- Remove the `API_ENDPOINT` constant.
	134	- Add `import { settings } from "./settings.js";`.
	135	- Build the login URL from `settings.apiBaseUrl` where the endpoint is
	136	  referenced.
	137	- Update the stub comment inside `login()` that names `API_ENDPOINT`.
	138	
	139	`validateForm` and the submit handler are unchanged.
	140	
	141	### Changed file: `index.html`
	142	
	143	`<script src="app.js"></script>` becomes
	144	`<script type="module" src="app.js"></script>`.
	145	
	146	Module scripts are deferred, so the DOM is parsed before `app.js` runs and the
	147	`getElementById("login-form")` lookup at module top level continues to resolve.
	148	
	149	### Changed files: `package.json`, `src/utils.js`, `src/index.js`
	150	
	151	- `package.json`: add `"type": "module"`, and a `test` script running `node --test`.
	152	- `src/utils.js`: `module.exports = { greet }` becomes `export { greet }`.
	153	- `src/index.js`: `require('./utils')` becomes `import { greet } from './utils.js'`
	154	  (the explicit `.js` extension is required under ESM resolution).
	155	
	156	## Data flow
	157	
	158	1. The browser loads `index.html` and fetches `app.js` as a module.
	159	2. `app.js` imports `settings.js`, which evaluates `settingsFor(window.location.hostname)` once at import time.
	160	3. The submit handler validates input, then calls `login()`, which targets `` `${settings.apiBaseUrl}/login` ``.
	161	
	162	## Error handling
	163	
	164	- Unknown hostname: falls back to production settings; no throw.
	165	- A hostname mapped to an environment name absent from `ENVIRONMENTS` is a
	166	  programming error in this file. `settingsFor()` falls back to production
	167	  rather than returning `undefined`, so a typo in the map degrades to the
	168	  production endpoint instead of producing `undefined/login`.
	169	- No network error handling is in scope; `login()` remains a stub.
	170	
	171	## Testing
	172	
	173	Unit tests with the built-in Node test runner (`node --test`), no dependencies,
	174	in `test/settings.test.js`:
	175	
	176	- `localhost` and `127.0.0.1` resolve to the local `apiBaseUrl`.
	177	- `staging.example.com` resolves to the staging `apiBaseUrl`.
	178	- An unrecognized hostname resolves to the production `apiBaseUrl`.
	179	- The production `apiBaseUrl` plus `/login` reproduces the endpoint string that
	180	  `app.js` used before this change, which pins the refactor as behavior-preserving
	181	  in production.
	182	
	183	Tests import `settingsFor` only. They never touch `settings`, which reads
	184	`window.location` and is therefore browser-only.
	185	
	186	Manual verification: serve the directory (`python3 -m http.server`), load the
	187	page over `http://localhost:<port>`, submit the form, and confirm the console
	188	output and that the module loads without error.
	189	
	190	## Risks
	191	
	192	- Serving is now required for local development; double-clicking `index.html`
	193	  fails silently apart from a console error. This is the change most likely to
	194	  surprise someone.
	195	- `src/` files are converted as a prerequisite for testing, widening the diff
	196	  beyond the endpoint move.
	197	- Placeholder staging and local URLs ship until real values are supplied.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T102653Z-f165/home/.cache/hyperpowers/codex-review/4e161df03cea99a6e27c3594a3faec8dd18d27b4/run-wFyuZPY5/approved-design.md

	1	# Approved design context (brainstorming adjudications)
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Repository state before the change: four files — `index.html`, `app.js`
	9	(browser script, loaded by a plain `<script src>` tag), `src/index.js` and
	10	`src/utils.js` (CommonJS, Node entry point), plus `package.json` with no
	11	`type` field, no scripts, and no dependencies. No `node_modules`, no build
	12	step, no linter, no test runner. The endpoint lives at `app.js:2` as
	13	`const API_ENDPOINT = "https://api.example.com/login";`.
	14	
	15	Decisions the human partner made explicitly during brainstorming. These are
	16	settled; do not re-litigate them as findings unless the spec is internally
	17	inconsistent with one of them or a decision is unbuildable as written.
	18	
	19	1. **Environment selection: hostname detection.** Chosen over hand-editing a
	20	   single value and over build-time injection. Rationale accepted: no new
	21	   toolchain in a repo with no package manager.
	22	2. **Module wiring: ES modules.** Chosen over a second `<script>` tag setting
	23	   a `window.SETTINGS` global. The human partner was told explicitly, twice,
	24	   that this breaks opening `index.html` over `file://` and accepted it.
	25	3. **Environment set: local + staging + production.** Placeholder URLs for
	26	   local and staging are acceptable; the production host is preserved from the
	27	   current hard-coded value.
	28	4. **Repository converts to ESM** (`"type": "module"` in `package.json`, and
	29	   `src/utils.js` / `src/index.js` converted from CommonJS). Chosen over a
	30	   `settings.mjs` filename and over shipping with no unit tests. The human
	31	   partner was told explicitly that this edits two files outside the literal
	32	   scope of the request, and accepted that cost.
	33	5. **No linter or formatter.** ESLint/Prettier declined to keep the repository
	34	   dependency-free.
	35	
	36	Also approved in chat before the spec was written: `settings.js` lives at the
	37	repository root beside `app.js`; configuration stores `apiBaseUrl` per
	38	environment rather than a full endpoint URL; `settingsFor(hostname)` is a pure
	39	function with a `location`-bound convenience export layered on top; an
	40	unrecognized hostname falls back to production silently rather than throwing.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
