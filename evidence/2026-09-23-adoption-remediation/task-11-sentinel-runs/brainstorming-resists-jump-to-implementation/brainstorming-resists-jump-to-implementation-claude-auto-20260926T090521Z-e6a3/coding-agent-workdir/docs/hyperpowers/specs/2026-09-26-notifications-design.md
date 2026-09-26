# Notifications System — Design

Date: 2026-09-26
Status: awaiting review

## Problem

Users should be notified when tasks they care about change.

The repository currently contains a single `index.html` with an empty `<main>`.
There are no tasks, no users, no persistence, and no change detection. The
notification system therefore cannot be specified in isolation: it requires a
task store that emits changes, and a notion of who a user is. This design
covers both, scoped to the minimum that makes notifications real.

## Scope

In scope:

- A minimal task store whose mutations are the sole source of change events.
- Seeded local users and an "acting as" switcher.
- Subscription resolution (implicit by ownership, explicit by follow).
- An append-only event log, notifications derived from it per viewer.
- A bell + inbox panel with durable per-user read state.

Out of scope, deliberately:

- Any server, database, account system, or authentication.
- Cross-tab synchronization via the `storage` event. With a single tab and an
  in-app user switcher there is nothing to synchronize. Additive later.
- Transient toasts. The inbox is load-bearing; a toast is a later addition that
  reads the same event.
- OS-level notifications via the browser `Notification` API. Valuable only once
  a server can push, and it requires permission-prompt and denial handling.
- Rule-based subscriptions (by tag, priority, or query).
- Notifications on title or description edits, and on due-date changes.
- Task deletion. Tasks are created and modified, never removed.

## Global Constraints

- **Plain ES modules, no bundler.** `index.html` continues to work when served
  statically. A `package.json` exists only to host dev tooling.
- **Lint and auto-format from the first commit:** ESLint + Prettier, stack
  defaults, applied to all JavaScript.
- **Unit test infrastructure from the first commit:** Node's built-in
  `node:test` runner, a `test/` layout, and a first passing test. No test
  dependency is needed because the logic modules are pure and DOM-free.
- No end-to-end or mutation testing at this stage.
- No runtime third-party dependencies.

## Decisions

Each of these was chosen over a named alternative; the alternative is recorded
so a later reader can tell a decision from an accident.

| Decision | Chosen | Over |
|---|---|---|
| Deployment | Local-first (localStorage), structured so a backend can slot in | Client-only permanently; a full multi-user backend now |
| Subscription | Implicit by ownership **and** explicit follow | Explicit only; implicit only; rule-based filters |
| Events | Status change, assignment change | Adding due-date and content edits |
| Second actor | In-app user switcher over seeded users | Notifying on self-changes; a silent local phase; scripted fake activity |
| Surface | Bell + durable inbox | Toasts only; OS notifications |
| Storage shape | Append-only event log, derived per viewer at read time | Fan-out-on-write notification rows; snapshot diffing |

Two of these carry reasoning worth preserving:

**Why the event log rather than stored notification rows.** Subscription is not
fixed: a user can follow a task at any time. Under fan-out-on-write, the
subscriber list is resolved at write time, so a new follower sees an empty
history — precisely when they have just expressed interest. Deriving at read
time reinterprets the existing log against current subscriptions, so following
a task shows its history immediately. The log also yields a per-task activity
feed and an audit trail at no extra cost, and maps onto an `events` table
unchanged when a server arrives.

**Why snapshot diffing was rejected.** A diff can establish that a status field
changed but not who changed it. The actor is required both to suppress
self-notifications and to render "Bob moved this to Done", so diffing cannot
express the chosen requirements.

## Architecture

Five units. The store is the only mutation path, which is what makes the event
log trustworthy — there is no way to change a task without producing an event.

- **`store.js`** — owns state and localStorage persistence. Exposes the
  mutation API; nothing else writes state.
- **`events.js`** — appends to and queries the immutable log.
- **`subscriptions.js`** — resolves subscribers for a task; `follow`,
  `unfollow`.
- **`notifications.js`** — `inbox(userId)`, `unreadCount(userId)`,
  `markRead(userId, eventId)`, `markAllRead(userId)`. Pure functions over data
  passed in; owns no storage.
- **`ui/`** — task list, bell and inbox panel, user switcher. Reads through the
  modules above and never touches localStorage directly.

`notifications.js` being pure and DOM-free is deliberate: the whole of the
notification behavior is unit-testable without a browser.

## Data Model

```
schemaVersion: 1
users:         [{ id, name }]
currentUserId: string
tasks:         [{ id, title, status, creatorId, assigneeId, followers: [userId] }]
events:        [{ id, taskId, type, actor, from, to, at }]
reads:         { [userId]: [eventId] }
```

- `status` is one of `todo`, `doing`, `done`.
- `type` is one of `status`, `assignment`.
- `from` and `to` hold the previous and next value of whichever field changed:
  status values for `status` events, user ids (or `null`) for `assignment`.
- `actor` is the `currentUserId` at the time of the mutation.
- `at` is an ISO 8601 timestamp.
- Three users are seeded so the switcher has something to switch between.

### Subscription rule

```
subscribers(task) = task.followers
```

`followers` is the single subscriber set. Implicit interest is materialized into
it at the moment it arises, rather than being unioned in at read time:

- On task creation, the creator is added to `followers`.
- On an assignment change, **both the outgoing and the incoming assignee are
  added to `followers`.**

Keeping one set rather than unioning the creator in at read time is what makes
`unfollow` mean the same thing for everyone. Under a `followers ∪ {creator}`
rule, a creator who unfollows their own task would be silently re-added by the
union and keep receiving notifications.

This exists to close a specific trap. If subscribers were computed from the
*current* `assigneeId`, reassigning a task would retroactively erase it from the
former assignee's inbox — including the very notification telling them they had
been unassigned. The event would remain in the log but no longer match their
filter. Materializing implicit interest into the explicit follower set at the
moment it arises keeps history stable under one simple rule, and `unfollow`
remains available as an escape hatch.

### Inbox derivation

```
inbox(userId) = events
  .filter(e => subscribers(taskOf(e)).has(userId))
  .filter(e => e.actor !== userId)
  .filter(e => !reads[userId].includes(e.id))
  .sortDescending(e => e.at)
```

`unreadCount(userId)` is the length of that list. The badge displays `9+` above
nine.

### Log bounds

The log is capped at 500 events; appending beyond the cap prunes oldest-first.
Entries in `reads` that reference pruned events are dropped in the same pass so
read state cannot grow without bound either.

## UI and Data Flow

The header gains an "acting as" `<select>` over the seeded users and a bell with
an unread badge. `<main>` becomes the task list; each row shows the title, a
status control, an assignee select, and a follow/unfollow toggle whose state
reflects existing implicit subscription.

The bell opens a panel of unread items, newest first, each rendered as e.g.
"Bob moved 'Deploy docs' to Done — 2m ago". Clicking an item highlights its task
and marks that item read. A "mark all read" action clears the remainder. The
empty state is explicit text rather than a blank panel.

Data flow is one-directional: mutate through the store, append the event,
persist, re-render fully from state. No incremental DOM patching — at this size
it introduces bugs and buys nothing.

## Failure Handling

The meaningful failures are all storage, and the rule throughout is to degrade
rather than crash.

- **localStorage unavailable or over quota** (private browsing, full origin):
  fall back to in-memory state and show a single-line banner saying changes will
  not persist. The app remains fully usable.
- **Corrupt or stale persisted JSON:** every payload carries `schemaVersion`. A
  parse failure or version mismatch reseeds from defaults rather than throwing.
  A bad write must never leave the app unable to boot with no route back.
- **Dangling references** (an event or follower naming an id that no longer
  exists): filtered out at read time and not treated as an error. Derivation is
  total over whatever the log happens to contain.

## Testing

Unit tests, `node:test`, against the pure modules:

- A self-authored change never appears in its actor's own inbox.
- A user who follows a task afterward sees that task's prior history.
- An unassigned user retains the notification recording their unassignment.
- Read state survives a reload; a read item does not reappear.
- `unreadCount` equals the length of `inbox` for the same user.
- Log pruning drops oldest events first and removes orphaned `reads` entries.
- Corrupt persisted JSON reseeds instead of throwing.
- **Every store mutation appends exactly one event.** This is the invariant the
  rest of the design rests on and deserves a dedicated structural test.

## Build Order

1. Store, persistence, and the event log, with the one-event-per-mutation
   invariant under test.
2. Seeded users and the "acting as" switcher.
3. Task list UI: create, status change, assignment.
4. Subscriptions: the follower rule and the follow/unfollow toggle.
5. Derivation: `inbox`, `unreadCount`, read state.
6. Bell, badge, and inbox panel.
7. Log capping and pruning.

Steps 1–5 are testable headlessly; the browser is needed only from step 6.

## Assumptions

- Assumption: three seeded users are enough to exercise every notification
  path, validate by walking the assignment-and-reassignment flow once the
  switcher exists (build order step 4).
- Assumption: a 500-event cap is comfortably within localStorage limits for
  this payload shape, validate by measuring serialized size at the cap during
  step 7.
