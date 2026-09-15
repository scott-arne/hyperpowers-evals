# Task Notifications — Design

Date: 2026-09-15
Status: Approved design, pending implementation plan

## Problem

Users should be notified when tasks they care about change.

The repository currently contains a single `index.html` with an empty `<main>`.
There is no task model, no persistence, no user identity, and no build tooling.
The requested feature therefore sits on top of three subsystems that do not yet
exist.

## Scope Decomposition

The request decomposes into three sub-projects, built in order. Each gets its own
spec, plan, and implementation cycle.

1. **Task core** — task model, local store, task list and editor UI.
2. **Change log** — append-only event stream for every task mutation, plus the
   activity view that renders it.
3. **Notification surface** — scheduler, feed, unread state. The interest rule
   (any task with a due date) is a single predicate and lives here rather than
   warranting its own cycle.

This document specifies the architecture spanning all four, because the
notification design constrains the shape of the first three. Implementation
plans are written per sub-project.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Users | Single-user, local-first, server-shaped seams | No backend now; stable IDs and an append-only log keep a server addable without a rewrite |
| Triggers | Due-date thresholds + activity log | In a single-user app, notifying about your own edits is noise; the clock is the only source of genuinely new information |
| Interest | Any task with a due date | Setting a due date is the opt-in; no extra field or control |
| Delivery | In-app feed; OS notifications behind an optional adapter | True background push requires a server; the feed is the achievable product |
| Stack | Vite + Preact | The feed, unread badge, and task list are real reactive state |
| Thresholds | 24h before due, then at overdue | Two notifications per task maximum keeps the bell trustworthy |

## Global Constraints

- **Linting and formatting:** ESLint + Prettier, configured before the first
  feature commit.
- **Unit tests:** Vitest, with runner, layout, and a first passing fixture in
  place before feature work.
- **Not in scope:** end-to-end tests, fuzz/property testing. Both were
  considered and declined.
- All timestamps are UTC ISO 8601 strings, compared as instants.
- `store` and `log` are the only modules that touch persistence.

## Architecture

Five modules beneath the UI layer.

| Module | Responsibility | Depends on |
|---|---|---|
| `store` | Tasks keyed by stable UUID; load/save to `localStorage`; the only writer | — |
| `log` | Append-only event list; never mutated, never deleted | — |
| `scheduler` | Ticks on a timer; compares `now` against due dates; emits threshold crossings | `store` |
| `notifications` | Derives the feed from log + scheduler output; owns unread state | `log`, `scheduler` |
| `ui` | Preact components: task list, task editor, bell + feed dropdown, activity view | all |

### Load-bearing boundaries

**The scheduler does not write notifications.** It reports threshold crossings;
`notifications` decides which become feed entries. This separates "when did this
cross its due date" from "have I already reported it," and makes deduplication
testable without real elapsed time.

**The scheduler takes `now` as a parameter** rather than calling `Date.now()`
internally. A time-based feature is otherwise untestable.

**Server readiness:** because `store` and `log` are the only persistence
touchpoints and the log is already an event stream, replacing `localStorage`
with a sync adapter is a change in two modules.

## Data Model

```js
// Task
{ id: uuid, title: string, notes: string,
  dueAt: ISO8601 | null, status: 'open' | 'done',
  createdAt: ISO8601, updatedAt: ISO8601 }

// LogEvent — append-only
{ id: uuid, taskId: uuid, at: ISO8601,
  type: 'task.created' | 'task.updated' | 'task.deleted',
  field: string | null, from: any, to: any }

// Notification
{ id: uuid, taskId: uuid, kind: 'due-soon' | 'overdue',
  thresholdAt: ISO8601, createdAt: ISO8601, readAt: ISO8601 | null }
```

### Model rules

**The fired-set is derived, not stored.** Whether a threshold has already
notified is answered by querying existing notifications for
`(taskId, kind, thresholdAt)`. A separate fired-set would be a second source of
truth that can drift from the feed.

**Dismissal sets `readAt`; it does not delete.** Deleting a notification would
make its threshold eligible to fire again.

**`thresholdAt` is part of the identity.** Pushing a due date back creates a
genuinely new threshold that should be able to notify again. Keying on
`(taskId, kind)` alone would suppress the second warning — the failure mode
where a deadline is missed because the app already reported the old one.

**Deleted tasks keep their log events.** Deletion removes the task from `store`
and emits `task.deleted`; history survives. The activity view renders the title
captured in the event rather than resolving it against the store.

## Data Flow

### Write path

Every mutation goes through `store.apply(mutation)`, which, in order: writes the
task, appends the log event, persists, then notifies subscribers. The UI never
touches `localStorage` and never appends to the log directly. A single writer
keeps the log and the store in step.

### Tick path

The scheduler runs on a 60-second interval, on page load, and on
`visibilitychange` when the tab returns to the foreground. Each tick:

1. Read tasks where `dueAt` is set and `status === 'open'`.
2. Compute thresholds crossed as of `now`.
3. Hand crossings to `notifications`, which discards those already recorded and
   appends the rest.

Rendering follows from state; the scheduler does not touch the DOM.

## Edge Cases

| Case | Behavior |
|---|---|
| Tab closed for a week | The load-time tick fires one `overdue` per affected task, not one per missed interval; the identity key dedupes |
| Laptop sleep | `setInterval` does not fire while suspended; the `visibilitychange` handler runs a catch-up tick on focus |
| Clock change / DST | Timestamps are UTC instants; DST shifts wall-clock display, never the threshold |
| Task completed before due | `status: 'done'` excludes it from the scan. Re-opening makes it eligible again, and the unchanged threshold key prevents re-firing |
| `localStorage` full or blocked | The store surfaces the write failure to the UI as a persistent "changes aren't being saved" banner. Silent data loss is the worst available outcome |
| Two tabs open | **Known limitation, accepted.** Each tab keeps independent in-memory state; last write wins. A `storage`-event listener would close this and was explicitly left out of scope |

## Testing

Vitest over the pure modules, which hold most of the interesting logic.

**`scheduler`** — driven by synthetic `now` values; no fake timers, no waiting.
Cases: crossing exactly at the boundary; a week of missed ticks collapsing to
one notification; a pushed-back due date firing again; a completed task staying
silent.

**`log`** — append-only behavior; events surviving their task's deletion.

**`store`** — tested against an in-memory `localStorage` double, including the
quota-failure path.

**`ui`** — light rendering tests only (the bell count reflecting unread state),
since end-to-end testing is out of scope.

## Deferred

- Multi-user accounts and a backend. The event log and stable IDs are the seams
  that keep this addable.
- Cross-tab and cross-device sync.
- OS-level notifications. Written as an adapter behind the notification
  interface so the permission flow stays isolated when enabled.
- Per-task mute. Added if the feed proves noisy under the
  any-task-with-a-due-date rule.
