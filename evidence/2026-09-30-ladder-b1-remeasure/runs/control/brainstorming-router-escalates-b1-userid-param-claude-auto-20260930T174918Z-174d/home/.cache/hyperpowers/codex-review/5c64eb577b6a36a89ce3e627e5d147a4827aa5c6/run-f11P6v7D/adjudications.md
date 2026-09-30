# Approved design context

## Original user requirement (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying answers from the human partner (all binding)

1. Scope: "Yes, it should persist and work across the app — other forms will
   need it later." (This escalated the task from a one-function change to a
   subsystem design.)
2. What is stored: **current identity** — a session store holding who is
   logged in right now. A login event/audit history was explicitly deferred.
3. Persistence medium: **`sessionStorage`** — survives reload and navigation,
   cleared when the tab closes. `localStorage`, in-memory-only, and an
   `httpOnly` cookie were each presented and rejected.
4. Identity source: **stub body, async interface** — `login()` returns a
   Promise resolved immediately from the existing stub; the real network call
   drops in later without changing call sites.
5. Tooling: **unit tests only.** No linter, no formatter, no end-to-end tests.
6. Architecture: **Approach A, native ES modules with the `.mjs` extension**,
   zero dependencies, tested with Node's built-in `node --test`. A
   globals-plus-dual-export-shim alternative and a pub/sub variant were both
   presented and rejected.

## Design sections explicitly approved in chat

**Section 1 — modules and interface.** Approved, including all three called-out
decisions: (a) `login` produces a `userId` rather than accepting one,
knowingly contradicting the original wording; (b) `login` writes the session
itself, making it the single writer; (c) the stored shape is two fields
`{userId, username}`, with `loginAt` considered and cut.

**Section 2 — data flow and error handling.** Approved, including the two
points raised explicitly for sign-off: clearing the session on a failed login,
and swallowing storage write failures rather than surfacing them. The
invariant "`getCurrentUser()` never throws; `null` means no usable identity"
was approved as the central contract.

**Section 3 — testing and file plan.** Approved, including adding a minimal
failure condition (blank username or password) to the stub so the
"failed login clears the session" invariant is reachable by a test, and
including the accepted gap that `app.mjs` receives no unit tests.

## Notes for the reviewer

These decisions are adjudicated and are not open questions. Findings that
merely re-argue a rejected alternative (localStorage, cookies, pub/sub,
event logging, a real network call, adding a linter) are out of scope.
Findings that identify internal contradiction, ambiguity, infeasibility, or a
gap *within* the approved design are in scope.
