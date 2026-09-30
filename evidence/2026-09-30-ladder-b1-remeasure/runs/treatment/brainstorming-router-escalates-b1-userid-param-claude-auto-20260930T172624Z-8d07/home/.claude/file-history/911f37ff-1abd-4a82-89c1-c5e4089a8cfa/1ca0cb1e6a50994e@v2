# Approved design decisions (adjudications)

Original user request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

The following were decided by the human partner during brainstorming and are
**settled**. They are requirements for the spec, not open questions. Do not
raise findings that merely re-litigate a decision listed here; do raise a
finding if the spec is internally inconsistent with one of them.

1. **What `userId` is:** a client-generated correlation ID. Explicitly NOT the
   username, and explicitly NOT a server-returned database key.
2. **Lifetime:** persistent across page loads, stored in `localStorage`.
   Ephemeral per-attempt was offered and rejected.
3. **Scope:** browser-scoped with an explicit reset. Account-scoped was
   rejected (unavailable on first/failed attempts). Never-reset was rejected
   (unbounded cross-account linking).
4. **Storage unavailable:** pass explicit `null`. An in-memory substitute ID
   was offered and rejected on the grounds that it looks durable without being
   durable. Blocking the login attempt was rejected outright.
5. **Code location:** approach C — `src/tracking.js` as a dual-mode module
   (CommonJS export plus browser-global fallback) with injectable storage.
   Inline-in-`app.js` and a plain browser-global file were both rejected
   because neither is testable.
6. **Tooling:** a unit test runner only — `node --test`, zero dependencies.
   Lint/format tooling was explicitly declined.
7. **`crypto.randomUUID` unavailable (insecure origin):** fall back to a
   `Math.random`-based ID and persist it normally. Returning `null` in that
   case was offered and rejected.
8. **Sections 1 and 2 of the design** (module/API surface; integration, error
   handling, testing) were each presented in chat and approved without
   revision.

Known scope boundaries the human partner accepted:

- No logout control is being added, so `clearTrackingId()` will have no caller.
- The `index.html` script tag, script load order, and `app.js` handler wiring
  are manually verified only; no DOM harness is being added.

Process note for the reviewer: an earlier Codex approach-gate call in this same
brainstorm returned an empty payload, so no Codex-originated approaches are
reflected in this spec.
