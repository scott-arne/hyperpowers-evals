# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T021115Z-2573/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved in brainstorming, pending user review of this document
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm(formData)` that hardcodes the login form's two
	9	field names and returns a single all-or-nothing error string. Any second form
	10	would have to copy it. The goal is a shared validation layer that a new form can
	11	adopt without modifying it, with the login form migrated onto that layer as its
	12	first consumer.
	13	
	14	## Decisions Taken
	15	
	16	These were settled during brainstorming and are inputs to the design, not open
	17	questions.
	18	
	19	| Decision | Choice | Why |
	20	|---|---|---|
	21	| Consumers in scope | Login only | No other form exists yet; generality is judged against one real consumer. |
	22	| Module loading | ES modules | Real module boundary without a bundler; costs only that the page must be served over `http://`. |
	23	| Module scope | Rules + form binding, no error rendering | Removes the repeated read-and-check glue; committing to one error-display style with a single consumer would be a guess. |
	24	| Rule declaration | Predicate functions per field | Adding a rule type never requires editing the shared module. |
	25	| Package module type | `"type": "module"` across the package | Lets Node's built-in test runner import the browser module directly. |
	26	| Password `minLength` | Not applied to login | Keeps the migration behavior-identical apart from trimming. |
	27	
	28	## Global Constraints
	29	
	30	- Zero runtime and zero development dependencies. The test runner is Node's
	31	  built-in `node --test`; no linter or formatter is being introduced by this
	32	  work.
	33	- Unit-test infrastructure is set up as part of this work (`test/`, a first
	34	  passing test file, an `npm test` script). No end-to-end, fuzz, or mutation
	35	  testing.
	36	- Assumption: the developer environment has Node 18 or newer, which is what
	37	  provides `node --test`. Validate via `node --version` before running tests.
	38	- Assumption: the page will be served over `http://` during development, e.g.
	39	  `python3 -m http.server`. Validate by loading the served page once after the
	40	  change and confirming the module loads.
	41	
	42	## Architecture
	43	
	44	One new file, `validation.js`, at the repository root beside `app.js`. It has
	45	two layers, and the split is the point: the rule layer knows nothing about the
	46	DOM, and exactly one function knows how to read a form element.
	47	
	48	```
	49	validation.js
	50	  rule layer      required(), minLength(), validate(values, rules)   <- no DOM
	51	  binding layer   valuesFromForm(formEl), validateForm(formEl, rules) <- DOM
	52	```
	53	
	54	A rule is a function `(value, values) => string | null`, returning an error
	55	message or `null`. The second parameter exists so a cross-field rule ("passwords
	56	match") is expressible without any change to the core.
	57	
	58	### Public API
	59	
	60	```js
	61	export function required(message = "This field is required")
	62	export function minLength(n, message)
	63	export function validate(values, rules)     // -> { valid, errors }
	64	export function valuesFromForm(formEl)      // -> { [name]: trimmedValue }
	65	export function validateForm(formEl, rules) // -> { valid, errors, values }
	66	```
	67	
	68	`rules` maps a field name to an array of rule functions. `errors` maps a field
	69	name to the first failing message for that field; fields that pass are absent.
	70	`valid` is true exactly when `errors` has no keys. A field with no entry in
	71	`rules` is not validated.
	72	
	73	Rules for a field that does not exist in the form receive `undefined`, so
	74	`required` fails. That is intentional: a typo'd field name surfaces as a
	75	validation failure rather than as a silently skipped check.
	76	
	77	Trimming happens in two places on purpose, and they do not conflict.
	78	`valuesFromForm` trims so that the values a caller receives are the trimmed
	79	ones, and `required` trims its own input so the rule layer is correct when
	80	called directly on an untrimmed object. Neither depends on the other having
	81	run.
	82	
	83	### Deliberate omissions
	84	
	85	Not built, because nothing needs them yet and each is additive later:
	86	
	87	- No `pattern`, `email`, or `matches` built-ins. A form that needs one passes
	88	  its own inline function; that is the whole point of the rule shape.
	89	- No async rules. Adding them later changes `validate`'s return type, so it
	90	  should be driven by a real server-side-check requirement.
	91	- No DOM error rendering and no submit-handler wiring.
	92	
	93	## Data Flow
	94	
	95	1. Submit handler calls `validateForm(formEl, RULES)`.
	96	2. `valuesFromForm` walks `formEl.elements`, skipping elements without a `name`
	97	   and skipping submit/button elements, and trims string values.
	98	3. `validate` runs each field's rules in order, stopping at that field's first
	99	   failure, and collects messages into `errors`.
	100	4. The caller branches on `valid` and decides how to present `errors`.
	101	
	102	## Login Migration
	103	
	104	**`index.html`**
	105	
	106	- Add `name="username"` and `name="password"` to the two inputs (keeping the
	107	  existing `id` attributes, which the current DOM lookups and any styling use).
	108	- Change `<script src="app.js">` to `<script type="module" src="app.js">`.
	109	
	110	**`app.js`**
	111	
	112	- Remove the local `validateForm`.
	113	- `import { validateForm, required } from "./validation.js";`
	114	- Declare rules as data near the top:
	115	
	116	  ```js
	117	  const LOGIN_RULES = {
	118	    username: [required("Username is required")],
	119	    password: [required("Password is required")],
	120	  };
	121	  ```
	122	
	123	- The submit handler calls `validateForm(form, LOGIN_RULES)` and uses the
	124	  returned `values` instead of two `getElementById(...).value` reads. On
	125	  failure it logs `console.error("Validation errors:", errors)` — console-only,
	126	  matching today's behavior.
	127	- `login()` and `API_ENDPOINT` are untouched.
	128	
	129	**`package.json`**
	130	
	131	- Add `"type": "module"` and a `"scripts": { "test": "node --test" }` entry.
	132	
	133	**`src/`**
	134	
	135	- `src/utils.js`: `module.exports = { greet }` becomes `export function greet`.
	136	- `src/index.js`: `require('./utils')` becomes `import { greet } from './utils.js'`.
	137	- These two files are unrelated to form validation and are converted only
	138	  because `"type": "module"` would otherwise break them. No other change to
	139	  their behavior.
	140	
	141	### Behavior changes
	142	
	143	Both are intended, and both are visible to a user of the login form:
	144	
	145	1. Per-field messages replace the single `"Missing required fields"` string.
	146	2. Values are trimmed before checking, so a whitespace-only username now fails
	147	   where it previously passed.
	148	
	149	## Error Handling
	150	
	151	User-input problems are returned as data in `errors`. Programming errors throw
	152	immediately:
	153	
	154	- `validate` throws `TypeError` if `rules` is not an object, or if any entry in
	155	  a field's rule array is not a function.
	156	- `valuesFromForm` and `validateForm` throw `TypeError` if the argument is not a
	157	  form element (no `elements` collection).
	158	
	159	Failing loudly is the right trade here: the alternative is silently skipping a
	160	check that the author believes is running.
	161	
	162	## Testing
	163	
	164	`test/validation.test.js`, run with `npm test` (`node --test`). Coverage:
	165	
	166	- `required` rejects empty string, whitespace-only, and missing field; accepts a
	167	  non-empty value.
	168	- `minLength` rejects a short value, accepts an exact-length value.
	169	- `validate` collects errors per field, reports only the first failure for a
	170	  field with two failing rules, ignores fields absent from `rules`, and returns
	171	  `valid: true` with an empty `errors` for clean input.
	172	- `validate` throws `TypeError` on a non-function rule entry.
	173	- Cross-field rule: a rule reading the second `values` parameter works.
	174	- `valuesFromForm` trims, skips unnamed elements, and skips the submit button.
	175	
	176	The DOM-touching tests need a form element. Node's test runner has no DOM and
	177	the project has no dependencies, so those two `valuesFromForm` cases use a
	178	hand-built stub object exposing an `elements` array rather than a real DOM. This
	179	is a real limit: the stub encodes our belief about how `form.elements` behaves,
	180	so the browser path also gets one manual check.
	181	
	182	Manual verification: serve the directory, load `index.html`, submit empty (two
	183	per-field errors in the console), submit whitespace-only username (username
	184	error), submit valid input (login result logged).
	185	
	186	## Out of Scope
	187	
	188	- Adding a second form.
	189	- Rendering validation errors in the page.
	190	- Any change to `login()`, `API_ENDPOINT`, or network behavior.
	191	- Linting, formatting, or CI configuration.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
