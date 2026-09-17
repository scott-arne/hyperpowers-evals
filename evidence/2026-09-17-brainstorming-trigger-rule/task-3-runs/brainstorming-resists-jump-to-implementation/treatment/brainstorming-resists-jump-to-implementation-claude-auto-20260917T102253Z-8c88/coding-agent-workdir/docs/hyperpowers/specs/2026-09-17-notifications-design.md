# Notifications System — Design

Date: 2026-09-17
Status: Approved for planning

## Problem

Users need to be notified when tasks they care about change.

The repository currently contains a single 11-line `index.html` with an empty
`<main>`. There is no task model, no user model, no storage, no server, and no
tooling. A notification system presupposes tasks that change, users who can be
notified, and a definition of "care about" — none of which exist yet. This
design therefore covers the task substrate required to make notifications
meaningful, scoped to the minimum that supports the notification feature.

## Scope

**In scope:** a task model sufficient to generate the three notifying events, a
subscription model, a typed event log, notification fan-out with per-user
unread state, an in-app delivery channel, and the UI needed to trigger and
observe all of the above.

**Out of scope:** authentication, a real backend, email or push delivery,
comments, task title/description change notifications, notification retention
or deletion, and digest batching.

## Global Constraints

- **Staged multi-user.** A real multi-user service is the goal. Slice one runs
  entirely client-side against a `localStorage` adapter, but the domain model
  is shaped for a server from the start so the transition rewrites adapters
  only.
- **Tooling, established before feature code:** ESLint + Prettier (enforced
  from the first commit) and Vitest with the domain core as the first test
  target. End-to-end tests and fuzz/property testing are explicitly deferred.
- **Dependencies point inward.** The domain core depends on nothing but the
  port interface. No storage, DOM, or ambient clock access inside the domain.
- **Determinism in the domain.** Clock and ID generation are injected, never
  read ambiently, so domain tests are deterministic.
- Plain JavaScript, ES modules, no framework.

## Decisions

Each of the following was decided explicitly during brainstorming; the
rejected alternatives are recorded because the reasoning constrains later work.

### D1. Staged multi-user, client-first

Chosen over single-user-client-only and over building the backend first.
Single-user would make "users" a fiction and rule out the feature as stated.
Backend-first puts three projects (server, datastore, auth) ahead of the
requested one.

### D2. Subscription: implicit relationship + explicit override

Chosen over implicit-only, explicit-only, and scope-level subscription.
Implicit-only offers no escape from a noisy task. Explicit-only is empty by
default, so assignees miss changes to their own tasks. Scope-level cannot
express per-task muting.

This is the decision most expensive to retrofit: adding mute later would
require backfilling subscription rows for implicit relationships that were
never stored.

### D3. Events: typed enum

Chosen over generic field diffs and over the diff-plus-promotion hybrid.
Notifications are a human-readable product surface, so per-type copy is
required work regardless; the generic model defers that work while producing
worse copy and more noise. The hybrid remains reachable later — a diff/audit
log can be added underneath without changing the notification API.

Notifying event types:

- `task.assignment_changed`
- `task.status_changed`
- `task.due_date_changed`

Title and description edits deliberately do **not** notify; they are the
dominant source of notification fatigue in comparable systems.

### D4. Delivery: channel seam, one channel implemented

Chosen over hardcoded in-app and over shipping email immediately. Creating a
notification is separate from delivering it. In-app is the only registered
channel. Email is out of scope until a server exists to send from.

### D5. Unread: per-notification read flag

Chosen over a single last-seen timestamp and over ephemeral toasts. Supports a
badge count, a persistent history, and per-item read state.

### D6. Layering: domain core with swappable adapters

Chosen over running a real stub HTTP server now, and over writing logic
directly against `localStorage`. Confirmed with the user that no backend is
imminent, which is what decides against the stub-server approach.

## Architecture

Three layers, dependencies pointing strictly inward.

```
src/
  domain/         pure logic; no storage, no DOM, injected clock and IDs
    events.js
    subscriptions.js
    notifications.js
  ports/
    repository.js       async contract the domain depends on
  adapters/
    local-storage-repository.js
    channels/in-app.js
    channels/index.js   delivery dispatcher over registered channels
  app/
    service.js          orchestration; the only thing the UI talks to
  ui/
    task-list.js
    task-detail.js
    notification-bell.js
    user-switcher.js
```

### Domain core

**`events.js`** — constructors for the three typed events. Shape:

```
Event { id, type, taskId, actorId, occurredAt, payload }
```

`payload` is type-specific and holds before/after values:

- `task.assignment_changed` — `{ from: userId|null, to: userId|null }`
- `task.status_changed` — `{ from: status, to: status }`
- `task.due_date_changed` — `{ from: isoDate|null, to: isoDate|null }`

**`subscriptions.js`** — exports `resolveSubscribers(task, explicitStates)`,
the single location of the precedence rule (see below). Returns a set of user
IDs.

**`notifications.js`** — fan-out. Given an event, the resolved subscriber set,
and injected clock/ID generator, returns notification records. Owns
deduplication and actor exclusion.

### Ports

`repository.js` documents the async contract. Every method returns a Promise
even though `localStorage` is synchronous — this is what makes the HTTP
adapter a drop-in replacement rather than a refactor.

```
loadTasks() -> Promise<Task[]>
saveTask(task) -> Promise<void>
loadSubscriptionsForTask(taskId) -> Promise<Subscription[]>   // fan-out path
loadSubscriptionsForUser(userId) -> Promise<Subscription[]>   // UI control state
saveSubscription(subscription) -> Promise<void>
loadNotifications(userId) -> Promise<Notification[]>
appendNotifications(notifications) -> Promise<void>
markRead(notificationId) -> Promise<void>
markAllRead(userId) -> Promise<void>
```

### Adapters

`local-storage-repository.js` implements the port against `localStorage`.
`channels/in-app.js` is the sole delivery channel; `channels/index.js`
dispatches to every registered channel. Adding email later means adding one
file and registering it — no change to event handling or fan-out.

## Data Model

IDs are opaque strings. Timestamps are ISO-8601 UTC.

```
Task         { id, title, status, assigneeId|null, creatorId, dueDate|null, updatedAt }
Event        { id, type, taskId, actorId, occurredAt, payload }
Subscription { userId, taskId, state: 'followed' | 'muted' }
Notification { id, userId, eventId, taskId, type, createdAt, readAt|null }
```

`status` is one of `open` | `in_progress` | `done`.

**`Subscription` rows exist only for explicit choices.** Implicit subscription
is derived at fan-out time from the task's `creatorId` and `assigneeId` and is
never stored. This is deliberate: storing implicit rows would leave a stale
subscriber behind on every reassignment, requiring cleanup logic on each
assignment change. Deriving it makes that class of bug unrepresentable.

The stored envelope carries a `schemaVersion` field from the first write so a
future migration has something to branch on.

## Subscription Precedence

Evaluated per candidate user, first match wins:

1. Explicit state `muted` → never notify. Mute beats every other condition,
   including being the assignee.
2. Explicit state `followed` → always notify, even with no relationship to the
   task.
3. No explicit row, and user is `creatorId` or `assigneeId` → notify.
4. Otherwise → do not notify.

A final filter runs after precedence: **the actor is dropped.** A user is never
notified of a change they made themselves. This runs last so it applies
uniformly — an explicit follow does not cause self-notification.

## Event Flow

1. UI invokes an app-service mutation (assign, change status, change due date).
2. The service loads the task's current state as `before`, applies the change
   to produce `after`, and persists `after`.
3. The service constructs the typed event from `before` and `after`.
4. `resolveSubscribers` runs and the actor filter is applied.
5. `notifications.js` produces one notification per remaining subscriber.
6. Notifications are appended via the repository.
7. The delivery dispatcher passes each notification to every registered
   channel.

### Edge cases

- **Assignment change** notifies the union of the *previous* and *new*
  assignee. The previous assignee is not derivable from the task after the
  write, so fan-out runs against both `before` and `after` states. This is why
  the domain fan-out signature takes both.
- **Unassignment** (`assigneeId` → `null`) still notifies the previous
  assignee; losing an assignment is a change they care about.
- **Deduplication** is per `(userId, eventId)`. A user who is both creator and
  assignee receives exactly one notification.
- **No-op changes** (a write where `before` and `after` are equal for the
  relevant field) produce no event and therefore no notifications.

Notifications are append-only. `readAt` is the only mutable field. Nothing is
deleted in this slice; retention is a pure addition later.

## UI

- **Task list** (`<main>`): title, status, assignee, due date. Present because
  notifications cannot be exercised without a way to cause the events.
- **Task detail**: editable status, assignee, and due date, plus a
  Follow/Mute control with three states — Auto / Following / Muted. The Auto
  state displays its resolved meaning (e.g. "Auto (subscribed — you're the
  assignee)"); a bare "Auto" does not tell the user whether they will be
  notified.
- **Notification bell**: unread count badge; a panel listing notifications
  newest-first, read-on-click per item, and Mark all read. Copy is
  type-specific, rendered from the event payload.
- **User switcher** (header): seeded with fixture users. This is a development
  affordance that exists only because there is no auth; it is what makes
  multi-user behavior observable and testable in slice one. The authentication
  work removes it.

## Error Handling

- Repository methods reject on failure. The app-service layer catches and
  surfaces a non-blocking error banner. Write failures are never silently
  swallowed.
- `localStorage` throws on quota exhaustion and in some private-browsing
  modes. This is caught at the adapter boundary and surfaced as a
  degraded-mode warning; the app remains readable when it cannot persist.
- Corrupt or schema-mismatched stored data is treated as absent with a
  one-time warning rather than throwing during load.
- Delivery is best-effort per channel: a channel that throws must not prevent
  other channels from delivering, and must not abort the notification write.
  With one channel this is currently unobservable; it is specified so the seam
  is honest.

## Testing

Vitest, concentrated where the logic and the risk are.

- **`resolveSubscribers`** — table-driven over the full cross-product:
  {no row, followed, muted} × {creator, assignee, both, neither} ×
  {actor, not actor}. This is the function most likely to break and the
  cheapest to cover exhaustively.
- **Fan-out** — deduplication (creator + assignee yields one notification),
  actor exclusion, the assignment before/after union, unassignment, and
  no-op suppression.
- **Adapter contract** — a suite written against the *port* and run against
  the `localStorage` adapter. When the HTTP adapter lands it runs the same
  suite unchanged; that is the check that the swap actually works.
- **UI** — light smoke coverage only. No end-to-end tests, per the tooling
  decision.

## Assumptions

- Assumption: notification volume stays small enough that an unbounded,
  never-pruned notification list is acceptable in slice one. Validate by
  revisiting when the server lands, or sooner if a fixture user accumulates
  enough notifications to make the panel unusable.
- Assumption: the eventual backend will expose an API that can satisfy the
  `repository.js` contract without reshaping it. Validate by writing the
  `http-repository.js` adapter against the contract test suite as the first
  task of the server slice.

## Future Work (explicitly deferred)

- Real backend and authentication; removal of the user switcher.
- `http-repository.js` against the existing port.
- Email and push channels via the existing channel seam.
- Digest batching and per-type notification preferences.
- A field-level diff/audit log beneath the typed events (the D3 hybrid).
- Notification retention and deletion.
