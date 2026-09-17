# Approved design decisions (brainstorming session, 2026-09-17)

Original request, verbatim:

> Add logging to the app so we can debug production issues.

Decisions the project owner made during brainstorming. These are settled; a
review should check the spec against them, not relitigate them.

1. **Scope** — both entry points (browser `app.js` and Node `src/index.js`),
   served by one shared module. Chosen over browser-only or Node-only.
2. **The problem** — "errors vanish silently": a failure reaches a real user and
   the team never finds out. Chosen over "can't reconstruct a session", "logs
   exist but are unusable", and "no specific incident yet". This is why mere
   structured logging was ruled insufficient.
3. **Destination** — a hosted error service (Sentry or equivalent), kept behind
   a transport seam the project owns. Chosen over building an own collect
   endpoint (rejected: no backend exists in the repo) and over
   "transport seam now, real sink later" (rejected: does not solve the stated
   problem).
4. **Module strategy** — Approach A: shared ESM core plus per-runtime adapters,
   no bundler. Chosen over adding esbuild (rejected as cost without present
   return: no minification today) and over a UMD single file (rejected: puts
   runtime branching inside the module, weakening the seam).
5. **Tooling** — unit tests only (`node --test`). Lint/format and end-to-end
   tests were explicitly declined by the project owner.

Design sections presented in chat and approved verbatim by the project owner
("looks good, go ahead"): the five-file architecture, the event shape, the data
flow, and the file-by-file change list. The redaction rules, the logger's own
failure behavior, and the test plan were presented immediately before the spec
was written.

Constraints raised by Claude and accepted into the design:

- Redaction must be structural (allowlist in core), not author discipline,
  because `app.js` currently logs a username and has a password in scope in the
  same handler.
- `username` is deliberately not allowlisted; removing it from the log line is
  an intended behavior change.
- The browser wiring will have no automated coverage, because e2e was declined.
  This was flagged to the project owner as a known gap, not hidden.
