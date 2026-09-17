# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T022237Z-88d4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (pending spec review)
	5	
	6	## Problem
	7	
	8	`app.js` contains a single `validateForm()` hardcoded to the login form's
	9	`username` and `password` fields. It returns one error string for the whole
	10	form and is called from a submit handler that also reads the DOM and reports
	11	failures to `console.error`. More forms are planned, with field sets that are
	12	not known yet. As written, each new form would duplicate all three jobs:
	13	reading values out of the DOM, checking them, and displaying the results.
	14	
	15	## Goals
	16	
	17	- A validation core that any form can use, independent of the DOM.
	18	- A rule vocabulary extensible without modifying shared code, since the
	19	  rules future forms need cannot be enumerated today.
	20	- Removal of the per-form submit-handler boilerplate that exists in `app.js`.
	21	- Unit tests covering the core.
	22	
	23	## Non-Goals
	24	
	25	- Async or server-side validation. No current form needs it.
	26	- Live validation on `blur` or `input`. Submit-time only.
	27	- A form-state or data-binding library.
	28	- Changes to `login()` or `API_ENDPOINT`. The login stub is out of scope.
	29	- End-to-end browser tests. Disproportionate at this size.
	30	
	31	## Global Constraints
	32	
	33	- **Module system:** ES modules throughout. `package.json` gains
	34	  `"type": "module"`.
	35	- **Dependencies:** none. The repo is dependency-free and stays that way.
	36	- **Tests:** Node's built-in `node:test` runner, via an `npm test` script.
	37	- **Lint/format:** not configured in this change (explicitly declined).
	38	
	39	## Architecture
	40	
	41	Two layers. The core is pure and knows nothing about the DOM; the binder is a
	42	thin adapter over it.
	43	
	44	```
	45	validation/
	46	  validators.js   built-in rule factories
	47	  validate.js     core: data + rules -> errors
	48	  bindForm.js     DOM adapter
	49	  index.js        public surface (re-exports)
	50	```
	51	
	52	Consumers import from `validation/index.js` only. The individual modules are
	53	internal structure, not the interface.
	54	
	55	### Validator contract
	56	
	57	```js
	58	(value, data) => string | null
	59	```
	60	
	61	Returns an error message, or `null` when the value passes. This signature is
	62	the extension point: a custom rule is an ordinary local function, requiring no
	63	change to shared code. The second argument is the full form data object, which
	64	is what makes cross-field rules (confirm-password, end-after-start) possible
	65	without a dedicated mechanism.
	66	
	67	### Core
	68	
	69	```js
	70	validate(data, rules) -> { valid: boolean, errors: { [field]: string } }
	71	```
	72	
	73	- `data` — `{ [field]: value }`.
	74	- `rules` — `{ [field]: validator[] }`.
	75	- Within a field, validators run in order and the **first failure wins**;
	76	  remaining validators for that field are skipped.
	77	- Across fields, **every** field is evaluated, so one submit surfaces all of
	78	  the user's problems.
	79	- `errors` holds at most one message per field. This matches how a form
	80	  renders — one error line per input — and spares callers the choice of which
	81	  of several messages to show.
	82	- `valid` is `true` exactly when `errors` has no keys.
	83	- A field present in `rules` but absent from `data` is validated with
	84	  `undefined` as its value, so `required()` reports it rather than silently
	85	  passing.
	86	- A field present in `data` but absent from `rules` is ignored, not an error.
	87	  Forms may carry values that need no validation.
	88	
	89	### Built-in validators
	90	
	91	Each is a factory returning a validator. Each accepts an optional trailing
	92	custom message that replaces the default.
	93	
	94	| Factory | Fails when |
	95	|---|---|
	96	| `required(message?)` | value is `undefined`, `null`, or a string that is empty after trimming |
	97	| `minLength(n, message?)` | string length is below `n` |
	98	| `maxLength(n, message?)` | string length exceeds `n` |
	99	| `pattern(regex, message?)` | `regex.test(value)` is false |
	100	
	101	`minLength`, `maxLength`, and `pattern` treat an empty value as passing, so
	102	that an optional field is only constrained when filled in. Requiredness is
	103	`required()`'s job alone; composing `[required(), minLength(3)]` then yields
	104	the "missing" message rather than the "too short" one for an empty input.
	105	
	106	No `email()` validator ships. `pattern` expresses it in one line at the call
	107	site, and a shared approximate email regex is worse than no shared one. Add it
	108	when a real form needs it.
	109	
	110	### Binder
	111	
	112	```js
	113	bindForm(formEl, rules, onValid) -> () => void
	114	```
	115	
	116	Attaches a `submit` listener and returns an unbind function. On submit it:
	117	
	118	1. Calls `preventDefault()`.
	119	2. Builds `data` from the form's named inputs.
	120	3. Clears all previously rendered errors.
	121	4. Runs `validate(data, rules)`.
	122	5. On success calls `onValid(data)`; on failure renders the errors.
	123	
	124	DOM conventions:
	125	
	126	- **Field names** come from each input's `name` attribute. Inputs without one
	127	  are skipped.
	128	- **Error display** targets an element with `data-error-for="<field>"`. The
	129	  binder sets its `textContent` and toggles `aria-invalid` on the matching
	130	  input. A field with no such element is skipped rather than throwing — a
	131	  missing error slot must not break submission.
	132	
	133	To keep the binder's logic testable without a DOM, field extraction and error
	134	application are written as separate exported functions that operate on plain
	135	inputs, with `bindForm` as the wiring over them.
	136	
	137	## Integration
	138	
	139	**`app.js`** — delete `validateForm()` and the hand-written submit handler.
	140	Add a rules object for the login form and a single `bindForm` call whose
	141	`onValid` callback invokes the existing `login()`. `login()` and
	142	`API_ENDPOINT` are unchanged.
	143	
	144	**`index.html`** — `<script src="app.js">` becomes
	145	`<script type="module" src="app.js">`. Add `name="username"` and
	146	`name="password"` to the inputs, and a `data-error-for` element per field.
	147	
	148	**`package.json`** — add `"type": "module"` and a `test` script.
	149	
	150	**`src/index.js`, `src/utils.js`** — convert `require`/`module.exports` to
	151	`import`/`export` (5 lines total). These files are unrelated to the feature,
	152	but `"type": "module"` would otherwise break them.
	153	
	154	## Error Handling
	155	
	156	- Invalid arguments to `validate` (non-object `data` or `rules`) throw a
	157	  `TypeError` immediately. This is a programming error, not a user error, and
	158	  should fail loudly at development time.
	159	- A validator that throws is not caught. A broken rule must surface rather
	160	  than silently pass a field.
	161	- `bindForm` throws if `formEl` is not an element or `onValid` is not a
	162	  function; both are wiring mistakes visible on first load.
	163	- Missing error-slot elements are tolerated silently, as above.
	164	
	165	## Testing
	166	
	167	Unit tests under `test/`, run by `node:test`:
	168	
	169	- **Each built-in validator** — passing and failing values, the empty-value
	170	  exemption for the length and pattern rules, and custom message override.
	171	- **`validate`** — first-failure-wins within a field; all fields evaluated;
	172	  `valid` true only when no errors; missing-field-in-`data` handling;
	173	  unvalidated-field-in-`data` ignored; cross-field access via the second
	174	  argument.
	175	- **Binder helpers** — field extraction from a plain input list, and error
	176	  application including the missing-slot case.
	177	
	178	`bindForm`'s event wiring itself is not unit tested; it is verified manually
	179	in the browser.
	180	
	181	## Risks and Assumptions
	182	
	183	- *Assumption:* the page is served over HTTP in development. ES modules do not
	184	  load from `file://`. Validate by opening the served page once after the
	185	  change; if direct file access turns out to be required, the fallback is a
	186	  global-namespace build, which would change the module layout.
	187	- Adding `"type": "module"` touches `src/`, which is outside the feature.
	188	  Scope is 5 lines and covered by the existing entry point running.
	189	- One-message-per-field is a deliberate constraint. A form later needing every
	190	  failure listed per field would require a change to the `errors` shape.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T022237Z-88d4/home/.cache/hyperpowers/codex-review/b183aa770b02a091232f22820a038d2ad087fcbc/run-in3591f4/approved-design-context.md

	1	# Approved Design Context — Reusable Form Validation
	2	
	3	Original user request, verbatim: "Make the form validation reusable across
	4	multiple forms."
	5	
	6	Repository state at the time of the request:
	7	
	8	- `app.js` — a login form only: `validateForm()` hardcoded to `username` and
	9	  `password`, returning `{ valid, error }` with one error string; a `submit`
	10	  listener that reads the DOM, validates, and logs to the console; plus a
	11	  `login()` stub and `API_ENDPOINT` constant.
	12	- `index.html` — loads `app.js` with a plain `<script>` tag. Inputs carry `id`
	13	  but no `name`. No error elements.
	14	- `src/index.js`, `src/utils.js` — an unrelated CommonJS entry point (`greet`).
	15	- `package.json` — no dependencies, no scripts, no `type` field.
	16	- No tests, no linter, no build step.
	17	
	18	## Decisions the user made during brainstorming
	19	
	20	Each was presented with alternatives and trade-offs; the user chose the listed
	21	option. These are settled, not open questions.
	22	
	23	1. **Consumers** — "More forms coming, shapes unknown." No specific second form
	24	   exists yet, so the design targets arbitrary field sets rather than named
	25	   forms.
	26	2. **Scope** — "Core + thin binder." A dependency-free validation core plus an
	27	   optional helper that wires a `<form>` element to it and renders errors.
	28	   Alternatives rejected: pure validation only; a single combined module.
	29	3. **Rule API** — "Composable validator functions." Per field, an array of
	30	   validator functions; built-ins ship as factories; custom rules are ordinary
	31	   functions. Alternatives rejected: a declarative schema object; supporting
	32	   both forms.
	33	4. **Module system** — "ES modules." `index.html` switches to
	34	   `<script type="module">`. Alternatives rejected: a `window` global
	35	   namespace; CommonJS plus a bundler. The user was told explicitly that this
	36	   means the page must be served over HTTP rather than opened from `file://`.
	37	5. **Tooling** — "node:test unit tests" only. ESLint/Prettier, end-to-end
	38	   browser tests, and no-tooling were all offered and declined. The repo stays
	39	   dependency-free.
	40	
	41	## Design sections the user approved in chat
	42	
	43	- **Section 1 (core)**: module layout under `validation/`; validator contract
	44	  `(value, data) => string | null`; `validate(data, rules)` returning
	45	  `{ valid, errors }` with one message per field and first-failure-wins within
	46	  a field; built-ins `required`, `minLength`, `maxLength`, `pattern`; no
	47	  `email()` validator by deliberate choice. Approved including the
	48	  `"type": "module"` conversion of the two `src/` files.
	49	- **Section 2 (binder and integration)**: `bindForm(formEl, rules, onValid)`
	50	  returning an unbind function; field names read from `name` attributes; error
	51	  text rendered into `[data-error-for="<field>"]` with `aria-invalid` toggled;
	52	  missing error slots skipped silently; `index.html` updated with `name`
	53	  attributes and error elements; `login()` and `API_ENDPOINT` untouched; unit
	54	  tests for the core and for the binder's extracted helpers, with `bindForm`'s
	55	  event wiring verified manually rather than in a headless browser.
	56	
	57	## Explicit non-goals, confirmed with the user
	58	
	59	Async/server-side validation; live `blur`/`input` validation; a form-state
	60	library; changes to the login stub; end-to-end browser tests; lint/format
	61	tooling.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
