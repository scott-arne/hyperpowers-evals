# Task Reminders — Design

Date: 2026-09-16
Status: Approved design, pending implementation plan

## Context

The repository currently contains a single `index.html` with an empty
`<main>`. There is no task model, no persistence, no identity, and no UI. The
originating request was "notify users when tasks they care about change."

Brainstorming resolved that request as follows:

- The app is single-user on a single device. There are no accounts and no
  server.
- Because the user is the only actor, notifying them about their own edits
  carries no information. The only changes worth surfacing are the ones that
  occur without user action: the passage of time against a due date.
- "Notifications" therefore means **due-date reminders**, not an event
  subscription system.

## Goals

1. A working local task list with optional due dates.
2. A reminder that fires at a task's due time, optionally a configurable
   number of minutes earlier.
3. Delivery as an OS-level browser notification when a tab is open and
   permission has been granted, degrading to in-page surfaces otherwise.

## Non-Goals

Recorded explicitly to prevent scope drift:

- Multi-user, sharing, assignment, or any notion of "who cares about" a task.
- Sync across devices or browser profiles.
- Reminders that fire while the browser is closed. See Platform Constraints.
- Recurring tasks.
- An activity or audit log of the user's own edits.
- Per-task reminder overrides in the first version. The data model leaves room
  for them.

## Platform Constraints

A pure local web page cannot reliably fire a scheduled notification with no
tab open. The two mechanisms that would allow it are both unsuitable:

- **Notification Triggers API** — Chrome-only and experimental.
- **Periodic Background Sync** — Chrome-only, requires an installed PWA, and
  the browser decides when (and whether) it runs.

This design does not attempt background delivery. The reliability ceiling is
stated in the UI rather than papered over: reminders reach the user while a
tab is open, and the in-page layer catches everything else on next visit. A
user who needs reminders with the browser shut should use their operating
system's reminder application.

## Architecture

Vanilla ES modules served as static files. No framework and no build step;
`index.html` loads `main.js` as a module.

The module boundaries exist so that the reminder logic is testable without a
DOM and without a real clock.

| Module | Responsibility | Depends on |
|---|---|---|
| `store.js` | Task CRUD, `localStorage` persistence, change events | storage adapter |
| `settings.js` | Global lead time, persisted | storage adapter |
| `scheduler.js` | Decides which reminders are due to fire | injected clock, task data |
| `notifier.js` | Delivers a reminder; owns permission state | `Notification` API |
| `ui.js` | Renders list, badges, banner, settings control | `store`, `settings` |
| `main.js` | Wiring only | all of the above |

The load-bearing boundary is between `scheduler.js` and `notifier.js`. The
scheduler decides *what should fire*; the notifier decides *how it reaches the
user*. The scheduler touches no DOM, no `Notification`, and no
`localStorage`, which is what makes its edge cases unit-testable.

`store.js` and `settings.js` take a storage adapter rather than referencing
`localStorage` directly, so tests can supply a fake and the in-memory fallback
(see Error Handling) is the same code path.

## Data Model

```
Task {
  id: string              // uuid
  title: string
  done: boolean
  dueAt: string | null    // ISO 8601
  createdAt: string       // ISO 8601
  reminderFiredAt: string | null  // ISO 8601; dedup record
}

Settings {
  leadMinutes: number     // 0 means fire at due time
}
```

Persisted under versioned keys `tasks.v1` and `settings.v1` so a later format
change has something to migrate from.

`reminderFiredAt` is what prevents a reminder re-firing on every page reload.
It records that this task's reminder has been delivered, not when the task was
due.

A future per-task override is a nullable `remindAt` field that falls back to
the global rule when absent. Adding it requires no migration of existing
stored tasks.

## Reminder Engine

### Fire condition

A task is due to fire when all of the following hold:

- `done` is false
- `dueAt` is non-null
- `now >= dueAt - leadMinutes`
- `reminderFiredAt` is null

On firing, `reminderFiredAt` is set before delivery is attempted, so a
delivery failure cannot produce a fire loop.

If `dueAt` is edited to a later time, `reminderFiredAt` resets to null so the
reminder fires again against the new time. Editing `dueAt` earlier behaves the
same way.

### Timing strategy

The scheduler does **not** rely on a single long `setTimeout`. Two reasons:

- `setTimeout` caps at roughly 24.8 days.
- Timers drift or are suspended across laptop sleep, so a timer set for
  tomorrow morning is not trustworthy.

Instead the scheduler recomputes "what is due now" from the clock on each of:

- a polling tick, default 30 seconds
- the `visibilitychange` event, when the document becomes visible
- any change to tasks or settings

The clock is injected, so tests advance time directly rather than waiting.

### Missed reminders

Reminders that came due while the app was closed are collected on load into a
single "while you were away" summary rendered in the page. They are marked
fired and do **not** produce a burst of OS notifications for events that may
be a day old.

The threshold for "missed" rather than "current" is that the fire time is more
than one polling interval in the past at the moment the scheduler first runs
in a session.

## Delivery and Permission

`notifier.js` has three states:

- **Granted** — deliver via the `Notification` API. The in-page surfaces
  update as well; the OS notification is additive.
- **Default (not yet asked)** — in-page only. An "Enable reminders" control is
  visible.
- **Denied or unsupported** — in-page only, permanently. The control is
  replaced with a short explanation rather than re-prompting.

Permission is requested only from an explicit user click, never on page load.
Auto-prompting at load is the reliable way to be permanently denied.

## UI Surfaces

- Task list with title, done checkbox, and due date. Overdue tasks are
  visually distinct.
- A count of overdue and due-soon tasks in the page heading, so the state is
  legible from a backgrounded tab's title. "Overdue" means `now > dueAt` and
  not done; "due soon" means the task is inside its lead window but `dueAt`
  has not yet passed. The two counts are reported separately.
- A "while you were away" banner on load when missed reminders exist,
  dismissible.
- An "Enable reminders" control reflecting permission state.
- A lead-time control writing `settings.leadMinutes`.

## Error Handling

- **`localStorage` unavailable or quota exceeded** — fall back to the
  in-memory storage adapter and show a persistent warning that changes will
  not survive a reload. The app remains usable.
- **Corrupt stored JSON** — copy the raw value to a `.bak` key before
  resetting, then start clean with a warning. The user's data is not silently
  discarded.
- **`Notification` constructor throws or the API is absent** — degrade to
  in-page delivery silently. This is an expected condition, not an error.

## Testing Strategy

- **`scheduler.js`** carries the real logic and gets real coverage: lead-time
  arithmetic, the dedup behavior of `reminderFiredAt`, reminder reset on
  `dueAt` edit, the missed-while-closed path, and `dueAt` values that cross a
  DST boundary.
- **`store.js` / `settings.js`** are tested against a fake storage adapter,
  including the quota-exceeded and corrupt-JSON paths.
- **`notifier.js`** is tested against a fake `Notification` for its three
  permission states.
- The DOM rendering and the genuine OS notification are the deliberately thin,
  untested edges.

## Global Constraints

Tooling to be established before implementation:

- ESLint and Prettier, configured and passing.
- A unit test runner (`node:test` or Vitest) with the project layout in place
  and one passing scheduler test.

No end-to-end test infrastructure in this version.

## Open Assumptions

- Assumption: a 30-second polling interval is frequent enough to feel
  immediate without measurable cost. Validate by observing whether reminders
  feel late in real use; the interval is a single constant.
