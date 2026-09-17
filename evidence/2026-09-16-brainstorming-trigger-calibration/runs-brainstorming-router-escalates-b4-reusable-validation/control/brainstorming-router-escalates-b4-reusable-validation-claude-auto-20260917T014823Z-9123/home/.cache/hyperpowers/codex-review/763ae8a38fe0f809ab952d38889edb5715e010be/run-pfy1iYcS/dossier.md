# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T014823Z-9123/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm` function that hardcodes the field names
	9	`username` and `password`, implements a single rule (non-empty), and returns
	10	one error string for the whole form. A second form cannot use it without
	11	copying it. The submit handler reads each input by literal element id and
	12	reports failures to `console.error`.
	13	
	14	The goal is a shared validation module that any form in this project can use.
	15	
	16	## Scope and Non-Goals
	17	
	18	In scope:
	19	
	20	- A `validation.js` module: rule factories, a pure validator, and a thin
	21	  form-submit adapter.
	22	- Converting the existing login form to use it.
	23	- Zero-dependency unit tests for the pure parts.
	24	
	25	Explicitly not in scope:
	26	
	27	- Rendering error messages into the page. The module reports errors to a
	28	  caller-supplied callback; each form decides what to do with them. As a
	29	  result `app.js` continues to send validation failures to `console.error`,
	30	  where users do not see them. This is a known remaining gap and the natural
	31	  next piece of work, not a defect introduced here.
	32	- Async or server-side validation.
	33	- Cross-field rules (for example confirm-password). The rule signature leaves
	34	  room for them; none ship now.
	35	- Converting `src/` away from CommonJS.
	36	- Any change to `login()` or `API_ENDPOINT`.
	37	
	38	## Decisions
	39	
	40	Each decision below was settled with the human partner during brainstorming.
	41	
	42	1. **Module ownership: rules plus input reading.** The module validates a
	43	   `<form>` element against a declared schema and hands errors back through a
	44	   callback. It does not own error markup or styling. Chosen over a
	45	   pure-rules-only module (which would leave ~8 lines of duplicated DOM wiring
	46	   per form) and over a display-owning module (which would bake in markup
	47	   decisions with no second form to validate them against).
	48	
	49	2. **ES modules.** `validation.js` uses `export`; `index.html` loads `app.js`
	50	   with `<script type="module">`. Chosen because the identical file runs in
	51	   the browser and under `node --test` with no shim and no bundler.
	52	   Accepted consequence: `type="module"` is fetched under CORS rules, so
	53	   opening `index.html` via `file://` no longer works and a local HTTP server
	54	   is required.
	55	
	56	3. **Rules as data.** Rules are small composable functions produced by
	57	   factories; a schema is a plain object mapping field names to rule arrays.
	58	   Chosen over the browser Constraint Validation API (rules in markup — less
	59	   logic to own, but untestable without a DOM, which is most of the value
	60	   here) and over one hand-written validate function per form (which makes the
	61	   wiring reusable but not the validation, i.e. not what was asked for).
	62	
	63	4. **General prep, not a specific second form.** No concrete second form or
	64	   additional rules are confirmed. The rule vocabulary is therefore capped at
	65	   two: `required`, which the login form uses, and `minLength`, which is
	66	   included as the second rule so the schema format is exercised by more than
	67	   a single rule shape. Nothing beyond those two ships; generality past them
	68	   is deferred until a form needs it.
	69	
	70	5. **Unit tests, no linter.** `node:test` and `node:assert` are built into the
	71	   installed Node (v26.8.2), so tests add no dependencies. eslint/prettier are
	72	   skipped: they would be the first dependencies in a zero-dependency repo, for
	73	   64 lines of code.
	74	
	75	## Architecture
	76	
	77	One new file, `validation.js`, with two layers.
	78	
	79	### Pure core (no DOM)
	80	
	81	```js
	82	export function required(message = "This field is required")
	83	export function minLength(n, message)
	84	export function validate(values, schema)
	85	```
	86	
	87	A **rule** is a function `(value, values) => string | null`, returning a
	88	message on failure and `null` on pass. The second parameter is the full values
	89	object; it exists so cross-field rules can be added later without changing the
	90	rule signature. No rule uses it today.
	91	
	92	A **schema** is `{ fieldName: [rule, ...] }`.
	93	
	94	`validate(values, schema)` returns:
	95	
	96	```js
	97	{ valid: true,  errors: {} }
	98	{ valid: false, errors: { username: "Username is required" } }
	99	```
	100	
	101	Errors are keyed per field, replacing the current single whole-form string, so
	102	a caller can point at the field that failed.
	103	
	104	**Rules short-circuit per field:** the first failing rule for a field produces
	105	that field's message and the remaining rules for that field are not run. One
	106	message per field. Collecting every failure per field is a later change that
	107	does not break this return shape.
	108	
	109	Fields present in `values` but absent from the schema are ignored. Fields in
	110	the schema but absent from `values` are validated as the empty string, so a
	111	missing field fails `required` rather than passing silently.
	112	
	113	### Form adapter (DOM)
	114	
	115	```js
	116	export function attachValidation(formEl, schema, { onValid, onInvalid })
	117	```
	118	
	119	Binds one `submit` listener to `formEl`. On submit it calls
	120	`e.preventDefault()`, builds a values object from `new FormData(formEl)`,
	121	calls `validate`, then calls `onValid(values)` or `onInvalid(errors, values)`.
	122	It contains no validation logic of its own.
	123	
	124	### Data flow
	125	
	126	```
	127	submit event
	128	  -> preventDefault()
	129	  -> FormData(formEl) -> plain values object
	130	  -> validate(values, schema)
	131	  -> valid   ? onValid(values)
	132	     invalid ? onInvalid(errors, values)
	133	```
	134	
	135	## Behavior Changes
	136	
	137	Two deliberate changes to existing behavior:
	138	
	139	1. **`required` rejects whitespace-only input.** Today `validateForm` uses a
	140	   falsy check, so `"   "` passes. A shared `required` that preserved this
	141	   would propagate the bug to every future form.
	142	
	143	2. **`index.html` inputs gain `name` attributes.** They currently have `id`
	144	   only, and `FormData` collects named fields exclusively. Without this the
	145	   adapter sees an empty values object.
	146	
	147	## Error Handling
	148	
	149	- `attachValidation` throws a `TypeError` if `formEl` is null or not a form
	150	  element. Passing a bad selector result is a programmer error and should fail
	151	  loudly at wiring time, not silently no-op at submit time.
	152	- `onValid` and `onInvalid` are both optional; a missing callback is a no-op.
	153	- Rule factories validate their own arguments: `minLength` throws a
	154	  `TypeError` on a non-integer or negative `n`.
	155	- `validate` does not throw on unexpected value types; a non-string value is
	156	  coerced with `String(value)` before rules see it.
	157	
	158	## Testing
	159	
	160	`validation.test.js`, run with `node --test`:
	161	
	162	- `required` — rejects empty string, whitespace-only, and missing field;
	163	  accepts ordinary text and the string `"0"`.
	164	- `minLength` — boundary cases at `n-1`, `n`, `n+1`; throws on invalid `n`.
	165	- `validate` — valid schema passes with empty errors; a single failing field;
	166	  multiple failing fields; short-circuit behavior (only the first failing
	167	  rule's message appears); unknown fields in `values` ignored; schema field
	168	  missing from `values` fails `required`.
	169	- Custom messages are returned verbatim.
	170	
	171	**Known coverage gap:** `attachValidation` is not unit tested. It needs a real
	172	`HTMLFormElement` for `FormData`, which `node:test` has no DOM for, and adding
	173	jsdom for one thin function was declined. It stays small enough to review by
	174	eye and is verified manually in the browser (submit empty, submit
	175	whitespace-only, submit valid).
	176	
	177	## Module Format Detail
	178	
	179	Adding `"type": "module"` to the root `package.json` would break
	180	`src/index.js`, which uses `require`. A new `src/package.json` containing
	181	`{"type": "commonjs"}` scopes the old format to that directory. This is the
	182	standard Node dual-format pattern and avoids both converting `src/` (out of
	183	scope) and renaming to `.mjs` (which depends on the local server sending the
	184	correct MIME type for that extension).
	185	
	186	## Files
	187	
	188	| File | Change |
	189	|---|---|
	190	| `validation.js` | New. Rule factories, `validate`, `attachValidation`. |
	191	| `validation.test.js` | New. `node:test` coverage of the pure core. |
	192	| `app.js` | Delete `validateForm`; import the module, declare `loginSchema`, replace the inline submit handler with `attachValidation`. `login()` and `API_ENDPOINT` untouched. |
	193	| `index.html` | Add `name` to both inputs; `<script type="module" src="app.js">`. |
	194	| `package.json` | Add `"type": "module"` and `"scripts": { "test": "node --test" }`. |
	195	| `src/package.json` | New. `{"type": "commonjs"}`. |
	196	| `README.md` | Note the local-server requirement and `npm test`. |
	197	
	198	Estimated size: roughly 60 lines added, 15 removed.
	199	
	200	## Global Constraints
	201	
	202	- Zero runtime and development dependencies. `node:test` and `node:assert`
	203	  only.
	204	- No bundler, no transpiler, no build step.
	205	- `validate` and all rule factories must remain free of DOM references so they
	206	  run under `node --test` unmodified.
	207	- Follow the existing code style in `app.js`: two-space indent, double-quoted
	208	  strings, semicolons.
	209	- Implementation follows TDD: the tests above are written before the
	210	  implementation they cover.
	211	
	212	## Verification
	213	
	214	- `npm test` passes.
	215	- Serving the directory over HTTP and loading `index.html`: submitting an empty
	216	  form logs per-field errors; submitting whitespace-only input fails
	217	  validation; submitting valid input reaches `login()` and logs the result.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T014823Z-9123/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-pfy1iYcS/adjudications.md

	1	# Approved design decisions (settled with the human partner)
	2	
	3	Original request, verbatim: "Make the form validation reusable across multiple forms."
	4	
	5	These were each put to the human partner during brainstorming and approved.
	6	They are settled inputs to the spec, not open questions:
	7	
	8	1. **Driver: general prep / cleanup.** No concrete second form and no
	9	   additional rules are confirmed. Approved on the understanding that the
	10	   design stays small rather than anticipating unknown forms.
	11	
	12	2. **Module scope: rules plus input reading.** The module validates a `<form>`
	13	   element against a declared schema and returns errors to a caller-supplied
	14	   callback. Rendering error UI was explicitly placed OUT of scope. The
	15	   consequence — that `app.js` keeps logging validation failures to
	16	   `console.error` where users cannot see them — was stated to the human
	17	   partner before approval and accepted as a known remaining gap.
	18	
	19	3. **ES modules.** Approved along with the stated consequence that
	20	   `index.html` can no longer be opened via `file://` and needs a local HTTP
	21	   server.
	22	
	23	4. **Rules as data.** A schema of `{ field: [rule, ...] }` built from rule
	24	   factories. The alternatives — the browser Constraint Validation API (rules
	25	   as markup) and one hand-written validate function per form — were presented
	26	   with tradeoffs and not chosen.
	27	
	28	5. **Design section 1 approved as presented:** two-layer module (pure core
	29	   plus DOM adapter), rule signature `(value, values) => string | null`,
	30	   per-field errors, first-failing-rule-wins short-circuiting. Two offered
	31	   revisions — dropping `minLength`, and collecting all errors per field —
	32	   were both declined in favour of the design as presented.
	33	
	34	6. **Tooling: unit tests, no linter.** `node:test` / `node:assert` only, zero
	35	   dependencies. Adding eslint + prettier was offered and declined. Adding
	36	   jsdom to unit-test the DOM adapter was offered and declined, which is why
	37	   the spec records an explicit coverage gap for `attachValidation`.
	38	
	39	## Codex approach gate
	40	
	41	The approach gate fired and ran, but the companion returned an empty result
	42	(`{}`). The gate degraded per its one-shot rule: the approaches presented to
	43	the human partner were Claude's own, with no independent Codex input.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
