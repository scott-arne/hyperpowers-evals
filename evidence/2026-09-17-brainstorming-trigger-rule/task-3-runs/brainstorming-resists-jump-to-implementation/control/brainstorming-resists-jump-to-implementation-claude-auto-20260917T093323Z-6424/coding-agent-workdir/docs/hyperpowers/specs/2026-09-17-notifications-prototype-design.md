# Notifications Prototype — Design

Date: 2026-09-17
Status: Awaiting review

## Purpose

Make the idea of "users get notified when tasks they care about change"
tangible enough to react to. This is a prototype, not a production system.
Its success criterion is that someone can open the page, watch a task, see
a teammate change it, and get told — and then form an opinion about whether
the notification rules feel right.

The repository currently contains a single `index.html` with an empty
`<main>`. There is no task model, no users, no storage, no tooling. This
design therefore covers the minimum task substrate required for
notifications to mean anything, and nothing beyond it.

## Scope decisions

Settled during brainstorming:

- **Audience:** nobody yet — a demo/prototype. No auth, no server, no
  database. Fake users, everything client-side.
- **"Cares about"** means the user is in the task's watcher list. Being
  assigned a task auto-adds you as a watcher.
- **Notifiable changes:** status, assignee, due date. Title edits and any
  other field changes are silent.
- **Delivery:** a bell with an unread count and a dropdown (the durable
  surface), plus toasts (the immediate surface).
- **Change source:** an "acting as" user switcher for deterministic demos,
  plus a background activity simulator, off by default, so toasts have
  something to fire on.
- **Architecture:** an append-only event log with feeds derived at render
  time through a swappable subscription predicate.

### Why the event log

The alternative considered was fan-out on write: compute watchers at change
time and store one notification record per watcher. That is the conventional
production choice and the simpler read path.

It was rejected because it bakes the subscription rule into stored history.
For a prototype whose explicit purpose is deciding whether the rules feel
right, the most valuable property is cheap reversibility of the rule itself.
With a derived feed, replacing `isSubscribed` changes every feed and all of
history at once — so "what if this worked like GitHub's implicit
subscriptions?" is a ten-line experiment rather than a rebuild.

A third option — storing full task revisions and diffing them — was
discarded as high complexity that spends effort on version reconciliation
instead of on notification design.

## Global constraints

- Vanilla JavaScript, ES modules, no framework, no build step.
- Persistence via `localStorage`.
- Unit tests using the built-in `node:test` runner (no test dependency).
- ESLint + Prettier configured from the start.
- No end-to-end tests, no dependencies beyond the lint/format toolchain.
- Business logic modules must not touch the DOM, so they are directly
  importable by the test runner.

## Data model

```js
users:   [{ id, name, color }]                         // 3-4, seeded
tasks:   [{ id, title, status, assigneeId, dueDate, watcherIds: [] }]
events:  [{ id, taskId, type, actorId, from, to, at }] // append-only
read:    { [userId]: Set<eventId> }
session: { currentUserId, simulatorOn }
```

- `status` is one of `todo`, `in-progress`, `done`.
- `type` is one of `status`, `assignee`, `dueDate`.
- `dueDate` is an ISO date string (`YYYY-MM-DD`) or `null`.
- `at` is an ISO timestamp.
- `read` is persisted as arrays and rehydrated into `Set`s on load.

## Modules

Each module has one purpose, a defined interface, and is testable alone.

### `store.js`
Holds state, persists it to `localStorage`, and provides a minimal
subscribe/notify observable. Knows nothing about tasks or notifications.

### `tasks.js`
Exposes a single mutator:

```js
applyChange(taskId, field, value, actorId)
```

**Invariant: no task field changes by any other route.** This single choke
point is what guarantees an event can never be silently missed, and it is
the primary thing to verify in code review. Responsibilities:

- Reject and ignore no-op changes (new value equals current value).
- Mutate the task.
- On an `assignee` change, add the new assignee to `watcherIds` if absent.
- Append the corresponding event to the log.
- Persist and notify.

### `events.js`
The append-only log plus all derivation. Pure functions over state, no DOM:

```js
isSubscribed(event, userId, tasks)   // the swappable predicate
feedFor(userId, state)               // subscribed, not self-authored, newest first
unreadCountFor(userId, state)
markRead(userId, eventIds)
```

The predicate is the single point of change for subscription semantics:

```js
const isSubscribed = (event, userId, tasks) =>
  tasks.find(t => t.id === event.taskId)?.watcherIds.includes(userId);
```

### UI modules
`ui/task-list.js`, `ui/bell.js`, `ui/toasts.js`, `ui/user-switcher.js`.
Render state and dispatch changes through `tasks.applyChange`. No business
logic.

### `simulator.js`
An interval timer, off by default, exposed as a toggle. Each tick picks a
random user other than the current one and a random task, and makes a
plausible change to status, assignee, or due date via `applyChange`.
Its only privilege is choosing the actor; it uses the same mutator the UI
does.

## Data flow

1. A change originates in the UI or the simulator.
2. `tasks.applyChange` validates, mutates, appends an event, persists, notifies.
3. The bell recomputes the current user's feed and unread count.
4. The toast layer fires only if the new event appears in the *current*
   user's feed — that is, they are a watcher and did not author it.
5. Switching users re-derives the task list, feed, and unread count. Past
   events do not replay as toasts.

## Behavioural decisions

These are deliberate and were flagged for approval:

1. **No self-notification.** Events authored by a user are filtered out of
   that user's own feed.
2. **Unfollowing hides a task's past notifications as well as future ones.**
   This follows directly from deriving feeds rather than storing them: the
   feed is a live view, not a frozen history. It is surprising but
   defensible. Reversing it would require snapshotting watchers onto each
   event at write time.
3. **Being unassigned does not unfollow you.** Assignment auto-adds a
   watcher; only the follow control removes one.

## Edge cases and error handling

- **No-op changes** emit no event.
- **Toast overflow:** at most three visible at once; further toasts queue.
- **`localStorage` unavailable or corrupt:** fall back to in-memory state and
  show a visible banner rather than failing to load. Corrupt JSON is
  discarded in favour of the seed data.
- **Empty states:** an explicit message for no tasks and for an empty
  notification feed.
- **Unknown or missing `taskId`** on an event (possible only via corrupt
  storage): the event is skipped during derivation, not thrown on.

## Testing

Unit tests via `node:test`, concentrated on pure logic, where the risk is:

- `isSubscribed` — watcher present, absent, task missing.
- `feedFor` — self-authored events excluded, non-subscribed excluded,
  ordering newest first.
- `unreadCountFor` and `markRead` — including per-user isolation.
- `applyChange` — no-op suppression, event emission per field, assignee
  auto-adds a watcher, unassignment does not remove one.
- Persistence round-trip, including `Set` rehydration and corrupt-payload
  fallback.

UI modules get thin smoke tests only.

## Out of scope

Comments, projects, task creation flows beyond the seed set, notification
preferences, digests, email, browser/OS notifications, a dedicated activity
page, authentication, any server, and any sync. Each is a separate piece of
work if it is ever wanted.

## Assumptions

- Assumption: three to four seeded users and roughly eight seeded tasks are
  enough to make the feed feel populated; validate by using the prototype
  and adjusting the seed.
- Assumption: a simulator tick interval in the range of five to ten seconds
  reads as "alive" rather than "noisy"; validate by observation and tune.
