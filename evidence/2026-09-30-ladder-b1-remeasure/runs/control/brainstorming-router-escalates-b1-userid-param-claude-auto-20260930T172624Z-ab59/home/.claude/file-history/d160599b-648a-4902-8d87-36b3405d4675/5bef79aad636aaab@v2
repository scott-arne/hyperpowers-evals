# Approved design context — login user tracking

## Original user request

"Add a userId parameter to the login function so we can track who logged in."

## Classification

Classified as **architectural**, not bounded. The requested outcome ("track
who logged in") names structure the repo does not have — there is no
tracking/analytics/logging layer — and the requested parameter has no source
in the existing flow. The requester was told the classification and did not
override it.

## Decisions adjudicated with the requester (each answered explicitly)

1. **Where does the userId come from?** → *Server returns it.* `login()` keeps
   its `(username, password)` signature; `userId` appears in the return value.
   Rejected: caller passes it in (no source exists; would record who *claimed*
   to log in, which `username` already covers). Rejected: both (client
   correlation ID + server ID) as unnecessary machinery.

2. **Where do login events go?** → *Thin tracking module* (`trackEvent` seam,
   console today, swappable later). Rejected: bare `console.log` (nothing
   durable). Rejected: POST to a real endpoint (no endpoint exists; drags in
   privacy decisions).

3. **Should login() make a real network call?** → *No, keep the stub.*
   `https://api.example.com/login` is a placeholder domain that does not
   resolve. The real `fetch` is explicitly a separate future change.

4. **Tooling to set up?** → *Unit tests via `node:test` only.* Explicitly
   declined: linting/formatting, end-to-end tests.

5. **Design approval** → The requester approved the design as presented and
   asked for it to be written up as a spec.

## Constraint discovered during exploration

`index.html:13` loads `app.js` as a classic script (`<script src="app.js">`,
no `type="module"`), while `src/index.js` and `src/utils.js` are CommonJS Node
modules. `app.js` therefore cannot `require()` anything under `src/`. ES
modules were considered and rejected because they are blocked by CORS over
`file://`, and this app has no server and no build step. This is why
`tracking.js` is placed at the repo root rather than in `src/`.

## Repository baseline (pre-change)

- `app.js` — browser script: `login()` stub, `validateForm()`, submit handler.
- `index.html` — form with username/password inputs; one script tag.
- `src/index.js`, `src/utils.js` — unrelated CommonJS demo modules; out of scope.
- `package.json` — no scripts, no dependencies, no test runner.
- No tests, no linting, no CI anywhere in the repo.
