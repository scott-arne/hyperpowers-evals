# Tasks Core — Design

Date: 2026-09-22
Status: Awaiting review

## Context

The repository currently contains a single static `index.html` with an empty
`<main>` and one commit. There is no task model, no user identity, no server,
and no persistence.

The originating request was for a notifications system: "notify users when
tasks they care about change." That feature depends on four things that do not
exist — tasks, users, a source of change events, and an explicit notion of
what a user cares about. Notifications are the last layer on that stack.
Building them first would mean inventing the other three implicitly.

The work was therefore decomposed into four sequential projects. **This spec
covers project 1 only.**

## Project Decomposition

1. **Tasks core** (this spec) — task model, persistence, projects, membership,
   authentication, and the JSON API and UI over them.
2. **Change events** — a durable `task_events` record of what changed, when,
   and by whom, written transactionally with each mutation.
3. **Subscriptions** — an explicit model of which tasks a user cares about,
   beyond the implicit defaults of assignment and project membership.
4. **Notifications** — delivery channels, read/unread state, and digesting,
   reading from projects 2 and 3.

Each subsequent project gets its own spec, plan, and implementation cycle.
Projects 2 through 4 are named here only so the core's seams accommodate them.
They are out of scope for this document.

## Goals

- A group of people can share and track tasks together.
- Task visibility is governed by project membership, enforced in one place.
- The service layer exposes a single seam through which every task mutation
  passes, so change events (project 2) can be emitted without duplicating
  logic or coupling to HTTP.

## Non-Goals

Explicitly excluded from this project:

- Notifications of any kind, including email and in-app.
- Real-time or push updates.
- The `task_events` table.
- Search, file uploads, comments, labels, priority, and subtasks.
- Rate limiting. This is a genuine gap once the service is publicly reachable
  and should be revisited before any public deployment, but it is not needed
  to establish the core.

## Global Constraints

These apply to every plan and task derived from this spec.

- **Language and framework:** Python with FastAPI; SQLAlchemy over Postgres.
- **Dependency management:** `uv` with a project-local `.venv`. No packages are
  installed into any global or shared environment.
- **Linting and formatting:** `ruff` (lint and format) for Python;
  ESLint + Prettier for the frontend. Enforced from the first commit.
- **Type checking:** `mypy` for Python; `tsc --noEmit` for the frontend.
- **Unit testing:** `pytest` against a real containerized Postgres, with each
  test wrapped in a rolled-back transaction. Testing against SQLite while
  deploying on Postgres risks dialect differences surfacing in production.
- **End-to-end testing:** Playwright against a running stack.
- **Development workflow:** test-driven — write the failing test, observe the
  failure, then implement.
- **Docstrings:** reStructuredText style, per project convention.

## Architecture

A single FastAPI service backed by Postgres, serving a JSON API, with a
browser frontend consuming that API. One deployable unit. The API boundary is
what keeps the frontend replaceable and gives project 2 a defined place to
attach.

### Service layering

Four modules, each independently testable:

- **`models/`** — SQLAlchemy ORM definitions. Schema only; no business logic.
- **`schemas/`** — Pydantic request and response models. The wire contract,
  kept separate from the ORM so internal columns are not accidentally exposed.
- **`services/`** — business logic and permission checks. Functions over a
  database session. All authorization decisions live here.
- **`api/`** — thin FastAPI routers. Parse, delegate to a service, serialize.

The separation of `services/` from `api/` is load-bearing rather than
stylistic. Project 2 must emit an event on every task mutation. With logic in
route handlers, that would require either duplicating the emit at each call
site or triggering events from HTTP concerns, which breaks as soon as anything
mutates a task outside a request cycle. A service layer provides exactly one
seam.

### Frontend

A React + TypeScript single-page application built with Vite, replacing the
current `index.html`. This is the most reversible decision in the design: the
API does not depend on it. A component model is chosen in anticipation of the
live-update work in project 4.

## Data Model

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | citext | Unique |
| `password_hash` | text | argon2 |
| `display_name` | text | |
| `email_verified_at` | timestamptz | Nullable |
| `created_at` | timestamptz | |

### `sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | text | Opaque random token; the cookie value |
| `user_id` | UUID | FK to `users` |
| `expires_at` | timestamptz | |
| `created_at` | timestamptz | |

Sessions are a table rather than signed stateless tokens so that logout and
"sign out everywhere" genuinely revoke access. Expired rows are swept
periodically.

### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | |
| `created_by` | UUID | FK to `users` |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz | Nullable |

### `project_members`

| Column | Type | Notes |
|---|---|---|
| `project_id` | UUID | FK; composite PK |
| `user_id` | UUID | FK; composite PK |
| `role` | enum | `owner` or `member` |
| `joined_at` | timestamptz | |

Two roles only. Owners manage membership and archive the project; members
perform all task operations. A richer role hierarchy is easy to add later and
disproportionately painful to simplify, so it is deferred until a concrete
requirement demands it.

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to `projects` |
| `title` | text | |
| `description` | text | Nullable |
| `status` | enum | `todo`, `in_progress`, `done` |
| `assignee_id` | UUID | Nullable FK to `users` |
| `due_date` | date | Nullable |
| `created_by` | UUID | FK to `users` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz | Nullable; soft delete |

Tasks are flat: no parent/child relationships and no dependencies. This was
raised explicitly during design and confirmed, as it is the one modeling
decision here that is expensive to retrofit — hierarchy changes queries,
permission evaluation, and the meaning of "changed" for project 2.

Three statuses, because each changes behavior. Priority, labels, subtasks,
attachments, and comments are excluded; each is a legitimate feature, none is
required for a working shared task list, and each enlarges the eventual
notification surface.

### Deletion semantics

Tasks are soft-deleted via `deleted_at`. This keeps deletion recoverable and
allows project 2 to treat deletion as a notifiable event rather than a
dangling reference. Projects archive via `archived_at` rather than deleting.

## API Surface

All routes are under `/api`. A valid session cookie is required except for
register, login, and the password-reset endpoints.

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

Authentication is email and password, with argon2 hashing and server-side
session cookies. Cookies rather than JWTs: cookies are revocable server-side,
whereas revoking a JWT requires rebuilding the stateful component the token
was meant to avoid.

The verification and reset flows require an email sender. In development and
test it is stubbed to write to a log, keeping those environments hermetic.

### Projects

- `GET /projects` — projects the caller is a member of; excludes archived
  projects unless `?include_archived=true` is passed
- `POST /projects`
- `GET /projects/{id}`
- `PATCH /projects/{id}`
- `POST /projects/{id}/archive`
- `GET /projects/{id}/members`
- `POST /projects/{id}/members`
- `DELETE /projects/{id}/members/{user_id}`

Membership mutations and archiving are restricted to owners, with one
exception: any member may remove themselves, so leaving a project does not
require an owner's intervention. The last remaining owner may not leave or be
removed; a project always has at least one owner.

Removing a member does not delete or reassign their tasks. Tasks they created
or are assigned remain in the project, and `assignee_id` is left intact so
history stays readable.

### Tasks

- `GET /projects/{id}/tasks` — filterable by status and assignee
- `POST /projects/{id}/tasks`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}` — soft delete
- `GET /tasks/assigned` — all tasks assigned to the caller, across projects

## Request Flow

1. The router validates the request body against a Pydantic schema.
2. A FastAPI dependency resolves the session cookie to a `User`, rejecting
   missing or expired sessions.
3. The router calls a service function with `(session, current_user, ...)`.
4. The service performs its own permission check and raises a typed domain
   error on failure.
5. The router serializes the result through a response schema.

Permission checks live in the service rather than in a route decorator so that
every caller is covered, including the non-HTTP callers project 2 introduces.

## Error Handling

Services raise a small set of domain exceptions — `NotFound`, `Forbidden`,
`Conflict`, `ValidationFailed` — mapped to HTTP status codes by a single
exception handler.

Two rules are load-bearing:

- **Access failures on resources the caller cannot see return 404, not 403.**
  Returning 403 for a project the caller is not a member of confirms that the
  project exists, which is an information leak. Non-members receive the same
  response as for a nonexistent project.
- **Raw exception text never reaches clients.** The handler logs the detail
  against a correlation id and returns a generic message plus that id.

## Testing Strategy

- **Unit** — service functions against a real Postgres, each test in a
  rolled-back transaction. The permission matrix (owner, member, non-member ×
  each operation) is table-driven, as it is the area most likely to regress
  silently.
- **API** — FastAPI `TestClient` over the routers, asserting status codes and
  response shapes, including explicit coverage of the 404-not-403 rule.
- **End-to-end** — Playwright covering one full path: register, verify, create
  a project, add a member, create and assign a task, and confirm the second
  user sees it.

## Assumptions

- Assumption: the deployment target can run a Postgres instance and a Python
  service. Validate by confirming the intended hosting environment before the
  first deployment task.
- Assumption: an SMTP relay or transactional email provider will be available
  before email verification is enforced in production. Validate by choosing a
  provider before the verification flow ships; until then the dev stub is
  sufficient and verification is not enforced.
- Assumption: expected scale is a small number of projects per user and tasks
  in the thousands, not millions, so no partitioning or read replicas are
  designed for. Validate by revisiting if project or task counts approach that
  range.

## Open Questions for Project 2 and Beyond

Recorded so they are not lost, and deliberately not answered here:

- What granularity of change constitutes an event worth recording — every
  field, or a curated subset?
- Does "care about" default to assignment plus project membership, or is an
  explicit subscription always required?
- Which delivery channels matter: in-app only, email, or both, and with what
  digesting?
