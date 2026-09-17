# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T103457Z-a95c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), not yet implemented
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`app.js` validates the login form inline. `validateForm(formData)` is hardcoded
	10	to the `username` and `password` keys, returns a single error string for the
	11	whole form, and is called from a hand-written `submit` listener that reads each
	12	input by `id`. Nothing about it can be used by a second form, and the failure
	13	path only reaches `console.error` — the user sees nothing.
	14	
	15	Several more forms are planned. Their specific rules are not yet known, so the
	16	design is judged primarily on how cheaply an unanticipated rule can be added.
	17	
	18	## Goals
	19	
	20	- One validation core shared by every form.
	21	- Adding a new rule requires no change to the core.
	22	- A new form is a rule spec plus one call.
	23	- Errors are visible to the user, per field.
	24	- Forms that need custom error UI can use the core without the DOM layer.
	25	
	26	## Non-goals
	27	
	28	- Asynchronous or server-side validation (e.g. "username already taken").
	29	  No planned form needs it. Adding it later means a parallel `validateAsync`;
	30	  it does not invalidate this design.
	31	- Migrating `src/index.js` / `src/utils.js` off CommonJS. They are unrelated to
	32	  the webapp and are not loaded by `index.html`.
	33	- Styling. The design emits a `field-error` class and sets ARIA attributes; no
	34	  CSS ships, because the project has none.
	35	
	36	## Architecture
	37	
	38	Two layers. The core is pure and has no DOM references; the binding layer is a
	39	separate module that depends on the core, never the reverse.
	40	
	41	```
	42	index.html ──<script type="module">──> app.js
	43	                                         │
	44	                                         v
	45	                              src/validation/index.mjs  (barrel)
	46	                                         │
	47	                  ┌──────────────────────┼──────────────────────┐
	48	                  v                      v                      v
	49	          bind-form.mjs              rules.mjs            validate.mjs
	50	             (DOM)                    (pure)             (pure, no DOM)
	51	                  │                                             ^
	52	                  └─────────────────────────────────────────────┘
	53	                              bind-form calls validate
	54	```
	55	
	56	| File | Responsibility | Depends on |
	57	|---|---|---|
	58	| `src/validation/validate.mjs` | `validate(values, spec)` — pure | nothing |
	59	| `src/validation/rules.mjs` | built-in rule factories — pure | nothing |
	60	| `src/validation/bind-form.mjs` | submit wiring + error rendering | `validate.mjs`, DOM |
	61	| `src/validation/index.mjs` | barrel re-export | the three above |
	62	
	63	### Module format
	64	
	65	ES modules with the `.mjs` extension.
	66	
	67	`package.json` has no `"type"` field, so Node resolves `.js` as CommonJS, which
	68	`src/index.js` and `src/utils.js` rely on. Setting `"type": "module"` would
	69	break both. `.mjs` gives native ESM in Node without touching them; browsers
	70	ignore the extension and honor `type="module"` on the script tag.
	71	
	72	Consequence: `index.html` will no longer work when opened over `file://`,
	73	because CORS blocks module scripts there. Serving the directory (for example
	74	`python3 -m http.server`) is required. This is inherent to ES modules, and was
	75	accepted when the module format was chosen.
	76	
	77	## The core
	78	
	79	### Rule contract
	80	
	81	```js
	82	(value, allValues) => string | null
	83	```
	84	
	85	A rule returns an error message when it fails and a falsy value when it passes.
	86	Receiving `allValues` is what makes cross-field rules (`matches`) ordinary
	87	rather than a special case. A rule is a plain function, so a project-specific
	88	rule needs no registration and no core change — this is the extension point the
	89	whole design is chosen for.
	90	
	91	### Spec shape
	92	
	93	```js
	94	const loginSpec = {
	95	  username: [required("Username is required")],
	96	  password: [required(), minLength(8)],
	97	};
	98	```
	99	
	100	A spec maps a field name to an ordered array of rules.
	101	
	102	### `validate(values, spec)`
	103	
	104	```js
	105	{ valid: boolean, errors: { [field]: string } }
	106	```
	107	
	108	- Rules for a field run in order; **the first failing rule wins** and no further
	109	  rules run for that field. One message per field is what a form displays, and
	110	  reporting "is required" together with "must be at least 8 characters" for the
	111	  same empty input is noise.
	112	- `errors` contains only fields that failed. `valid` is `errors` being empty.
	113	- Keys present in `values` but absent from `spec` are ignored.
	114	- Keys present in `spec` but absent from `values` are validated as `undefined`,
	115	  so `required()` reports them.
	116	
	117	### Built-in rules
	118	
	119	`required`, `minLength`, `maxLength`, `pattern`, `email`, `matches`.
	120	
	121	Each takes an optional custom message as its final argument and falls back to a
	122	sensible default. `matches(otherField, message?)` compares against
	123	`allValues[otherField]`.
	124	
	125	`email` uses a deliberately permissive check (a non-empty local part, an `@`, a
	126	dot-bearing domain). Strict RFC 5322 matching rejects valid addresses and is
	127	not worth the regex; real verification is sending mail.
	128	
	129	## The binding layer
	130	
	131	```js
	132	bindForm(formElement, spec, onValid)
	133	```
	134	
	135	On `submit`:
	136	
	137	1. `event.preventDefault()`.
	138	2. Read values via `new FormData(formElement)`.
	139	3. `validate(values, spec)`.
	140	4. If invalid: render each message, set `aria-invalid="true"` on the failing
	141	   fields, focus the first failing field, and do not call `onValid`.
	142	5. If valid: clear all messages and `aria-invalid`, then call
	143	   `onValid(values, event)`.
	144	
	145	A field's error clears on its `input` event. Without that, a corrected field
	146	keeps displaying a stale message until the next submit, which reads as a bug.
	147	
	148	### Markup contract
	149	
	150	Two requirements, kept minimal because every future form inherits them:
	151	
	152	1. **Each validated input carries a `name` matching its spec key.** `FormData`
	153	   only collects named controls. Today's inputs have `id` but no `name`, so
	154	   `index.html` gains `name="username"` and `name="password"`.
	155	2. **Error placement is optional.** If the form contains an element matching
	156	   `[data-error-for="<field>"]`, the message is written there. Otherwise
	157	   `bindForm` creates `<span class="field-error" data-error-for="<field>">` and
	158	   inserts it immediately after the input. A new form therefore needs no error
	159	   markup, while a form with layout constraints can place its own.
	160	
	161	Created error elements are given an `id` and linked from the input via
	162	`aria-describedby`.
	163	
	164	### Failure mode
	165	
	166	If `spec` names a field with no matching control in the form, `bindForm` throws
	167	an `Error` naming that field, at bind time. A typo'd spec key would otherwise
	168	produce a field that appears validated and silently is not — the worst
	169	available outcome, and the one most likely to reach production.
	170	
	171	## Changes to existing files
	172	
	173	- `app.js` — delete `validateForm`; delete the hand-written submit listener and
	174	  its two `getElementById` reads; add `loginSpec` and a single `bindForm` call
	175	  whose `onValid` calls the existing `login()`. `login()` and `API_ENDPOINT`
	176	  are unchanged.
	177	- `index.html` — add `name` attributes to both inputs; add `type="module"` to
	178	  the script tag.
	179	- `package.json` — add a `test` script and a `jsdom` devDependency.
	180	
	181	No other existing file is modified.
	182	
	183	## Testing
	184	
	185	Runner: Node's built-in `node:test` with `node:assert`. `npm test` runs
	186	`node --test`. No lint or formatter configuration is added — this was an
	187	explicit decision, not an oversight.
	188	
	189	**Core** (`test/validate.test.mjs`, `test/rules.test.mjs`) — no DOM:
	190	
	191	- each built-in rule, passing and failing
	192	- first-failing-rule-wins for a field with several rules
	193	- `matches` reading a sibling field's value
	194	- a spec key absent from `values` reported by `required`
	195	- a `values` key absent from the spec ignored
	196	- custom messages overriding defaults
	197	- the exact result shape on a clean pass
	198	
	199	**Binding layer** (`test/bind-form.test.mjs`) — under `jsdom`, a devDependency:
	200	
	201	- messages rendered into an existing `[data-error-for]` element
	202	- an error element created and inserted after the input when none exists
	203	- `aria-invalid` and `aria-describedby` set, and cleared on a passing submit
	204	- focus landing on the first failing field
	205	- `onValid` not called on failure; called with parsed values on success
	206	- an error clearing on the field's `input` event
	207	- `bindForm` throwing when the spec names an absent field
	208	
	209	jsdom is test-only; the shipped runtime keeps zero dependencies.
	210	
	211	## Alternatives considered
	212	
	213	- **Declarative spec + named rule registry** (`{ username: { required: true } }`
	214	  resolved against `registerRule`). Buys serializable specs. Costs global
	215	  mutable registry state, indirection between spec and behavior, an awkward
	216	  path for custom messages, and an escape hatch for cross-field rules that
	217	  breaks its own data-only premise. Nothing here needs serializable specs.
	218	- **Chainable schema builder** (`v.string().required().email()`). Best
	219	  ergonomics, most machinery, and reimplements an existing library. If this is
	220	  ever wanted, adding Zod beats writing it.
	221	- **Rules declared in HTML `data-` attributes.** Least JS per form, but rules
	222	  become runtime-parsed strings, cross-field and conditional rules get awkward,
	223	  and with the rule set still unknown it is the hardest choice to reverse.
	224	
	225	Both rejected alternatives could be built later as a thin layer that emits rule
	226	functions, so choosing the function-based core forecloses neither.
	227	
	228	## Codex approach gate
	229	
	230	Preflight returned `ok`, but the installed companion is a stub build
	231	(`codexVersion: 0.0.0-stub`) and the one-shot consultation returned an empty
	232	payload. Treated as an incomplete call per the gate's degrade path: this design
	233	carries no independent Codex approaches.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T103457Z-a95c/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-ZHnAPEb5/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-17)
	2	
	3	Original request, verbatim: "Make the form validation reusable across multiple forms."
	4	
	5	Decisions the human partner explicitly made. These are settled; findings that
	6	merely re-litigate them are out of scope unless they identify a concrete defect.
	7	
	8	1. **Scope** — several forms are planned, their rules are unknown. The rule set
	9	   must be general and extensible.
	10	2. **Layering** — a pure validation core plus a *separate, optional* DOM-binding
	11	   layer. A form must be able to use the core alone with its own error UI.
	12	   (Rejected: validator-only; single always-DOM module; rules in HTML attributes.)
	13	3. **Module format** — ES modules, no bundler. Approved with the explicit
	14	   consequence that `index.html` stops working over `file://` and needs a static
	15	   server. (Rejected: CommonJS + window global; adding esbuild/Vite.)
	16	4. **Core shape** — rules are plain functions `(value, allValues) => string|null`;
	17	   a spec maps a field to an ordered rule array. Approved over a named-rule
	18	   registry with data-only specs, and over a chainable schema builder.
	19	5. **Tooling** — unit tests only, using Node's built-in `node:test`. The human
	20	   partner explicitly declined ESLint/Prettier and end-to-end tests. Absence of
	21	   lint/format configuration is a decision, not an omission.
	22	6. **DOM-layer testing** — `jsdom` as a devDependency was explicitly chosen over
	23	   a hand-rolled fake DOM and over manual-only verification.
	24	7. **Out of scope by decision** — async/server-side validation; migrating
	25	   `src/index.js` and `src/utils.js` off CommonJS; any CSS.
	26	
	27	## Codebase facts
	28	
	29	- `app.js`: classic script; `validateForm` hardcoded to username/password,
	30	  single error string; hand-written submit listener; errors only to `console.error`.
	31	- `index.html`: one form `#login-form`, two inputs with `id` but no `name`,
	32	  loaded via plain `<script src="app.js">`. No error markup, no CSS.
	33	- `src/index.js`, `src/utils.js`: unrelated CommonJS greet demo, not loaded by the page.
	34	- `package.json`: no `type`, no deps, no scripts. No test runner, no lint config,
	35	  no lockfile, no CI.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
