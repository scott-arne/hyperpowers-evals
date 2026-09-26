# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260926T082612Z-9cd1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-settings-module-design.md

	1	# Settings Module for Environment-Specific API Configuration
	2	
	3	Date: 2026-09-26
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	`app.js` hardcodes the API endpoint on line 2:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Changing environments means editing application source, which makes it easy to
	15	deploy a build pointed at the wrong API and leaves no single place to see what
	16	each environment talks to. The goal is a dedicated settings module so the
	17	endpoint is configuration rather than code.
	18	
	19	## Context
	20	
	21	The repository is a four-file static webapp with no toolchain:
	22	
	23	- `index.html` loads `app.js` with a classic `<script src>` tag.
	24	- `app.js` is browser code with no module syntax; it relies on script-tag
	25	  global scope.
	26	- `package.json` declares no dependencies, no scripts, and no `"type"` field.
	27	  There is no bundler, build step, linter, formatter, test runner, or CI.
	28	- `src/index.js` and `src/utils.js` are CommonJS Node files, unrelated to the
	29	  webapp and not loaded by the page.
	30	
	31	The repo therefore already spans two module worlds — CommonJS under `src/`,
	32	implicit globals at the root — with nothing shared between them.
	33	
	34	## Decisions
	35	
	36	These were settled during brainstorming; the alternatives are recorded so the
	37	reasoning survives.
	38	
	39	**Environment selection: hostname detection.** The settings module maps
	40	`window.location.hostname` to an endpoint, so one set of files deploys to every
	41	environment and self-selects. Rejected: a single hand-edited `ENVIRONMENT`
	42	constant (a manual pre-deploy step that is easy to forget); build-time
	43	injection (requires introducing tooling the repo does not have); a
	44	query-param/localStorage dev override (deferred as unneeded for now).
	45	
	46	**Environments defined: local, staging, production.** Local and staging hosts
	47	are placeholders for the maintainer to replace. The production endpoint carries
	48	over the existing `https://api.example.com/login` value unchanged, so behavior
	49	on the real production host is identical to today.
	50	
	51	**Scope: the API endpoint only.** No timeouts, feature flags, or base-URL
	52	splitting. Additional settings get added when something actually needs them.
	53	
	54	**Wiring: classic script tag plus a pure resolver.** A new root-level
	55	`config.js` is loaded by its own `<script>` tag ahead of `app.js` and publishes
	56	a global. Rejected: ES modules, which give a real module boundary but are
	57	fetched under CORS rules, so the page would stop working when opened directly
	58	from disk — a workflow cost that outweighs module hygiene on a page this small.
	59	Also rejected: a dual-target CommonJS/browser module, which would let `src/`
	60	consume the settings, but `src/` is unrelated to the webapp and makes no API
	61	calls (YAGNI).
	62	
	63	**Unknown hostname: throw.** Resolution of an unmapped hostname raises an error
	64	naming the hostname. Rejected: falling back to production (a stray deployment
	65	would silently talk to the production API), falling back to local (fails
	66	harmlessly but obscurely), and warning with a null endpoint (defers the failure
	67	to the first request).
	68	
	69	## Design
	70	
	71	### New file: `config.js`
	72	
	73	Placed at the repository root beside `app.js`, not under `src/`, because `src/`
	74	is the unrelated Node tree.
	75	
	76	```js
	77	// Per-environment settings, selected by the hostname the page is served from,
	78	// so the same files can be deployed to every environment unchanged.
	79	const ENVIRONMENTS = {
	80	  // Empty hostname is a file:// URL — opening index.html directly from disk.
	81	  "": { apiEndpoint: "http://localhost:3000/login" },
	82	  "localhost": { apiEndpoint: "http://localhost:3000/login" },
	83	  "127.0.0.1": { apiEndpoint: "http://localhost:3000/login" },
	84	  "staging.example.com": { apiEndpoint: "https://api-staging.example.com/login" },
	85	  "www.example.com": { apiEndpoint: "https://api.example.com/login" },
	86	};
	87	
	88	function resolveSettings(hostname) {
	89	  const settings = ENVIRONMENTS[hostname];
	90	  if (!settings) {
	91	    throw new Error(
	92	      `No settings configured for hostname "${hostname}". ` +
	93	      `Add it to ENVIRONMENTS in config.js.`
	94	    );
	95	  }
	96	  return settings;
	97	}
	98	
	99	const APP_SETTINGS = resolveSettings(window.location.hostname);
	100	```
	101	
	102	The empty-string entry exists because the two approved decisions interact: on a
	103	`file://` URL `window.location.hostname` is `""`, which the throw-on-unknown
	104	rule would otherwise treat as an unrecognized host and reject. Mapping `""` to
	105	the local endpoint preserves the open-from-disk workflow that motivated the
	106	script-tag approach, while keeping the throw loud for genuinely unknown hosts.
	107	
	108	`resolveSettings` is a separate pure function rather than inline lookup so that
	109	environment resolution can be tested by passing a hostname string, with no DOM
	110	and no page load.
	111	
	112	### Changed file: `index.html`
	113	
	114	Add one line immediately before the existing `app.js` tag:
	115	
	116	```html
	117	<script src="config.js"></script>
	118	<script src="app.js"></script>
	119	```
	120	
	121	Order is load-bearing: `config.js` must define `APP_SETTINGS` before `app.js`
	122	is parsed.
	123	
	124	### Changed file: `app.js`
	125	
	126	Delete the `const API_ENDPOINT` line, and update the stub comment inside
	127	`login()` to name `APP_SETTINGS.apiEndpoint` instead. No other logic changes.
	128	`API_ENDPOINT` is currently referenced only from that comment — `login()` does
	129	not yet make a network call — so no call site needs rewriting.
	130	
	131	## Data flow
	132	
	133	`config.js` executes first, resolves the hostname exactly once at load time,
	134	and publishes `APP_SETTINGS`. `app.js` reads `APP_SETTINGS.apiEndpoint` at the
	135	point of use. Resolution is eager and happens once per page load; there is no
	136	lazy lookup and nothing to re-resolve.
	137	
	138	## Error handling
	139	
	140	An unrecognized hostname throws while `config.js` is executing, before `app.js`
	141	is parsed. The practical consequence is that the submit listener is never
	142	attached: the console shows an error naming the hostname, and the form silently
	143	does nothing. "Loud" therefore means a console error plus a dead form, not a
	144	message visible to an end user. User-facing error UI is out of scope.
	145	
	146	## Testing
	147	
	148	The repository has no test runner, no lint config, and no CI, so there is no
	149	established testing pattern to follow and this change does not introduce one.
	150	`resolveSettings` is pure specifically so that a test becomes a one-liner once
	151	a runner exists.
	152	
	153	Verification is manual:
	154	
	155	1. Open `index.html` from disk; confirm the console shows no error and
	156	   `APP_SETTINGS.apiEndpoint` is the localhost value.
	157	2. From the browser console, call `resolveSettings("nope.example.com")` and
	158	   confirm the thrown message names that hostname and reads clearly.
	159	3. Confirm the production entry still carries the original
	160	   `https://api.example.com/login`.
	161	
	162	Standing up a minimal test runner is a separate decision, deliberately not
	163	folded into this change.
	164	
	165	## Out of scope
	166	
	167	- `src/index.js` and `src/utils.js` — not loaded by the page.
	168	- Making `login()` perform an actual network request.
	169	- Any build tooling, bundler, or `.env` handling.
	170	- User-facing error UI for the unknown-hostname case.
	171	
	172	## Assumptions
	173	
	174	- Assumption: the production host is `www.example.com`; validate by confirming
	175	  the hostname the deployed page is actually served from before the map is
	176	  relied on. The staging and local entries are explicit placeholders awaiting
	177	  real values.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
