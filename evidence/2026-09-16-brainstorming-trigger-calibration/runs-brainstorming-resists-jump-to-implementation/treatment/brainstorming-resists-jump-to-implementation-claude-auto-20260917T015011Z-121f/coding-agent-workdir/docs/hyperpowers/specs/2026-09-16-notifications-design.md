# Notifications — Design

Date: 2026-09-16
Status: approved for planning

## Problem

Users should be notified when tasks they care about change.

The repository currently contains one file, `index.html`: a static page with
an `<h1>Tasks</h1>` and an empty `<main>`. There is no task model, no
persistence, no identity, and no server. Notifications therefore cannot be
built as a standalone feature — it is the capstone that sits on top of three
subsystems that do not yet exist.

## Decomposition

Four subsystems, in dependency order:

1. **Task model + persistence** — tasks with fields that can change.
2. **Identity** — accounts and sessions, so a change has an actor and
   recipients are distinguishable.
3. **Interest** — the relation that makes a task one a user "cares about".
4. **Notification generation + delivery** — observe, resolve recipients,
   coalesce, fan out, render, mark read.

**Sequencing: vertical slice.** Rather than completing each layer in turn,
build a minimum end-to-end path through all four, then widen. A notification
system's hard problems live in the seams — what counts as a change, who counts
as caring, what happens when the same task changes five times in a minute —
and those are found by running one event end to end, not by perfecting a task
CRUD layer first. The slice also makes the notification path's constraints
visible while the lower layers are still cheap to change.

This document specifies **the slice**. Later widening (additional channels,
explicit watches, more event types) is listed under Deferred.

## Global Constraints

- **Stack:** Node + TypeScript. Thin HTTP server (Fastify), SQLite
  (better-sqlite3), vanilla TypeScript frontend, no frontend framework.
  One language across client and server so event and payload types are shared
  rather than duplicated.
- **Tooling from the start:** aggressive lint + auto-format (ESLint +
  Prettier, or Biome), and unit-test infrastructure (runner, layout, a first
  passing fixture). End-to-end tests and property/fuzz tests are deferred, not
  rejected — see Deferred.
- **Development method:** test-driven. Tests are written before the
  implementation they cover.
- **No notification may be lost once a task change is committed.** This is the
  constraint that drives the outbox architecture below.
- Design documents in this repository are working files and are not committed
  unless explicitly requested.

## Architecture

### Event transport: transactional outbox + worker

A task mutation writes the task change **and** an `events` row in a single
SQLite transaction, then returns. A background worker polls the outbox,
resolves interest, coalesces, and writes deliveries.

Alternatives considered:

- **Synchronous in-request dispatch** — resolve interest and write
  notifications inline in the request handler. Simplest, but it puts
  notification work in the user's critical path, loses the notification if it
  throws after the task commits, and leaves coalescing with nowhere to live:
  there is no later moment at which to collapse events.
- **In-process event emitter** — handlers emit to an in-memory bus with
  asynchronous listeners. Lighter than a worker, but an in-memory bus loses
  events on crash and offers no retry, which is exactly the failure the
  outbox exists to prevent.

The outbox is chosen because SQLite makes it nearly free — one extra table and
one polling loop — and it converts notifications from best-effort to
guaranteed-once-saved. Its cost is a background loop to operate and
eventual consistency on the order of a second or two, both acceptable.

### Module layout

```
web/                 vanilla TS, no framework, served static
server/
  http/              Fastify routes; thin — parse, authorize, call domain
  tasks/             task model + mutations (writes events in-transaction)
  auth/              sessions, current user
  events/            outbox: append(), claim(), markProcessed()
  notifications/
    interest.ts      interestedUsers(event) -> userId[]
    coalesce.ts      window logic: collapse same (recipient, task, type)
    dispatch.ts      creates deliveries, invokes channel adapters
    channels/
      in-app.ts      the only adapter in the slice
  worker/            polls outbox, drives coalesce -> dispatch
db/                  SQLite schema + migrations
```

Boundaries:

- `interest.ts` takes an event and returns user IDs. Depends on task and user
  read models only. It is the single seam through which every "who cares"
  question passes; no call site resolves interest independently.
- `coalesce.ts` takes pending notification state and merges. Pure; depends on
  nothing.
- `dispatch.ts` writes deliveries and invokes adapters through the channel
  interface, never a concrete channel.
- The channel interface is one method, so adding email later touches
  `channels/` and nothing else.

## Data Model

```
users               (id, email, display_name, password_hash, created_at)
sessions            (id, user_id, expires_at)
tasks               (id, title, status, assignee_id, creator_id, due_date,
                     created_at, updated_at)

events              (id, type, task_id, actor_id, payload, occurred_at,
                     processed_at, attempts, last_error)
notifications       (id, recipient_id, task_id, type, coalesce_key,
                     window_closes_at, created_at, read_at)
notification_events (notification_id, event_id, recipient_id)
deliveries          (id, notification_id, channel, state, attempts,
                     sent_at, last_error)
```

Constraints and rationale:

- `UNIQUE(event_id, recipient_id)` on `notification_events`. This is what
  makes worker replay safe: a re-processed event cannot double-notify.
  `recipient_id` is duplicated onto this table specifically so the constraint
  can be expressed.
- `events` is append-only and never deleted. It is the audit trail, and
  `processed_at IS NULL` is the work queue. `attempts` and `last_error` are
  the diagnostics for a stuck event.
- Read state (`read_at`) lives on `notifications`, above the channel layer.
  Reading a notification in-app must be able to suppress a not-yet-sent email
  for the same notification, which is only possible if read state is not
  per-channel.
- `deliveries.state` is one of `pending | sent | failed`.
- Deleting a user or a task cascades to their notifications.

### Interest model

Hybrid, derived-first. In the slice, interest is derived from the task:
a user is interested if they are the task's **creator** or its **assignee**.
There is no subscription table yet.

An explicit watch/mute override is the planned next step, and
`interestedUsers(event)` is written as the single seam it plugs into. Deriving
first means the feature works from the moment tasks exist, with no cold-start
problem; the seam means adding overrides later is additive rather than a
redesign.

**The actor who caused a change is never a recipient of it.** This is the most
common defect in notification systems and is enforced inside
`interestedUsers`, not at call sites.

### Event vocabulary

Curated semantic events, with the type as a first-class column. The slice
defines exactly two:

- `task.assigned`
- `task.status_changed`

Two is the minimum that exercises both coalescing behaviors: same type merges,
different types do not.

A generic `task.updated` carrying a field diff was rejected. Notification
quality is largely a copywriting problem, and useful copy ("Dana assigned you
*Fix login*") cannot be written against a diff. The cost of curation is that a
field with no event defined notifies nobody — the safe failure. Under-notifying
is recoverable; training users to ignore the bell is not.

### Coalescing

Key: `(recipient_id, task_id, type)`. Window: **60 seconds, fixed.**

Repeat changes of the same kind merge into one notification; a reassignment
and a status change remain separate, so an important change is never buried
inside a batch of trivial ones and every notification keeps its specific copy.

The window is fixed rather than sliding: the first event starts a 60-second
clock, all matching events within it merge, and it fires regardless of
continued activity. A sliding window would mean a task edited every 30 seconds
all afternoon never notifies anyone.

If type-level merging proves too noisy in practice, the additive next step is
a `(recipient, task)` key with a priority escape for high-signal events.

## Data Flow

1. `PATCH /tasks/:id` — authorize, load, apply the change. In **one
   transaction**: update `tasks` and insert one `events` row per semantic
   change. Commit and return 200. The request waits on no notification work.
2. **Worker tick (~1s):** claim a batch of `events WHERE processed_at IS NULL`.
3. For each event: `interestedUsers(event)` yields recipients, minus the
   actor. For each recipient, find an open notification matching
   `(recipient, task, type)` with `window_closes_at > now`; attach the event if
   found, otherwise create a notification with
   `window_closes_at = now + 60s`. Mark the event processed.
4. **Worker tick (~1s):** for notifications whose window has closed and that
   have no deliveries, create one delivery per enabled channel and invoke the
   adapter.
5. Client polls `GET /notifications?unread=1` every 30 seconds. The bell
   renders the unread count and a dropdown list.
   `POST /notifications/:id/read` marks one read.

Real-time transport (SSE or WebSocket) is deferred behind the same client-side
interface. Nothing in the slice requires sub-minute latency, and connection
management is a real cost.

## Security

- `GET /notifications` is **always** scoped to the session user. The API
  exposes no `user_id` parameter. Notification lists are a classic IDOR
  target; the defense is making the bug unrepresentable rather than relying on
  a correct authorization check.
- Passwords are stored as bcrypt hashes. Sessions are cookie-based,
  HTTP-only.
- Constraint recorded for when permissions arrive: `interestedUsers` must
  intersect its result with *can-view*. In the slice every user can see every
  task, so nothing leaks; once visibility rules exist, a notification's title
  text becomes a disclosure channel for tasks the recipient may not read.

## Failure Handling

| Failure | Behavior |
|---|---|
| Worker crashes mid-event | Event stays `processed_at IS NULL` and is reclaimed on the next tick. Safe because step 3 is idempotent via `UNIQUE(event_id, recipient_id)`. |
| One event throws repeatedly | `attempts++` with backoff; after 5 attempts mark it failed and continue. A poison event must never stall the queue behind it. |
| Adapter fails | `deliveries.state = 'failed'`, retried with backoff. Other channels for the same notification are unaffected. |
| Notification read before delivery fires | Pending non-in-app deliveries are skipped. A user should not receive an email about something already seen. |
| Task or user deleted | Cascade-delete their notifications. A notification pointing at a deleted task has nothing useful to say. |
| Worker not running | Task mutations still succeed; events accumulate and drain on restart. Degraded, not broken — the main payoff of the outbox. |

## Slice Scope

| Area | Ships in the slice |
|---|---|
| Auth | Email + password (bcrypt), cookie session. Real rather than a stub — throwaway auth is rarely replaced. |
| Tasks | Create, list, update (title, status, assignee, due date). No delete. |
| Events | `task.assigned`, `task.status_changed`. |
| Interest | Creator + assignee, actor excluded, behind `interestedUsers`. |
| Coalescing | Fixed 60s window, key `(recipient, task, type)`. |
| Delivery | In-app adapter only, written against the channel interface. |
| UI | Task list, task edit, bell with unread count, dropdown, mark-read. 30s poll. |

## Deferred

Decisions, not oversights:

- Explicit watch / mute (the `interestedUsers` seam exists for it)
- Email channel (the channel interface exists for it)
- `task.commented`, `task.due_date_changed`, and further event types
- Per-type notification preferences
- SSE / WebSocket real-time transport
- Task permissions and visibility rules
- End-to-end tests (Playwright). The bell-updates-in-the-browser behavior
  cannot be fully proven without them.
- Property/fuzz tests. Coalescing and interest resolution are the logic most
  suited to them.

## Testing

Unit tests, written before their implementation.

- `interest.ts` — table-driven: actor excluded; creator and assignee both
  notified; creator-is-assignee yields one recipient, not two; an unassigned
  task notifies only the creator.
- `coalesce.ts` — same key merges inside the window; a different type does not
  merge; a closed window starts a new notification; an open window is **not**
  extended by new events.
- Worker — processing the same event twice produces exactly one notification
  (proves the `UNIQUE(event_id, recipient_id)` index); a poison event does not
  block those behind it.
- Dispatch — a failing adapter marks its own delivery failed without affecting
  other channels.
- HTTP — `GET /notifications` returns only the session user's rows. This
  security test exists from the first commit.

The two `coalesce.ts` window cases and the worker idempotency case are the
ones expected to catch real defects; the rest are regression insurance.

## Open Assumptions

- Assumption: a 60-second coalescing window matches how quickly users expect
  to hear about a change; validate by observing notification volume and
  complaints once the slice is in use.
- Assumption: creator + assignee covers most of what "cares about" means in
  practice; validate by whether users ask for explicit watch before they ask
  for mute.
