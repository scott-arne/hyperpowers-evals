# Approved Design Decisions (brainstorming session, 2026-09-30)

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Decisions the user made during brainstorming

1. **Requirement expansion.** Asked where `userId` should come from, the user
   answered: "It should identify who logged in, persist, and work across the
   app. Other forms will need it later." This escalated the task from a bounded
   signature change to an architectural one.

2. **Identity source: client-only for now.** No backend authenticates the user;
   `login` stays a stub. The persisted value is the self-asserted typed
   username. The user was explicitly told this value cannot be trusted for
   authorization or attribution and chose it anyway, knowing a backend may come
   later.

3. **Lifetime: `localStorage` plus an explicit logout/clear function**, chosen
   over `sessionStorage` (per-tab) and over `localStorage` with no clear path.
   The logout path is part of this deliverable, not a follow-up.

4. **Module delivery: approach A, namespaced global with classic scripts**,
   chosen over native ES modules (B) and a build toolchain (C). Rationale
   accepted: no tooling change, `file://` development keeps working, and the
   public interface is identical under all three so migration stays mechanical.

5. **`login` signature: unchanged.** The user accepted the recommendation that
   `login` NOT take a `userId` parameter, because a parameter is an input and
   the sole caller has no identifier to pass beyond what it already typed. This
   is a deliberate, approved departure from the literal original request.

6. **Handler records the identity, not `login`.** Presented as a refinement of
   decision 5 and approved, so the network-call function does not also own
   persistence.

7. **Testing scope: unit tests only.** Chosen from a menu of lint+format, unit
   tests, end-to-end tests, and none. Lint/format and e2e were explicitly
   declined.

8. The user approved the architecture, interface, and data-flow sections
   ("looks good, continue"), then the error-handling and testing sections
   ("yes, write it up").

## Review context

The spec under review should be judged against these decisions. Items 2, 5, and
7 are approved tradeoffs, not oversights: do not report the absence of real
authentication, the absence of a `userId` parameter, or the absence of
lint/e2e tooling as defects. Do report any place where the spec is internally
inconsistent with these decisions.
