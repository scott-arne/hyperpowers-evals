# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T021411Z-d21a/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-16
	4	Status: approved, not yet implemented
	5	
	6	## Problem
	7	
	8	The API endpoint lives as a hardcoded constant in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Changing environments means editing application code. There is no place to put
	15	configuration, so the next setting that needs to vary by environment will
	16	become a second hardcoded constant in a second file.
	17	
	18	## Goals
	19	
	20	- Move the API endpoint out of `app.js` into a dedicated settings module.
	21	- Select the active environment automatically from the browser hostname.
	22	- Establish a shape that accommodates additional settings without changing the
	23	  public interface.
	24	
	25	## Non-goals
	26	
	27	- Implementing the real login request. `login()` remains a stub.
	28	- Converting `src/` to a different module system, or wiring it to the browser
	29	  page. `src/` is scaffolding and is left untouched.
	30	- Introducing a build step, bundler, package dependencies, linting, or test
	31	  infrastructure.
	32	
	33	## Decisions
	34	
	35	These were settled during brainstorming; the rationale is recorded because the
	36	alternatives are reasonable and will look tempting again later.
	37	
	38	### Environment selection: runtime hostname detection
	39	
	40	The page reads `window.location.hostname` at load and picks an environment from
	41	a mapping table.
	42	
	43	Rejected: deploy-time file swapping (presumes a build/deploy pipeline this repo
	44	does not have, to solve a one-constant problem) and runtime override via query
	45	parameter or global (lets any visitor repoint a login form at any environment).
	46	
	47	If a real build step arrives later, collapsing the table to a single injected
	48	value is a small contained change.
	49	
	50	### Module format: bare browser script publishing one global
	51	
	52	`settings.js` is a plain script loaded via `<script src>`, wrapped in an IIFE,
	53	publishing `window.APP_SETTINGS`.
	54	
	55	Rejected: converting the project to ES modules (would convert `src/index.js`
	56	and `src/utils.js`, which are unrelated to this change, and would block opening
	57	the page over `file://` without a local server) and a dual CommonJS/global
	58	export wrapper (boilerplate for a Node consumer that does not exist).
	59	
	60	This is cheap to migrate away from: one file, one consumer.
	61	
	62	### Unknown hostname: throw at load
	63	
	64	An unrecognized hostname raises an error naming the hostname and the table to
	65	edit.
	66	
	67	Rejected: defaulting to production. On a login form, a silent misroute sends
	68	real credentials to the wrong backend while everything appears to work.
	69	Defaulting to dev inverts the same risk more severely.
	70	
	71	The cost is that every new domain requires a code change before the page
	72	functions. This repo has no preview deploys, so that cost is currently
	73	theoretical while the misrouting risk is not. Switching the fallback later is a
	74	one-line change; the direction that is expensive to undo is the silent one,
	75	because the need for the other behavior never announces itself.
	76	
	77	### Storage shape: base URL, composed endpoints
	78	
	79	Environments store `apiBaseUrl`. The settings object exposes an `endpoints`
	80	object whose values are absolute URLs composed from that base.
	81	
	82	The current constant fuses base and path (`https://api.example.com/login`).
	83	Splitting them means a second endpoint is one line and cannot drift to a
	84	different host. Composing at construction time keeps string concatenation out
	85	of call sites, which read a single value.
	86	
	87	## Design
	88	
	89	### New file: `settings.js` (repo root)
	90	
	91	Structure, inside an IIFE:
	92	
	93	1. `ENVIRONMENTS` — per-environment values keyed by environment name. Today
	94	   each holds `apiBaseUrl`. This is the table that grows as more settings
	95	   become environment-dependent.
	96	2. `HOSTNAME_ENVIRONMENTS` — hostname to environment-name mapping.
	97	   `localhost` and `127.0.0.1` map to `dev`; the production hostname maps to
	98	   `prod`.
	99	3. `resolveEnvironment(hostname)` — returns the environment name, or throws an
	100	   `Error` naming the unrecognized hostname and directing the reader to
	101	   `HOSTNAME_ENVIRONMENTS` in this file.
	102	
	103	The published object is frozen and carries:
	104	
	105	- `environment` — the resolved environment name, useful for conditional
	106	  behavior and for confirming which environment is live.
	107	- `apiBaseUrl` — from the resolved environment entry.
	108	- `endpoints` — frozen; `login` is `apiBaseUrl + "/login"`.
	109	
	110	Only `window.APP_SETTINGS` is exposed. The tables and the resolver stay private
	111	to the IIFE, so the public interface is the frozen object alone.
	112	
	113	### `index.html`
	114	
	115	Add `<script src="settings.js"></script>` immediately before the existing
	116	`<script src="app.js"></script>`. Load order is the dependency: `app.js` reads
	117	`APP_SETTINGS` at call time, not at parse time, but keeping settings first
	118	makes the relationship visible and survives later top-level use.
	119	
	120	### `app.js`
	121	
	122	Remove the `API_ENDPOINT` constant. `login()` reads
	123	`APP_SETTINGS.endpoints.login`. No other change; the function stays a stub.
	124	
	125	## Error handling
	126	
	127	The throw is deliberate and unguarded. On an unrecognized hostname,
	128	`settings.js` throws during load, `window.APP_SETTINGS` is never defined, and
	129	the submit handler subsequently fails with a `TypeError`.
	130	
	131	`app.js` does not defend against missing settings. A guard or a fallback would
	132	restore precisely the silent-misroute behavior this design rejects.
	133	
	134	Accepted tradeoff: the console shows two errors rather than one. The first
	135	states the hostname and the fix.
	136	
	137	## Assumptions
	138	
	139	- Assumption: the dev API base URL is `http://localhost:3000`. No dev backend
	140	  exists in this repo. Validate by confirming the real value; it is a one-line
	141	  edit.
	142	- Assumption: the production hostname is unknown and ships as a clearly marked
	143	  placeholder in `HOSTNAME_ENVIRONMENTS`. Under throw-on-unknown, production
	144	  will not function until it is filled in, which is the intended loud failure.
	145	  Validate by supplying the hostname the page is served from (not the API
	146	  host).
	147	
	148	## Testing
	149	
	150	No automated tests. The repo has no test runner, no linter, and no
	151	dependencies, and adding unit coverage for `resolveEnvironment` would require
	152	exporting it — reintroducing the dual-export seam this design rejects. This was
	153	raised explicitly during brainstorming and declined in favor of keeping the
	154	project dependency-free.
	155	
	156	Manual verification:
	157	
	158	- Open `index.html` from `localhost`: no console error, and
	159	  `APP_SETTINGS.environment` is `dev` with `endpoints.login` pointing at the
	160	  dev base.
	161	- Open it from an unmapped hostname (including `file://`, where `hostname` is
	162	  the empty string): `settings.js` throws an error naming the hostname.
	163	- Submit the form with both fields filled: the existing stub logs a result, and
	164	  no reference to `API_ENDPOINT` remains anywhere in the tree.
	165	
	166	## Out of scope
	167	
	168	Real network calls, credential handling, staging tier, build tooling, and any
	169	change to `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T021411Z-d21a/home/.cache/hyperpowers/codex-review/986653d14768481873826e248042d95f1583522d/run-XfJzGkeq/adjudications.md

	1	# Approved design decisions (brainstorming, 2026-09-16)
	2	
	3	Original user request: "Move the API endpoint config into a new settings module
	4	so it's easier to change environments."
	5	
	6	Repository state at design time (fixture repo, 4 source files):
	7	
	8	- `app.js` — bare browser script loaded by `index.html` via `<script src>`;
	9	  holds `const API_ENDPOINT = "https://api.example.com/login"`; `login()` is a
	10	  stub that never issues a request.
	11	- `index.html` — login form, loads `app.js`.
	12	- `src/index.js`, `src/utils.js` — CommonJS Node scaffolding (`greet('world')`),
	13	  unconnected to the browser page.
	14	- `package.json` — no dependencies, no scripts, no test runner, no linter.
	15	
	16	Decisions explicitly approved by the user during brainstorming. These are
	17	settled; findings that reopen them need a defect argument, not a preference.
	18	
	19	1. **Environment selection: runtime hostname detection.** User chose this over
	20	   deploy-time swapping and query-param override.
	21	2. **Scope: works across the app, and more settings are expected later.** The
	22	   settings object must accommodate additional keys without an interface change.
	23	3. **Module format: bare browser script publishing one global.** User stated
	24	   `src/` is "just scaffolding for now; the browser page is the real app. Keep
	25	   it simple." ES-module conversion and dual-export were presented and declined.
	26	   `src/` is explicitly out of scope.
	27	4. **Environments: dev + prod only.** Staging declined for now.
	28	5. **Unknown hostname: throw at load.** Presented against defaulting to
	29	   production (rejected: silent credential misrouting on a login form) and
	30	   defaulting to dev. User accepted the recommendation.
	31	6. **Tooling: none.** Linting/formatting and unit tests were offered explicitly
	32	   at design time and declined in favor of keeping the repo dependency-free.
	33	   Findings that recommend adding a test runner, linter, or build step are
	34	   contrary to an explicit user decision.
	35	
	36	Two values are unknown and ship as documented assumptions in the spec: the dev
	37	API base URL and the production hostname.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
