# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T110831Z-de49/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), not yet implemented
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`app.js` contains a `validateForm` function hardcoded to the login form: it
	10	checks that `username` and `password` are non-empty and returns a single
	11	whole-form error string, which the submit handler writes to `console.error`.
	12	The user is shown nothing. Any second form would have to copy this function and
	13	edit the field names.
	14	
	15	The goal is a validation capability that any form in this app can use, without
	16	each form re-implementing rules, error shapes, or error display.
	17	
	18	## Constraints
	19	
	20	Established with the human partner before design:
	21	
	22	- **Rule set:** required fields plus a small set of common types — email
	23	  format, min/max length, numeric range. Cross-field rules (password
	24	  confirmation) and async rules (server-side uniqueness) are explicitly out of
	25	  scope for this work.
	26	- **Layering:** a pure validator that returns per-field errors, plus a
	27	  separate, opt-in helper that renders them. The core must not reference the
	28	  DOM.
	29	- **Module format:** a dual-export shim (`module.exports` when present, else
	30	  attach to `window`). `index.html` must keep working when opened directly from
	31	  disk over `file://`; Node must be able to load the core for tests. No
	32	  bundler, no build step.
	33	
	34	  The browser globals are named explicitly: `src/validation.js` attaches
	35	  `window.Validation` (`{ rules, validate }`) and `src/validation-display.js`
	36	  attaches `window.ValidationDisplay`
	37	  (`{ readValues, showErrors, clearErrors }`). Exactly two globals are added;
	38	  nothing else is written to `window`.
	39	
	40	## Global Constraints
	41	
	42	- **Tooling to set up:** unit-test infrastructure only — Node's built-in
	43	  `node:test` runner via `"test": "node --test"`. No lint/format tooling and no
	44	  end-to-end tooling in this work.
	45	- **Zero runtime and dev dependencies.** The repo has none today; this work
	46	  adds none. This is what rules out jsdom for testing the display layer.
	47	- **No framework, no transpiler, no bundler.**
	48	
	49	## Approach
	50	
	51	Rules are expressed as **arrays of rule functions per field** (chosen over
	52	data-only descriptors and HTML-attribute-driven validation):
	53	
	54	```js
	55	const loginSchema = {
	56	  username: [required(), minLength(3)],
	57	  password: [required(), minLength(8)],
	58	};
	59	```
	60	
	61	Chosen because it reads nearly identically to a data-only schema at the call
	62	site, makes each rule independently unit-testable, and absorbs the deferred
	63	rules (cross-field, async) later without redesign — a custom rule is just a
	64	function of the right shape. HTML-attribute-driven validation was rejected: it
	65	would require a DOM to do anything, which contradicts the pure-core constraint.
	66	
	67	## Components
	68	
	69	### `src/validation.js` (new) — pure core
	70	
	71	No DOM references anywhere in this file.
	72	
	73	Exports:
	74	
	75	- `rules` — `required`, `email`, `minLength`, `maxLength`, `min`, `max`.
	76	- `validate(values, schema)`.
	77	
	78	Rules are **factories**: `minLength(8)` returns a function
	79	`(value) => message | null`. Each factory takes an optional custom message as
	80	its last argument: `minLength(8, "Password is too short")`. This signature is
	81	the module's extension point — a one-off rule is a function of that shape and
	82	requires no change to the module.
	83	
	84	### `src/validation-display.js` (new) — display layer
	85	
	86	The only file that touches the DOM.
	87	
	88	Exports:
	89	
	90	- `readValues(formEl)` — returns `{fieldName: value}` via `FormData`.
	91	- `showErrors(formEl, errors)` — renders messages; clears previous ones first.
	92	- `clearErrors(formEl)` — removes all messages and error state.
	93	
	94	Error placement: for field `x`, the helper looks inside the form for
	95	`[data-error-for="x"]` and writes the message there. If no such element exists,
	96	it creates a `<span class="field-error" data-error-for="x">` after the input.
	97	A new form therefore needs no ceremonial markup but can override placement.
	98	
	99	Accessibility: the helper sets `aria-invalid` on the invalid input and wires
	100	`aria-describedby` to the message element, so the error is programmatically
	101	associated with its field rather than only visually adjacent.
	102	
	103	### `index.html` (changed)
	104	
	105	- Inputs gain `name` attributes. They currently carry only `id`s, and
	106	  `FormData` keys off `name`.
	107	- Two `<script>` tags for the new modules, before `app.js`.
	108	- A new signup form (see Scope below).
	109	
	110	### `app.js` (changed)
	111	
	112	`validateForm` is deleted. The submit handler becomes:
	113	
	114	```js
	115	const { rules, validate } = window.Validation;
	116	const { readValues, showErrors, clearErrors } = window.ValidationDisplay;
	117	const { required, minLength } = rules;
	118	
	119	form.addEventListener("submit", (e) => {
	120	  e.preventDefault();
	121	  const result = validate(readValues(form), loginSchema);
	122	  if (!result.valid) return showErrors(form, result.errors);
	123	  clearErrors(form);
	124	  login(...);
	125	});
	126	```
	127	
	128	The `login` stub and `API_ENDPOINT` are unchanged.
	129	
	130	## Error Contract
	131	
	132	- `validate` returns `{ valid: boolean, errors: { field: message } }` — a
	133	  **single message string per field**, not an array. Rules for a field run in
	134	  order and **stop at the first failure**: an empty required field reports
	135	  "Username is required", not that plus a length complaint.
	136	- **Only `required` cares about emptiness.** Every other rule passes on an
	137	  empty value. This is what makes optional fields expressible: `[email()]`
	138	  accepts blank, `[required(), email()]` does not.
	139	- `required` treats a whitespace-only value as empty. It trims for the check
	140	  only and never mutates the value. Length rules measure the raw string.
	141	- A schema field absent from the submitted values validates as `""`. A values
	142	  key absent from the schema is ignored, not an error. Partially-validated
	143	  forms are therefore supported.
	144	- `min`/`max` coerce with `Number()` and return a "must be a number" message on
	145	  `NaN` rather than silently passing.
	146	- `email` uses a pragmatic `something@something.tld` check, not RFC 5322. It
	147	  will accept addresses that do not deliver; real verification is a send, not a
	148	  regex. This is an accepted limitation, not an oversight.
	149	- Errors for a field clear when the user edits it — the display helper installs
	150	  an `input` listener — so stale messages do not linger during correction.
	151	- Validation runs **on submit only**: not on blur, not per keystroke. This
	152	  matches current behavior.
	153	
	154	## Scope
	155	
	156	In scope:
	157	
	158	- The two new modules.
	159	- Rewiring the existing login form.
	160	- A **new signup form** in `index.html` (email, password, age), added
	161	  deliberately as a second consumer. With one caller, "reusable" is an untested
	162	  claim; the signup form exercises `email`, `minLength`, and `min` and
	163	  pressure-tests the schema shape before it hardens.
	164	- Unit tests for the core.
	165	
	166	Out of scope:
	167	
	168	- Cross-field rules, async rules.
	169	- Lint/format tooling, end-to-end tooling.
	170	- Any change to `src/index.js`, `src/utils.js`, the `login` stub, or
	171	  `API_ENDPOINT`.
	172	- Actual form submission to a server — `login` remains a stub.
	173	
	174	## Testing
	175	
	176	`package.json` gains `"scripts": { "test": "node --test" }`; tests live in
	177	`test/validation.test.js` and `require('../src/validation.js')` — which the
	178	dual-export shim makes possible.
	179	
	180	Covered:
	181	
	182	- Each of the six rules: a passing value, a failing value, the boundary case
	183	  (`minLength(3)` against exactly three characters), and the custom-message
	184	  override.
	185	- The three contract semantics as explicit tests: short-circuit (an empty field
	186	  yields exactly one message), optional-field behavior (`[email()]` passes on
	187	  `""`; `[required(), email()]` fails), and whitespace-only counting as empty
	188	  for `required`.
	189	- `validate` composition: a clean multi-field pass; a multi-field failure
	190	  returning one message per failing field; a schema field missing from the
	191	  values; a values key absent from the schema being ignored.
	192	- `min`/`max` against a non-numeric string returning the "must be a number"
	193	  message.
	194	
	195	**Known gap:** `src/validation-display.js` has no automated test. Testing it
	196	requires a DOM, which means either jsdom (a dependency, ruled out by the
	197	zero-dependency constraint) or end-to-end tooling (out of scope for this work).
	198	The display layer is verified **by hand** in the browser against both forms:
	199	
	200	1. Submitting either form empty shows one message per invalid field.
	201	2. Each message appears next to its own input.
	202	3. Editing a field clears that field's message.
	203	4. A valid submit clears all messages and reaches the `login` stub.
	204	
	205	This will be reported as manual verification, not as automated test coverage.
	206	If the gap needs closing later, end-to-end tests are the cheaper fix than
	207	jsdom, because they exercise the real submit path.
	208	
	209	## Risks and Assumptions
	210	
	211	- Assumption: the signup form's field set (email, password, age) is
	212	  representative enough to pressure-test the abstraction. Validate via the
	213	  first real form that follows — if it needs a rule shape the schema cannot
	214	  express, the rule-function signature is the escape hatch and no redesign
	215	  should be required.
	216	- Adding `name` attributes to existing inputs changes `index.html` markup. No
	217	  current code reads those inputs by `name`, and the existing `id`-based
	218	  lookups are being replaced in the same change, so nothing else depends on the
	219	  present markup.
	220	- The dual-export shim is a dated idiom. It is four lines and deletable the day
	221	  a bundler is introduced.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T110831Z-de49/home/.cache/hyperpowers/codex-review/44b899475e3e48fdaa5c55c83ca5929fab1714ad/run-jzO1YBwg/adjudications.md

	1	# Approved design decisions (human partner, this session)
	2	
	3	Original request, verbatim: "Make the form validation reusable across multiple forms."
	4	
	5	Decisions the human partner explicitly approved during brainstorming. These are
	6	settled; findings that re-litigate them are out of scope unless they identify a
	7	genuine defect that follows from the decision.
	8	
	9	1. **Rule scope** — required fields plus a small built-in set: email format,
	10	   min/max length, numeric range. Cross-field rules (password confirmation) and
	11	   async rules (server-side uniqueness) are explicitly deferred.
	12	2. **Layering** — pure validator returning per-field errors, plus a separate,
	13	   opt-in display helper. Rejected: validator-only, and a single
	14	   `bindValidation(formEl, schema)` API.
	15	3. **Module format** — dual export shim (`module.exports` when present, else a
	16	   browser global). Rejected: ES modules (would break `file://` page loads and
	17	   force `src/` CommonJS conversion) and browser-global-only (not loadable in
	18	   Node, so the core could not be unit-tested).
	19	4. **Rule expression** — approach A, arrays of rule functions per field
	20	   (`{ username: [required(), minLength(3)] }`). Rejected: data-only
	21	   descriptors (closed vocabulary) and HTML-attribute-driven validation
	22	   (requires a DOM, contradicts decision 2).
	23	5. **Tooling** — unit-test infrastructure only, via Node's built-in `node:test`.
	24	   The human partner declined lint/format tooling and end-to-end tooling for
	25	   this work.
	26	6. **Second form** — a signup form is added to `index.html` deliberately, as a
	27	   second consumer, to pressure-test the abstraction before it hardens.
	28	7. **Error contract** — approved as written in the spec's Error Contract
	29	   section, including: one message per field (not an array), rules
	30	   short-circuiting at the first failure per field, only `required` caring about
	31	   emptiness, and validation running on submit only.
	32	
	33	## Codebase facts
	34	
	35	The repo is a 64-line fixture webapp: `index.html` (one login form, inputs have
	36	`id` but no `name`), `app.js` (login stub + hardcoded `validateForm` + a submit
	37	listener), `src/index.js` and `src/utils.js` (CommonJS, unrelated to the forms),
	38	`package.json` (no scripts, no dependencies), `README.md`. No bundler, no
	39	framework, no test runner, no lint config. Node is available.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
