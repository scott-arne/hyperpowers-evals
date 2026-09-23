# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260922T093300Z-8dc4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-22
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	`API_ENDPOINT` is a hardcoded constant on line 2 of `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application logic,
	15	which puts the endpoint value in the same file as the login flow and the DOM
	16	wiring. There is no way to run the same files against development, staging,
	17	and production.
	18	
	19	## Goal
	20	
	21	Extract the API endpoint into a dedicated settings module that resolves the
	22	correct environment automatically, so switching environments requires no code
	23	edit and no rebuild.
	24	
	25	## Non-Goals
	26	
	27	- No build step, bundler, or package dependencies. The repo is currently
	28	  dependency-free and stays that way.
	29	- No changes to `src/index.js` or `src/utils.js`. Nothing in the Node half of
	30	  the repo reads the API endpoint; wiring it in would be speculative.
	31	- No secrets handling. The endpoint URLs are public, as they already are today
	32	  in shipped source.
	33	
	34	## Context
	35	
	36	The repository contains two unconnected halves:
	37	
	38	- `index.html` + `app.js` — a browser app loaded as a classic script
	39	  (`<script src="app.js">`). No module system, no bundler. `API_ENDPOINT`
	40	  lives here.
	41	- `src/index.js` + `src/utils.js` — a Node CommonJS pair (`require` /
	42	  `module.exports`), and `package.json`'s `main`.
	43	
	44	CommonJS in `src/` cannot be loaded by the browser without a bundler, so the
	45	settings module belongs on the browser side.
	46	
	47	## Decisions
	48	
	49	Each decision below was confirmed with the user during brainstorming.
	50	
	51	| Decision | Choice | Rationale |
	52	|---|---|---|
	53	| Environment selection | Hostname detection | No build toolchain; the same files deploy everywhere unchanged. |
	54	| Module form | Classic script, namespaced global | Matches the existing plain-script style; preserves `file://` loading. ES modules would break opening `index.html` from disk. |
	55	| Unmapped hostname | Throw | On an auth endpoint, a wrong-environment default is worse than a broken page. |
	56	| `file://` (empty hostname) | Mapped explicitly to `development` | Preserves double-click loading; an empty hostname can only mean a local file, so fail-loudly still holds for real unknown hosts. |
	57	| Test infrastructure | Node built-in `node:test` | Zero dependencies, keeps the repo dependency-free. |
	58	
	59	## Architecture
	60	
	61	### New file: `settings.js` (repo root, beside `app.js`)
	62	
	63	An IIFE taking `globalThis`, exposing one global, `window.AppSettings`:
	64	
	65	- `AppSettings.resolveEnvironment(hostname)` — a pure function. Takes a
	66	  hostname string, returns `{ name, apiEndpoint }`, throws on no match. Reads
	67	  no globals and touches no DOM. This purity is what makes the environment
	68	  logic testable without a browser.
	69	- `AppSettings.current` — the result of `resolveEnvironment(location.hostname)`,
	70	  resolved eagerly at load time. Set only when `location` exists, so requiring
	71	  the file under Node does not throw.
	72	
	73	Two tables drive resolution, and they are the only things edited to change
	74	environments:
	75	
	76	```js
	77	const ENVIRONMENTS = {
	78	  development: { apiEndpoint: "<development URL>" },
	79	  staging:     { apiEndpoint: "<staging URL>" },
	80	  production:  { apiEndpoint: "https://api.example.com/login" },
	81	};
	82	
	83	const HOSTNAME_TO_ENVIRONMENT = {
	84	  "":          "development",  // file:// — opened from disk
	85	  "localhost": "development",
	86	  "127.0.0.1": "development",
	87	  // staging and production hostnames
	88	};
	89	```
	90	
	91	Separating hostname-to-name from name-to-settings means adding a preview host
	92	is a one-line change, and a second hostname for an existing environment does
	93	not duplicate its URL.
	94	
	95	Assumption: the environment set is development / staging / production, with
	96	today's `https://api.example.com/login` as production. Validate by confirming
	97	the real staging and production hostnames with the user before implementation;
	98	the development and staging URLs and the non-local hostnames are unknown and
	99	must be supplied.
	100	
	101	### Changes to `app.js`
	102	
	103	- Remove the `API_ENDPOINT` constant (line 2).
	104	- `login()` reads `AppSettings.current.apiEndpoint` at call time rather than
	105	  capturing it at load, so no stale value is held and the existing comment on
	106	  line 6 stays accurate.
	107	- The submit handler gains one guard: if `window.AppSettings` is missing, log
	108	  that settings failed to load and point at the earlier error, then return
	109	  without submitting.
	110	
	111	### Changes to `index.html`
	112	
	113	- Add `<script src="settings.js"></script>` immediately before the existing
	114	  `app.js` tag.
	115	- Add a one-line comment noting that load order is a dependency. This is the
	116	  single non-obvious thing a future reader can break silently.
	117	
	118	## Error Handling
	119	
	120	`resolveEnvironment` throws on an unmapped hostname. The message names the
	121	offending hostname and lists the known ones, so an unlisted host is
	122	diagnosable from the console in one read.
	123	
	124	Classic `<script>` tags execute independently, so a throw in `settings.js`
	125	does not prevent `app.js` from running. Without a guard this produces the real
	126	error at load followed by a confusing `Cannot read properties of undefined` on
	127	submit. The `app.js` guard converts that second error into a message pointing
	128	back at the first, and the form refuses to submit to an unknown endpoint.
	129	Two errors, both naming the real cause.
	130	
	131	## Testing
	132	
	133	`node:test` with `node:assert`, no dependencies. Add a `test` script to
	134	`package.json` running `node --test`.
	135	
	136	`test/settings.test.js` consumes the same interface the browser does:
	137	
	138	```js
	139	require("../settings.js");
	140	const { resolveEnvironment } = globalThis.AppSettings;
	141	```
	142	
	143	The global is the module's interface, so the test needs no export boilerplate
	144	and no environment sniffing in `settings.js`.
	145	
	146	Cases:
	147	
	148	- A known development hostname (`localhost`, `127.0.0.1`) resolves to the
	149	  development environment and its endpoint.
	150	- The empty hostname resolves to development.
	151	- A known production hostname resolves to the production endpoint.
	152	- An unmapped hostname throws, and the error message contains the offending
	153	  hostname.
	154	- Requiring `settings.js` under Node does not throw despite the absence of
	155	  `location`.
	156	
	157	## Risks
	158	
	159	- The hostname table is the single point of correctness. A missing entry takes
	160	  the login form down on that host. This is the accepted cost of the
	161	  fail-loudly decision, and the fix is one line.
	162	- Endpoint URLs for every environment are visible in shipped source. This is
	163	  already true today and is not made worse.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260922T093300Z-8dc4/home/.cache/hyperpowers/codex-review/4a4c2f87742ceded7d58be48c0f6b24a4e7030b8/run-8SYU5PAh/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	The following were each presented to the user with trade-offs and explicitly
	9	approved. They are settled; do not re-litigate them as findings unless a
	10	choice is internally inconsistent with the rest of the spec or has a defect
	11	the user was not told about.
	12	
	13	1. **Environment selection: hostname detection.** Chosen over a hardcoded
	14	   active-env constant and over build-time injection. Rationale: the repo has
	15	   zero dependencies and no build step; hostname detection needs neither and
	16	   lets the same files deploy to every environment.
	17	
	18	2. **Module form: classic script exposing a namespaced global
	19	   (`window.AppSettings`).** Chosen over ES modules and over a dual-mode
	20	   Node/browser module in `src/`. Rationale: `app.js` is already a classic
	21	   script loaded by a plain `<script>` tag; `type="module"` is CORS-blocked on
	22	   `file://` and would break opening `index.html` from disk.
	23	
	24	3. **Unmapped hostname: throw.** Chosen over falling back to development and
	25	   over falling back to production. Rationale: this is a login endpoint; a
	26	   silent wrong-environment default is worse than a visibly broken page.
	27	
	28	4. **`file://` / empty hostname: mapped explicitly to `development`.** Chosen
	29	   over leaving it unmapped. Rationale: preserves double-click loading, which
	30	   motivated decision 2; an empty hostname can only mean a local file, so
	31	   fail-loudly still holds for every real unknown host.
	32	
	33	5. **Test infrastructure: Node's built-in `node:test`.** Chosen over no tests
	34	   and over adding a linter alongside. Rationale: keeps the repo
	35	   dependency-free.
	36	
	37	## Known-open item
	38	
	39	The real staging and production hostnames, and the development and staging
	40	URLs, are not known. The spec records this as an explicit `Assumption: ...
	41	validate via ...` and flags the values as placeholders to be supplied before
	42	implementation. Flagging that these values are unknown is expected, not a
	43	finding; flagging a place where the spec treats them as known would be.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
