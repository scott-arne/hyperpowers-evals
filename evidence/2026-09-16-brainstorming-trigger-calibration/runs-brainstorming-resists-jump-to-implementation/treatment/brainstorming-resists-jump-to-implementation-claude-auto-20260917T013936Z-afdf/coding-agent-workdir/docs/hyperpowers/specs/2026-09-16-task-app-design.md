# Task App — Design

Date: 2026-09-16
Status: awaiting user review

## Why This Spec Exists

The request was "build a notifications system for this app." The app is a
single static `index.html` containing an `<h1>` and an empty `<main>`. There
is no task model, no user identity, no persistence, and no source of change
events — that is, none of the four things a notification depends on.

A notifications spec written against this repo would therefore be mostly a
spec for the application underneath it. The work is decomposed into two
cycles:

1. **This spec — the task app**, built with the hooks notifications requires
   already in place.
2. **The notifications subsystem**, its own spec, plan, and implementation
   cycle, built on those hooks.

The purpose of cycle 1 is not merely to have tasks. It is to make cycle 2 a
feature rather than a rewrite. Three properties carry that weight, and each
is called out where it appears below: durable identity, a recorded change
(not just current state), and an explicit "cares about" relationship.

## Global Constraints

- **Users:** single-user, structured for multi-user. Every change records an
  author; tasks carry an explicit watcher list. Neither is surfaced in v1 UI.
- **Persistence:** browser-only (localStorage), reached exclusively through a
  storage seam so a server becomes an adapter swap rather than a rewrite.
- **Delivery reach (consequence, stated plainly):** while the app is
  browser-only, notifications can only fire while the tab is open. Email,
  push-when-closed, and cross-device all require the server adapter. This is
  a known and accepted bound of the chosen persistence, not an oversight.
- **Change detection:** append-only event log. State is derived by folding
  the log.
- **Tooling:** unit test infrastructure from the first commit. Linting,
  formatting, and end-to-end tests are explicitly declined for now.
- **Build step:** none. Plain ES modules loaded directly by the browser.
- Assumption: Node's built-in `node:test` is an acceptable runner, since it
  requires no dependency and runs ES modules natively. Validate via the first
  implementation task; substitute any runner that preserves the
  no-build-step constraint.

## Architecture

Four modules. Each has one purpose, a defined interface, and is testable
independently. Only the view layer knows the DOM exists.

| Module | Responsibility | Depends on |
|---|---|---|
| `store` | The storage seam. `append(event)`, `load()`. One localStorage implementation today; an in-memory one for tests. | nothing |
| `events` | Event type definitions and the reducer folding a log into task state. Pure functions. | nothing |
| `tasks` | Task operations (`create`, `setStatus`, `setDue`, `setPriority`, `setNotes`, `setTitle`). Each emits an event; none mutate state directly. | `store`, `events` |
| `view` | Renders task state, dispatches to `tasks`. The only DOM-aware module. | `tasks` |

### Data Flow

One direction, one loop:

```
view -> tasks -> event -> store -> reducer -> state -> view
```

Nothing writes state except by appending an event. That single rule is what
guarantees the log is complete, and a complete log is exactly what cycle 2
reads from. Any code path that mutates state directly is a defect, because it
produces a change no notification can ever observe.

### Task Shape

```
id         string, stable
title      string
notes      string
status     "todo" | "doing" | "done"
due        ISO date string | null
priority   "low" | "normal" | "high"
createdBy  identity id
watchers   identity id[]
```

An identity id is a string. In v1 it is the constant `"local"` for every
record. It is a field rather than an implicit assumption so that a later
multi-user migration rewrites values, not schemas.

`createdBy` and `watchers` are the durable-identity and cares-about hooks. In
single-user mode `createdBy` is a constant local identity and the creator is
implicitly their own watcher. These fields carry no v1 UI. They exist because
adding them later means rewriting every stored record.

### Event Shape

```
type   e.g. "task.created", "task.status_changed"
taskId string
at     ISO timestamp
by     identity ref
data   type-specific payload, e.g. { from, to }
```

`from`/`to` on mutation events is what lets cycle 2 describe a change rather
than merely announce one.

### Error Handling

A corrupt or unparseable log fails loudly to an empty state and preserves the
raw stored data under a backup key. It does not silently discard tasks. An
unknown event type encountered during a fold is skipped, not fatal, so a log
written by a newer version stays loadable.

## UI

One screen, no routing. `<main>` holds the task list. A row shows title,
status, due date, and priority; clicking expands it in place for editing. No
modal, no detail page.

- **Adding:** a single text input at the top. Type, Enter, task exists.
  Status defaults to `todo`; everything else empty.
- **Status:** a three-state control on the row (todo → doing → done).
  First-class rather than a checkbox, because it is the transition cycle 2
  cares about most.
- **Filtering:** by status, plus a "due soon" view — tasks due within the
  next 3 days and not yet `done`. No search in v1.
- **Overdue:** visually distinct. Notable as the one state in v1 that changes
  with no user action — the class of event that makes notifications worth
  building.

### Out of Scope for v1

Drag reordering, bulk edit, search, undo UI (the log supports undo; the
buttons come later), and anything notification-shaped. The last is deliberate
discipline: building half a notifications feature inside the task app is what
would make cycle 2 messy.

## Testing

The module split is what makes testing cheap.

- `events` — pure functions over a log. Table-driven tests, no setup.
- `tasks` — tested against the in-memory `store`, the seam earning its keep
  on day one.
- `view` — a thin smoke test that a render produces the expected DOM. No
  heavy component testing for a single screen.

The load-bearing invariant, to be pinned before the code grows:

> Fold a log to state, append one more event, fold again — the result matches
> applying that event to the first state.

Cycle 2 depends on this holding.

## What Cycle 2 Inherits

Stated explicitly so the next spec can be checked against it:

- A complete, ordered, append-only record of every change.
- `from`/`to` detail on every mutation, so a notification can say what changed.
- `by` on every event, so it can say who changed it.
- `watchers` on every task, so it can say who to tell.
- A storage seam, so moving to a server does not invalidate any of the above.

Notification triggering, delivery, grouping, read/unread state, and user
preferences are all cycle 2's subject. None are designed here.
