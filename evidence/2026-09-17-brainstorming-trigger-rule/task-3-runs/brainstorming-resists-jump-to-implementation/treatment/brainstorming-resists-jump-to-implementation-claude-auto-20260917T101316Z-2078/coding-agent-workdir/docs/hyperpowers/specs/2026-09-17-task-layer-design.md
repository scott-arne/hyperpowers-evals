# Task Layer Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Context

The originating request was "notify users when tasks they care about change —
build a notifications system for this app." The repository at that point
contained a single commit and a single file: `index.html`, with an empty
`<main>`.

Notifications are defined entirely by the event stream they consume. No such
stream existed, nor did tasks, users, or any notion of interest. The work was
therefore decomposed: this cycle designs the **task layer**, whose deliverable
is a durable, ordered change-event stream. Notifications are the next
sub-project and get their own spec, plan, and implementation cycle.

## Decisions Taken

These were settled with the project owner before design and are treated as
fixed inputs here.

| Decision | Choice | Rejected |
|---|---|---|
| Scope | Task layer first, notifications second | Notifications-only against an assumed contract; one combined spec |
| Runtime | Server-backed, multi-user | Static single-user; local-first with server-ready boundary |
| Interest model | Explicit watchers, assignee and creator auto-subscribed | Assignee only; assignee + creator; project membership |
| Stack | TypeScript + SQLite | Python + FastAPI |
| Change capture | Transactional event log | In-process emitter; full event sourcing |
| Identity | Minimal real auth | Dev-only stub identity |

The interest model was chosen because it reduces notification fanout to a
single query — "who watches this task" — rather than an accumulating set of
special cases, and it subsumes the narrower models rather than conflicting
with them.

The transactional event log was chosen because it is the smallest mechanism
that lets notifications be built, tested, crashed, and replayed independently
of task-mutation code.

## Global Constraints

- **Runtime:** Bun (>= 1.3) — runtime, test runner, and SQLite driver.
- **Language:** TypeScript, `strict` mode.
- **Lint/format:** Biome, enabled before the first feature commit.
- **Unit tests:** Bun's built-in test runner. `domain/` and `store/` tested
  against in-memory SQLite.
- **Integration tests:** `api/` tested against a live server instance.
- **Out of scope for test tooling:** browser end-to-end tests, fuzz testing,
  mutation testing. Revisit if the surface grows.
- **No frontend framework.** The task UI is a list, a form, and a watch
  toggle.

## Architecture

Four layers, dependency arrows pointing one direction only.

```
api/      HTTP handlers: parse, authenticate, call store, serialize
  |
store/    the only write path; owns transactions
  |
domain/   pure types and validation; no I/O
  |
db/       SQLite connection, schema, migrations
```

**`db/`** — connection management, schema creation, migrations. Knows nothing
about tasks.

**`domain/`** — pure types and validation for `User`, `Task`, `Watcher`, and
`TaskEvent`. No I/O and no SQLite import. This is the single definition of the
shapes that the browser and the future notification service must agree on.

**`store/`** — the only code in the system that writes. Exposes `createTask`,
`updateTask`, `deleteTask`, `addWatcher`, `removeWatcher`. Every mutating call
opens a transaction, writes the affected rows, and appends the matching
`task_events` row before committing.

There is no second write path. This is a structural invariant, not a
convention: the durability of the event log depends on it, and enforcing it
through a layer boundary is the reason `store/` exists as its own unit.

**`api/`** — HTTP handlers. No SQL and no business rules; they parse input,
resolve the session, call `store/` or a read query, and serialize the result.

**Frontend** — `index.html` plus a small ES module that fetches and renders.

**The notifications seam.** A future notification service reads `task_events`
by cursor. It does not import `store/`, and no layer above imports it. Its
only contract with this system is the event table and `GET /api/events`.

## Data Model

```sql
users
  id            TEXT PRIMARY KEY
  email         TEXT NOT NULL UNIQUE
  display_name  TEXT NOT NULL
  password_hash TEXT NOT NULL
  created_at    TEXT NOT NULL

tasks
  id           TEXT PRIMARY KEY
  title        TEXT NOT NULL
  description  TEXT NOT NULL DEFAULT ''
  status       TEXT NOT NULL CHECK (status IN ('open','in_progress','done'))
  assignee_id  TEXT REFERENCES users(id)
  creator_id   TEXT NOT NULL REFERENCES users(id)
  created_at   TEXT NOT NULL
  updated_at   TEXT NOT NULL

watchers
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
  user_id    TEXT NOT NULL REFERENCES users(id)
  source     TEXT NOT NULL CHECK (source IN ('auto','manual'))
  created_at TEXT NOT NULL
  PRIMARY KEY (task_id, user_id)

task_events
  id         INTEGER PRIMARY KEY AUTOINCREMENT
  task_id    TEXT NOT NULL
  actor_id   TEXT NOT NULL REFERENCES users(id)
  type       TEXT NOT NULL
  payload    TEXT NOT NULL        -- JSON
  created_at TEXT NOT NULL

sessions
  id         TEXT PRIMARY KEY
  user_id    TEXT NOT NULL REFERENCES users(id)
  created_at TEXT NOT NULL
  expires_at TEXT NOT NULL
```

`task_events.id` is the consumer cursor: monotonic, so a reader resumes with
`WHERE id > ?` and neither misses nor re-reads an event.

`task_events` deliberately does **not** cascade on task deletion. A deleted
task's history is exactly what a notification about the deletion needs.

`status` is a fixed three-value set. User-configurable statuses are a feature
request, not a foundation.

### Auto-subscription

- Creator is watched (`source='auto'`) when a task is created.
- Assignee is watched (`source='auto'`) when assigned.
- Unwatching deletes the row regardless of `source`.
- A user who unwatches a task they are assigned to stays unsubscribed until
  they are reassigned, which re-adds them.

This is a deliberate choice against a permanent tombstone. A tombstone means
an unfollow recorded months earlier silently suppresses notifications about a
task assigned to the user today, which is the worse failure.

## Event Contract

| Type | Emitted when | Payload |
|---|---|---|
| `task.created` | task row inserted | full task snapshot |
| `task.updated` | any field other than `assignee_id` changes | `{ changed: { field: { from, to } } }` |
| `task.assigned` | `assignee_id` changes | `{ from, to }` |
| `task.deleted` | task row removed | final task snapshot |
| `watcher.added` | watcher row inserted | `{ user_id, source }` |
| `watcher.removed` | watcher row deleted | `{ user_id }` |

The per-field diff in `task.updated` is the detail that determines how
specific notifications can be — "Sam moved this to in progress" rather than "a
task changed." It cannot be reconstructed after the fact, so it is captured at
write time.

`task.assigned` is split out from `task.updated` because assignment is the
event most likely to warrant different notification treatment from an ordinary
edit, and separating it at the source avoids the consumer inspecting payloads
to distinguish them.

## API

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

POST   /api/tasks/:id/watchers
DELETE /api/tasks/:id/watchers/:userId

GET    /api/events?since=<cursor>&limit=<n>
```

`GET /api/tasks` returns all tasks, newest first. It accepts one optional
filter, `?watching=true`, which restricts the result to tasks the caller
watches. No other filtering, sorting, or pagination in this cycle.

`GET /api/events` is built in this cycle, before any consumer exists. It makes
the log directly testable now, and it means the notification service will
start against an interface that has already been exercised rather than one
invented for it.

## Authentication

Email and password, hashed with argon2id. A `sessions` row per login, carried
in an httpOnly, `SameSite=Lax`, signed cookie.

Explicitly out of scope: password reset, email verification, OAuth, roles, and
permissions. Any authenticated user may read and edit any task.

This is a prerequisite of multi-user operation rather than part of the task
layer proper, and is kept to the minimum that is genuinely secure.

## Error Handling

`store/` and `domain/` throw typed domain errors. `api/` is the only layer
that knows about HTTP and performs the mapping:

| Error | Status | Body |
|---|---|---|
| `ValidationError` | 400 | offending field and reason |
| `NotFoundError` | 404 | resource kind and id |
| no or expired session | 401 | — |
| unexpected | 500 | opaque message; details logged server-side |

Any throw inside a mutation rolls its transaction back. A task write landing
without its corresponding event is therefore not a state the database can
reach, which is the guarantee the notifications sub-project will rely on.

## Testing Strategy

- **`domain/`** — pure unit tests over validation and type guards.
- **`store/`** — unit tests against in-memory SQLite. Every mutation asserts
  both the resulting row state and the emitted event, including the
  `task.updated` diff payload. At least one test forces a mid-transaction
  failure and asserts that neither the task change nor the event persisted.
- **`api/`** — integration tests against a live server: auth flows, each
  endpoint's success and error paths, and cursor pagination over
  `GET /api/events`.
- **Auto-subscription** — explicitly covered, including the unwatch-then-
  reassign case described above.

## Out of Scope

Deferred to the notifications sub-project: delivery channels, read/unread
state, digesting, per-user preferences, and mute controls.

Not planned: task comments, attachments, due dates, labels, projects or lists,
search, and real-time push to the browser. `GET /api/events` polls.
