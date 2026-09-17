# Approved design decisions (from brainstorming)

Original request, verbatim: "Make the form validation reusable across multiple forms."

Decisions made and explicitly approved by the human partner, in order:

1. **Motivation/scope of rules** — "A few similar forms" (signup, profile edit);
   mostly required-field checks plus a couple of format rules (email, min
   length). Modest rule set, known up front.

2. **Module boundary** — "Validation only": a pure function, rules + data in,
   errors out. No DOM. Each form keeps its own submit handler and error
   display. Explicitly rejected: form binding, and a shared error renderer.

3. **Module loading** — "ES modules": `export`/`import`, `index.html` switches
   to `<script type="module">`. No build step. Explicitly rejected: plain
   script + global, and CommonJS + bundler.

4. **Rule format** — "Composable predicates": rules are functions,
   `{ email: [required(), isEmail()] }`. Explicitly rejected: a declarative
   rule schema with a name registry, and shared helpers with a hand-written
   validator per form. Also discarded during design: HTML-attribute-driven
   validation via the Constraint Validation API (needs the form element,
   contradicting decision 2; cannot express cross-field rules).

5. **Tooling** — "Unit tests" only: `node:test`, zero dependencies, adds an
   `npm test` script. A linter/formatter was offered and declined.

6. **Design sections approved in chat** — the module API (rule builders,
   `validate(rules, data)`, per-field `{ valid, errors }` shape) was presented
   and the partner answered "Yes, that looks right." The integration section
   (app.js migration, index.html `type="module"`, not building the signup or
   profile-edit forms) was presented alongside the tooling question.

Explicitly out of scope by the partner's own framing: building the signup and
profile-edit forms. They were named as motivation, not as deliverables. The
controller flagged that a single consumer is weak proof of reuse and offered to
build one; the offer stands and was not taken up.

Also unchanged by decision: `src/index.js` and `src/utils.js` (unrelated
CommonJS Node code).
