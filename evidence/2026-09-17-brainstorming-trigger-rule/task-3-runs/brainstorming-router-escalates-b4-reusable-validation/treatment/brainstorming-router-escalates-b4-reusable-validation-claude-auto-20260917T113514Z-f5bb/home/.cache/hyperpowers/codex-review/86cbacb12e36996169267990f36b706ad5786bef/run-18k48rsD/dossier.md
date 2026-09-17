# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T113514Z-f5bb/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved in brainstorming; awaiting user review before planning.
	5	
	6	## Problem
	7	
	8	`app.js` contains a single `validateForm()` that hardcodes a required-field
	9	check for the login form's `username` and `password`. It returns one generic
	10	message (`"Missing required fields"`) for any failure, and `app.js` reports
	11	that failure with `console.error` — the user sees nothing on the page.
	12	
	13	Nothing about this is reusable. A second form would re-implement value
	14	collection, the required check, and error reporting from scratch, and would
	15	invent its own error wording. The goal is a validation layer that makes the
	16	second form cheap to write.
	17	
	18	## Constraints
	19	
	20	- No second form exists yet. There is no concrete consumer to validate the
	21	  design against, so the design is deliberately minimal and biased toward
	22	  being cheap to replace rather than complete.
	23	- No build step, no bundler, no existing test or lint setup.
	24	- `src/index.js` and `src/utils.js` are unrelated CommonJS scratch code. They
	25	  are out of scope and stay untouched.
	26	
	27	## Global Constraints
	28	
	29	- **Module format:** ES modules, web code only. `app.js` and the new
	30	  `validation.js` use `import`/`export`; `index.html` loads `app.js` with
	31	  `<script type="module">`. `src/` remains CommonJS.
	32	- **Serving:** the page must be served over HTTP (e.g. `npx serve`). ES
	33	  modules do not load from `file://`. This is an accepted regression from
	34	  "double-click index.html".
	35	- **Testing:** Node's built-in test runner (`node --test`), no test
	36	  dependencies. `npm test` is wired up in `package.json`. New logic in the
	37	  pure core ships with tests.
	38	- **Not adopted:** no linter, no formatter, no end-to-end test framework.
	39	  These were considered and declined for a page this size.
	40	
	41	## Decisions
	42	
	43	| Decision | Choice | Why |
	44	|---|---|---|
	45	| Rule declaration | Declarative field schema | Adding a form means writing data, not logic. A per-form validator function is cheaper today but is what already exists — factoring it out would not be reuse. |
	46	| Markup coupling | None | HTML constraint attributes (`required`, `minlength`) were rejected: they give up control of message wording and make cross-field rules awkward, and making markup the source of truth is hard to back out of. |
	47	| Layer scope | Pure core plus a thin DOM binder | The per-form boilerplate is the DOM wiring, so a core-only layer would under-deliver on "reusable". The binder is the speculative half and is kept deliberately dumb. |
	48	| Live validation | Excluded | Most speculative surface; no consumer asking for it. |
	49	| `src/` conversion to ESM | Excluded | Unrelated refactoring. |
	50	
	51	## Architecture
	52	
	53	One new file, `validation.js`, at the repo root next to `app.js`.
	54	
	55	### Validators
	56	
	57	A validator is a factory returning a predicate called with
	58	`(value, allValues)`. It returns `null` when the value is acceptable, or a
	59	message string when it is not. Every validator receives `allValues` so that
	60	cross-field rules (confirm-password, "end date after start date") need no
	61	second mechanism when a form eventually wants one.
	62	
	63	```js
	64	export const required  = (msg = "This field is required") => (v) => v.trim() ? null : msg;
	65	export const minLength = (n, msg) => (v) => v.length >= n ? null : msg ?? `Must be at least ${n} characters`;
	66	export const pattern   = (re, msg) => (v) => re.test(v) ? null : msg;
	67	```
	68	
	69	Three validators are the entire starter set. `pattern` covers email and
	70	similar formats until a real form demands more.
	71	
	72	`required` and `minLength` have default messages; `pattern` does not, because
	73	no generic wording describes an arbitrary regex usefully. `pattern`'s `msg`
	74	argument is therefore mandatory.
	75	
	76	### Core
	77	
	78	```js
	79	export function validate(values, schema) → { valid, errors }
	80	```
	81	
	82	- `schema` maps a field name to an ordered array of validators:
	83	  `{ username: [required()], password: [required(), minLength(8)] }`
	84	- `errors` maps a field name to a single message string. Fields that pass are
	85	  absent from `errors`.
	86	- **First failing rule per field wins.** Remaining rules for that field are
	87	  not run, so a user sees one message per field rather than a pile.
	88	- Values are normalized to `""` when missing or nullish before validators run,
	89	  so validators never defend against `undefined`. This matters because
	90	  `validate` is public and callable directly with an arbitrary `values`
	91	  object; when called through `bindForm`, a field missing from the form has
	92	  already thrown at bind time instead.
	93	- `validate` is pure: no DOM access, no I/O.
	94	
	95	### Binder
	96	
	97	```js
	98	export function bindForm(formEl, schema, onValid)
	99	```
	100	
	101	On `submit` the binder:
	102	
	103	1. Calls `preventDefault()`.
	104	2. Collects `{ name: value }` from the form's `[name]` inputs.
	105	3. Runs `validate(values, schema)`.
	106	4. Renders errors — writes each message into
	107	   `[data-error-for="<name>"]` within the form, clearing stale messages on
	108	   every submit so a corrected field's message disappears.
	109	5. Calls `onValid(values)` only when `valid` is true.
	110	
	111	The binder never learns what the form does. It decides only whether `onValid`
	112	runs.
	113	
	114	Two markup conventions total: `name` attributes on inputs, and
	115	`[data-error-for]` elements for messages. Keeping the count at two is what
	116	makes the binder cheap to discard if the second form disagrees with it.
	117	
	118	## Data Flow
	119	
	120	```
	121	submit event
	122	  → preventDefault
	123	  → collect { name: value } from form [name] inputs
	124	  → validate(values, schema) → { valid, errors }
	125	  → render errors into [data-error-for] spans (always, clearing stale)
	126	  → if valid: onValid(values) → login(...)
	127	```
	128	
	129	## Error Handling
	130	
	131	Three cases, deliberately handled differently:
	132	
	133	- **Validation failures are not exceptional.** They are data in `errors`,
	134	  rendered to the page. No throwing.
	135	- **Schema/markup mismatch** — a schema names a field with no matching
	136	  `[name]` input. This is a developer bug; silently validating an `undefined`
	137	  value would hide it, so `bindForm` throws at bind time with the offending
	138	  field name.
	139	- **Missing `[data-error-for]` element** — not fatal. The message is skipped.
	140	  A form may intentionally choose not to display a particular error.
	141	- **`onValid` throwing** propagates untouched. Swallowing it would hide real
	142	  submission failures.
	143	
	144	## Changes to Existing Files
	145	
	146	### `app.js`
	147	
	148	- `validateForm()` is **deleted**. Its behavior is replaced by a schema.
	149	- The manual `getElementById` reads and the submit listener are replaced by a
	150	  single `bindForm` call.
	151	- `login()` and `API_ENDPOINT` are unchanged.
	152	
	153	Resulting shape:
	154	
	155	```js
	156	import { bindForm, required } from "./validation.js";
	157	
	158	const loginSchema = {
	159	  username: [required("Username is required")],
	160	  password: [required("Password is required")],
	161	};
	162	
	163	bindForm(document.getElementById("login-form"), loginSchema, ({ username, password }) => {
	164	  console.log("Login result:", login(username, password));
	165	});
	166	```
	167	
	168	### `index.html`
	169	
	170	- `username` and `password` inputs gain `name` attributes.
	171	- A `<span data-error-for="...">` is added per field.
	172	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	173	
	174	### `package.json`
	175	
	176	- Add `"scripts": { "test": "node --test" }`.
	177	
	178	## Behavior Changes
	179	
	180	These are intentional and were approved:
	181	
	182	- A failed submit previously logged `"Missing required fields"` to the console
	183	  and showed the user nothing. It now renders a per-field message on the page.
	184	- Error messages are per-field and specific rather than one generic string.
	185	- The page must be served over HTTP instead of opened directly as a file.
	186	
	187	## Testing
	188	
	189	`validation.test.js`, run with `node --test`:
	190	
	191	- Each validator's passing and failing case, including `required` rejecting
	192	  whitespace-only input and `minLength`'s default message.
	193	- `validate` with a multi-rule field, asserting first-error-wins ordering.
	194	- `validate` with a cross-field rule reading `allValues`.
	195	- `validate` with all fields valid, asserting `errors` is empty and `valid` is
	196	  true.
	197	- Missing/nullish values normalizing to `""`.
	198	
	199	Binder coverage is partial and knowingly so. Value collection and error
	200	rendering are extracted as separate exported functions and tested against a
	201	hand-built fake element. The submit-event wiring itself is **not** covered by
	202	automated tests — that gap is the accepted cost of declining end-to-end
	203	tests.
	204	
	205	Manual verification after implementation: serve the directory, submit the
	206	empty form and confirm a message appears under each field, then fill both
	207	fields and confirm the login result logs and the messages clear.
	208	
	209	## Out of Scope
	210	
	211	Excluded under YAGNI — no consumer justifies them yet:
	212	
	213	- Live/on-blur validation and per-field dirty state
	214	- Asynchronous validators (e.g. server-side uniqueness checks)
	215	- Internationalization of messages
	216	- A public `validateField` entry point
	217	- Any change to `src/index.js` or `src/utils.js`


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T113514Z-f5bb/home/.cache/hyperpowers/codex-review/86cbacb12e36996169267990f36b706ad5786bef/run-18k48rsD/adjudications.md

	1	# Approved design context — reusable form validation
	2	
	3	Original user request, verbatim: "Make the form validation reusable across
	4	multiple forms."
	5	
	6	Repository state at the time of the request: a static webapp with one form.
	7	`index.html` holds a single login form; `app.js` holds `API_ENDPOINT`, a stub
	8	`login()`, a hardcoded `validateForm()`, and a submit listener. `src/index.js`
	9	and `src/utils.js` are unrelated CommonJS scratch code. No build step, no
	10	tests, no linter.
	11	
	12	The following decisions were made by the user during brainstorming and are
	13	settled. They are inputs to the review, not open questions.
	14	
	15	1. **No second form exists yet.** The user was asked which other forms the
	16	   layer must serve and answered "none concretely yet" — they want the login
	17	   validation factored out so the next form is cheap, with no second consumer
	18	   in hand. The design is therefore deliberately minimal and biased toward
	19	   being cheap to replace.
	20	
	21	2. **Declarative field schema** chosen for rule declaration, over a per-form
	22	   validator function and over HTML constraint attributes.
	23	
	24	3. **ES modules, web code only.** `app.js` and `validation.js` use ESM;
	25	   `index.html` uses `<script type="module">`. `src/` stays CommonJS and is
	26	   explicitly out of scope. The user accepted that the page must now be served
	27	   over HTTP rather than opened from `file://`.
	28	
	29	4. **Core plus a thin DOM binder**, with live/on-blur validation explicitly
	30	   excluded. The user chose this over a pure core with no DOM involvement.
	31	
	32	5. **Tooling:** unit tests only, using Node's built-in `node --test` runner
	33	   with no dependencies. The user was offered lint+format and end-to-end tests
	34	   alongside, and declined both. Consequently the binder's submit-event wiring
	35	   has no automated coverage; the spec states this gap rather than hiding it.
	36	
	37	Review guidance: findings that re-litigate decisions 1-5 above are out of
	38	scope unless the decision makes the spec internally inconsistent or
	39	unbuildable as written.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
