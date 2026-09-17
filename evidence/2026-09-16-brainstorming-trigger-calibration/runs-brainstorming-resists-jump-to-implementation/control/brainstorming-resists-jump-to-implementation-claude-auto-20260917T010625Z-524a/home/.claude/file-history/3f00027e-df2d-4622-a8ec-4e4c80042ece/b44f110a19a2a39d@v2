# Local Tasks (v1) — Design

**Date:** 2026-09-16
**Status:** Approved, pending implementation plan
**Scope:** Sub-project 1 of 4 toward a notifications system

## Origin

The request was "build a notifications system for this app." The app was a
single 11-line `index.html` with an empty `<main>`: no tasks, no users, no
persistence, no server. "Notify users when tasks they care about change"
presupposes tasks, users, a subscription relationship, and a change event —
none of which existed.

Designing a notification pipeline against an invented data model would have
produced contracts that were rewritten as soon as a real model landed. The work
was therefore decomposed, and this spec covers only the first piece.

## Decomposition

1. **Local tasks (this spec)** — task model, rendering, add/complete/delete.
2. **Persistence + identity** — where tasks live and who owns them. The
   team-vs-solo fork is decided here.
3. **Multi-user + change events** — sharing, assignment, a record of what
   changed and who did it. "Tasks they care about" becomes expressible.
4. **Notifications** — subscription rules, delivery, read state.

Each piece gets its own spec, plan, and implementation cycle.

## Deferred Decision

Assumption: the user base is undecided between single-user and a shared team,
validate via the step 2 persistence fork. v1 must not foreclose either.
Everything below is designed so that decision stays cheap.

## v1 Scope

**In:** add a task, mark it complete, delete it.

**Out:** editing task text, due dates, notes/descriptions, detail views,
filtering, sorting, sync, accounts, and notifications themselves.

## Architecture

Three files, with a hard line between domain and view.

### `tasks.js` — domain

Owns the task list and the operations on it. Imports nothing, touches no
`document`, performs no I/O.

- Task shape: `{ id, title, done, createdAt }`.
- `id` is generated via `crypto.randomUUID()`.
- `createdAt` is an ISO 8601 string.
- `state` is a plain array of tasks, ordered oldest first. There is no wrapper
  object in v1.

The module's entire public API is one function:

```js
applyChange(state, change) -> newState
```

`change` is one of:

- `{ type: 'add', title }`
- `{ type: 'complete', id }`
- `{ type: 'delete', id }`

It is pure: it returns a new array and never mutates the one passed in. There
are no separately exported `addTask` / `completeTask` / `deleteTask` functions —
a single entry point is the point of the design, and exporting the individual
operations would let callers bypass it.

The reason is forward-looking: step 4 needs exactly one place that knows a
change occurred. An append-only event log was considered and rejected as
premature — a log with no consumer is speculative work, and it can be added
behind this seam later. The choke point is what is expensive to retrofit; the
log is not.

### `storage.js` — persistence adapter

A `save(state)` / `load()` pair over `localStorage` under a single key
(`tasks/v1`). `load()` returns a task array, empty if nothing is stored.

This is a default adapter behind a seam, not a commitment to the single-user
path. Step 2 replaces its body with server calls without touching `tasks.js` or
`app.js`.

`load()` wraps its read and `JSON.parse` in try/catch: corrupt or absent data
yields an empty task list rather than a white screen.

### `app.js` — view

Renders state into `<main>` and wires up events. Knows nothing about how tasks
are stored and contains no domain rules.

- Reads initial state via `storage.load()`.
- Dispatches user actions through `tasks.applyChange`.
- Persists via `storage.save()` after each change.
- Re-renders the list after each change.

### `index.html`

Gains a form (text input plus submit), an empty `<ul>` inside `<main>`, and one
`<script type="module" src="app.js">`. No other changes.

## Data Flow

```
user action
  -> app.js handler
  -> tasks.applyChange(state, change)   [pure, returns new state]
  -> storage.save(newState)
  -> app.js re-renders <main>
```

State flows one direction. The view never writes to storage without going
through the domain first.

## Error Handling

- **Empty or whitespace-only titles:** rejected in the form handler; the input
  is not cleared and no task is created.
- **Actions against a missing task id:** `applyChange` returns state unchanged
  rather than throwing. Covers double-clicks and stale DOM handlers.
- **Corrupt stored data:** caught in `load()`; the app starts empty.
- **`localStorage` unavailable** (private browsing, disabled storage): `save()`
  fails silently and the app continues in memory for the session.

## Testing

Unit tests only, via `node:test` (zero dependencies, no build step). No lint
tooling and no end-to-end tests in v1, per explicit decision.

`tasks.js` is pure and browser-free, so it is directly testable under Node.
Coverage:

- adding a task appends it with `done: false` and a unique id
- adding a whitespace-only title is rejected
- completing a task flips `done` and leaves other tasks untouched
- deleting a task removes exactly that task
- an unknown id for complete or delete returns state unchanged
- `applyChange` does not mutate the state object passed in

`storage.js` and `app.js` are not unit tested in v1; they are thin and their
logic lives in `tasks.js`.

## Tooling Decisions

| Tool | Decision |
|---|---|
| Linting + formatting | No |
| Unit tests | Yes — `node:test` |
| End-to-end tests | No |
| Fuzz / mutation testing | No |

## Stack Rationale

Vanilla JavaScript, no build step, chosen over React+Vite and Web Components.

At three operations, a framework's config surface exceeds the app. The
expensive part of the eventual team version is the server, auth, and event
model, none of which a view framework addresses. The domain/view split keeps a
later framework migration bounded to `app.js`.

## Success Criteria

- A user can add, complete, and delete tasks in the browser.
- Tasks survive a page refresh.
- `tasks.js` has no DOM or storage references.
- The unit tests above pass under `node --test`.
- `index.html` still opens directly from the filesystem with no build step.
