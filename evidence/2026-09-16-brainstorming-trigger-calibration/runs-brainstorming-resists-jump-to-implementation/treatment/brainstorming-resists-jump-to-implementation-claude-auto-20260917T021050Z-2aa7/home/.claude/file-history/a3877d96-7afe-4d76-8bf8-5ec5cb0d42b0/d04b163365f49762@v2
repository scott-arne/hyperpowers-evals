# Task App with Due-Date Alerts — Design

Date: 2026-09-16
Status: Awaiting user review

## Context

The repository currently contains a single 11-line `index.html` with an empty
`<main>`. There is no task model, no persistence, no user concept, no server,
and no tooling.

The originating request was "notify users when tasks they care about change."
Clarification established that the app is **single-user, one browser**. In that
setting no other person ever mutates a task, so change-notification has no
source of change worth reporting to the user — they performed the change
themselves. The valuable notification signal is instead **time passing**: a task
becoming due or overdue.

This spec therefore covers a task application with localStorage persistence and
in-page due/overdue alerting, scoped as a single implementation cycle.

## Goals

- Create, edit, complete, and delete tasks that survive a page reload.
- Attach an optional due date to a task.
- Surface in-page alerts when a task is approaching its due date or is overdue.
- Keep the alerting logic pure and testable without a browser or a real clock.

## Non-Goals

- Multi-user, sharing, accounts, or authentication.
- Any server, database, or network transport.
- Cross-device sync.
- Browser `Notification` API popups or service-worker background delivery.
  The design keeps these addable later as an additional renderer, but they are
  out of scope.
- Activity log of the user's own edits.

## Global Constraints

- Plain HTML, CSS, and vanilla JavaScript as native ES modules. No framework,
  no bundler, no build step.
- Tooling established before implementation begins: **ESLint + Prettier**
  (lint and auto-format) and **Vitest** (unit tests, including one first
  passing test). No end-to-end framework. No fuzz or property testing.
- All persisted timestamps are ISO 8601 UTC strings.
- No test may depend on the machine's local timezone or on the real current
  time.

## Architecture

The organizing decision is that notification logic is a **pure function of
`(tasks, now)`**:

```
computeAlerts(tasks, now) -> Alert[]
```

It reads no DOM, calls no clock, and touches no storage. Every time-dependent
question is therefore answerable in a unit test with a fixed instant. `main.js`
is the only module that calls `Date.now()`.

### Modules

| Module | Responsibility | Depends on |
|---|---|---|
| `src/task.js` | Task shape and validation | nothing |
| `src/store.js` | Load/save to localStorage under a versioned key; storage injected | `task.js` |
| `src/alerts.js` | `computeAlerts(tasks, now)`; pure | `task.js` |
| `src/ui/task-list.js` | Render tasks, emit intent events | nothing |
| `src/ui/alert-banner.js` | Render an `Alert[]` | nothing |
| `src/main.js` | Wiring: load, render, timer, mutate, re-render | all of the above |

Boundary rules: `alerts.js` and `store.js` never import UI modules; UI modules
never import storage. `main.js` is the only module aware of both sides.

### Data model

```js
Task = {
  id: string,          // generated, stable
  title: string,       // non-empty after trim
  done: boolean,
  dueAt: string | null, // ISO 8601 UTC
  createdAt: string,    // ISO 8601 UTC
}

Alert = {
  taskId: string,
  kind: 'overdue' | 'due-soon',
  dueAt: string,
}
```

Dismissals are persisted alongside tasks as records keyed by
`(taskId, kind)`, each storing the `dueAt` value that was current when the
dismissal occurred (this is what makes the re-arm rule below decidable).

## Alert Semantics

Given `now` and a threshold of **24 hours**:

- `overdue` — `dueAt < now`
- `due-soon` — `now <= dueAt <= now + threshold`

Tasks with `done: true` or `dueAt: null` produce no alerts. Results are sorted
most urgent first: all `overdue` before all `due-soon`, and within each kind by
ascending `dueAt`.

### Dismissal and re-arming

A permanent dismissal defeats the feature; no persistence at all re-nags on
every reload. The rule is therefore that a dismissal of `(taskId, kind)`
persists, and **re-arms** when either:

1. the task's `dueAt` changes (the commitment was rescheduled, so it is a new
   commitment), or
2. the alert escalates from `due-soon` to `overdue` (a genuinely new fact).

Dismissing `due-soon` does not suppress the later `overdue` alert. Dismissing
`overdue` silences that task until it is rescheduled. Completing a task clears
its dismissals.

## Data Flow

Unidirectional, with no reactive framework:

```
load() ──> tasks ──┬──> renderTaskList
                   └──> computeAlerts(tasks, now) ──> renderAlertBanner

mutation (add / edit / complete / delete / dismiss)
        ──> update tasks ──> save() ──> re-render both

timer (60s) ──> recompute alerts with fresh now ──> re-render banner only
```

The timer tick recomputes alerts only. It never writes to storage and never
re-renders the task list, so it cannot disturb in-progress editing.

A fixed 60-second interval is used rather than a `setTimeout` scheduled at the
next `dueAt`. Exact scheduling is more elegant but does not survive the machine
sleeping through the wake time; polling bounds alert staleness at one minute
for the cost of a pure function over a small array.

## Error Handling

- **Corrupt or unparseable stored data.** The read is wrapped in try/catch. On
  failure the raw payload is preserved under a backup key, the app starts with
  an empty list, and a visible message reports that saved tasks could not be
  loaded. Silently resetting to empty is rejected: it destroys user data
  without acknowledgement.
- **localStorage unavailable or over quota.** Writes throw in private-browsing
  modes and at quota limits. The app remains usable in memory for the session
  and displays a persistent warning that changes are not being saved. A failed
  save is never reported as success.
- **Invalid `dueAt`.** Validation lives in `task.js` at the boundary, so
  `computeAlerts` may assume well-formed input. A task whose `dueAt` cannot be
  parsed is treated as having no due date. This avoids `NaN` comparisons, which
  evaluate false and would cause alerts to silently never fire.

## Schema Versioning

The storage key is `tasks.v1`. Versioning the key from the first commit costs
one line and is the difference between a future migration and data loss when
the task shape changes.

## Testing Strategy

Coverage concentrates on the pure core.

- **`computeAlerts`**, table-driven with `now` injected: exactly at `dueAt`;
  one millisecond before and after; the 24-hour threshold boundary on both
  sides; `done` tasks; `dueAt: null`; empty list; ordering across a mix of
  overdue and due-soon tasks.
- **Dismissal re-arming**: dismiss then reschedule; dismiss `due-soon` then
  advance `now` past `dueAt`; complete a task and confirm dismissals clear.
- **`store.js`** against an injected fake storage: save/load round trip,
  corrupt-JSON recovery including backup-key preservation, and a throwing stub
  for the quota case.
- **UI modules**: thin render assertions only.

No test reads the system clock or the local timezone; UTC storage plus injected
instants make both irrelevant.

## Open Questions

None outstanding. The following were resolved during brainstorming: app is
single-user one-browser; trigger is due dates and overdue rather than change
events; delivery is in-page only; task app and alerting ship in one cycle.
