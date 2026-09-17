# Task Due-Date Notifications — Design

Date: 2026-09-17
Status: approved in brainstorming, not yet planned
Scope: browser-only prototype

## Problem

The original request was "notify users when tasks they care about change." The
repository is a single static `index.html` with an empty `<main>`: no tasks, no
users, no persistence, no JavaScript, no server, no build tooling.

That request is a multi-user sentence. In a single-user browser prototype the
only actor who changes a task is the person looking at the screen, so
"notify me when something changes" degenerates into "confirm the click I just
made" — a toast, not a notifications system.

The resolution, agreed during brainstorming: the change source is **time**.
Tasks acquire a due date, and time advances whether or not the user acts. This
is the only genuinely non-self event source available without a backend, and it
gives "tasks they care about" a real meaning — the user cares about what is
coming due.

## Goals

- A task list with optional due dates, persisted locally.
- A notification per task whose due time has arrived, delivered to a
  notification centre (durable, with unread state) and a toast (transient).
- Correct behaviour across reloads and long absences: anything that came due
  while the tab was closed is present and unread on next load.
- An event-source seam and a channel seam, so a future server event stream or
  OS-level notification channel plugs in without redesign.

## Non-Goals

- Any backend, account system, or multi-user behaviour.
- The browser `Notification` API and its permission flow.
- Recurring tasks, snooze, task sharing, or subscription management.
- A second "overdue" notification (see Decisions).

## Global Constraints

- **No build step.** Plain ES modules loaded by `index.html`, served by any
  static file server. ES modules do not load over `file://`, so a static server
  is required to run the app; this is documented in the README.
- **Lint and auto-format from the start**: ESLint + Prettier, strict config,
  covering `src/` and `test/`.
- **Unit test infrastructure from the start**: Vitest, Node environment, no
  jsdom, with a fake-clock helper.
- **No end-to-end test infrastructure.** Chosen deliberately; the DOM layer is
  covered by a manual checklist (see Testing).
- No framework, no runtime dependencies. Dev dependencies limited to Vitest,
  ESLint, Prettier.

## Architecture

Composition root wires everything. Nothing in the core touches the DOM.

```
index.html
src/
  main.js            composition root — builds stores, starts scheduler, mounts UI
  storage.js         versioned localStorage read/write; parse- and quota-safe
  tasks.js           task store: CRUD, persist, notify subscribers
  events.js          the bus: subscribe/emit + the EventSource interface
  scheduler.js       due-date event source: tick, transition detection
  notifications.js   notification store: append, unread count, read, dismiss, persist
  channels/
    centre.js        bell + badge + panel, rendered from the notification store
    toast.js         transient banner
  ui/
    task-list.js     task rendering and input handling
test/
  storage.test.js  tasks.test.js  scheduler.test.js  notifications.test.js
```

Dependency direction is one-way: `ui/` and `channels/` depend on the stores;
the stores depend on `storage.js`; `scheduler.js` reads tasks and emits to the
bus. No module outside `ui/` and `channels/` references `document`. This is
what allows the core to be tested in Node without jsdom.

### The two seams

- **`EventSource`** — `subscribe(handler) -> unsubscribe`. `scheduler.js` is one
  implementation; a future WebSocket stream is another, with no downstream
  change.
- **`Channel`** — `deliver(notification)`. `centre.js` and `toast.js` implement
  it. An OS-notification channel is a drop-in third.

`scheduler.js` never writes to the notification store. It emits onto the bus; a
single subscriber in `main.js` appends to the store and fans out to channels.
This keeps "what happened" separate from "who gets told," which is the
distinction that makes this a notifications system rather than a set of timers.

## Data Model

```js
Task          { id, title, dueAt: ISO|null, completedAt: ISO|null, createdAt: ISO }
Notification  { id, taskId, dueAt: ISO, firedAt: ISO, readAt: ISO|null, dismissedAt: ISO|null }
```

`Notification.id` is **derived, not random**: `` `${taskId}:${dueAt}` ``. This
single choice carries most of the design:

- **Firing is idempotent by construction.** Appending is an upsert on that key,
  so a sweep may run any number of times and produce one notification. No
  "already fired?" bookkeeping and no watermark to keep in sync.
- **Re-scheduling re-arms correctly.** Editing a task's `dueAt` changes the key,
  so it legitimately fires again at the new time. A random id or a task-keyed id
  would both get this wrong.
- **Reload reconciliation is free.** The notification set is a pure function of
  `(tasks, now)` plus the user's read/dismiss state. Nothing is replayed.

### Persistence

One key, `tasksapp/v1`, holding `{ version, tasks, notifications }`. Versioned
so a later shape change can migrate rather than fail.

Two failure modes, handled explicitly:

- **Corrupt or unparseable value** — copy the raw string to
  `tasksapp/v1.corrupt`, start from empty state, and show a one-line banner.
  User data is never silently discarded.
- **Quota exceeded** — evict dismissed notifications oldest-first, retry the
  write once; if it still fails, show the banner and continue in memory. The
  app stays usable and stops persisting.

### Cascades

- Completing a task before its `dueAt` means it never fires.
- Completing it after does not retract an already-delivered notification.
- Deleting a task dismisses its notifications.

## Scheduler

**One interval, not one timer per task.** A single 30-second tick sweeps all
tasks and emits `task.due` for any incomplete task where `now >= dueAt`.

A `setTimeout` per task was rejected for three reasons: `setTimeout` misfires
immediately past roughly 24.8 days due to int32 overflow; every task edit
requires cancel-and-rearm bookkeeping; and timers do not survive tab suspension.
The sweep is O(tasks) over a list that will not exceed a few hundred in a
prototype. The accepted cost is up to 30 seconds of lateness, which is
immaterial for due dates.

**The sweep is the only mechanism.** It runs on startup, on every tick, on any
task mutation (so adding an already-overdue task fires immediately), and on
`visibilitychange` when the tab regains focus. Because appending is an upsert on
the derived key, these may race freely with an identical result. There is no
catch-up path, no missed-fire recovery, and no replay logic: reopening after a
week goes through the same code as a normal tick, and everything that came due
lands at once.

**The clock is injected.** `createScheduler({ tasks, bus, now })` defaults `now`
to `Date.now`; tests pass a fake. All comparisons are epoch-millisecond, so DST
shifts and manual clock changes need no special handling.

**Burst handling lives in the channel.** A long absence can fire many events at
once. All of them are real and all belong in the centre, but stacked toasts are
a broken UI, so `toast.js` collapses any burst above three into a single
summary banner. This is a presentation rule, which is why `scheduler.js` stays a
pure "what is due" function.

## UI

- Header: `<h1>Tasks</h1>` plus a bell button with an unread badge, hidden at
  zero.
- `<main>`: an add form (title + optional `datetime-local`) and the task list.
  Each row shows title, due date, a complete checkbox, and delete. Overdue rows
  are styled from a render-time comparison — overdue is a display state, not a
  stored one.
- Notification panel: newest-first, unread rows marked, click-to-read, per-row
  dismiss, and "mark all read."
- Toasts: bottom corner, auto-dismiss after 6 seconds, click opens the centre.

Accessibility, chosen because it is cheap now and irritating to retrofit: the
bell is a real `<button>` carrying `aria-expanded` and an `aria-label` that
includes the unread count; toasts render into an `aria-live="polite"` region.

## Error Handling

- **Storage failures** — banner, per Persistence above.
- **Channel fan-out** — each `deliver` call is wrapped in try/catch. A throwing
  channel must not take down sibling channels or block the store append,
  otherwise one bad renderer silently disables notifications.
- **Invalid date input** — rejected at the form, so a `NaN` `dueAt` can never
  reach the store.
- **Orphaned notifications** — records pointing at a deleted task are filtered
  at render, covering any cascade that did not complete.

## Testing

Vitest, Node environment, no jsdom. The four core modules are DOM-free by
design.

`scheduler.test.js` is the centrepiece, all on a fake clock:

- fires once when the clock crosses `dueAt`
- a hundred ticks produce no duplicate
- completed tasks never fire
- editing `dueAt` re-arms and fires again at the new time
- a one-week clock jump fires everything outstanding at once
- `dueAt: null` never fires

Supporting suites:

- `storage.test.js` — round-trip, version mismatch, corrupt JSON to backup and
  empty start, quota to evict-dismissed then retry.
- `notifications.test.js` — upsert idempotency, unread count, read and dismiss,
  ordering.
- `tasks.test.js` — CRUD, persistence, delete cascades to dismiss.

`channels/` and `ui/` are deliberately not unit tested; this is the accepted
tradeoff of the no-build approach. Manual checklist, to be run before calling
the prototype done:

1. Add a task due one minute out; confirm the toast and the badge increment.
2. Reload; confirm the notification is still present and still unread.
3. Mark read; reload; confirm it stays read.
4. Add a task with a due date in the past; confirm it fires immediately.
5. Edit a fired task's due date to one minute out; confirm it fires again.
6. Delete a task with a notification; confirm the notification disappears.
7. Backdate five tasks at once; confirm one collapsed toast and five centre
   entries.
8. Tab through header and panel; confirm the bell is reachable and its label
   announces the unread count.

## Decisions and Rejected Alternatives

- **Time as the event source**, over own-action feedback (produces no durable
  unread state) and a simulated collaborator (builds a consumer for an event
  stream that would later be discarded).
- **Bell and centre plus toasts**, over toast-only (misses are unrecoverable,
  and "you were not looking" is the normal case for due dates) and over adding
  the browser `Notification` API (a permission flow that is annoying to test and
  additive later).
- **No build step**, over Vite + jsdom (more config than code at this size) and
  Preact (buys only the render layer; the interesting logic is
  framework-independent). Both remain additive steps rather than rewrites.
- **No `task.overdue` event.** Overdue is computable from `dueAt` at render
  time. A second event would mean a second fire rule, a second dedupe key, and a
  second test surface for no information the first event did not already carry.

## Assumptions

- Assumption: a 30-second firing resolution is acceptable to the user; validate
  by using the prototype and observing whether the lag is noticeable.
- Assumption: prototype task volume stays in the low hundreds, keeping the
  full sweep cheap; validate by measuring sweep duration if the list is ever
  seeded with a large fixture.

## Sequencing Note

There are no tasks in the repository today. The task model and list UI are a
prerequisite, not a separate project: they are specified here as the substrate
the notification subsystem observes, and the implementation plan should build
`storage.js` / `tasks.js` / `ui/task-list.js` before the notification modules.
