# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, sorting by Service or Started, colored status chips and durations, so the on-call engineer can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built from the vendored Keel component kit (`vendor/kit`, imported as `#kit/*`) rather than hand-written markup: `pageHeader` for the title and snapshot time, `filterBar` + `selectField` for the environment dropdown (with `keep` holding the sort), `dataTable` for the sortable table, `badge` for the status chips and `emptyState` for the no-match message. `src/server.js` routes `/deploys` to it through the existing `ROUTES` table, which already handles the 503 "Snapshot unavailable" case, and `src/layout.js` adds the nav link after "Services".

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Node 20 or later (`package.json` `engines`), no new dependencies. Tests run with `node --test` (`npm test` / `just test`).
- Reuse the kit: import `pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge` and `emptyState` from `#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge` and `#kit/empty`. Do not change anything under `vendor/kit/`, and do not hand-roll a table, sort header, `<select>`, chip or empty-state markup in the page.
- Route `/deploys`, page title and nav label "Deploys", nav link placed directly after "Services".
- Header "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (the default, value `all`), "production", "staging". Query param `?env=`; changing it keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (sort `startedAt`, dir `desc`). Service and Started sortable both ways through `?sort=` (`service` | `startedAt`) and `?dir=` (`asc` | `desc`); changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue. With kit tones: `succeeded` → `ok`, `failed` → `bad`, `rolled-back` → `warn`, `in-progress` → `info`.
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, such as "4m 12s"; in-progress shows "running".
- Empty: when the filter matches no deploys, show "No deploys in staging" (naming the chosen environment) in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` values fall back to the default.
- Out of scope: details page, pagination, live refresh, any action on a deploy.

## Decisions the spec leaves open

- **Empty snapshot with "All environments":** the spec only names the filtered case. With no environment chosen the page says "No deploys". (`test/e2e/empty.test.js` renders every nav page against an empty snapshot, so this case does happen.)
- **Snapshot time and Started column format:** both use the existing `formatTimestamp` (`src/core/format/timestamp.js`, e.g. "2026-10-01 09:30 UTC"); the header line reads "Snapshot 2026-10-01 09:30 UTC". The Overview page prints the same "Snapshot …" wording.
- **Durations of an hour or more** stay in minutes and seconds ("75m 0s"), as the spec says.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filter, kit composition, status tone map, duration format |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, default order, both sorts, filter, chips, durations, empty states, query fallback |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add `{ href: '/deploys', label: 'Deploys' }` to `NAV` after Services |
| `test/server.test.js` | Modify | Route test, 503 test, add `/deploys` to the "every page in the nav" list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. The e2e suite renders every nav link against this folder |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot for the same suite |
| `README.md` | Modify | Name Deploys in the Pages list |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module that wires six kit components together. The full content is in the plan, but correctness depends on how the kit escapes and sorts.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing code, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Renders `<header class="kit-page-header"><div><h1>{title}</h1><p class="kit-muted">{subtitle}</p></div></header>`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. Renders a GET form; each `keep` entry becomes `<input type="hidden" name="k" value="v">`.
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`. The selected option renders as `<option value="x" selected>`. It carries `data-autosubmit`, and `public/kit.js` submits the form when the value changes.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Returns `empty` when `rows` is empty. Otherwise it sorts by `sort` (stable, compares `col.value ?? row[key]` with `localeCompare`), renders a cell as `<td>{render(row) or escaped row[key]}</td>`, and renders a sortable header as `<th aria-sort="ascending|descending"><a href="{escaped sortHref}">Label ▲|▼</a></th>` when active, `<th><a href="…">Label</a></th>` otherwise. Clicking the active column flips it; any other column starts `asc`.
  - `badge(label, tone) → string` from `#kit/badge`. Renders `<span class="kit-badge kit-badge--{tone}">{label}</span>`; an unknown tone becomes `muted`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`. Renders `<div class="kit-empty"><p class="kit-empty__title">{title}</p></div>`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`. Returns `"2026-10-01 09:30 UTC"`.
- Produces: `export function renderDeploys(snapshot, query)` in `src/pages/deploys.js`.
  - `snapshot`: `{ generatedAt: string, deploys: Array<{ id, service, version, environment, status, startedAt, finishedAt: string|null, author }> }`
  - `query`: plain object of query params (`Object.fromEntries(searchParams)`)
  - returns an HTML string (page body only; the server wraps it in the layout). Task 2 relies on this exact name and signature.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in snapshot order, and chosen so that newest-first,
// oldest-first and by-service give three different orders.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-2', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.2', environment: 'staging', status: 'failed', startedAt: '2026-10-01T07:30:00Z', finishedAt: '2026-10-01T07:32:05Z', author: 'ana' },
    { id: 'd-3', service: 'api', version: '3.15.0', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Service names in the order their rows appear.
const order = (html) =>
  ['api', 'billing', 'notifications', 'search']
    .map((name) => [name, html.indexOf(`<td>${name}</td>`)])
    .filter(([, at]) => at >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /<p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'api', 'notifications', 'billing']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(order(asc), ['api', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(desc), ['search', 'notifications', 'billing', 'api']);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(oldest), ['billing', 'notifications', 'api', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="asc">/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.deepEqual(order(newest), ['search', 'api', 'notifications', 'billing']);
});

test('filters by environment and keeps the filter when sorting', () => {
  const staging = renderDeploys(snapshot, { env: 'staging' });
  assert.deepEqual(order(staging), ['search', 'billing']);
  assert.match(staging, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(staging, /<option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option>/);
  assert.match(staging, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
  const production = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.deepEqual(order(production), ['api', 'notifications']);
  assert.match(production, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says there are no deploys when the snapshot is empty', () => {
  const html = renderDeploys({ generatedAt: snapshot.generatedAt, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'api', 'notifications', 'billing']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` / "Cannot find module … src/pages/deploys.js".

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';
import { formatTimestamp } from '../core/format/timestamp.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
      }),
    ],
    keep: { sort, dir },
  });

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, Object.hasOwn(TONES, d.status) ? TONES[d.status] : 'muted') },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: formatDuration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// finishedAt minus startedAt, such as "4m 12s". finishedAt is null while a
// deploy is in progress.
function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Do not escape `sortHref`'s return value yourself. `dataTable` escapes it, which is how `&` turns into `&amp;` in the tests. `env`, `key` and `next` always come from fixed allow-lists, never from raw query text.
- `formatTimestamp` and `formatDuration` only produce digits, letters, spaces, `-` and `:`, so returning them from `render` as "trusted HTML" is safe. The other text cells (service, version, environment, author) have no `render`, so `dataTable` escapes them.
- Sorting by service relies on `Array.prototype.sort` being stable: deploys of the same service keep their snapshot order (newest first).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run the whole suite to confirm nothing else moved: `node --test`
Expected: all tests pass (380 before this task, plus the 10 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration (server, layout, two fixture files, server tests, README). Every e2e test that visits the nav depends on it.

**Files:**
- Modify: `src/server.js` (import list, around line 31; `ROUTES`, after the `/services` entry on line 46)
- Modify: `src/layout.js` (`NAV`, after the Services entry on line 5)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (Pages section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). The existing `handle(url, { dataDir })` in `src/server.js` reads the `deploys` snapshot via `readSnapshot`, returns 503 with "Snapshot unavailable" if the read fails, and otherwise calls `render(snapshot, Object.fromEntries(searchParams))`.
- Produces: `GET /deploys` route and the "Deploys" nav link. Nothing downstream consumes them in code.

Why the fixtures belong in this task: `test/e2e/empty.test.js`, `single.test.js` and `missing.test.js` take every `<a href>` in the nav and render it against `test/e2e/fixtures/empty/`, `fixtures/single/` and a missing dir, expecting 200, 200 and 503. Neither fixture folder has a `deploys.json` today, so adding the nav link without them turns the empty and single runs into 503 failures.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the `paths` array in `serves every page in the nav`, directly after `'/services'`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

Then add these two tests after `renders the services page inside the layout`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.match(res.body, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The first test reads the real `data/deploys.json`, whose newest entry is `d-1042`, `search` 1.23.0-rc.1 in staging, `in-progress`.)

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The three tests that touch `/deploys` get status 404 instead of 200 / 503.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical position (after `renderDatabases`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route directly after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry directly after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

- [ ] **Step 4: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the sibling `services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" }
  ]
}
```

- [ ] **Step 5: Run the full suite to verify everything passes**

Run: `node --test`
Expected: all tests pass, including the new server tests and `test/e2e/{empty,single,missing,navigation,queries,titles}.test.js`, which now also visit `/deploys`. If `empty.test.js` or `single.test.js` fails on `/deploys` with 503, a fixture file is missing or misnamed. If either fails on `undefined|NaN`, look at `formatDuration` / `formatTimestamp` input.

Also check that the fixtures pass the repo's data verifier, which validates against `src/shared/schemas/deploys.js`:

Run: `node tools/harbor.js verify --data=test/e2e/fixtures/single --now=2026-10-01T09:31:00Z 2>&1 | grep deploys`
Expected: `ok    deploys`. (`--now` keeps the freshness rule from flagging the fixed fixture timestamp. Problems the verifier reports for other fixture files are not part of this task.)

- [ ] **Step 6: Update the README**

In `README.md`, under "## Pages", change the first sentence to name the new page:

```markdown
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

(Keep the rest of the paragraph, starting at "`src/server.js` routes requests …", unchanged.)

- [ ] **Step 7: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`, and check that:
- the "Deploys" link sits after "Services" and is highlighted
- choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`
- clicking "Service" keeps `env=staging`
- the chips are green, red, amber and blue

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it from the nav"
```
