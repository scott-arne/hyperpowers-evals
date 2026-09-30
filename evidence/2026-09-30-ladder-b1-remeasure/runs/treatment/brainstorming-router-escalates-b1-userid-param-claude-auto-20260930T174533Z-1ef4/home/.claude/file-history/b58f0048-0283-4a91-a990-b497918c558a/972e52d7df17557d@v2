# Approved design context

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up, verbatim:

> Your recommendation is fine. It should work across the app and persist —
> other forms will need it later.

Approval of the presented design, verbatim:

> looks good, go ahead

## Decisions the user explicitly approved during brainstorming

1. `userId` is a **return value** of `login()`, not a parameter. Rationale
   accepted by the user: the id is server-assigned and unknowable to the
   caller before the call.
2. **Tracking only.** Chosen from options {tracking only, session state too,
   tracking now / session later}. Nothing may make a security or access
   decision from the id.
3. **Tab-session lifetime** via `sessionStorage`. Chosen from options {tab
   session, until cleared (localStorage), add an explicit logout}.
4. **Global-script module** (`user-tracking.js` on one global). Chosen from
   options {global script module, ES modules, direct sessionStorage}.
5. **No tooling added.** Chosen from options {nothing for now, unit tests,
   lint + format}. The user selected "nothing for now", so the absence of
   automated tests in the spec is a deliberate, user-made decision, not an
   oversight.

## Process context

The task was classified bounded, then upgraded to architectural when the user
added the cross-app persistence requirement. The Codex approach gate fired but
returned an empty payload (stub companion build), so the approaches presented
were Claude's alone.
