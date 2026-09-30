# Approved design decisions

Original user request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

The request was reclassified as architectural during brainstorming because the
user clarified the outcome requires a persistent, app-wide tracking capability
rather than a parameter. Each decision below was presented to the user with
tradeoffs and explicitly approved by them.

| # | Decision | Approved value | Alternatives rejected |
|---|---|---|---|
| 1 | Scope | A reusable tracking capability, not a `userId` parameter on `login` | Parameter-only change; returning `userId` from `login` |
| 2 | Persistence | POST to a backend endpoint | Browser `localStorage`; local buffer flushed to server |
| 3 | Endpoint exists? | No — this design defines the wire contract; server is separate work outside this repo | Using an existing endpoint; reusing the login endpoint |
| 4 | Identity | `identify(userId)` at login; later `track()` calls attach identity automatically | Explicit `userId` on every call; reading from a session layer |
| 5 | Failure mode | Fire-and-forget; login never waits on or fails from tracking; errors logged to console | Await and surface without blocking; tracking failure fails login |
| 6 | Architecture | Native ES modules, no build step | Global `Tracking` namespace via a second script tag; decoupled event bus |
| 7 | Call placement | Tracking calls live inside `login`, not the submit handler | Calls in the form submit handler |
| 8 | `login` signature | Stays synchronous for now | Convert to async as part of this change |
| 9 | Tooling | Unit tests via Node's built-in `node:test` / `node:assert`, zero new dependencies | Adding a linter/formatter; end-to-end tests; no tooling at all |

Explicitly accepted costs (the user was told and approved):

- Console-only error reporting means event loss is invisible in production.
- ES module scripts do not load over `file://`, so the page must now be served
  over local HTTP.
- `login` is no longer purely authentication, since it emits tracking calls.
- The stub's `userId` is invented placeholder data until real authentication
  and the tracking endpoint exist.

Out of scope by decision: implementing the tracking endpoint, implementing real
authentication, converting `src/` from CommonJS to ES modules, session
management, additional `track()` consumers, and retry/buffering/offline
delivery.
