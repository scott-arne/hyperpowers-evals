# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T100746Z-a459/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	`app.js` contains a single `validateForm()` that hardcodes two field names
	9	(`username`, `password`), checks only presence, returns one first-failure error
	10	string, and reports failures to `console.error`. Adding a second form means
	11	copying that function, the submit handler that reads DOM values by element id,
	12	and whatever error reporting the new form invents. Nothing about the current
	13	shape is reusable: the rules, the wiring, and the error display are all fused
	14	into one login-specific block.
	15	
	16	The goal is that adding a form costs a schema and one function call.
	17	
	18	## Scope
	19	
	20	In scope:
	21	
	22	- Required-field and basic-format rules: required, email, min length, max
	23	  length, numeric range. Synchronous, each rule self-contained per field.
	24	- Inline per-field error messages rendered in the DOM, cleared on each submit.
	25	- Native ES modules, no build step.
	26	- Migration of the existing login form onto the new layer.
	27	- Unit-test infrastructure and tests for the pure core.
	28	
	29	Explicitly out of scope (deferred, with room left in the design):
	30	
	31	- Cross-field rules (password confirmation, date ordering).
	32	- Async / server-checked rules (username availability).
	33	- Live validation on blur or input; submit-button disabling.
	34	- Linting and formatting infrastructure.
	35	- End-to-end / browser-driven tests.
	36	
	37	## Decisions
	38	
	39	These were settled during brainstorming and are not open questions:
	40	
	41	1. **Rule scope:** required plus basic formats. Synchronous, per-field.
	42	2. **Error presentation:** inline per-field messages in the DOM.
	43	3. **Module format:** native ES modules (`<script type="module">`). The page is
	44	   served over `http://`, not opened as a `file://` path.
	45	4. **Approach:** a pure rules/evaluation core plus a generic form controller
	46	   that owns DOM reading and error rendering — rather than a rules-only library
	47	   (which makes every form re-solve error UI) or the native Constraint
	48	   Validation API (which limits rule expressiveness and custom message wording,
	49	   and is not unit-testable without a DOM).
	50	5. **Tooling:** unit tests only, via `node:test`. No linter, no formatter, no
	51	   e2e harness.
	52	
	53	## Architecture
	54	
	55	Three new files under `src/validation/`, layered so each has one job and each
	56	layer is usable without the one above it.
	57	
	58	### `src/validation/rules.js`
	59	
	60	Pure, DOM-free rule factories. Each returns a validator with the signature
	61	`(value: string) => string | null` — the message on failure, `null` on pass.
	62	
	63	```
	64	required(message?)
	65	email(message?)
	66	minLength(n, message?)
	67	maxLength(n, message?)
	68	range(min, max, message?)
	69	```
	70	
	71	Each accepts an optional message override; otherwise it supplies a default
	72	("This field is required", "Enter a valid email address", and so on).
	73	
	74	Rule semantics, made explicit so they are not re-decided during
	75	implementation:
	76	
	77	- Every validator receives a **string** (values arrive from DOM inputs).
	78	- `required` fails on the empty string. Because values are trimmed before
	79	  validation, whitespace-only input fails too.
	80	- `email` uses a pragmatic check — non-empty local part, a single `@`, a
	81	  domain containing a dot with non-empty labels — not RFC 5322. The intent is
	82	  to catch typos, not to be an authority on address syntax; real verification
	83	  is a server's job.
	84	- `minLength` / `maxLength` compare `value.length`, inclusive at both bounds
	85	  (`minLength(3)` passes on exactly 3 characters).
	86	- `range(min, max)` parses the value with `Number(value)` and fails with its
	87	  message if the result is `NaN`, so a non-numeric entry reports the range
	88	  message rather than throwing. Bounds are inclusive.
	89	- Only `required` fails on empty input. Every other rule treats `""` as a pass,
	90	  so an optional field with a format rule is valid when left blank; pair it
	91	  with `required()` when the field is mandatory.
	92	- Rules target text-like inputs (`text`, `password`, `email`, `number`,
	93	  `textarea`). Checkboxes, radio groups, and multi-selects are out of scope.
	94	
	95	A validator is just a function, so a one-off custom rule needs nothing from
	96	this module — any `(value) => string | null` works in a schema.
	97	
	98	Depends on: nothing.
	99	
	100	### `src/validation/validate.js`
	101	
	102	```
	103	validate(values, schema) -> { valid, errors }
	104	```
	105	
	106	A schema maps field name to an array of validators:
	107	
	108	```js
	109	{ username: [required()], email: [required(), email()] }
	110	```
	111	
	112	Behavior:
	113	
	114	- Runs each field's validators in array order and keeps the **first** failure
	115	  for that field. `errors` is `{ fieldName: message }` containing only failing
	116	  fields.
	117	- `valid` is `Object.keys(errors).length === 0`.
	118	- A key present in `values` but absent from `schema` is ignored.
	119	- A key present in `schema` but absent from `values` is validated as `""`.
	120	
	121	Depends on: the validator calling convention only, not on `rules.js` itself.
	122	
	123	### `src/validation/form.js`
	124	
	125	```
	126	attachValidation(formEl, schema, onValid) -> void
	127	```
	128	
	129	The only file that touches the DOM. It registers a `submit` listener that:
	130	
	131	1. Calls `preventDefault()`.
	132	2. Collects values from `formEl.elements` by schema key, trimming each.
	133	3. Calls `validate(values, schema)`.
	134	4. On failure, renders the errors. On success, clears all errors and calls
	135	   `onValid(values)`.
	136	
	137	Depends on: `validate.js` and the DOM.
	138	
	139	### Data flow
	140	
	141	```
	142	submit event
	143	  -> formEl.elements
	144	  -> values object (trimmed)
	145	  -> validate(values, schema)
	146	  -> { valid, errors }
	147	  -> error rendering   (invalid)
	148	  -> onValid(values)   (valid)  -> login()
	149	```
	150	
	151	The key property: `rules.js` and `validate.js` never reference a DOM API, so
	152	they run and are tested in plain Node. `form.js` is the only part that needs a
	153	browser.
	154	
	155	## DOM contract
	156	
	157	**Field identification.** Values are read via `formEl.elements[name]`, so every
	158	validated input needs a `name` attribute matching its schema key. The two login
	159	inputs gain `name="username"` and `name="password"`; their existing `id`
	160	attributes stay.
	161	
	162	**Trimming.** Values are trimmed before validation, so a whitespace-only entry
	163	fails `required()`.
	164	
	165	**Error message placement.** For each field, the controller looks for an
	166	element matching `[data-error-for="<fieldName>"]` inside the form.
	167	
	168	- If one exists, it is used.
	169	- If not, the controller creates
	170	  `<span class="field-error" data-error-for="<fieldName>"></span>` and inserts
	171	  it immediately after the input.
	172	
	173	Auto-creation is what keeps adding a form cheap; an error node is hand-placed
	174	in the markup only when it needs to live somewhere other than directly after
	175	its field.
	176	
	177	**Clearing.** On every submit, the controller clears the text of every error
	178	node it manages before rendering the current failures, so a message cannot
	179	outlive the problem that produced it.
	180	
	181	**Accessibility.** A failing input gets `aria-invalid="true"` (removed when it
	182	passes); its error node carries `role="alert"`. Two attributes, applied now
	183	rather than retrofitted.
	184	
	185	## Error handling
	186	
	187	The controller is defensive about programmer error and transparent about
	188	everything else.
	189	
	190	Throws at **attach time**, not at submit time — both conditions are knowable
	191	when `attachValidation` is called, and a page that is wired wrong should say so
	192	on load rather than on the user's first submit:
	193	
	194	- `formEl` is null/undefined or is not a `<form>` element.
	195	- A schema key has no matching named input inside the form. Silently
	196	  validating a field that does not exist is the failure mode that costs an
	197	  afternoon of debugging.
	198	
	199	Not caught, deliberately:
	200	
	201	- A validator that throws. That is a bug in the rule; swallowing it hides it.
	202	- `onValid` throwing. The controller is not the right place to decide what a
	203	  submit-handler failure means.
	204	
	205	User-facing validation failures are not errors in this sense — they are the
	206	normal path, and they are reported through the returned `errors` object and the
	207	inline messages.
	208	
	209	## Changes to existing files
	210	
	211	- **`index.html`** — add `type="module"` to the `app.js` script tag; add
	212	  `name` attributes to the two inputs.
	213	- **`app.js`** — delete `validateForm()`; import `attachValidation` and the
	214	  rules; declare the login schema; replace the hand-written submit listener
	215	  with one `attachValidation` call whose `onValid` calls `login()`. `login()`
	216	  and `API_ENDPOINT` are otherwise unchanged.
	217	- **`package.json`** — add `scripts.test`.
	218	- **`src/index.js`, `src/utils.js`** — untouched. They are unrelated CommonJS,
	219	  are never loaded by the page, and stay as they are.
	220	
	221	## Testing
	222	
	223	**Runner:** `node:test` with `node:assert/strict`. `npm test` runs
	224	`node --test test/`. No dependencies are added.
	225	
	226	**Module resolution constraint.** Node reads `.js` as CommonJS unless told
	227	otherwise, and `src/index.js` / `src/utils.js` are CommonJS that this work does
	228	not touch — so a root-level `"type": "module"` would break them. Instead,
	229	`src/validation/package.json` contains exactly `{"type": "module"}`, marking
	230	only that directory as ESM. Browsers ignore the file; Node respects it. Test
	231	files use the `.mjs` extension so they are ESM regardless of location.
	232	
	233	**Unit tests** cover `rules.js` and `validate.js`:
	234	
	235	- Each rule's pass and fail cases, plus boundaries: empty string,
	236	  whitespace-only, exact min and max length, range endpoints, a non-numeric
	237	  value passed to `range`, a set of valid and invalid email inputs, and the
	238	  "only `required` fails on empty" rule applied to each format rule.
	239	- Message overrides: a rule given a custom message returns it rather than the
	240	  default.
	241	- `validate`: first-failure-per-field ordering, fully clean input, multiple
	242	  failing fields at once, a key in `values` absent from the schema, and a key
	243	  in the schema absent from `values`.
	244	
	245	**`form.js` has no automated tests.** It requires a DOM, and the jsdom /
	246	Playwright infrastructure that would supply one is out of scope. This is a
	247	known, accepted gap: the DOM contract (error node placement, clearing,
	248	`aria-invalid`) is verified manually in a browser, and any claim about it must
	249	be reported as manually verified rather than tested. It is also the reason
	250	`form.js` stays thin — logic belongs in the tested core.
	251	
	252	**Method:** TDD for the core. The test for a rule is written before the rule.
	253	
	254	## Success criteria
	255	
	256	1. Adding a new form requires only: markup with `name` attributes, a schema
	257	   object, and one `attachValidation` call. No new validation or rendering
	258	   code.
	259	2. The login form behaves as before for valid input, and now shows an inline
	260	   message next to each empty field instead of logging to the console.
	261	3. `npm test` passes and covers every rule and every documented `validate`
	262	   behavior.
	263	4. `rules.js` and `validate.js` contain no DOM references.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T100746Z-a459/home/.cache/hyperpowers/codex-review/6312f15e825cc42b990cdef24570b70b96b0227b/run-BiBqK8lj/adjudications.md

	1	# Approved design decisions (brainstorming record)
	2	
	3	## Original request (verbatim)
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Decisions the human partner made, in order
	8	
	9	1. **Rule scope** — required fields plus basic formats (email format, min/max
	10	   length, numeric range). Synchronous, self-contained per field. Cross-field
	11	   rules and async/server-checked rules were offered and NOT chosen; they are
	12	   deliberately out of scope.
	13	2. **Error presentation** — inline per-field messages in the DOM, cleared on
	14	   the next submit. Console-only, a single summary block, and
	15	   inline-plus-live-validation-with-disabled-submit were offered and NOT
	16	   chosen. Live/blur validation and submit-button disabling are therefore
	17	   deliberately out of scope.
	18	3. **Module format** — native ES modules (`<script type="module">`). A global
	19	   namespace script and CommonJS-plus-bundler were offered and NOT chosen. The
	20	   page will be served over `http://`.
	21	4. **Approach** — a pure rules/evaluation core plus a generic form controller
	22	   (`attachValidation`). A rules-only library and the native Constraint
	23	   Validation API were offered and NOT chosen.
	24	5. **Tooling** — unit tests only, via Node's built-in `node:test`, zero
	25	   dependencies. Lint/format (ESLint + Prettier) and end-to-end tests
	26	   (Playwright) were offered and NOT chosen. The absence of lint and e2e
	27	   infrastructure is an accepted decision, not an oversight.
	28	
	29	## Design sections explicitly approved in chat
	30	
	31	- Section 1 (architecture and module boundaries: `rules.js`, `validate.js`,
	32	  `form.js`; data flow; `src/index.js` and `src/utils.js` left untouched) —
	33	  approved verbatim.
	34	- Section 2 (DOM contract via `name` attributes and `data-error-for` nodes,
	35	  auto-creation of missing error nodes, clear-on-submit, `aria-invalid` and
	36	  `role="alert"`, throw-on-programmer-error, no-catch on rule/callback throws)
	37	  — approved verbatim.
	38	- Section 3 (testing: `node:test`, the `src/validation/package.json`
	39	  `{"type":"module"}` marker to avoid breaking the existing CommonJS files,
	40	  unit tests for the pure core only, `form.js` manually verified, TDD for the
	41	  core) — approved verbatim.
	42	
	43	## Codebase facts
	44	
	45	Pre-existing repository contents: `index.html` (one `login-form` with two
	46	inputs carrying only `id` attributes), `app.js` (hardcoded `validateForm()`
	47	plus a submit listener, `login()` stub, `API_ENDPOINT`), `src/index.js` and
	48	`src/utils.js` (unrelated CommonJS, never loaded by the page), `package.json`
	49	(no dependencies, no scripts), `README.md`. No build step, no tests, no
	50	linter, no framework.
	51	
	52	## Notes for the reviewer
	53	
	54	- Items listed above as "offered and NOT chosen" are settled scope decisions.
	55	  Do not report them as gaps or missing requirements.
	56	- The absence of automated tests for `form.js` is a disclosed, accepted gap
	57	  (it follows directly from decision 5). Report it only if the spec's stated
	58	  mitigation is itself inadequate.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
