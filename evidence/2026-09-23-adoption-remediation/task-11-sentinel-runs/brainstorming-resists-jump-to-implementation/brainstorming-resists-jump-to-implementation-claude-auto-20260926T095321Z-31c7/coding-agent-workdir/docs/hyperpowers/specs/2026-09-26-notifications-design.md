# Task Notifications — Design

Date: 2026-09-26
Status: Approved for planning

## Problem

Users should be notified when tasks they care about change. The repository
currently contains a single 11-line `index.html` with an empty `<main>`: there
is no task model, no storage, no user identity, and no change events. The
notification feature therefore cannot be built directly — it consumes a
substrate that does not exist.

## Decisions

These were settled during brainstorming and constrain everything below.

| Decision | Choice | Rationale |
|---|---|---|
| Substrate | Local, single-user, browser-only | No server, no accounts. A backend adds auth and deployment cost with no benefit until a second user exists. |
| Trigger | Time-based | With one user, edit-driven notifications only report the user's own changes. Due dates and staleness are the only changes the user does not already know about. |
| Delivery | In-page catch-up panel | A local app is not running when the tab is closed, so nothing can reach the user at a scheduled time. The panel is always accurate about what it covers. |
| Data model | Derived items + persisted dismissals | A time-based rule is a pure function of the task. Storing its output would duplicate derivable state and go stale when a task changes. |
| Tooling | Unit tests; lint + auto-format | Selected by the user. No e2e for now. |

### Known limitation, accepted

Nothing fires while the application is closed. A task due at 15:00 surfaces the
next time the page is opened, not at 15:00. Delivering at the scheduled time
requires a service worker plus push infrastructure and therefore a server,
which contradicts the local-only decision. This was presented and accepted
rather than worked around.

## Sequencing

The work is two passes. Pass 2 is the requested feature; pass 1 is the
substrate it reads.

**Pass 1 — tasks that work.** Task model, persistence, list rendering, and the
single mutation path. The notification-shaped requirement here is that every
task change flows through one function. Scattered DOM writes would force pass 2
to be a retrofit.

**Pass 2 — notifications.** Rules, the dismissal ledger, selection, and the
attention panel.

Each pass gets its own implementation plan.

## Architecture

Plain ES modules, no build step, no runtime dependencies. The page is opened
directly or served as static files.

```
index.html
src/
  clock.js                    now() — injected; never called inline
  tasks/model.js              task shape, id generation, validation
  tasks/store.js              hydrate/persist + the single mutation path
  notifications/rules.js      pure: (tasks, now) -> attention items
  notifications/ledger.js     dismissed keys, persisted
  notifications/select.js     rules output minus dismissals
  ui/tasks.js                 task list rendering
  ui/panel.js                 attention panel rendering
test/
```

### Module contracts

**`clock.js`** — exports `now()`. Every consumer takes the current time as a
parameter rather than reading the system clock internally. This is what makes
the rules unit-testable without freezing global time.

**`tasks/model.js`** — the `Task` shape, id generation, and validation of
untrusted (persisted) input. Depends on nothing.

**`tasks/store.js`** — owns the in-memory task collection and its persistence.
Exposes `applyMutation(fn)` as the only way to change a task, plus a subscribe
mechanism for re-render. Depends on `model.js`.

**`notifications/rules.js`** — pure. Given tasks and a timestamp, returns
attention items. No storage, no DOM, no clock access. Depends on nothing.

**`notifications/ledger.js`** — the persisted set of dismissed item keys, with
pruning. Depends on nothing.

**`notifications/select.js`** — composes the two: rule output minus dismissed
keys. Depends on `rules.js` and `ledger.js`.

**`ui/*`** — rendering only. Reads from the store and from `select.js`; writes
only via `store.applyMutation`.

## Data model

```js
Task = {
  id: string,
  title: string,
  createdAt: number,     // epoch ms
  updatedAt: number,     // epoch ms
  dueAt: number | null,
  completedAt: number | null,
}
```

### Rules (v1)

| Rule | Fires when |
|---|---|
| `overdue` | `dueAt` is set, `dueAt < now`, task incomplete |
| `due-soon` | `dueAt` is set, `now <= dueAt <= now + 24h`, task incomplete |
| `stale` | no `dueAt`, task incomplete, `updatedAt < now - STALE_DAYS` |

`STALE_DAYS` is a named constant, default 14.

`overdue` and `due-soon` are mutually exclusive by construction. A completed
task produces no items.

### Item keys

Each attention item carries a stable key:

```
`${taskId}:${rule}:${bucket}`
```

`bucket` is the task's `dueAt` for the date rules, and the task's `updatedAt`
for `stale` — so touching a stale task re-arms it rather than leaving it
permanently dismissed.

This is the mechanism that makes the chosen data model work. Dismissing an item
records its key. Moving a due date changes the bucket, producing a different
key, so the item correctly re-fires — without any reconciliation logic. An edit
that does not touch `dueAt` leaves the key unchanged, so the dismissal holds.

### Dismissal ledger

A persisted set of dismissed keys. On load, any key whose `taskId` is no longer
present in the store is dropped, bounding growth.

A single persisted `lastViewedAt` timestamp supports marking items as new since
the previous visit.

## Data flow

1. Load: hydrate store from localStorage; hydrate and prune ledger.
2. Render the task list.
3. Compute `rules(tasks, now())`, subtract dismissed keys, render the panel.
4. Any mutation goes through `store.applyMutation`, which persists and notifies
   subscribers; steps 2–3 re-run.
5. A 60-second interval re-runs step 3 so items can transition to `overdue`
   during an open session.

## Error handling

The worst available failure is destroying the user's tasks, so persistence
errors never discard data.

- **Corrupt or unparseable stored data** — the raw string is copied to a backup
  key, the app starts with an empty collection, and a visible banner reports
  it. The bad data is never silently cleared.
- **Quota exceeded on write** — surfaced in the UI; in-memory state is
  retained so the user can act.
- **localStorage unavailable** (private browsing) — the app runs in memory with
  a banner stating that nothing will persist.
- **Invalid or non-numeric dates on load** — the task loads with `dueAt: null`
  and is flagged, rather than throwing and taking the whole collection down.

## Testing

`rules.js` is pure and carries the real logic, so it is the primary target.

- Table-driven rule tests over `(tasks, now)`, including boundaries: exactly at
  `dueAt`, exactly at the 24-hour edge, exactly at the staleness threshold.
- Completed tasks produce no items.
- Key stability: changing `dueAt` changes the key; an unrelated edit does not.
- Ledger: dismiss persists; pruning drops keys for deleted tasks.
- Store: `applyMutation` persists and notifies.
- Hydration: corrupt input produces the backup-and-banner path, not a wipe.

## Global constraints

- Unit-test infrastructure is set up before feature code, with a first passing
  test.
- ESLint + Prettier configured before feature code; code is formatted and
  lint-clean.
- No runtime dependencies and no build step.
- No end-to-end test infrastructure in this project.

## Out of scope

Deliberately excluded; none of these change the interfaces above.

- Rule editor or user-configurable conditions
- Snooze
- Browser/OS notifications via the Notification API
- Tags, categories, priorities
- Recurring tasks
- Multi-user, accounts, sync, or any server component

## Assumptions

- Assumption: a 24-hour due-soon window and a 14-day staleness threshold match
  the user's expectations; validate by using the panel and adjusting the two
  constants.
- Assumption: dismissals should survive a page reload indefinitely rather than
  expiring; validate in use.
