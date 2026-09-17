# User Preferences Storage — Design

Date: 2026-09-17
Status: approved (brainstorming complete, awaiting implementation plan)
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no persistence of any kind. Nothing the user does in the page
survives a reload, so there is no way to offer settings that hold across
sessions. The request is to add preferences storage so settings persist.

## Scope

In scope:

- A browser-side preferences storage subsystem backed by `localStorage`.
- One real preference wired into the existing login form, demonstrating the
  persistence round-trip end to end.
- Unit-test and lint/format infrastructure, neither of which exists today.

Out of scope:

- A settings panel or any multi-preference UI.
- Preferences for the Node program under `src/`, which is an unrelated surface
  that the browser page does not load.
- Server-side or cross-device synchronization. Preferences are per-browser,
  per-device.
- Cross-tab live synchronization (see Future Directions).

## Decisions Made During Brainstorming

| Question | Decision |
|---|---|
| Which surface | Browser webapp (`index.html` + `app.js`), `localStorage` |
| How much scope | Storage module plus one wired preference |
| Data model | Single namespaced, versioned JSON blob |
| Module format | `createPreferences(storage)` factory with a dual browser/Node export shim |
| Demo preference | `rememberUsername` + `lastUsername` |
| Tooling | `node:test` unit tests, ESLint + Prettier. No Playwright, no fuzzing |

Rejected alternatives, with reasons, are recorded in Alternatives Considered.

## Global Constraints

These apply to every task in the implementation plan:

- **Unit tests use the built-in `node:test` runner** and `node:assert`. No test
  dependency is added. `npm test` runs `node --test`.
- **ESLint and Prettier are configured** and the new and modified code passes
  both. This introduces the repository's first `devDependencies`; the ESLint
  config must declare browser globals for `app.js` and `preferences.js`, and
  Node globals for `src/` and the test files.
- **No build step, no bundler.** `index.html` must continue to work when opened
  directly from the filesystem via `file://`.
- **No runtime dependencies.** The shipped browser code adds none.
- **The password is never persisted** anywhere, in any form.
- Existing behaviour of `src/index.js` and `src/utils.js` is not modified.

## Architecture

Three files, each with a single responsibility.

### `preferences.js` (new, browser + Node)

The entire storage subsystem. It owns:

- `DEFAULTS` — the schema. Every known preference and its default value. This
  table is the single source of truth for which keys exist and what type each
  one holds.
- `STORAGE_KEY` — `"webapp:prefs"`.
- `SCHEMA_VERSION` — `1`.
- The read, validate, merge, and write logic.

It knows nothing about login, forms, or the DOM.

Exposed through a factory:

```js
createPreferences(storage)
```

`storage` is any object providing `getItem` and `setItem`. It defaults to
`window.localStorage`. Nothing in this design removes the entry — `reset()`
writes the defaults rather than deleting — so `removeItem` is deliberately not
part of the required interface. This injection point is what makes the
subsystem testable in Node with a `Map`-backed fake and no DOM emulator.

The returned object exposes exactly three methods:

- `get(key)` — returns the current value. **Throws** if `key` is not in
  `DEFAULTS`. Returning `undefined` for a typo'd key would hide the bug rather
  than surface it.
- `set(key, value)` — updates the in-memory value and immediately serializes
  the whole blob to storage. **Throws** if `key` is not in `DEFAULTS`. Returns
  `true` only when the value was **durably persisted**; it returns `false` both
  when the write throws (see Quota below) and when the instance is running on
  the in-memory fallback, since in neither case will the value survive a
  reload. Callers may ignore the return value.
- `reset()` — restores every preference to its default and persists the result.
  Returns the same durability boolean as `set`.

The API is deliberately narrow so that adding change subscriptions later is
additive rather than a rewrite.

The file ends with a dual-export shim: it attaches to `window` when a browser
global is present and assigns to `module.exports` when running under Node. This
preserves `file://` loading while keeping the module requirable by the tests.

### `app.js` (modified)

Constructs the preferences instance at load, then reads and writes through it.
It must not touch `localStorage`, `JSON`, or the schema version directly. Its
new responsibilities are restoring the form state on load and recording it on
submit.

### `index.html` (modified)

Loads `preferences.js` before `app.js` via a second classic `<script>` tag, and
gains one checkbox in the login form with the id `remember-username` and a
label reading "Remember my username".

## Data Model

A single `localStorage` entry under `webapp:prefs`:

```json
{
  "v": 1,
  "values": {
    "rememberUsername": false,
    "lastUsername": ""
  }
}
```

`DEFAULTS` for version 1:

| Key | Type | Default | Meaning |
|---|---|---|---|
| `rememberUsername` | boolean | `false` | Whether to restore the username field on load |
| `lastUsername` | string | `""` | The username to restore |

These are two separate keys on purpose. Collapsing them into one would require
encoding "off" as the empty string, which erases the difference between
*disabled* and *enabled but never used* and makes the checkbox state guesswork.

### Load sequence

1. Probe storage availability (see Failure Modes). Fall back to an in-memory
   store if unavailable.
2. Read `STORAGE_KEY`. If absent, use `DEFAULTS` as-is.
3. Parse. On any parse failure, use `DEFAULTS`.
4. Reject the blob wholesale if it is not an object, if `values` is not an
   object, or if `v` is greater than `SCHEMA_VERSION`. Use `DEFAULTS`.
5. For each key in `DEFAULTS`, take the stored value if present and of the
   matching type; otherwise take the default. Keys present in storage but
   absent from `DEFAULTS` are discarded.
6. Cache the merged result in memory. All `get` calls are served from this
   cache, so there is no parse per read.

### Write sequence

`set` mutates the cache and then serializes the entire blob, including the
version field, back to storage immediately. Writing on every `set` rather than
batching means a tab closed without warning still persists the change. The
payload is small enough that the cost of whole-blob rewrites is irrelevant.

## Failure Modes

Every one of these degrades to a working application. None surfaces an error to
the user.

| Condition | Behaviour |
|---|---|
| Storage unavailable (private mode, site data blocked) | Accessing `window.localStorage` can itself throw. The factory probes inside `try`/`catch` and falls back to a `Map`-backed in-memory store. The app behaves identically; preferences do not survive reload. |
| Malformed JSON | Caught. Treated as "nothing stored"; defaults apply. The bad value is left in place rather than eagerly wiped — the next `set` overwrites it, and not destroying data we failed to parse is the safer default. |
| Blob parses but has the wrong shape | Same as malformed: defaults apply. |
| `v` greater than `SCHEMA_VERSION` | A newer build wrote it. Treated as unreadable; defaults apply. We do not guess at a future format. |
| `v` less than `SCHEMA_VERSION` | Cannot occur at version 1. The migration seam is reserved and deliberately left empty. |
| A stored value's type disagrees with its default | That single key falls back to its default. Every other key still loads. |
| `setItem` throws `QuotaExceededError` | Caught. The in-memory value still updates so the session stays self-consistent. `set` returns `false` and logs a console warning. The app never throws at the user over a preference. |

## The Wired Preference

**On load:** if `rememberUsername` is true, populate `#username` with
`lastUsername` and check `#remember-username`.

**On submit:** if the checkbox is checked, set `rememberUsername` to `true` and
`lastUsername` to the submitted username. If it is unchecked, set
`rememberUsername` to `false` **and** clear `lastUsername` to `""`. Leaving a
stored username behind after the user has opted out would be a privacy
surprise.

The existing validation and stubbed `login()` behaviour is unchanged. The
preference writes happen only on a submit that passes validation, so a rejected
empty form does not overwrite a previously remembered username.

## Security

- **The password is never stored** — not in `localStorage`, not in the blob, and
  not retained beyond the submit handler. This is enforced structurally, not by
  convention: `DEFAULTS` contains no password key, and because both `get` and
  `set` throw on keys absent from `DEFAULTS`, a future contributor cannot
  quietly add one through a `set` call.
- `localStorage` is readable by any script running on the origin, so persisting
  even a username is a small disclosure on a shared machine. This is the
  standard, accepted tradeoff for a "remember me" feature, and it is recorded
  here so the choice stays deliberate rather than accidental.

## Testing

Unit tests run under `node:test` against `createPreferences(fakeStorage)`, where
the fake is a `Map`-backed object implementing `getItem`/`setItem`/`removeItem`.
No browser and no DOM emulator are involved.

Required cases:

1. Empty storage yields the defaults.
2. `set` then `get` round-trips a value.
3. **A fresh instance over the same storage sees the previously written
   value.** This is the literal "persists across sessions" claim and the test
   that would catch a store which only ever worked in memory.
4. Malformed JSON falls back to defaults.
5. A wrong-shaped blob falls back to defaults.
6. A `v` above `SCHEMA_VERSION` falls back to defaults.
7. One type-mismatched key defaults while its neighbours load normally.
8. A key present in storage but absent from `DEFAULTS` is discarded.
9. `get` with an unknown key throws.
10. `set` with an unknown key throws.
11. `reset()` restores every default and persists.
12. A storage whose `getItem` throws produces a working in-memory fallback:
    `get`/`set` still behave, and `set` returns `false` to signal the value is
    not durable.
13. A `setItem` that throws `QuotaExceededError` leaves `set` returning `false`
    with the in-memory value still updated.

**Known coverage gap.** The DOM wiring in `app.js` — check the box, submit,
reload, see the username restored — is not covered by automated tests, because
end-to-end tooling was deliberately excluded. It is verified manually once, and
the gap is recorded here rather than left implicit. Adding Playwright later
would close it.

## Alternatives Considered

- **One `localStorage` key per preference.** Rejected. It buys per-key isolation
  between concurrent tabs, but scatters the defaults, requires per-key value
  encoding, gives schema versioning nowhere natural to live, and turns both
  migration and `reset()` into prefix scans of the whole keyspace. The
  properties it trades away are exactly the ones that make adding a second
  preference cheap.
- **An observable store with subscriptions and `storage` events.** Rejected for
  now as premature. It is the right eventual shape once a settings UI exists,
  and the narrow `get`/`set`/`reset` API is specifically chosen so that adding
  it later is additive.
- **ES modules.** Rejected. Cleaner and standard, but `type="module"` breaks
  `file://` loading under module CORS rules, which would mean the page could no
  longer be opened directly.
- **A plain global with no factory.** Rejected. Simplest to read, but it could
  only be tested through a jsdom dependency, in a repository that currently has
  none.
- **A shared browser/Node preferences core.** Rejected as out of scope. The
  `src/` program is unrelated to the page and shares no code with it.
- **Playwright end-to-end tests.** Rejected for now on cost: a dependency that
  downloads browser binaries, to test one checkbox on a stub login form. This
  is the accepted cause of the coverage gap noted above.
- **Fuzz or mutation testing.** Rejected. The interesting input surface is
  "arbitrary junk in one string," which the explicit corruption cases cover more
  legibly than a fuzzer would.

## Future Directions

Not part of this work; recorded so the design's seams are understood.

- Change subscriptions and `window.addEventListener("storage", ...)` for live
  cross-tab synchronization. Additive against the current API.
- A settings panel, once there is more than one user-facing preference.
- Schema migrations, when `SCHEMA_VERSION` first advances past 1. The load path
  already reserves the branch.

## Assumptions

- Assumption: preferences are acceptable as per-browser and per-device, with no
  expectation of following a user to another machine. Validate by confirming
  with the product owner before any multi-device expectation is set.
- Assumption: the stubbed `login()` remains a stub for the duration of this
  work, so there is no real authentication response that should influence what
  gets persisted. Validate by re-checking `app.js` at implementation time.

## Codex Gate Record

**Approach gate.** Fired (genuinely different data models with materially
different tradeoffs) and preflight returned `ok`, but the companion returned an
empty payload, so no independent Codex approaches were contributed. Per the
gate's one-shot rule this was noted once and not retried. The approaches in
Alternatives Considered are Claude's own.

**Spec review gate.** Round 1 ran both required lenses
(completeness-and-consistency, feasibility-and-scope) in the foreground over an
assembled dossier with no missing inputs. Both captures returned an empty
payload and normalized to `incomplete` ("json payload has no terminal
verdict"). Bounded recovery found no recoverable job (`status --json` reported
no running, finished, or recent jobs), and the failure is not transient — three
independent companion calls returned identical empty payloads — so no relaunch
was attempted. **This is not an approval.** The gate degraded to "no Codex
review," recorded durably in the ungated ledger as event
`20260917T095608Z-7552-17393`, class `incomplete-review`. The only review this
spec has received is Claude's own self-review.
