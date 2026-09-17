# Task Notifications — Design

Date: 2026-09-16
Status: Approved design, pending implementation plan

## Problem

Users should be notified when tasks they care about change.

The repository currently contains a single static `index.html` with an empty
`<main>`: no tasks, no users, no storage, no build tooling. Notifications are
the last layer of a stack whose lower layers do not exist. This design builds
the smallest substrate that makes notifications meaningful, and no more.

## Scope

In scope:

- A minimal task model sufficient to make changes observable.
- Explicit per-task subscriptions ("watch").
- A durable, ordered change log.
- A persistent notification inbox with unread state, plus transient toasts.
- Two real change sources: cross-tab propagation and due-date arrival.

Out of scope (explicitly deferred):

- Any server, account system, or cross-device delivery.
- Email, push, or OS-level notification delivery.
- Rule-based subscriptions (saved filters).
- Per-subscription notification preferences.
- Notifications for title/description edits or assignee changes.
- Task management features beyond what notifications require.

## Global Constraints

- **Substrate:** client-only, single browser, no server. Module boundaries are
  shaped so a server can later implement the change-feed seam.
- **Audience:** undecided between single-user and multi-user. The design is
  weighted for reversibility; no decision in it presumes either.
- **Tooling, configured before implementation begins:**
  - Unit test runner with project layout and one passing fixture.
  - Linting and auto-formatting (ESLint + Prettier, stack defaults).
  - Vanilla ES modules. No bundler, no framework, no build step.
  - No end-to-end tests (see Known Gaps).
- No DOM access in the logic layer; UI modules are the only DOM consumers.

## Decisions and Rationale

### Subscriptions are declared, not derived

A user watches a task explicitly. Subscriptions are stored records resolved
through a single matcher function.

Derived subscriptions (creator/assignee) were rejected as the primary model:
with one user, every task is yours, so a derived model notifies about
everything. Rule-based subscriptions were rejected as premature. Both remain
additive — `Subscription.kind` dispatches in the matcher, and adding a kind
touches neither the event layer nor the delivery layer.

### Notifiable changes are lifecycle changes

Status/completion changes and due-date changes generate notifications.
Title/description edits do not: content churn is the category that trains
users to mute. `Event.type` is an open string, so widening the set means
adding an emitter, not migrating a schema.

### The change log is a persisted append-only event log with per-tab cursors

Considered and rejected:

- **In-memory pub/sub** — cannot cross tabs. A second tab observes only that
  storage changed, not what changed.
- **Full event sourcing** (tasks as a projection) — requires replay on every
  read plus snapshotting and compaction, for history nobody asked for.

The persisted log with cursors is what makes cross-tab sync and due-date
arrival one mechanism rather than two, and it is the seam's real payoff: an
ordered change feed with a cursor is the shape a server would serve over
SSE or WebSocket, making a remote producer and a sibling tab interchangeable.

### Self-caused changes in the originating tab are suppressed, not unlogged

Events always record to the log. The originating tab filters its own events at
materialization time via `origin`. A user clicking "done" gets no redundant
toast; other tabs still receive the event.

## Data Model

```
Task          { id, title, status, dueAt|null, updatedAt }
Event         { seq, type, taskId, before, after, at, origin }
Subscription  { id, kind: "task", taskId, createdAt }
Notification  { id, eventSeq, taskId, type, at, read }
```

- `Event.type` is one of `status`, `due-date`, `due`, `overdue`.
- `Event.before` / `Event.after` carry the old and new value of the field the
  event names: task status for `status`, `dueAt` for `due-date`. For the
  time-triggered `due` and `overdue` events no field changed, so `before` is
  `null` and `after` is the `dueAt` that elapsed.
- `Event.seq` is monotonic within the log and defines ordering.
- `Event.origin` is the originating tab's id.
- `Subscription.kind` is the extension point for future subscription types.
- `Notification.eventSeq` is the idempotency key: materializing the same event
  twice produces the same record.

## Modules

| Module | Responsibility | Depends on |
|---|---|---|
| `store` | Versioned localStorage read/write, JSON handling, quota errors, schema version | — |
| `events` | Append to log, read-since-cursor, cross-tab `storage` listener, monotonic `seq` | `store` |
| `tasks` | The only mutation path for tasks; writes task and appends event | `store`, `events` |
| `subscriptions` | watch/unwatch; `matches(subscription, event)` | `store` |
| `notifications` | Consume events through the matcher; materialize records; read/unread | `store`, `events`, `subscriptions` |
| `due` | Scan on load and on interval; emit `due`/`overdue` events idempotently | `tasks`, `events` |
| `ui/*` | Task list, watch toggle, bell and inbox panel, toast host | all of the above |

`tasks` being the sole mutation chokepoint is load-bearing: it is what
guarantees no task change escapes the log, and it is the function a server
implementation would replace.

## Data Flow

All three sources converge after `events.append`.

1. **Local mutation** — UI calls a `tasks` mutator, which writes the task and
   appends an event with `origin = thisTabId`. The local consumer runs the
   matcher and suppresses materialization because the origin matches.
2. **Cross-tab** — the `storage` event fires in sibling tabs. Each reads
   `events.readSince(cursor)`, runs the matcher, materializes notification
   records, renders badge and toast, and advances its cursor.
3. **Due arrival** — `due.scan()` runs on load and on an interval, appending
   `due`/`overdue` events for watched tasks past `dueAt`. Downstream is
   identical to flow 2.

## Error Handling

- **First load or cursor reset.** When the cursor is absent, or behind a
  trimmed log, notifications are materialized as already read and no toasts
  fire. Toasts require a known cursor. This prevents a toast storm on first
  open.
- **Clock jumps and sleep.** `due.scan()` dedupes on `due:{taskId}:{dueAt}`.
  A deadline passed during sleep yields exactly one late notification. The
  same key prevents two concurrently scanning tabs from double-firing, so no
  leader election is required.
- **Duplicate materialization.** Keyed by `eventSeq`; replay or a race is a
  no-op write.
- **Storage unavailable or over quota.** Fall back to in-memory state, show a
  single banner stating notifications will not survive reload, continue
  working for the session. Storage errors never propagate to the UI as throws.
- **Corrupt or future-version data.** Version check on read. Unrecognized
  versions are moved to a backup key rather than parsed optimistically or
  silently discarded.
- **Unbounded log growth.** Trim to the most recent 500 events. Safe because
  of the cursor-reset rule above.

## Testing

`store` takes an injectable storage adapter and `due` takes an injectable
clock, so the risky logic is testable without a browser:

- Matcher dispatch by `Subscription.kind`.
- `eventSeq` idempotency: materializing one event twice yields one record.
- Due dedupe key across clock jumps and missed intervals.
- Cursor-reset path produces records marked read and zero toasts.
- Log trim, and cursor behavior against a trimmed log.
- Quota-exceeded fallback to in-memory.

## Known Gaps

- **Cross-tab sync has no automated coverage.** End-to-end tests were declined,
  so the `storage`-event wiring is verified by opening two tabs manually. The
  cursor and matcher logic beneath it is unit-tested; the browser wiring is
  not. Accepted for a first version, recorded so it is not later mistaken for
  tested behavior.
- Assumption: a durable notification inbox is more valuable than transient
  alerts for this app's usage pattern. Validate by observing whether the inbox
  is reviewed across sessions once tasks exist.

## Next Step

Implementation plan via the writing-plans skill. No code is written until the
plan is approved.
