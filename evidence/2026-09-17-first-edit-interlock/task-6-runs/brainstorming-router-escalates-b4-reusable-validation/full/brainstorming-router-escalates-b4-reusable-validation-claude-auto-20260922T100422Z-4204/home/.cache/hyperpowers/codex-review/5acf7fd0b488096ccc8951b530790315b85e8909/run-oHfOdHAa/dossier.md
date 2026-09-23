# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260922T100422Z-4204/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-reusable-form-validation-design.md

	1	# Reusable Form Validation
	2	
	3	Date: 2026-09-22
	4	Status: approved, not yet implemented
	5	
	6	## Problem
	7	
	8	`app.js` holds a `validateForm(formData)` that hardcodes a presence check over
	9	exactly two fields, `username` and `password`, and returns a single error
	10	string for the whole form. It is a local function in the same file as the
	11	login form's submit handler, so no other form can use it. Any second form
	12	would copy it and edit the field names.
	13	
	14	The request is to make the validation reusable across multiple forms.
	15	
	16	## Scope
	17	
	18	In scope:
	19	
	20	- A shared validation module that any form can use.
	21	- Converting the login form to consume it.
	22	- Unit tests for the module.
	23	
	24	Out of scope, each decided explicitly during design:
	25	
	26	- **Rendering errors into the DOM.** The module stays free of DOM knowledge.
	27	  Each form keeps its own submit handler and decides how to present failures.
	28	  The login form continues to log to the console.
	29	- **Form binding.** No attach-to-a-`<form>`-element helper, no `onValid`
	30	  callback plumbing.
	31	- **Building a second form.** None exists and none is planned; the module is
	32	  general so a future form can adopt it, but this change adds no new form.
	33	- **`src/index.js` and `src/utils.js`.** This CommonJS pair is unrelated to the
	34	  webapp, is not loaded by `index.html`, and is not converted or moved.
	35	- **Lint and format tooling.** Offered and declined; the repo stays
	36	  dependency-free.
	37	
	38	## Global Constraints
	39	
	40	- **ES modules.** Chosen over a `window` global and over CommonJS-plus-bundler.
	41	  Accepted cost, stated and accepted during design: `index.html` gains
	42	  `<script type="module">`, so the page must be served over HTTP and will no
	43	  longer open from `file://`.
	44	- **Zero runtime and dev dependencies.** The repo has no `node_modules`, no
	45	  lockfile, and no bundler. Nothing here adds one. Tests use Node's built-in
	46	  runner.
	47	- **Rules only.** The module is pure: values in, result out, no DOM, no I/O.
	48	- **Nothing outside the webapp files changes** beyond adding a `test` script to
	49	  `package.json`.
	50	
	51	## Design
	52	
	53	### File layout
	54	
	55	Two new files at the repository root, alongside `index.html` and `app.js`:
	56	
	57	- `validation.mjs` — the module
	58	- `validation.test.mjs` — its tests
	59	
	60	The webapp lives at the root, so the module belongs there rather than in
	61	`src/`.
	62	
	63	The `.mjs` extension is load-bearing. `package.json` has no `"type"` field, so
	64	Node treats a plain `.js` file as CommonJS and would refuse to import an ESM
	65	`validation.js` from the test file. The alternatives were rejected: adding
	66	`"type": "module"` breaks `src/index.js`'s `require()` call, and renaming those
	67	files to `.cjs` pulls unrelated code into this change. `.mjs` buys Node-side
	68	testability while leaving everything else alone. Browsers ignore the extension
	69	and load the file by path.
	70	
	71	### Module interface
	72	
	73	A **rule** is any function `(value) => string | null` — the error message on
	74	failure, `null` on pass. Custom rules are therefore ordinary inline functions
	75	and require no change to the shared module. This is the property that keeps a
	76	shared validator from accumulating every individual form's special cases.
	77	
	78	Four exports:
	79	
	80	```js
	81	export function required(message = "This field is required")
	82	export function minLength(n, message)
	83	export function matches(regexp, message)
	84	export function validate(values, rules)
	85	```
	86	
	87	`required`, `minLength`, and `matches` are rule *makers*: each returns a rule.
	88	Each takes an optional `message` that overrides a sensible default, so a form
	89	can phrase its own errors without a new rule kind.
	90	
	91	`validate(values, rules)` takes a plain object of field values and a rules map
	92	of the form `{ fieldName: [rule, rule, ...] }`. It returns:
	93	
	94	```js
	95	{ valid: boolean, errors: { [fieldName]: message } }
	96	```
	97	
	98	`valid` is true exactly when `errors` has no keys.
	99	
	100	### Semantics
	101	
	102	These three could each reasonably go the other way, so they are fixed here:
	103	
	104	1. **A field named in `rules` but absent from `values`** receives `undefined`.
	105	   `required()` rejects it. There is no separate "missing key" concept and no
	106	   distinction between absent and empty.
	107	2. **A field present in `values` but not named in `rules`** is ignored, not an
	108	   error. A form may pass its entire value bag and validate a subset.
	109	3. **First failure per field wins.** Within a field, rules run in array order
	110	   and evaluation stops at the first failure. Other fields are still
	111	   validated. The result is at most one message per failing field, and a form
	112	   with three bad fields reports all three.
	113	
	114	`required` rejects `undefined`, `null`, and any string that is empty or only
	115	whitespace.
	116	
	117	`minLength` and `matches` operate on the value as a string, treating
	118	`undefined` and `null` as `""`. Naive coercion would be a trap: `String(undefined)`
	119	is the 9-character `"undefined"`, so a field carrying `minLength(8)` without a
	120	preceding `required()` would pass while empty. With the rule above it fails
	121	instead, which is the safer default for a rule set assembled per form.
	122	
	123	### Call site
	124	
	125	`app.js` deletes its local `validateForm` and imports the module:
	126	
	127	```js
	128	import { validate, required } from "./validation.mjs";
	129	
	130	const loginRules = { username: [required()], password: [required()] };
	131	const { valid, errors } = validate({ username, password }, loginRules);
	132	```
	133	
	134	On failure the handler logs `errors` via `console.error`, as it does today. On
	135	success it calls `login()` unchanged. `API_ENDPOINT` and `login()` are not
	136	touched.
	137	
	138	`index.html` changes `<script src="app.js">` to
	139	`<script type="module" src="app.js">`. `app.js` keeps its `.js` extension;
	140	only Node cares about the extension, and Node never loads `app.js`.
	141	
	142	### Behavior change
	143	
	144	The login form currently reports one message, `"Missing required fields"`, when
	145	either field is blank. Afterward it reports a per-field message for each blank
	146	field. The accept/reject decision for every input is identical; only the shape
	147	and wording of the console output differ. `validateForm`'s `{ valid, error }`
	148	return shape is replaced by `{ valid, errors }`; its only caller is the submit
	149	handler in `app.js`, updated in the same change.
	150	
	151	## Testing
	152	
	153	`validation.test.mjs` runs under `node --test`, added to `package.json` as
	154	`"scripts": { "test": "node --test" }`.
	155	
	156	Cases:
	157	
	158	- Each rule maker in isolation, passing and failing, with the default message
	159	  and with an overriding message.
	160	- `required` against `undefined`, `null`, `""`, `"   "`, and a valid string.
	161	- `validate` with every field valid, returning `valid: true` and empty
	162	  `errors`.
	163	- `validate` with one failing field, and with several failing fields.
	164	- First-rule-wins ordering within a field.
	165	- A key in `values` with no entry in `rules` is ignored.
	166	- A key in `rules` with no entry in `values` is treated as `undefined`.
	167	- An empty rules object returns `valid: true`.
	168	
	169	## Verification
	170	
	171	`npm test` covers the module. The page change — `type="module"` plus the import
	172	— is not covered by an automated test. It will be reported as verified by
	173	reading only, unless a browser check is requested; any claim that the page
	174	works in a browser requires actually serving and loading it.
	175	
	176	## Risks
	177	
	178	- Serving over HTTP is now mandatory for the page. Anyone opening
	179	  `index.html` directly from disk will see a silent module-load failure in the
	180	  console. This cost was raised during design and accepted.
	181	- The module is general but has exactly one consumer, so its interface is
	182	  validated against a single presence-checking form. The first genuinely
	183	  different form is the real test of the design.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260922T100422Z-4204/home/.cache/hyperpowers/codex-review/5acf7fd0b488096ccc8951b530790315b85e8909/run-oHfOdHAa/adjudications.md

	1	# Approved design context — decisions already settled with the human partner
	2	
	3	The original request, verbatim:
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	The following were explicitly asked and answered during brainstorming. They are
	8	settled: do not re-litigate them as findings. Findings that the spec fails to
	9	*record* a decision, or contradicts one, are in scope.
	10	
	11	1. **Which other forms must this serve?** — "None yet, generic reuse." No second
	12	   form exists or is planned. Design for a general rule set; do not build a
	13	   second form.
	14	
	15	2. **Module loading?** — ES modules. The human partner was shown and accepted
	16	   the cost that `index.html` gains `<script type="module">` and the page will
	17	   no longer open from `file://`. Rejected alternatives: a `window`-global
	18	   script, and CommonJS plus a bundler.
	19	
	20	3. **How much should the reusable piece cover?** — Rules only. A pure function,
	21	   no DOM knowledge. Each form keeps its own submit handler and decides how to
	22	   display errors. Explicitly rejected: rendering error messages into the DOM,
	23	   and full form binding (attach-to-form with an `onValid` callback).
	24	
	25	4. **Which module shape?** — Composable rule functions: a rule is
	26	   `(value) => string | null`, and `validate(values, rules)` takes
	27	   `{ field: [rule, ...] }`. Rejected alternatives: a minimal
	28	   `validate(values, requiredFields)` presence-only extraction, and a
	29	   declarative data schema interpreted by a fixed built-in rule table.
	30	
	31	5. **Tooling?** — Unit tests via `node --test` only. Lint and formatting were
	32	   offered and declined; the repo stays dependency-free.
	33	
	34	6. The human partner was shown and approved, before the spec was written: the
	35	   per-field `{ valid, errors }` result shape replacing the current single
	36	   `error` string, and the resulting change in the login form's console output.
	37	
	38	## Codebase facts
	39	
	40	Repo root: `index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`,
	41	`src/utils.js`. No dependencies, no lockfile, no `node_modules`, no bundler, no
	42	test runner, no linter, and no `"type"` field in `package.json`.
	43	
	44	`app.js` today defines `validateForm(formData)` — a presence check hardcoded to
	45	`username` and `password`, returning `{ valid, error }` — plus a submit handler
	46	for `#login-form` that logs failures with `console.error`, and a stub `login()`.
	47	`index.html` loads it with a plain `<script src="app.js">`.
	48	
	49	`src/index.js` and `src/utils.js` are an unrelated CommonJS pair (`greet`), not
	50	loaded by the page.
	51	
	52	Verified on the development machine: `node --version` is v26.9.0, and
	53	Python 3.14's `http.server` maps both `.js` and `.mjs` to `text/javascript`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
