# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T104833Z-d1c1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (pending user review of this document)
	5	
	6	## Problem
	7	
	8	The API endpoint is a hardcoded constant in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application
	15	logic. There is no place to put per-environment configuration, and no
	16	mechanism for selecting an environment.
	17	
	18	## Goals
	19	
	20	- Move endpoint configuration out of `app.js` into a dedicated module.
	21	- Select the environment automatically, with no deploy-time step.
	22	- Cover three environments: local, staging, production.
	23	- Make environment resolution testable.
	24	
	25	## Non-goals
	26	
	27	- A build step or bundler. The project has no build tooling and this
	28	  change does not add any.
	29	- Configuring the `src/` Node entry point. `src/index.js` and
	30	  `src/utils.js` are a separate CommonJS program that shares no code
	31	  with the webapp and needs no endpoint configuration.
	32	- Secret management. The values here are public API base URLs.
	33	
	34	## Design
	35	
	36	### New file: `settings.js`
	37	
	38	Lives at the repository root, alongside `app.js`. Not under `src/`,
	39	which is the unrelated Node program.
	40	
	41	```js
	42	const ENVIRONMENTS = {
	43	  local:      { name: "local",      apiBaseUrl: "http://localhost:3000" },
	44	  staging:    { name: "staging",    apiBaseUrl: "https://staging-api.example.com" },
	45	  production: { name: "production", apiBaseUrl: "https://api.example.com" },
	46	};
	47	
	48	export function resolveEnvironment(hostname) { /* hostname -> env key */ }
	49	
	50	export const settings = ENVIRONMENTS[
	51	  resolveEnvironment(globalThis.location?.hostname ?? "")
	52	];
	53	```
	54	
	55	### Environment selection: hostname detection
	56	
	57	`resolveEnvironment` is a pure function from hostname string to
	58	environment key:
	59	
	60	| Hostname            | Environment  |
	61	|---------------------|--------------|
	62	| `localhost`         | `local`      |
	63	| `127.0.0.1`         | `local`      |
	64	| the staging host    | `staging`    |
	65	| anything else       | `production` |
	66	
	67	Chosen over a manually-edited `ENV` constant (a human step that gets
	68	forgotten) and over build-time injection (which would require adding a
	69	bundler to a project that has none). One artifact works in every
	70	environment with no deploy action.
	71	
	72	### Base URL, not full endpoint URL
	73	
	74	Each environment stores `apiBaseUrl`, and the login URL is derived from
	75	it. What varies across environments is the host, never the path, so
	76	storing full URLs would duplicate the host three times and require three
	77	edits to add a second endpoint.
	78	
	79	### Unknown hostname falls back to production
	80	
	81	A configuration module that throws at import time takes down the entire
	82	page. An unrecognized host therefore resolves to `production`, so the app
	83	still works.
	84	
	85	The accepted tradeoff: a mistyped staging hostname silently talks to
	86	production rather than failing loudly. This was considered and chosen
	87	deliberately for a login form, where a broken page is worse than a
	88	correct-but-unexpected target.
	89	
	90	### Module loading: ES modules
	91	
	92	`index.html` changes to `<script type="module" src="app.js">`, and
	93	`app.js` imports from `./settings.js`.
	94	
	95	Chosen over a classic script exposing a global, because the `import`
	96	statement makes the dependency visible in the file that uses it rather
	97	than implicit in script-tag ordering — which is the main reason to
	98	extract a settings module at all.
	99	
	100	Consequence: `index.html` can no longer be opened directly from `file://`,
	101	because ES module loading is CORS-restricted. Local development requires
	102	a static server, e.g. `python3 -m http.server`.
	103	
	104	### The `globalThis.location?.` guard
	105	
	106	Reading `window.location.hostname` unguarded at module scope throws when
	107	the module is imported under Node, which would make `resolveEnvironment`
	108	untestable without a DOM shim. The optional chain lets the module import
	109	cleanly in Node (where it resolves to `production`, unused by tests)
	110	while `resolveEnvironment` is tested directly with explicit hostname
	111	arguments.
	112	
	113	Chosen over splitting into a pure `environments.js` plus a browser-facing
	114	`settings.js`, which separates concerns more strictly but adds a file to
	115	a project of six for two dozen lines of code.
	116	
	117	## Changes to existing files
	118	
	119	- **`app.js`** — remove the `API_ENDPOINT` constant; add
	120	  `import { settings } from "./settings.js";`; reference
	121	  `settings.apiBaseUrl` in `login()`. The function remains a stub, as it
	122	  is today — this change does not add real network calls.
	123	- **`index.html`** — add `type="module"` to the `app.js` script tag.
	124	
	125	## Testing
	126	
	127	Test runner: Node's built-in `node:test`, run via `node --test`. Chosen
	128	because it requires no dependency, keeping `package.json` dependency-free.
	129	`resolveEnvironment` is a pure string function and needs no DOM.
	130	
	131	`package.json` gains a `scripts.test` entry. No dependencies are added.
	132	
	133	Test cases for `resolveEnvironment`:
	134	
	135	- `localhost` resolves to `local`
	136	- `127.0.0.1` resolves to `local`
	137	- the staging hostname resolves to `staging`
	138	- the production hostname resolves to `production`
	139	- an unrecognized hostname resolves to `production`
	140	- each environment entry exposes the expected `apiBaseUrl`
	141	
	142	## Placeholder values
	143	
	144	The local and staging values below are placeholders supplied at the
	145	user's direction and **must be replaced before deploying**:
	146	
	147	- local `apiBaseUrl`: `http://localhost:3000`
	148	- staging `apiBaseUrl`: `https://staging-api.example.com`
	149	- staging hostname (the host the browser runs on, not the API host):
	150	  `staging.example.com`
	151	
	152	Assumption: the production `apiBaseUrl` is `https://api.example.com`,
	153	derived from the existing `API_ENDPOINT` constant in `app.js`. Validate
	154	by confirming with the user that the current hardcoded value is the
	155	production endpoint.
	156	
	157	Assumption: the production site's own hostname does not need an explicit
	158	mapping entry, because production is the fallback. Validate by confirming
	159	no fourth environment is served from an unlisted host.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
