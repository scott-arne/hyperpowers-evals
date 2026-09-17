# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T013632Z-7db7/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved in brainstorming, pending implementation plan
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm` function hardcoded to the login form: it
	9	checks `formData.username` and `formData.password` for presence and returns a
	10	single error string. Any second form would have to copy it. The goal is to
	11	extract validation into a reusable module so that adding a form does not mean
	12	duplicating validation logic.
	13	
	14	No second form exists today. The deliverable is therefore the reusable module
	15	plus the login form migrated onto it — not a set of new forms.
	16	
	17	## Decisions taken with the human partner
	18	
	19	| Question | Decision |
	20	|---|---|
	21	| What drives the work | No second form yet; extract now so the next form is cheap |
	22	| Validator's boundary | Compute only — returns results, never touches the DOM |
	23	| Module loading | Native ES modules; no bundler, no build step, no dependencies |
	24	| Rule shape | Predicate map plus a minimal rule library |
	25	| Tooling | Unit tests via `node --test`; no linter, formatter, or e2e |
	26	
	27	Approaches considered and rejected: HTML-native constraint validation (rules as
	28	input attributes — rejected because error messages would be browser-supplied
	29	and cross-field rules have no home) and a declarative schema with a full rule
	30	library (rejected as code written against imagined requirements; it can be
	31	layered on top of the chosen core later without changing it).
	32	
	33	The Codex approach gate ran and returned an incomplete result (preflight
	34	`ok`, companion call returned `{}`); it contributed no approaches. This is a
	35	recorded degrade, not a blocker.
	36	
	37	## Global Constraints
	38	
	39	- No third-party dependencies. Everything uses the standard library and
	40	  built-in browser APIs.
	41	- No build step. Source files are served as written.
	42	- Unit-test infrastructure is set up as part of this work: `node --test` with
	43	  `node:assert`, a `"test"` script in `package.json`, and at least one passing
	44	  test before the change is considered done.
	45	- Match the existing style in `app.js`: two-space indent, double-quoted
	46	  strings, plain function declarations, semicolons.
	47	- Do not modify `src/index.js` or `src/utils.js`. They are an unrelated
	48	  Node-side CommonJS demo not loaded by the page.
	49	- Design documents are not committed unless explicitly requested.
	50	
	51	## Architecture
	52	
	53	One new browser module, imported by the page's existing script.
	54	
	55	```
	56	index.html
	57	  └── <script type="module" src="app.js">
	58	        └── imports ./validation.js   (pure, no DOM)
	59	```
	60	
	61	`validation.js` is the reusable unit. It has one job: given field values and
	62	field rules, produce a validation result. It knows nothing about forms,
	63	elements, or rendering. `app.js` remains the login form's controller: it reads
	64	the DOM, calls the validator, and decides what to do with the result.
	65	
	66	This boundary is what makes the module reusable — a second form imports the
	67	same `validate` and supplies its own rules object, with no changes to
	68	`validation.js` unless it needs a rule that does not exist yet.
	69	
	70	### `validation.js` public interface
	71	
	72	```js
	73	/**
	74	 * A rule is a function: (value) => string | null
	75	 * It returns an error message, or null when the value is acceptable.
	76	 */
	77	
	78	export function required(value)
	79	export function validate(values, rules)
	80	```
	81	
	82	`required` is the only built-in rule shipped, because presence is the only rule
	83	the login form actually has. Additional rules (`minLength`, `pattern`, `email`)
	84	are added when a real form needs them, not before.
	85	
	86	`validate(values, rules)`:
	87	
	88	- `values` — a plain object of field name → value, e.g. `{ username, password }`.
	89	- `rules` — a plain object of field name → array of rules, e.g.
	90	  `{ username: [required] }`.
	91	- Returns `{ valid: boolean, errors: object }`.
	92	
	93	### Result contract
	94	
	95	```js
	96	{ valid: true,  errors: {} }
	97	{ valid: false, errors: { password: "This field is required." } }
	98	```
	99	
	100	- `errors` is always present, `{}` when valid, so callers never branch on
	101	  `undefined`.
	102	- `errors` is a per-field map. This replaces the current single `error` string,
	103	  which is a breaking change to the one existing caller (migrated as part of
	104	  this work). Per-field messages are the point: a single string cannot tell a
	105	  form which input to mark.
	106	- `valid` is `true` exactly when `errors` has no keys.
	107	
	108	### Evaluation semantics
	109	
	110	- Rules for a field run in array order and stop at the first failure, so each
	111	  field contributes at most one message.
	112	- A rule receives `values[field] ?? ""`, so a field missing from `values`
	113	  behaves identically to an empty input and no rule ever sees `undefined`.
	114	- Fields present in `values` but absent from `rules` are ignored, not rejected.
	115	- Iteration is driven by the keys of `rules`, not of `values`.
	116	
	117	## Data flow
	118	
	119	Unchanged in shape from today:
	120	
	121	1. Submit handler intercepts the event and calls `preventDefault()`.
	122	2. It reads the input values from the DOM.
	123	3. It builds a `values` object and calls `validate` with the form's rules.
	124	4. On `valid`, it proceeds to `login()`. Otherwise it reports the errors.
	125	
	126	## Changes by file
	127	
	128	### `validation.js` (new)
	129	
	130	Exports `required` and `validate` as specified above.
	131	
	132	### `app.js`
	133	
	134	- Remove the local `validateForm` function.
	135	- Add `import { validate, required } from "./validation.js";`
	136	- Declare the login form's rules as a module-level constant:
	137	
	138	```js
	139	const LOGIN_RULES = {
	140	  username: [required],
	141	  password: [required],
	142	};
	143	```
	144	
	145	- Update the submit handler to consume the new result shape, reporting each
	146	  field's message:
	147	
	148	```js
	149	const result = validate({ username, password }, LOGIN_RULES);
	150	if (result.valid) {
	151	  const loginResult = login(username, password);
	152	  console.log("Login result:", loginResult);
	153	} else {
	154	  for (const [field, message] of Object.entries(result.errors)) {
	155	    console.error(`Validation error (${field}):`, message);
	156	  }
	157	}
	158	```
	159	
	160	- `login()` and `API_ENDPOINT` are unchanged.
	161	
	162	### `index.html`
	163	
	164	- One change: `<script src="app.js"></script>` becomes
	165	  `<script type="module" src="app.js"></script>`.
	166	
	167	### `package.json`
	168	
	169	- Add `"type": "module"` so `node --test` treats `validation.js` and its test
	170	  as ES modules.
	171	- Add `"scripts": { "test": "node --test" }`.
	172	
	173	Note: `src/index.js` and `src/utils.js` use CommonJS `require` /
	174	`module.exports`. Setting `"type": "module"` makes Node treat `.js` files in
	175	this package as ES modules, which would break those two files if they were
	176	executed. They are a demo that nothing runs, and `package.json`'s `main` points
	177	at `src/index.js` but no script or test invokes it. **Assumption: nothing
	178	depends on running `src/index.js`, validated by confirming with the human
	179	partner during the plan review and by checking that `node --test` passes
	180	without touching `src/`.** If that assumption fails, the fallback is to rename
	181	the two demo files to `.cjs` rather than to abandon `"type": "module"`.
	182	
	183	### `validation.test.js` (new)
	184	
	185	Unit tests using `node:test` and `node:assert/strict`, importing
	186	`validation.js` directly. Cases to cover:
	187	
	188	- Valid input across all fields → `{ valid: true, errors: {} }`.
	189	- One empty field → `valid: false`, message under that field's key only.
	190	- All fields empty → a message under each field's key.
	191	- A field missing from `values` entirely → treated as empty, same message.
	192	- A field in `values` with no entry in `rules` → ignored, does not appear in
	193	  `errors`.
	194	- A field with multiple rules → only the first failing rule's message appears.
	195	- `required` in isolation → returns a string for `""`, `null`, and `undefined`;
	196	  returns `null` for a non-empty string.
	197	
	198	## Error handling
	199	
	200	- Validation failures are data, not exceptions. `validate` does not throw for
	201	  invalid input values.
	202	- `validate` is not defensive about programmer error: passing a rules object
	203	  whose values are not arrays of functions is a bug in the caller, and the
	204	  resulting `TypeError` is the correct signal. No silent coercion.
	205	- The login form's failure path stays console-based, matching current
	206	  behavior. Rendering messages into the page is out of scope.
	207	
	208	## Testing
	209	
	210	- `npm test` (`node --test`) runs the unit tests described above.
	211	- Manual verification: serve the directory over HTTP (for example
	212	  `python3 -m http.server`), open the page, submit the form empty and confirm
	213	  per-field errors in the console, then submit it filled and confirm the login
	214	  result logs. Opening `index.html` from `file://` no longer works, because
	215	  module scripts are blocked by CORS on that scheme — this is a known and
	216	  accepted consequence of the ES-module decision.
	217	
	218	## Non-goals
	219	
	220	- No second form is built.
	221	- No DOM rendering of error messages.
	222	- No rules beyond `required`.
	223	- No linter, formatter, or end-to-end test setup.
	224	- No changes to `login()`, `API_ENDPOINT`, or anything under `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T013632Z-7db7/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-eHBHecnO/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original request, verbatim: "Make the form validation reusable across multiple forms."
	4	
	5	The human partner answered these clarifying questions and approved both design
	6	sections in chat before the spec was written. These are settled — do not
	7	re-litigate them; review the spec against them.
	8	
	9	1. **Driver** — "No second form yet." Login is the only form. The extraction is
	10	   done now so the next form is cheap. Over-generalization is an explicit cost.
	11	2. **Boundary** — "Compute only." The validator returns results and never
	12	   touches the DOM. Error rendering is out of scope.
	13	3. **Module loading** — "Native ES modules." No bundler, no build step, no
	14	   dependencies. The `file://` limitation was named and accepted.
	15	4. **Rule shape** — "Predicate map + tiny rule library." Rejected alternatives,
	16	   with reasons, were HTML-native constraint validation (browser-controlled
	17	   messages, no cross-field rules) and a declarative schema with a full rule
	18	   library (code written against imagined requirements).
	19	5. **Tooling** — Unit tests only, via `node --test` with `node:assert`, zero
	20	   dependencies. Linting, formatting, and end-to-end tests were explicitly
	21	   declined.
	22	
	23	Approved in chat, Section 1: the `validation.js` module, the
	24	`(value) => string | null` rule signature, `validate(values, rules)`, and the
	25	`{ valid, errors }` result contract with a per-field `errors` map replacing the
	26	current single `error` string.
	27	
	28	Approved in chat, Section 2: the `app.js` migration with a `LOGIN_RULES`
	29	constant, the `type="module"` change in `index.html`, `values[field] ?? ""`
	30	normalization, first-failure-per-field semantics, console-based error reporting,
	31	and the non-goals list.
	32	
	33	Environment fact: Node v26.8.2 is installed, so `node --test` is available.
	34	
	35	The Codex approach gate ran before the spec was written and returned an
	36	incomplete result; it contributed no approaches.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
