# Task Notifications — Design

Date: 2026-09-16
Status: approved (design); not yet planned

## Problem

The request was: notify users when tasks they care about change.

The repository is a single static `index.html` containing an `<h1>Tasks</h1>`
and an empty `<main>`. There is no task model, no user model, no persistence,
and no JavaScript. Every prerequisite of the requested feature is absent.

The request as literally worded does not survive the browser-only decision.
In a single-user browser-only app the user is the only agent that can change a
task, so "notify me when a task changed" reports the user's own edit back to
them. The trigger that carries information is the clock, not a person.

## Scope

In scope:

- A minimal task model with due dates, persisted to `localStorage`.
- Time-driven in-page notifications: due-soon and overdue.
- Per-threshold dismissal.

Out of scope, deliberately:

- OS-level notifications (browser Notification API, service worker,
  background sync). Deferred as a separate decision; the design keeps it a
  new consumer of `due-state.js` rather than a rewrite.
- Multi-user, accounts, sync, any server component.
- Change-driven notifications and notification history. See "Rejected
  alternatives".

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Substrate | Browser-only, single user, `localStorage` | No backend to build before the first task exists |
| Trigger | Time-driven (due dates) | The only trigger that tells the user something they do not already know |
| Spec scope | One spec covering tasks + notifications | Scope collapsed far enough that two cycles cost more than they protect |
| Notification core | Derived state (pure function of tasks and `now`) | No stored records, therefore no dedupe, staleness, or reconciliation |
| Delivery | In-page only | OS push needs permission flow, service worker, and background sync |
| Due-soon window | 24 hours | A single constant; trivially changeable |

## Architecture

Five ES modules, no framework, no build step. `index.html` loads one
`<script type="module">`.

| Module | Responsibility | Depends on |
|---|---|---|
| `storage.js` | Read/write whole app state to `localStorage` under one versioned key; owns JSON parsing and corruption handling | nothing |
| `tasks.js` | Task shape and pure CRUD transforms (`addTask`, `updateTask`, `toggleComplete`, `deleteTask`), each taking state and returning new state | nothing |
| `due-state.js` | The notification core: `dueState(task, now)` and `activeAlerts(state, now)`. Pure; no DOM, no storage, no clock access | `tasks.js` (shape only) |
| `ui.js` | All DOM: renders the task list and the alert region, wires event handlers | the above |
| `app.js` | Wiring only: loads state, starts the tick, routes events to transforms, persists, re-renders | all |

`due-state.js` is the boundary that matters. It never touches the DOM,
`localStorage`, or `Date.now()`; `now` is always a parameter. This is what
makes the notification logic testable without a browser and reviewable
independently of task CRUD.

## Data model

```js
// Task
{ id, title, dueAt, completedAt, createdAt, updatedAt }
// dueAt: ISO 8601 string | null
// completedAt: ISO 8601 string | null

// Dismissal ack
{ taskId, threshold, forDueAt }
// threshold: 'dueSoon' | 'overdue'

// Persisted root
{ version: 1, tasks: [...], acks: [...] }
```

An ack records the `dueAt` it was made against. An ack applies only when
`ack.forDueAt === task.dueAt`. Consequently a due date that moves makes prior
acks stop matching, and the alert correctly fires again at the new time; an
ack for a deleted task matches nothing. Neither case needs an invalidation
pass, a reconciliation job, or cleanup on delete.

### Threshold rules

- `overdue` when `now >= dueAt`.
- `dueSoon` when `0 < dueAt - now <= 24h`.
- Otherwise `ok`.

The `>=` in the first rule is deliberate: with a strict `>` the exact instant
`now === dueAt` would satisfy neither rule and report `ok`, which is wrong.
The two rules are therefore exhaustive and non-overlapping for any task with
a `dueAt`.
- A task with `dueAt: null` never alerts.
- A completed task never alerts, regardless of `dueAt`.
- The two thresholds are dismissed independently: dismissing `dueSoon` does
  not pre-dismiss `overdue`.

## Data flow

One loop serves both user edits and the passage of time:

```
event (user action OR 30s tick)
  -> pure transform in tasks.js        (user actions only)
  -> persist via storage.js            (user actions only)
  -> activeAlerts(state, Date.now())   in due-state.js
  -> ui.js re-renders list + alerts
```

`Date.now()` is called in exactly one place, `app.js`, at the top of the loop,
and passed downward. Nothing below `app.js` reads the clock.

The tick does not write to storage; it re-derives and re-renders only. Alerts
may therefore be up to 30 seconds stale, which is immaterial for due dates
measured in hours. Reopening the app after any interval renders correct state
immediately, because the first render passes the current `now`.

## Error handling

- **Corrupt or unparseable stored state** — `storage.js` catches, returns
  empty state, and preserves the bad value under a `…:corrupt-<timestamp>`
  key rather than overwriting it. Silent data loss is the worse failure.
- **`localStorage` unavailable or over quota** (private mode, full disk) — the
  app runs in memory and shows a persistent "changes won't be saved" banner.
  It neither crashes nor pretends to save.
- **Schema version mismatch** — state carries `version: 1`; an unknown version
  is treated as corrupt per the first rule.
- **Invalid `dueAt`** — a value that does not parse is normalized to `null` on
  read, so it degrades to "no due date" rather than producing `NaN`
  comparisons that would make `dueState` silently return `ok` forever.

## Testing

Unit tests via Node's built-in test runner; no test-framework dependency.

`due-state.js` carries the bulk of the tests, and needs no DOM and no fake
clock because `now` is a parameter:

- each threshold boundary: just before, exactly at, just after
- `dueAt: null`
- completed task with a past `dueAt`
- ack matching `forDueAt`
- ack orphaned by a changed `forDueAt`
- the two thresholds dismissed independently

`tasks.js` and `storage.js` also get unit tests, storage's corruption path
especially, since it is the path that protects user data.

`ui.js` is left untested at this scale: DOM assertions over a small render
cost more to maintain than they catch.

## Global constraints

- Linting and auto-formatting: Biome, configured before implementation.
- Unit test infrastructure: Node built-in test runner, with test layout and a
  first passing `dueState` test in place before feature work.
- No third-party runtime dependencies.
- No build step.

## Rejected alternatives

- **Materialized notification log** (stored notification records with
  read/unread and history). Supports history and multiple future trigger
  types, at roughly double the code plus duplicate suppression and
  reconciliation when tasks are deleted or due dates move backward. Rejected:
  history was not requested. Derived state grows into this without a rewrite
  if it is later wanted.
- **Scheduled timers** (one `setTimeout` per task, armed at its due moment).
  Exact firing and no idle work, but timers do not survive a reload, so it
  needs the derived reconciliation pass anyway plus timer bookkeeping on every
  edit and delete; `setTimeout` also caps near 24.8 days. Strictly more
  machinery for precision a due-date feature does not need.
- **Change-driven notifications.** The original framing. Empty in a
  single-user browser-only app, where the only writer is the reader.
- **Server-backed multi-user.** Would make change-driven notifications
  meaningful, at the cost of a backend, database, auth, and deployment before
  the first notification ships.

## Assumptions

- Assumption: a single user on a single device is the whole audience;
  validate by confirming no multi-device use is expected before any
  `localStorage` schema is depended upon externally.
- Assumption: a 30-second tick is frequent enough; validate in use, since the
  interval is one constant.
