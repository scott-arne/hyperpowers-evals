# Task Due Alerts — Design

Date: 2026-09-22
Status: Approved in brainstorming; awaiting user review of this document.

## Summary

A single-user, browser-only task list that surfaces which tasks are due soon or
overdue. Tasks are stored in `localStorage`. Due status is computed from the
task's due date and the current time rather than stored, so there is no
notification state to keep in sync.

## Origin and Scope Correction

The original request was to notify users when tasks they care about change.
Brainstorming established that this app is single-user and browser-only, with
no server. That collapses the original premise: the user is the only party who
changes tasks, so notifying them about their own edits carries no information.

The surviving useful trigger is time. A due date arrives, or passes, without
the user doing anything. This design covers that and nothing else.

Two consequences are recorded here deliberately, because they are the gap
between what was asked for and what is being built:

1. **No cross-user notifications.** There is one user. "Tasks they care about"
   has no meaning beyond "their tasks," so there is no subscription or watch
   concept.
2. **No delivery when the app is closed.** A browser-only app with no server
   cannot reliably reach the user with the tab closed. The Notifications API
   fires only while the page is open. Service Worker + Periodic Background Sync
   is Chromium-only, requires a PWA install, gives the browser control of
   timing, and does not run on iOS. Reliable background delivery requires a
   server with Web Push or email, which is out of scope. This app tells the
   user what is overdue *when they look at it*.

If background delivery on a phone is the actual requirement, this design does
not meet it and a server-backed design should be written instead.

## Global Constraints

- **Stack:** Vanilla JavaScript, ES modules, loaded directly by the browser.
  No bundler, no build step, no runtime dependencies.
- **Tests:** `node --test` (Node's built-in runner). No test dependencies.
  Unit tests only.
- **Not configured:** lint, formatter, end-to-end tests. Chosen deliberately.
- **Persistence:** `localStorage` only.
- **Browser support:** any browser with ES modules and `crypto.randomUUID()`.

## Out of Scope

Priorities, tags, projects, search, filtering, recurring tasks, user-facing
sort controls, undo, dark mode, settings/preferences, multi-user, accounts,
sync, and any server component.

## Architecture

Six files. The split exists so the logic worth testing has no DOM or storage
dependency.

| File | Responsibility | Depends on |
|---|---|---|
| `index.html` | Page shell and mount points | — |
| `src/task.js` | Task construction and validation. Pure. | — |
| `src/due.js` | Due-status computation. Pure. | — |
| `src/store.js` | `localStorage` load/save behind a narrow interface | `task.js` |
| `src/render.js` | Task list to DOM | `due.js` |
| `src/app.js` | Wiring: event handlers, timer, orchestration | all |

`src/due.js` is the entirety of the alerting logic. `src/store.js` is the seam
where a server-backed implementation would be substituted if the no-server
decision is ever reversed.

## Data Model

```js
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // crypto.randomUUID()
  title: "Submit expenses",                     // non-empty after trim
  done: false,
  dueAt: "2026-09-25T17:00:00.000Z",            // ISO 8601 UTC, or null
  createdAt: "2026-09-22T11:02:00.000Z"         // ISO 8601 UTC
}
```

`dueAt` is nullable; a task without a due date never produces an alert.

Timestamps are stored as UTC ISO strings and rendered in the viewer's local
time. Storing locale-formatted strings would make the stored data
unparseable across timezone and locale changes.

### Persistence

- Key: `tasks.v1`. The version suffix allows a future shape change to migrate
  explicitly rather than silently misread old data.
- Value: a JSON array of task objects.
- Read once at startup; written on every mutation.
- `store.js` accepts its storage object as a parameter, defaulting to
  `window.localStorage`, so tests inject a fake and run under Node.

## Due Status

```js
dueStatus(task, now) → 'none' | 'upcoming' | 'soon' | 'overdue'
```

Rules, evaluated in order:

1. `task.done` is true → `none`. Completed tasks never alert.
2. `dueAt` is null or does not parse to a valid date → `none`.
3. `dueAt <= now` → `overdue`
4. `dueAt <= now + SOON_WINDOW` → `soon`
5. otherwise → `upcoming`

`SOON_WINDOW` is 24 hours, defined as a single exported constant.

`now` is a required parameter rather than read from the clock inside the
function. This keeps the function pure and makes boundary cases testable.

Because status is derived on each render, it cannot drift out of sync with the
task data. Editing a due date or completing a task changes the alert
immediately, with no record to invalidate.

## Surfaces

Three, all in-page:

- **Per-task badge** — `Overdue` or `Due soon` on the task row; nothing for
  `upcoming` and `none`.
- **Header count** — `Overdue (n)`, hidden when n is 0.
- **Banner** — above the list when any task is overdue, stating the count.

Alerts are not dismissible. They clear when the task is completed or its due
date moves. This keeps the system fully derived, with no stored dismissal
state and no question of when a dismissal should reset.

## Keeping Status Current

Status depends on `now`, so the display goes stale as time passes. Two
mechanisms keep it correct:

1. A single `setInterval` recomputes and re-renders every 60 seconds. Minute
   granularity is sufficient; sub-minute precision on "overdue" has no value.
2. A `visibilitychange` listener recomputes when the tab becomes visible.

The second is not redundant. Browsers throttle timers in background tabs and
may suspend them entirely on mobile, so a tab left open overnight can return
showing stale status. Recomputing on visibility change is what prevents the
user from seeing yesterday's state on return.

## User Interface

Single screen:

```
Tasks                                    Overdue (2)
┌──────────────────────────────────────────────────┐
│ 2 tasks are overdue                              │
└──────────────────────────────────────────────────┘
[ New task title..........] [ due date ▾ ] [ Add ]

☐  Submit expenses          Sep 20, 5:00 PM   Overdue   ✕
☐  Renew passport           Sep 23, 9:00 AM   Due soon  ✕
☐  Read the spec            —                           ✕
☑  Book flights             Sep 19, 2:00 PM             ✕
```

### Interactions

- **Add** — title required, due date optional via a `datetime-local` input.
- **Toggle done** — the row checkbox.
- **Edit title** — click the title to edit inline.
- **Change due date** — the row's date field.
- **Delete** — the `✕` control. Immediate, with no confirmation and no undo.
  Approved as a deliberate tradeoff.

### Ordering

Fixed, not user-configurable:

1. Overdue tasks first
2. Then by due date ascending
3. Then undated tasks by creation time
4. Completed tasks sorted to the bottom regardless of the above

### Empty State

When no tasks exist, the list area shows a short prompt to add the first task
rather than rendering an empty container.

## Error Handling

| Failure | Behavior |
|---|---|
| `tasks.v1` is corrupt or unparseable | Start with an empty list; warn to console. The app must still open. |
| `localStorage` unavailable (private mode) | Run in memory; show a one-line "changes won't be saved" notice. |
| Quota exceeded on write | Retain in-memory state; surface a non-blocking error. Do not discard user input. |
| Title empty or whitespace only | Rejected at the form; no task created. |
| `dueAt` does not parse | Treated as no due date, so it cannot produce a false `overdue`. |

## Testing

`node --test`, tests under `test/`, no dependencies.

### `test/due.test.js`

The state machine, with `now` injected. Cases:

- `dueAt` exactly equal to `now` (boundary: must be `overdue`)
- `dueAt` exactly at the `SOON_WINDOW` edge (boundary between `soon` and
  `upcoming`)
- A completed task whose `dueAt` is in the past (must be `none`, not
  `overdue`)
- `dueAt` null
- `dueAt` an unparseable string
- A due date across a daylight-saving transition

### `test/task.test.js`

Construction and validation: empty-title rejection, whitespace-only rejection,
title trimming, id generation, `createdAt` population.

### `test/store.test.js`

Save/load round-trip, corrupt-JSON fallback to an empty list, and
quota-exceeded handling, all against an injected fake storage object.

### Known Coverage Gap

`src/render.js` and `src/app.js` have no automated coverage. Confirming that a
badge actually appears in the DOM requires a browser, which end-to-end tests
would provide; those were deliberately excluded. Rendering and wiring are
verified manually.

## Open Assumptions

- Assumption: minute-granularity status updates are acceptable to the user;
  validate by using the app with a task due within the hour.
- Assumption: `localStorage` capacity is ample for a personal task list;
  validate via the quota-exceeded test path rather than by measurement.
