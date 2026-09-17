# Task Notifications — Design

Date: 2026-09-17
Status: Approved (pending spec review)

## Problem

The app should tell the user about tasks that need attention. The original
request was "notify users when tasks they care about change." Brainstorming
established that this app is single-user and local, with no server and no
accounts, which changes what the feature can be: the user makes every change
themselves, so a change notification tells them nothing they do not already
know.

The only state transition a single-user app can report that the user did not
cause is the passage of time. A task becomes due, or passes its due date,
without anyone touching it. That is the feature.

## Constraints

Established during brainstorming, in the order they were settled:

1. **Single user, one browser.** No server, no accounts, no sharing.
2. **No delivery while the page is closed.** Web push requires a backend.
   Scheduled service-worker wakeups are not reliably supported. Notifications
   are therefore visible only in the app, either while it is open or the next
   time it is opened.
3. **Triggers are due-soon and overdue only.** Stale-task detection and
   per-task explicit reminder times were considered and dropped.
4. **In-app surface only.** No OS-level `Notification` API toasts. The
   permission prompt is a real cost paid for a benefit that does not survive
   the browser being closed.
5. **Notifications are dismissible per occurrence.** Not pure-derived, not
   snooze.

## Global Constraints

Inherited by every implementation task:

- **Lint and format:** ESLint + Prettier, configured with autofix. Code must
  pass lint before a task is considered complete.
- **Unit tests:** a test runner (Vitest, or `node:test` if a zero-dependency
  setup is preferred) with an established layout and a first passing fixture,
  set up before feature code.
- **No end-to-end tests** and no fuzz/mutation testing. Considered and
  declined for this scope.
- **No build step.** ES modules loaded directly by the browser.

## Out of Scope

Accounts, authentication, a server, sharing or collaboration, OS or push
notifications, stale-task detection, snooze, recurring tasks, task
prioritisation, tags, and search. Each was either raised and declined during
brainstorming or falls outside the single-user local constraint.

## Data Model

One entity, persisted to `localStorage` under a single key as a JSON array.

```
Task {
  id:           string        // crypto.randomUUID()
  title:        string
  dueDate:      string | null // ISO 8601; null means never notifies
  completedAt:  string | null // ISO 8601; non-null means done, never notifies
  dismissed:    { dueSoon: boolean, overdue: boolean }
}
```

Notifications are **not** persisted. There is no notifications collection, no
event log, and no fan-out. The notification list is a pure function of the
task array and the current time. The only persisted notification state is the
pair of dismissal flags on each task.

## Notification Rules

Evaluated in order, per task:

1. Skip the task unless `dueDate` is non-null and parses as a valid ISO 8601
   date, and `completedAt` is null.
2. Determine the kind:
   - **overdue** — `dueDate < now`
   - **dueSoon** — `now <= dueDate < now + DUE_SOON_WINDOW`
   - otherwise (`dueDate >= now + DUE_SOON_WINDOW`) the task is not yet
     relevant and yields nothing.
3. Skip the task if the dismissal flag matching that kind is true.
4. Otherwise emit one notification of that kind.

`DUE_SOON_WINDOW` is a module constant of 24 hours. It is deliberately not a
user setting; promoting it to one later is a small change.

The two kinds are mutually exclusive, so a task contributes at most one
notification at any instant.

## Dismissal Semantics

- Dismissing a notification sets the matching flag (`dueSoon` or `overdue`)
  on its task to true.
- **Any edit to `dueDate` resets both flags to false.** This rule is what
  makes "occurrence" well-defined. It is enforced inside `store.updateTask`
  rather than at call sites, so no caller can omit it.
- Completing a task removes it from the notification list without touching
  its flags. If the task is later reopened and is still overdue, the prior
  dismissal still applies — reopening is deliberately not treated as a new
  occurrence.
- A task dismissed as `dueSoon` that subsequently crosses into `overdue`
  notifies again, because `overdue` carries its own independent flag.

## Architecture

Vanilla JavaScript as ES modules. No framework and no build step: the app is
one screen, a list, and a panel, and a toolchain would exceed the feature in
size. `index.html` loads `src/main.js` via `<script type="module">`.

The accepted cost is explicit re-rendering rather than reactive updates. At
this size that is a small number of call sites. The module boundaries below
are drawn so that a framework could later be introduced behind them without
touching the notification logic.

### Modules

Four modules, dependencies pointing one direction only.

**`src/store.js`** — owns the task array and all `localStorage` access.

- Exports: `getTasks()`, `addTask(fields)`, `updateTask(id, fields)`,
  `deleteTask(id)`, `dismiss(id, kind)`.
- The only module that touches `localStorage` or generates IDs.
- Enforces the dismissal-flag reset rule inside `updateTask`.
- Depends on: nothing.

**`src/notifications.js`** — the notification engine, as a pure function.

- Exports: `getNotifications(tasks, now) → [{ taskId, kind, title, dueDate }]`
  and the `DUE_SOON_WINDOW` constant.
- No imports, no clock access, no DOM access. `now` is a parameter.
- Depends on: nothing.

**`src/ui.js`** — rendering and event wiring.

- Renders the task list and the notification panel from supplied state.
- Translates user events into `store` calls.
- Depends on: `store`, `notifications`.

**`src/main.js`** — startup and the clock.

- Initial render, plus a 60-second `setInterval` tick that re-renders so a
  task crossing its due boundary appears without a page reload.
- Depends on: `store`, `ui`.

The boundary that matters: `notifications.js` depends on nothing and reads no
ambient state. All logic that is easy to get wrong lives in a pure function.

### Interface Surface

Each module is usable without reading its internals:

- `store` — a task collection with persistence. Callers never see
  `localStorage` or the storage key.
- `notifications` — tasks plus a timestamp in, a notification list out.
  Callers never see the rules.
- `ui` — state in, DOM out, callbacks to `store`. Callers never see markup.

## User Interface

- A task list: title, due date, completion checkbox, delete.
- An "add task" input with an optional due date.
- A bell control showing a count of current notifications, opening a panel
  that lists them grouped by kind (overdue first, then due soon), each with a
  dismiss action.
- When `localStorage` is unavailable, a persistent banner stating that
  changes will not be saved.

## Error Handling

- **Corrupt or unparseable stored JSON:** log, copy the raw bad value to a
  backup key, and start from an empty list. Never crash to a blank page, and
  never silently destroy data that a parse bug might have misread.
- **`localStorage` unavailable or over quota** (private browsing, for
  example): run in memory and show the not-persisting banner once.
- **Invalid `dueDate` strings:** treated as `null` — no due date, never
  notifies. The notification path must never throw.

## Testing Strategy

`getNotifications` holds the logic most likely to be wrong and is pure, so it
receives direct coverage:

- overdue: due date strictly in the past
- due soon: due date within the window
- boundaries: `dueDate` exactly equal to `now`, and exactly equal to
  `now + DUE_SOON_WINDOW`
- completed tasks excluded regardless of due date
- null and invalid due dates excluded
- each dismissal flag honoured independently
- a task dismissed as `dueSoon` still notifies once it becomes `overdue`

`store.js` is tested against a fake `localStorage` for:

- the reset-both-flags-on-`dueDate`-edit rule
- recovery from corrupt stored JSON, including that the backup key is written
- in-memory fallback when storage throws

`ui.js` and `main.js` are not unit tested; they are wiring, and end-to-end
tests were declined.

## Future Extensions

Recorded so the design does not foreclose them, not as committed work:

- OS notifications via the `Notification` API, layered over the same computed
  list. Would still only fire with the tab open.
- A configurable due-soon window, promoting `DUE_SOON_WINDOW` to a setting.
- Snooze, which would replace the boolean dismissal flags with timestamps.
- Multi-user support, which would require a backend and would change the
  notification model from computed to stored-and-fanned-out. This is the one
  extension that is a rewrite rather than an addition, and it was ruled out
  deliberately.
