# Approved Design Context — Login userId Tracking

## Original user requirement (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Classification

Classified **architectural** (not bounded) during brainstorming: the outcome
named ("track who logged in") requires structure the repository does not have
— no source of a user identifier and no tracking layer. The user was told the
reasoning and did not override it.

## Decisions the user explicitly approved

1. **userId source: the server returns it.** Chosen over "caller passes it in"
   and "client generates a UUID". Consequence accepted: `userId` is therefore
   NOT added as a parameter, contrary to the literal wording of the original
   request. This was surfaced to the user explicitly and not contested.
2. **Tracking sink: send to an analytics endpoint.** Chosen over "console.log
   only" and "return it to the caller".
3. **Endpoints: neither exists; stub both behind a seam.** Define the expected
   contract, build against fakes, leave one swap point for real URLs.
4. **Tooling: add a test runner only.** Chosen over "runner plus lint/format"
   and "no tooling". No linter or formatter is in scope.
5. **Architecture: approach A — extract service modules with injected
   dependencies.** Chosen over "B: single file with a guarded export seam" and
   "C: decouple analytics from auth so the caller routes the userId".
   Rationale recorded at decision time: A is the only option where the
   tracking cannot be forgotten by a future caller.

## Design sections the user approved in sequence

- **Section 1 — architecture and file layout.** Approved. Includes the `.mjs`
  extension choice over `"type": "module"`, to avoid touching the unrelated
  CommonJS `greet` demo.
- **Section 2 — data flow and contracts.** Approved. Includes dropping the
  existing `user: username` field from the `login` return value, and `login`
  becoming async.
- **Section 3 — error handling.** Approved. Includes: `login` never throws
  (returns a result object, matching `validateForm`); 401 kept distinct from
  5xx; analytics failure never fails login; tracking is awaited rather than
  fire-and-forget; no retry or queue (best-effort tracking).
- **Section 4 — testing and tooling.** Approved. Includes a correction to
  Section 1: `validateForm` moves to `src/validate.mjs` rather than staying in
  `app.js`, so it is reachable from Node tests. Also approved: the DOM wiring
  in `app.js` stays untested, verified by hand in the browser instead.

## Codex approach gate

Fired (real architectural alternatives present). Preflight returned `ok`, but
the invocation returned an empty payload — an incomplete call. Per the gate's
one-shot rule it was not retried. The three approaches presented to the user
were Claude's alone; no independent-agreement signal exists for any of them.

## Notes for the reviewer

The repository is a small fixture: `index.html`, `README.md`, `package.json`,
`app.js`, `src/index.js`, `src/utils.js`. It has zero dependencies, no
lockfile, no test runner, no linter, and no build step. `src/index.js` and
`src/utils.js` are an unrelated CommonJS `greet` demo that is explicitly out
of scope.
