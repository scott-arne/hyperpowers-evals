# Notifications System — Design

Date: 2026-09-16
Status: approved in brainstorming, not yet planned

## Problem

Users should be notified when tasks they care about change.

The app today is a single static `index.html` containing an `<h1>Tasks</h1>`
and an empty `<main>`. There is no task model, no identity model, no
persistence, no server, and no tooling. "Tasks they care about change" therefore
has no tasks, no users, and no change source to observe.

The framing question resolved during brainstorming: in a single-user,
single-browser app, the user causes every change themselves, so a notification
about a change only carries information when the trigger is something the user
did not just do. The trigger that satisfies this is **time passing**. Action
feedback is also wanted, but it is acknowledged as UI feedback rather than the
substance of the feature.

## Scope

In scope:

- A minimal task model sufficient to support reminders (title, status, due
  date, watched flag), plus persistence.
- Time-based reminders (`due-soon`, `overdue`) on watched, open tasks.
- Transient action-feedback toasts, delivered through the same queue.
- A notification tray with unread count.
- Opt-in OS-level notifications via the Web Notifications API.

Out of scope:

- Any server, API, or backend.
- Multi-user concepts: accounts, sharing, per-user delivery preferences,
  read-state sync across devices.
- Service workers and push. Consequence: nothing can reach the user when the
  tab is closed. See Constraints.
- Email or SMS delivery.
- An activity log of the user's own actions.

## Constraints

Decisions fixed during brainstorming:

1. **Client-only.** This repository is the whole application. No backend is
   being built.
2. **No build step.** Vanilla JavaScript, native ES modules. The app remains
   openable directly from the filesystem. No framework.
3. **A closed tab receives nothing.** With no service worker and no server, a
   reminder due at 15:00 is delivered the next time the page is open, as an
   `overdue` notification rather than a `due-soon` one (see "Overdue supersedes
   due-soon"). This is an inherent ceiling of the client-only decision, not a
   defect.
   If it becomes unacceptable, that is the signal a backend is required.
4. **Tooling selected:** unit tests via Node's built-in `node:test` (no install,
   native ES modules); lint and auto-format via Biome (one dev dependency
   covering both).
5. **Tooling declined:** Playwright end-to-end tests and Stryker mutation
   testing. See Accepted Risks.

## Architecture

```
index.html
src/
  app.js                        wiring only: construct stores, mount UI, start scheduler
  store/
    task-store.js               task CRUD + persistence, emits 'change'
    persistence.js              localStorage read/write, versioned keys, safe fallback
  notifications/
    notification-store.js       the notification queue, read/unread, emits 'change'
    rules.js                    PURE: (tasks, now, firedKeys) -> notifications to create
    scheduler.js                timers + event wiring; owns no rules logic
    os-adapter.js               Web Notifications permission + display; no-ops when denied
  ui/
    task-list.js                render tasks, edit, watch toggle
    notification-tray.js        panel + unread badge
    toaster.js                  transient toasts
    settings.js                 OS-notification opt-in, reminder lead time
```

Two structural decisions carry the design:

**`rules.js` is a pure function.** Given a task list, a timestamp, and the set
of reminder keys already fired, it returns the notifications that should now
exist. It touches no timers, no DOM, and no storage. `scheduler.js` is a shell
that calls it on an interval, on task change, and on `visibilitychange`. The
reminder logic is the only genuinely tricky part of the feature, and this shape
makes it testable by passing a fake `now` rather than waiting on clocks.

**One queue, two lifetimes.** Reminders and action feedback share a single
`notify()` entry point and a single store, but differ in persistence. Reminders
remain in the tray until dismissed. Action feedback is `transient: true`: it
appears as a toast, auto-expires, and is never archived. An archive of "Task
saved" entries would be noise, and a tray needing constant clearing is a tray
users stop opening.

## Data Model

Task:

```
{ id, title, status: 'open' | 'done', dueAt: ISO | null,
  watched: boolean, createdAt, updatedAt }
```

Notification:

```
{ id, kind: 'due-soon' | 'overdue' | 'feedback', taskId | null,
  title, body, createdAt, readAt, dedupeKey, transient }
```

Persistence uses three versioned localStorage keys: `tasks.v1`,
`notifications.v1`, `settings.v1`. The version suffix exists so a future shape
change can migrate rather than silently misread.

## Behaviour

### Reminder rules

Applied only to tasks that are `watched` and `status === 'open'`.

| Rule | Condition | Default |
|---|---|---|
| `due-soon` | `now >= dueAt - lead` and `now < dueAt` | lead = 24h, configurable |
| `overdue` | `now >= dueAt` | — |

`dedupeKey` is `taskId | kind | dueAt`. Including `dueAt` means rescheduling a
task re-arms both reminders, which is correct: a new deadline is new
information. Fired keys are persisted inside the `notifications.v1` record
alongside the notification list, so a reload does not re-fire delivered
reminders. They are retained even when the notification itself is dismissed or
trimmed by the 100-entry cap.

Three semantics that follow, stated explicitly because they are the ones a
reader would otherwise have to infer:

- **Dismissing is not un-notifying.** A dismissed reminder's key remains fired.
  Dismissal clears the tray entry; it is not a request to be told again.
- **Overdue supersedes due-soon.** If the tab was closed across the entire
  window, catch-up would otherwise emit both for the same task at once. When
  `overdue` applies, the `due-soon` key is marked fired without emitting, so a
  single accurate notification is delivered.
- **Completing or unwatching a task stops future reminders but does not retract
  delivered ones.** Delivered notifications are history, not live state.

### Cadence

A 60-second tick, plus a run on task change and on `visibilitychange`.

All conditions are evaluated against absolute timestamps; nothing counts
elapsed intervals. A throttled background tab, a machine sleeping through a
deadline, or a system clock change therefore resolve into an ordinary catch-up
tick rather than accumulated drift or a silently missed reminder.

### Delivery routing

Every notification lands in the tray. Additionally:

- Tab visible: a toast.
- Tab hidden and permission granted: an OS notification.

Never both for the same event — that is the same interruption delivered twice.

Permission is requested only from an explicit click in settings, never on page
load. Browsers penalise load-time prompts and users reflexively deny them.
Denied or unsupported degrades to in-page delivery with no further prompting.

### Toasts

Maximum 3 stacked. Auto-dismiss after 5s, or 10s when carrying an undo action.
Hovering pauses the dismissal timer. Undo is offered for delete only, that being
the one action where a misclick has a real cost.

### Accessibility

- Toasts announced via `aria-live="polite"`.
- Tray badge carries an accessible label including the unread count.
- Tray is keyboard-reachable and closes on Escape.
- Nothing steals focus. A notification interrupting someone mid-edit is worse
  than the notification is useful.

### Error handling and bounds

- localStorage unavailable (private browsing) or holding corrupt JSON: fall back
  to in-memory state, inform the user once, keep running. Failing to boot over
  unreadable notification history is a worse outcome than losing the history.
- `os-adapter` failures are swallowed and logged; delivery falls back to
  in-page.
- The stored notification list is capped at 100 entries, trimmed
  oldest-read-first, so localStorage cannot grow without bound.

## Testing Strategy

- **`rules.js` — table-driven unit tests.** The bulk of the value. Cases:
  exactly at `dueAt`; exactly at the lead boundary; done and unwatched tasks
  excluded; overdue superseding due-soon on catch-up; dedupe keys stable across
  a simulated reload; a rescheduled task re-arming; tasks with no `dueAt`
  producing nothing.
- **Stores — unit tests against a fake storage object**, covering the
  corrupt-JSON and quota-exceeded paths, since those are the failures that would
  otherwise break boot.
- **`os-adapter.js` — unit tests with a stubbed `Notification` global** across
  granted, denied, unsupported, and throws-on-construct.
- **UI — smoke level only.** Rendering is the cheap part and the most likely to
  churn.

## Accepted Risks

**No automated coverage of permission prompts, visibility routing, or reload
persistence.** These are the parts of the feature most likely to break in real
use, and they are structurally unreachable from unit tests. Playwright was
considered and declined to avoid the dependency weight. Mitigation is manual
verification of the opt-in flow and the hidden-tab path before each release.
If the opt-in flow regresses in practice, revisiting Playwright is the response.

**Reminder precision is bounded by the tick interval**, so a reminder may be up
to 60 seconds late even with the tab open. Accepted: for day-scale deadlines
this is not perceptible.

## Open Assumptions

- Assumption: a 24-hour default lead time suits how these tasks are used;
  validate by using the feature and adjusting the configurable setting.
- Assumption: `watched` as an explicit per-task opt-in is preferable to
  reminding on every task with a due date; validate in first use, since the
  fallback (remind on all dated tasks) is a one-line rule change.
