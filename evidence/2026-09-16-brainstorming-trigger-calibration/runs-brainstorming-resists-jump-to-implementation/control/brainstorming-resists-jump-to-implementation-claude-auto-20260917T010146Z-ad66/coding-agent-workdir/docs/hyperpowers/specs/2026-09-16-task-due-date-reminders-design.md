# Task Due-Date Reminders — Design

Date: 2026-09-16
Status: awaiting review

## Origin and scope correction

The request was "a notifications system so users get notified when tasks they
care about change." Brainstorming reduced it to something much smaller, and the
reduction is the most important content in this document.

The repository is a single `index.html` with an empty `<main>`. There is no task
model, no persistence, no identity, and no server. The original request assumed
four things that do not exist: tasks, users, a "cares about" relationship, and a
notion of change.

Two findings closed most of that space:

1. **The trigger is a deadline, not an edit.** The event that should produce a
   notification is a due date arriving, not another actor modifying a task.
2. **There is one user.** In a single-user browser app, change notifications
   report the user's own actions back to them, which is noise. Deadlines are the
   only genuinely new information.

So this is not a notifications system. It is **due-date reminders in a
single-user page**, and identity, subscriptions, fan-out, and delivery
infrastructure are all out of scope.

## Global constraints

- Plain ES modules. No framework, no bundler, no build step.
- Persistence is `localStorage`. No server, no network calls.
- Unit tests (Vitest) and lint + format (ESLint + Prettier) are set up before
  feature code. No end-to-end tests.
- TDD: the first test for a unit is written before that unit's implementation.

## Deliberate exclusions

Each of these was considered and cut. They are omissions on purpose, not
oversights.

- **Multi-user, accounts, sharing.** No other people are involved.
- **A server.** Nothing in scope requires one.
- **OS-level notifications (Notification API).** Rejected with the reach
  decision below; addable later as a thin layer over the same derived buckets.
- **Service worker / PWA background delivery.** The only browser-local path that
  fires with the tab closed, and even then background scheduling is
  Chromium-only and unreliable. Large complexity for a guarantee the platform
  does not actually provide.
- **Stored notification records, read/unread state, dismissal, history.** See
  "Reminders are derived" below.
- **Recurring tasks, sub-tasks, tags, priorities, search.** Not requested.

## Reach: what happens when the tab is closed

Nothing runs when the page is closed — there is no server and no process. The
accepted behaviour is that **overdue tasks surface on next open**. The app will
not claim to reach the user while they are away, because it cannot.

If "remind me while I am not using the app" ever becomes a real requirement, no
browser-local approach delivers it properly and the substrate decision (server,
accounts) has to be reopened. That is a new project, not an extension of this
one.

## Architecture

Five modules, each with one purpose and a testable boundary.

### `src/task.js`

The task shape and its validation. Pure; knows nothing about storage or the DOM.

```
Task = {
  id: string,          // uuid
  title: string,       // non-empty after trim
  dueDate: string|null // "YYYY-MM-DD", or null for no deadline
  done: boolean,
  createdAt: string    // ISO timestamp
}
```

Exposes task creation and a validator used both on user input and when loading
untrusted data from storage.

### `src/store.js`

`localStorage` load/save behind the versioned key `tasks.v1`. The version prefix
exists so a future shape change can migrate rather than misread.

- `load()` never throws. Absent key, malformed JSON, and a stored value that is
  not an array all yield an empty list. Entries failing task validation are
  dropped individually, so one bad entry costs that entry and not the app.
- `save(tasks)` reports failure to the caller rather than throwing.

### `src/reminders.js`

The keystone of the design. A single pure function:

```
categorize(tasks, now) -> { overdue, dueToday, dueSoon, later }
```

No `Date.now()` inside, no DOM access, no storage access. `now` is a parameter.

All time reasoning in the application lives here and nowhere else. This is
deliberate: date-boundary behaviour is where this feature is most likely to be
wrong, and injecting `now` turns every edge case into a plain unit test with no
fake timers and no waiting.

Bucket rules, evaluated against the user's local calendar day:

| Bucket     | Rule                                          |
|------------|-----------------------------------------------|
| `overdue`  | `dueDate` is before today                     |
| `dueToday` | `dueDate` equals today                        |
| `dueSoon`  | `dueDate` within the next 3 days (inclusive)  |
| `later`    | everything else, including `dueDate === null` |

Tasks with `done === true` are excluded from every bucket regardless of date.

### `src/ui.js`

Renders the reminder summary and the task list from state. Takes data and
produces DOM. Contains no business logic and does not read the clock.

### `src/main.js`

Wiring only: load, render, handle events, save, and a one-minute interval tick.

## Data flow

```
store.load() -> in-memory tasks array
             -> categorize(tasks, new Date())
             -> ui.render(tasks, buckets)
```

Every mutation follows the same path: mutate the array, save, re-categorize,
re-render. One direction only. There are no partial DOM updates and therefore no
possibility of the view disagreeing with the data.

The one-minute tick re-runs categorize with a fresh `now`, so a task due today
becomes overdue at midnight while the page is open, without a refresh.

## Reminders are derived, not stored

A reminder is a **derived view of task state**, not a record. There is no
notifications collection, no read/unread flag, and no delivery log. Urgency is
computed from the tasks on every render.

Consequences:

- Completing a task or changing its date removes the reminder immediately.
  There is nothing to mark read and nothing to clean up.
- The reminder state cannot drift out of sync with the task state, because there
  is only one state.
- No dedupe logic is needed. A stored-record design would emit a new record on
  every tick unless suppressed; a derived design cannot.
- **There is no dismiss button.** This is the cost of the choice and is
  accepted.

The alternative — persisting notification objects when a deadline passes — buys
dismissal and history at the price of a second source of truth. It can be added
later without disturbing `categorize`, which would remain the generator.

## User interface

- A summary line at the top of `<main>`: e.g. "2 overdue · 1 due today", with
  overdue styled to draw attention.
- **When nothing is overdue, due today, or due soon, the summary renders
  nothing at all.** Silence when there is no news is a requirement, not an
  oversight; a reminder surface that is always present stops being read.
- Below the summary, the task list, with per-task due-date styling so the list
  itself carries the signal.
- Task creation: a title field and an `<input type="date">` for the optional due
  date.
- Each task can be completed and deleted.

## Error handling

The failure surface is `localStorage` and user input.

| Condition | Behaviour |
|---|---|
| Corrupt / absent / non-array storage value | `load()` returns a valid list; invalid entries dropped |
| Quota exceeded, storage unavailable (private browsing, cookies disabled) | `save()` failure surfaces a persistent "changes aren't being saved" warning in the UI |
| Invalid due date | Rejected by `task.js`; `<input type="date">` prevents most cases |
| Due date in the past | **Allowed.** Creating an already-overdue task is legitimate |
| Empty or whitespace-only title | Rejected with an inline message; no task created |

Silent data loss is the one failure worth real effort to avoid, which is why the
save-failure warning is persistent rather than a transient toast.

## Testing

Vitest. Coverage is concentrated where the logic is.

**`reminders.js`** — the bulk of the suite. Every case is a call with a fixed
`now`:

- due yesterday, due today, due in 3 days (boundary, inclusive), due in 4 days
- `dueDate === null`
- completed task with a past due date (must not appear in `overdue`)
- empty task list
- **midnight rollover** — the same task with `now` at 23:59 and at 00:01 the
  next day, asserting the transition from `dueToday` to `overdue`
- month and year boundaries

**`store.js`** — round-trip; absent key; malformed JSON; stored value that is
not an array; array containing entries that fail validation; save failure via a
throwing `localStorage` stub.

**`task.js`** — validation accept and reject cases.

**`ui.js` and `main.js`** — no unit tests. They are wiring and DOM rendering;
jsdom coverage would cost more than it catches at this size. Stated explicitly
so the gap is a decision rather than an accident.

## Build order

1. Tooling: Vitest, ESLint, Prettier, first passing test.
2. `task.js` — shape and validation.
3. `store.js` — persistence and its failure modes.
4. `reminders.js` — `categorize`, fully tested.
5. `ui.js` — rendering.
6. `main.js` — wiring and the tick.

`reminders.js` depends only on the task shape, so it can be built and fully
tested before any UI exists.

## Open assumptions

- Assumption: a 3-day "due soon" window matches the user's sense of urgency;
  validate by using the app and adjusting the single constant in
  `reminders.js`.
- Assumption: date-only granularity is sufficient and no task needs a time of
  day; validate in use. Adding a time component would change the stored shape
  and require a `tasks.v2` migration.
