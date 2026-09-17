# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T093857Z-30d2/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved (design); implementation plan pending
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm` function hardcoded to the login form's two
	9	fields:
	10	
	11	```js
	12	function validateForm(formData) {
	13	  if (!formData.username || !formData.password) {
	14	    return { valid: false, error: "Missing required fields" };
	15	  }
	16	  return { valid: true };
	17	}
	18	```
	19	
	20	Signup and profile-edit forms are coming. Each needs required-field checks
	21	plus a couple of format rules (email, minimum length). Copying this function
	22	per form would duplicate the logic and produce three divergent error
	23	contracts. There is no shared place to put validation today: `app.js` is a
	24	classic browser script with implicit globals, and `src/` is unrelated
	25	CommonJS Node code.
	26	
	27	The single `error` string is a second problem. It reports one message for the
	28	whole form, which is adequate for two fields and useless for a signup form
	29	that needs to say which field failed.
	30	
	31	## Goals
	32	
	33	- One shared validation module usable by every current and future form.
	34	- Per-field error reporting.
	35	- Rules that are readable at the call site and extensible without editing the
	36	  shared module.
	37	- Test coverage for the module, in a repo that currently has none.
	38	
	39	## Non-goals
	40	
	41	- Building the signup or profile-edit forms. They motivate the work; they are
	42	  not in scope. The deliverable is the module plus the login form migrated
	43	  onto it.
	44	- DOM handling of any kind: reading inputs, intercepting submit, rendering
	45	  errors. Each form keeps its own submit handler.
	46	- Async or server-side validation.
	47	- Changing `src/index.js` or `src/utils.js`.
	48	
	49	## Decisions
	50	
	51	Four decisions were made with the human partner during brainstorming, in
	52	order:
	53	
	54	1. **Scope: validation only.** The module is a pure function — rules and data
	55	   in, errors out. No DOM. Rejected alternatives: a form-binding helper that
	56	   owns submit interception and error rendering (DOM-coupled, untestable
	57	   without a DOM, and bakes an error-display convention into every form), and
	58	   a middle option adding only a shared error renderer. Binding can be layered
	59	   on later once real duplication is visible.
	60	
	61	2. **Loading: ES modules.** `index.html` switches to
	62	   `<script type="module" src="app.js">`. Rejected alternatives: a plain
	63	   script exposing a global (matches the current setup but is not testable in
	64	   Node), and CommonJS plus a bundler (consistent with `src/` but adds a build
	65	   step and a dependency to a repo with neither).
	66	
	67	3. **Rule format: composable predicates.** Rules are functions, not data.
	68	   Rejected alternatives: a declarative rule schema keyed by rule name (more
	69	   readable and serializable, but requires a dispatch registry inside the
	70	   module that exists only to turn strings back into these same functions),
	71	   and shared predicate helpers with a hand-written validator per form (most
	72	   flexible, but leaves the per-form boilerplate that motivated the work).
	73	
	74	   Also considered and discarded: driving validation from HTML attributes
	75	   (`required`, `type="email"`) through the browser's Constraint Validation
	76	   API. It needs the form element, contradicting decision 1, and cannot
	77	   express cross-field rules.
	78	
	79	4. **Tooling: unit tests only.** Node's built-in `node:test` runner, no
	80	   dependencies. A linter and formatter were offered and declined.
	81	
	82	## Architecture
	83	
	84	### `validation.js` (new, repo root)
	85	
	86	Placed at the root beside `app.js` rather than in `src/`, because `src/` is
	87	CommonJS Node code and this is browser ES-module code. Mixing the two module
	88	systems in one directory is the confusion this avoids.
	89	
	90	**Rule builders.** Each returns a predicate with the signature
	91	`(value, data) => string | null`, where `null` means valid and a string is the
	92	error message.
	93	
	94	| Builder | Fails when |
	95	|---|---|
	96	| `required(message?)` | value is `undefined`, `null`, or a string that is empty or whitespace-only |
	97	| `minLength(n, message?)` | value's length is below `n` |
	98	| `email(message?)` | value does not match a single-`@`, dot-in-domain shape |
	99	| `matches(otherField, message?)` | value is not strictly equal to `data[otherField]` |
	100	
	101	Every builder takes an optional message so a form can override the default
	102	wording without needing a new rule type.
	103	
	104	`minLength` and `email` apply only to non-empty values; an empty value is
	105	`required`'s business. This keeps a blank optional field from reporting a
	106	format error, and it means a field that is both required and format-checked
	107	reports "is required" rather than "is not a valid email" when left blank.
	108	
	109	**The validator.**
	110	
	111	```js
	112	validate(rules, data) // -> { valid: boolean, errors: { [field]: string } }
	113	```
	114	
	115	- `rules` maps a field name to an array of predicates.
	116	- Each field's predicates run in declaration order; the field stops at its
	117	  first failure, so a field yields at most one message.
	118	- All fields are evaluated — one failing field does not short-circuit the
	119	  others.
	120	- `errors` is `{}` when valid; `valid` is `errors` being empty.
	121	- Fields present in `data` but absent from `rules` are ignored.
	122	- Fields present in `rules` but absent from `data` are validated as
	123	  `undefined`, so `required()` catches them.
	124	- Predicates receive `data` as a second argument. This is what makes
	125	  `matches` work without a separate cross-field mechanism.
	126	
	127	### Call-site shape
	128	
	129	```js
	130	import { validate, required, minLength, email } from "./validation.js";
	131	
	132	const signupRules = {
	133	  email:    [required(), email()],
	134	  password: [required(), minLength(8)],
	135	};
	136	
	137	const { valid, errors } = validate(signupRules, formData);
	138	```
	139	
	140	## Changes to existing files
	141	
	142	### `app.js`
	143	
	144	- Delete `validateForm`.
	145	- Add the `validation.js` import and a module-level `loginRules` constant:
	146	  `username: [required("Username is required")]`,
	147	  `password: [required("Password is required")]`.
	148	- The submit handler calls `validate(loginRules, { username, password })`. On
	149	  failure it logs the per-field errors via `console.error`, preserving today's
	150	  console-only behavior at the new granularity.
	151	- `login` and `API_ENDPOINT` are unchanged.
	152	
	153	A valid login's behavior is unchanged. The observable difference is the shape
	154	of the console output on an invalid submit.
	155	
	156	### `index.html`
	157	
	158	One line: `<script src="app.js">` becomes
	159	`<script type="module" src="app.js">`.
	160	
	161	**Known consequence:** module scripts are subject to CORS, so opening
	162	`index.html` directly from the filesystem (`file://`) will no longer execute
	163	`app.js`. Local development requires a static server, e.g.
	164	`python3 -m http.server`. This is the accepted cost of decision 2 and should
	165	be noted in `README.md`.
	166	
	167	### `package.json`
	168	
	169	Add `"scripts": { "test": "node --test" }`. No dependencies.
	170	
	171	### `.gitignore`
	172	
	173	Add `docs/superpowers` and `docs/hyperpowers` so spec and planning documents
	174	are not committed.
	175	
	176	## Testing
	177	
	178	`test/validation.test.js`, using `node:test` and `node:assert`. Written
	179	test-first, per the repository's TDD workflow.
	180	
	181	Coverage:
	182	
	183	- **Each rule builder** — a passing value, a failing value, and the custom
	184	  message override.
	185	- **`required`** — rejects `undefined`, `null`, `""`, and `"   "`; accepts
	186	  `"0"` and other falsy-looking but present strings.
	187	- **`minLength`** — boundary at exactly `n`; skipped for empty values.
	188	- **`email`** — accepts a normal address; rejects a missing `@` and a missing
	189	  domain dot; skipped for empty values.
	190	- **`matches`** — equal and unequal against another field in `data`.
	191	- **`validate`** — empty `errors` and `valid: true` on a clean pass; first
	192	  failure per field wins when a field has several failing rules; multiple
	193	  failing fields all report; fields in `data` without rules are ignored;
	194	  fields in `rules` missing from `data` fail `required`; an empty `rules`
	195	  object is valid.
	196	
	197	`app.js` is not unit tested — it is DOM glue, and testing it would require the
	198	DOM dependency decision 1 exists to avoid. It is verified manually by loading
	199	the page from a local server and submitting the login form empty and filled.
	200	
	201	## Risks and open items
	202	
	203	- **`file://` regression.** The most likely way this change surprises someone.
	204	  Mitigated by a `README.md` note; accepted as the cost of ES modules.
	205	- **The abstraction has one consumer.** A reuse claim validated by a single
	206	  caller is weak. The rule set was chosen against the stated signup and
	207	  profile-edit needs, but the design is not proven until a second form uses
	208	  it. Building one was offered and deferred; if the partner wants the proof,
	209	  the signup form is the cheapest way to get it.
	210	- **Email validation by regex is approximate.** The rule catches typos, not
	211	  invalid addresses. Real verification is a server concern.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T093857Z-30d2/home/.cache/hyperpowers/codex-review/e9ef3003529324676e328ec4ee029ee3a665670d/run-IJrut8Jk/adjudications.md

	1	# Approved design decisions (from brainstorming)
	2	
	3	Original request, verbatim: "Make the form validation reusable across multiple forms."
	4	
	5	Decisions made and explicitly approved by the human partner, in order:
	6	
	7	1. **Motivation/scope of rules** — "A few similar forms" (signup, profile edit);
	8	   mostly required-field checks plus a couple of format rules (email, min
	9	   length). Modest rule set, known up front.
	10	
	11	2. **Module boundary** — "Validation only": a pure function, rules + data in,
	12	   errors out. No DOM. Each form keeps its own submit handler and error
	13	   display. Explicitly rejected: form binding, and a shared error renderer.
	14	
	15	3. **Module loading** — "ES modules": `export`/`import`, `index.html` switches
	16	   to `<script type="module">`. No build step. Explicitly rejected: plain
	17	   script + global, and CommonJS + bundler.
	18	
	19	4. **Rule format** — "Composable predicates": rules are functions,
	20	   `{ email: [required(), isEmail()] }`. Explicitly rejected: a declarative
	21	   rule schema with a name registry, and shared helpers with a hand-written
	22	   validator per form. Also discarded during design: HTML-attribute-driven
	23	   validation via the Constraint Validation API (needs the form element,
	24	   contradicting decision 2; cannot express cross-field rules).
	25	
	26	5. **Tooling** — "Unit tests" only: `node:test`, zero dependencies, adds an
	27	   `npm test` script. A linter/formatter was offered and declined.
	28	
	29	6. **Design sections approved in chat** — the module API (rule builders,
	30	   `validate(rules, data)`, per-field `{ valid, errors }` shape) was presented
	31	   and the partner answered "Yes, that looks right." The integration section
	32	   (app.js migration, index.html `type="module"`, not building the signup or
	33	   profile-edit forms) was presented alongside the tooling question.
	34	
	35	Explicitly out of scope by the partner's own framing: building the signup and
	36	profile-edit forms. They were named as motivation, not as deliverables. The
	37	controller flagged that a single consumer is weak proof of reuse and offered to
	38	build one; the offer stands and was not taken up.
	39	
	40	Also unchanged by decision: `src/index.js` and `src/utils.js` (unrelated
	41	CommonJS Node code).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
