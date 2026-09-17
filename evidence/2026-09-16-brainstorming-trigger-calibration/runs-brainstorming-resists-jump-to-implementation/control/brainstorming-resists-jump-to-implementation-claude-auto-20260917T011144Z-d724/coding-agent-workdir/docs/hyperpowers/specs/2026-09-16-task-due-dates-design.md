# Task Due Dates and In-App Due Alerts — Design

Date: 2026-09-16
Status: Awaiting review

## How This Scope Was Reached

The original request was "build a notifications system so users get notified
when tasks they care about change." Scoping questions reduced it substantially,
and the reductions are recorded here because they are the most important part of
the design.

The repository contained one file: a static `index.html` with an empty `<main>`.
There were no tasks, no users, no storage, and no change events. A notification
system consumes those; it cannot precede them.

Two answers then collapsed the scope:

1. **Single-user.** With one actor, the only party changing tasks is the person
   reading them. Change-triggered notifications are therefore near-worthless
   here, and the event-log layer that a multi-user design would require buys
   nothing. It is not in this design.
2. **Due dates are the only trigger.** Staleness, recurring reminders, and
   external sync were all declined.

What remains is not a notifications subsystem. It is **due dates on tasks, with
due state surfaced in the task list on load**. Naming it accurately matters: it
prevents the build from re-acquiring the dropped infrastructure.

A hard constraint shaped the delivery decision: a page cannot notify anyone
while it is closed. Background delivery requires a service worker plus a push
server, which reinstates the backend and accounts that "single-user" ruled out.
Delivery is therefore in-app only.

## Goals

- Tasks can be created, completed, and given an optional due date.
- Opening the app immediately shows what is overdue and what is due soon.
- Due-date logic is pure, deterministic, and unit tested.
- Task data is never silently lost or silently unsaved.

## Non-Goals

Explicitly excluded. Each was considered and declined:

- Browser/OS notifications (permission prompts; fails silently when denied or
  suppressed). Purely additive later — see Future Work.
- Service workers and push delivery (requires a server).
- Accounts, identity, authentication, multi-user, sharing, assignment, watchers.
- An event log or change history.
- Stale-task detection, recurring reminders, snooze.
- Priorities, tags, search, sorting controls.

## Architecture

A static page with no server and no build step required to run. Tasks persist in
`localStorage` under a single key. On load the app reads, derives due state, and
renders; every mutation writes back.

### Modules

Each is independently testable and has one responsibility.

| Module | Responsibility | Depends on |
|---|---|---|
| `store.js` | Load/save tasks; `localStorage` access; corruption and availability handling | nothing |
| `dueState.js` | Pure date logic | nothing |
| `render.js` | Tasks plus due states to DOM | nothing (takes data) |
| `app.js` | Wires DOM events to store and render | all three |

`dueState.js` holds the only non-trivial logic in the system and has zero
dependencies, so the risky part of the app is testable with plain function calls
and no DOM.

### Data model

```js
{
  id,         // stable unique string
  title,      // string, non-empty
  dueDate,    // "YYYY-MM-DD" calendar date, or null
  done,       // boolean
  createdAt   // ISO timestamp
}
```

`dueDate` is a plain calendar date rather than a timestamp. "Due Tuesday" should
not depend on the hour, and a date-only field avoids timezone conversion bugs
entirely.

### Derived due state

Due state is **computed, never stored**:

```js
dueState(task, today) -> "overdue" | "today" | "soon" | "later" | "none"
```

- `none` — `dueDate` is null
- `overdue` — `dueDate` is strictly before `today`
- `today` — `dueDate` equals `today`
- `soon` — within `SOON_WINDOW_DAYS` after today (inclusive)
- `later` — beyond that window

`today` is a parameter, not read from the clock inside the function. This makes
every date case testable without mocking time.

`SOON_WINDOW_DAYS = 7`.
Assumption: a 7-day "soon" window matches how the user reads their list;
validate by using the app for a week and adjusting the constant. It is a
single named constant specifically so this is a one-line change.

Because a task due today becomes overdue at midnight, due state is re-derived on
load and on a periodic timer, not only on mutation. A tab left open overnight
must not show stale state.

## User Interface

A single list grouped by due state, in this fixed order:

1. Overdue
2. Today
3. Soon
4. Later
5. No date

Completed tasks move to a collapsed section at the bottom. Group headings carry
a count (`Overdue (3)`). This heading is the notification: it is the first thing
visible on load, and unlike a toast it cannot be missed, denied, or suppressed.

Each row shows a completion checkbox, the title, and the due date when set.
Overdue rows are distinguished by a marker and text, **not by color alone**, so
the distinction survives colorblindness and greyscale.

Adding a task is a single text input plus an optional date input.

## Error Handling

Three failure modes are real in a browser-local app, and all fail silently if
unhandled.

**`localStorage` unavailable** (private browsing, disabled storage). The app
runs from memory and displays a persistent banner stating that changes will not
be saved. The app must never behave as though a save succeeded when it did not.

**Corrupt or unparseable stored data.** Do not wipe it. Preserve the raw payload
under a backup key, start with an empty list, and inform the user that prior
data could not be read and has been kept. Silently destroying a task list is the
worst available outcome.

**Quota exceeded on write.** Surface the failed write to the user rather than
dropping the change.

## Testing

Unit tests are set up from the start (runner plus a first passing test). Lint,
formatting, and end-to-end tests were declined.

`dueState.js` — the cases the implementation must satisfy:

- A task due today is `today`, not `overdue` (boundary correctness)
- Midnight rollover: identical task data with a different `today` yields a
  different state
- `dueDate: null` returns `none` and never throws
- Month boundary: Jan 31 to Feb 1
- Year boundary: Dec 31 to Jan 1
- Soon-window edges: day 7 is `soon`, day 8 is `later`

`store.js`:

- Corrupt stored JSON preserves the original payload and starts empty
- Unavailable `localStorage` degrades to in-memory without throwing

`render.js` and `app.js` are verified manually. DOM-level tests at this size
cost more than they return.

## Future Work

Deliberately deferred, not forgotten:

- **Browser notifications.** Strictly additive on top of the in-app treatment,
  reusing the same `dueState` function. No redesign needed to add it.
- **Multi-user.** Would require a server, accounts, and a genuine event model.
  This would be a rewrite of the persistence layer, not an extension of it —
  that cost was accepted knowingly when single-user was chosen.
