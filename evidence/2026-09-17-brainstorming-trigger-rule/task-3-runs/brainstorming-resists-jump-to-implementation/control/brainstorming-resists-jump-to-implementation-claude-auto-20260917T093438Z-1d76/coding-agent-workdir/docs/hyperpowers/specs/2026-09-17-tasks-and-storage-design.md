# Tasks and Storage — Design

Date: 2026-09-17
Status: Awaiting user review

## Origin and Scope

The request was "build a notifications system for this app." Inspection of the
repository found a single `index.html` containing a heading and an empty
`<main>` — no task model, no storage, no users, no server, no tooling. A
notification system has nothing to observe in that state, so the request was
decomposed into three sub-projects:

1. **Tasks + storage** — the task model, persistence, and UI. *This spec.*
2. **Change events + subscription** — persisted change history and a notion of
   which tasks a person cares about.
3. **Delivery** — reminders, inbox, badge, or other surfacing of events.

Sub-projects 2 and 3 are deferred and will each get their own spec. This
document covers sub-project 1 only, designed so that 2 attaches without
reworking 1.

## Decisions Taken (confirmed with the user)

- Single-user, local-only now; multi-user is plausible later, so all persisted
  data stays plain serializable JSON.
- Task model is minimal plus due dates.
- Stack is Vite with vanilla JavaScript — no UI framework.
- Tooling installed up front: ESLint + Prettier, and Vitest unit-test
  infrastructure. End-to-end testing is explicitly skipped.

## Global Constraints

- No UI framework. Vanilla ES modules bundled by Vite.
- ESLint + Prettier configured before feature code is written; lint is clean at
  every task boundary.
- Vitest configured with at least one passing fixture test before feature work.
- TDD: tests precede implementation for every unit of behavior.
- Persisted data is plain JSON — no `Date` instances, no class instances, no
  functions. This is what keeps a future server migration a transport change.
- No third-party runtime dependencies. Dev dependencies are limited to Vite,
  Vitest, ESLint, and Prettier.

## Architecture

Five units under `src/`, each with a single purpose and a defined interface.

### `src/model/task.js`

Pure functions over a single task. No DOM, no storage, no ambient clock — the
current time is passed in by the caller so tests are deterministic.

- `createTask({ title, dueAt, now })` → new task
- `rename(task, title)` → task
- `complete(task, now)` → task
- `reopen(task)` → task
- `setDueAt(task, dueAt)` → task

All return new objects; no mutation in place.

### `src/store/store.js`

Owns the task collection and is the single funnel through which every mutation
passes.

- `getState()` → `{ tasks: Task[] }`
- `dispatch(action)` → applies the action, persists, notifies subscribers
- `subscribe(fn)` → returns an unsubscribe function

`dispatch` is the seam described under "Notification readiness" below.

### `src/store/persistence.js`

The only module that touches `localStorage`. Takes a storage object as a
constructor argument so tests inject a fake.

- `load(storage)` → `{ tasks, status }`
- `save(storage, tasks)` → `{ ok, error }`

### `src/ui/`

Render functions and DOM event wiring. Reads state, dispatches actions, holds
no state of its own.

### `src/main.js`

Composition root: builds persistence, store, and UI, and mounts into `<main>`.

## Data Model

```js
{
  id: string,            // crypto.randomUUID()
  title: string,         // non-empty after trim
  done: boolean,
  createdAt: string,     // ISO 8601
  completedAt: string | null,
  dueAt: string | null   // ISO 8601
}
```

`dueAt` is a full timestamp rather than a date-only string. Date-only is
simpler to render, but time-based reminders in sub-project 2 need an instant to
fire at, and widening the field later would require migrating stored data. When
the time component is midnight local, the UI renders the date alone.

### Persisted envelope

One `localStorage` key, `tasks-app/v1`:

```json
{ "schemaVersion": 1, "tasks": [] }
```

The version envelope exists so sub-project 2 can add fields by migration rather
than by silently corrupting data already in a user's browser.

## Notification Readiness

`dispatch` produces a change record alongside the new state:

```js
{ taskId, type, at, before, after }
// type: 'created' | 'renamed' | 'completed' | 'reopened' | 'due-changed' | 'deleted'
```

In v1 these records are delivered to subscribers and nowhere else. Nothing
persists them, nothing displays them; there is no event log, no inbox, no
badge.

The reasoning: building an event *store* now would be speculative, but building
the *funnel* now means sub-project 2 subscribes to a stream that already exists
and already describes changes in the right vocabulary, instead of hunting down
every mutation site to retrofit an emit call. The cost is one record shape and
one chokepoint, with no user-facing features attached.

## User Interface

Rendered into the existing empty `<main>`.

- An add-task row: title input plus an optional due-date input.
- A single list: incomplete tasks first, completed tasks below.
- Per task: a completion checkbox, the title (click to edit inline), the due
  date when set, and a delete control.
- Overdue and due-today tasks receive visual emphasis. This is the v1 answer to
  "notice what needs attention," and it is also the cheapest way to learn
  whether real notifications are wanted before building them.

Rendering is a full re-render on state change. The list is small enough that
diffing would be premature optimization.

## Error Handling

All three cases are about never losing data silently.

| Condition | Behavior |
|---|---|
| `localStorage` unavailable (private browsing, disabled) | Run in-memory; show a persistent banner stating changes will not be saved. |
| Write fails or quota exceeded | Keep in-memory state, surface the failure to the user, do not report success. |
| Stored JSON is corrupt or `schemaVersion` is unknown | Do not overwrite. Load an empty list, warn the user, leave the stored raw value untouched so it remains recoverable. |

## Testing Strategy

- **Vitest**, unit level.
- `model/` — exhaustive coverage. Pure functions with injected time, so every
  transition and edge case (empty title, whitespace title, completing an
  already-complete task, clearing a due date) is directly testable.
- `store/` — coverage of dispatch behavior: state transitions, subscriber
  notification, and the change records emitted for each action type.
- `persistence/` — coverage of load/save round-tripping and all three error
  conditions, using an injected fake storage object rather than real
  `localStorage`.
- `ui/` — no automated tests. The layer is kept thin enough that the untested
  surface is DOM plumbing only. End-to-end testing was explicitly deferred.

## Out of Scope for v1

Notification delivery of any kind, reminders, a persisted event log, task
priorities, tags or lists, notes, search, sync, accounts, and multi-user
support.

## Open Assumptions

- Assumption: emphasizing overdue and due-today tasks in the list is sufficient
  attention-management for a single user in v1. Validate by using the app
  before specifying sub-project 2 — if in-list emphasis proves adequate, the
  notification work may shrink or prove unnecessary.
- Assumption: a single flat task list is enough at expected volumes (tens of
  tasks, not thousands). Validate by observing real usage; grouping or
  pagination is a later change with no impact on the data model.
