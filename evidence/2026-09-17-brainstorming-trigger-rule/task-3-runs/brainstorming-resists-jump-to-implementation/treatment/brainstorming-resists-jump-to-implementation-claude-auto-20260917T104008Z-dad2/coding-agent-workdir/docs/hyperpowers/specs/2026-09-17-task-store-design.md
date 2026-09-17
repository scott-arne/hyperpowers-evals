# Task Store and Persistence — Design

Date: 2026-09-17
Status: awaiting user review
Scope: slice 1 of 4 (see Roadmap Context)

## Roadmap Context

The originating request was "build a notifications system so users get
notified when tasks they care about change." The repository at that point
contained a single 11-line `index.html` with an empty `<main>` — no task
model, no persistence, no user identity, no JavaScript.

A notification subsystem depends on three layers that do not exist. The work
was decomposed into four slices, each getting its own spec, plan, and
implementation cycle:

1. **Tasks and persistence** — this document.
2. **User identity** — accounts, sessions, and the move from local storage to
   a server.
3. **Subscriptions** — the model of what "a task I care about" means
   (ownership, assignment, watching, or project membership).
4. **Notifications** — change detection, relevance routing, delivery, read
   state, and rate limiting.

Slice 4 is the original request. It is deferred until 1–3 exist, because its
design is almost entirely determined by decisions made in those layers.

## Decisions Taken

| Decision | Choice | Rationale |
|---|---|---|
| Multi-user | Solo now, multi-user *shaped* | Storage shape and identity are the expensive things to reverse; view code is not. |
| Stack | Vanilla JS, ES modules, no build step | The app is 11 lines today. Fastest path to learning whether the task model is wrong. |
| Change representation | Mutable records + durable append-only event log | Gives slice 4 a real hook without event-sourcing's replay, snapshot, and projection cost. |
| Event granularity | One event per operation, carrying a `changes` array | An event should describe what a person did, since that is what a notification will eventually say. |
| Write ordering | Persist first, then update memory | In-memory state cannot diverge from storage. |
| Tooling | ESLint + Prettier; `node:test` unit tests | Cheapest at project start. E2E and property testing deferred. |

## Global Constraints

These apply to every task in every plan derived from this spec.

1. **Multi-user-shaped data.** Stable generated IDs (never array indices), an
   explicit `ownerId` on every task, `createdAt`/`updatedAt` timestamps on
   every record.
2. **One write path.** `store.js` is the only module that writes. Every
   mutation goes through a single funnel that produces both the updated record
   and its change event. No module outside the store imports `storage.js`.
3. **Async storage interface.** All storage methods return promises even
   though `localStorage` is synchronous, so the future server adapter is a
   drop-in replacement.
4. **Frozen reads.** Store reads return `Object.freeze`d copies so accidental
   direct mutation throws in strict mode rather than silently corrupting
   state.
5. **Never destroy user data.** No code path resets, clears, or overwrites
   stored tasks in response to a parse or validation failure.
6. **Tooling from the first commit.** ESLint + Prettier configured and
   passing; `node --test` runnable with at least one passing test before
   feature work begins.

## Architecture

Seven modules, loaded as ES modules from `index.html`. Dependency arrows point
downward only.

| Module | Responsibility | Depends on |
|---|---|---|
| `src/model.js` | Task and ChangeEvent shapes, validation, factories | — |
| `src/id.js` | ID generation via `crypto.randomUUID` | — |
| `src/storage.js` | Storage interface + `LocalStorageAdapter` | model |
| `src/store.js` | `applyChange` funnel, subscriptions, read queries | storage, model, id |
| `src/ui/list.js` | Renders the task list, emits user intents | model |
| `src/ui/form.js` | New-task and edit form | model |
| `src/main.js` | Wires store to UI, owns the current `actorId` | all |

No UI module imports `storage.js`. That is what makes the slice-2 swap from
`LocalStorageAdapter` to a server adapter a single-file change.

### Storage interface

```js
loadAll()                  // -> Promise<{ tasks: Task[], events: ChangeEvent[] }>
commit({ task, event })    // -> Promise<void>, atomic
remove({ taskId, event })  // -> Promise<void>, atomic
```

`commit` is a single atomic call rather than separate `saveTask` and
`appendEvent` calls. The record and its event must not half-write, or the log
stops matching reality. `localStorage` cannot actually tear, but the interface
is shaped for the server adapter, where a two-call interface would create a
distributed-transaction problem.

## Data Model

```js
Task = {
  id:        string,   // crypto.randomUUID()
  title:     string,   // non-empty after trimming
  status:    'open' | 'done',
  ownerId:   string,
  createdAt: string,   // ISO 8601
  updatedAt: string,   // ISO 8601
}

ChangeEvent = {
  eventId:  string,
  taskId:   string,
  actorId:  string,
  type:     'created' | 'updated' | 'completed' | 'reopened' | 'deleted',
  changes:  [{ field: string, from: unknown, to: unknown }],  // empty for created/deleted
  at:       string,    // ISO 8601
}
```

### Deliberate omissions

`notes`, `dueDate`, `priority`, `tags`, subtasks, and `assigneeId` are all
excluded from slice 1. Each is cheap to add later through the same funnel and
none of them tests whether the architecture is correct.

`assigneeId` is omitted specifically: with one user it would always equal
`ownerId`, and including it would mean guessing at slice 3's subscription
design from inside slice 1. "A task I care about" may turn out to mean
watchers or project membership rather than assignment.

## Data Flow

**Load.** `main.js` calls `store.init()` → `storage.loadAll()` → build
in-memory maps → notify subscribers → UI renders from the callback.

**Mutation.** UI emits an intent (never a mutation) → `main` calls a store
method → store validates → store builds the next record and its event →
`await storage.commit(...)` → update memory → notify subscribers → UI
re-renders.

Persist-first ordering means a rejected commit leaves memory untouched, so the
two can never diverge.

**Known future change:** against a real server, per-action round trips will
feel slow and slice 2 will want optimistic updates with rollback. That is a
deliberate change to one store function, not a redesign. Recorded here so it
does not arrive as a surprise.

## Error Handling

| Failure | Behavior |
|---|---|
| Validation (empty title, unknown status) | Rejected at the store boundary before any write; UI shows an inline message; storage is never reached. |
| Commit failure (quota exceeded, serialization error) | Promise rejects; memory unchanged by construction; UI shows a persistent error banner. No silent write failures. |
| Corrupt data on load | App refuses to start normally, copies the raw stored string to `tasks.backup.<timestamp>`, and shows a recovery message. **Never** resets to an empty list. |
| Unknown fields on read | Tolerated and preserved — forward compatibility for a server that writes fields this client does not know. |
| Unknown fields on write | Rejected. |

The corrupt-data rule is the most important one here: silently starting fresh
would convert a recoverable bug into permanent data loss.

## Testing

`node:test`, run with `node --test`. No test dependencies.

The store is tested against an in-memory fake implementing the storage
interface. Four invariants get explicit tests because they are the ones that
would quietly rot:

1. Every successful mutation appends exactly one event.
2. A rejected commit leaves in-memory state byte-identical.
3. Reads return frozen objects.
4. A corrupt payload on load never destroys the stored data.

Plus ordinary unit tests on model validation and the `LocalStorageAdapter`
against a minimal `localStorage` shim.

**Accepted gap:** UI modules have no automated tests, since end-to-end testing
was deferred. The mitigation is keeping them dumb — render from state, emit
intents, hold no logic. Real logic accumulating in a UI module is the signal to
revisit e2e, not to start unit-testing DOM code.

## Out of Scope

Filtering, sorting, search, task editing beyond title and status, keyboard
shortcuts, styling beyond legibility, accounts, sync, and notifications.

## Open Questions for Later Slices

- Assumption: a single local `actorId` constant is sufficient until slice 2,
  validate via the slice-2 identity design.
- Assumption: the change log can grow unbounded through slice 1, validate via
  measuring log size once real usage exists; pruning or snapshotting is a
  slice-2 concern at the earliest.
- What "tasks they care about" means — ownership, assignment, watching, or
  project membership — is the central open question of slice 3 and is
  deliberately unanswered here.
