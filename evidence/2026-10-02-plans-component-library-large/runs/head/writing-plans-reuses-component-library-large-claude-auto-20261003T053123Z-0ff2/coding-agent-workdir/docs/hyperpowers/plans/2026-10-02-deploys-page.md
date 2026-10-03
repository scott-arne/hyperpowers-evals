# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing the recent deploys from `data/deploys.json`. It has an environment filter, sorting by Service and Started, colored status chips and a duration column, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` and returns HTML like every other page. It is built from the vendored Keel kit components already in `vendor/kit/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`), so it writes no table, form, chip or empty-state markup of its own. Query handling (validate `env`/`sort`/`dir`, fall back to defaults, keep the filter in sort links and the sort in the filter form) follows `src/pages/services.js`. `src/server.js` gets a route and `src/layout.js` gets a nav entry after Services. The existing 503 path in `handle()` covers a missing snapshot with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`, kit components imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`. Nav label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is `null` while in progress.
- Header "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Changing it reloads with `?env=` and keeps the current sort.
- Columns in this order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first. Service and Started sort both ways via `?sort=` and `?dir=`, and changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` → default.
- Tests run with `node --test`.

## Grounding

- **Page module shape and naming:** `src/pages/services.js:1-17` shows `render<Page>(snapshot, query)`, the top-of-file comment documenting the query parameters, and the `ENVIRONMENTS` allow-list with fall-back-to-default parsing.
- **Sort links carry the filter, filter form carries the sort:** `src/pages/services.js:30-39` (sort header href `?env=…&sort=…&dir=…`) and `src/pages/services.js:87-94` (hidden `sort`/`dir` inputs). The kit equivalents are `vendor/kit/table/src/lib/table.js:51-61` (`headerCell`: active column flips, others start ascending, `aria-sort`) and `vendor/kit/filter-bar/src/lib/filter-bar.js:17-23` (`keep` → hidden inputs).
- **Kit components to reuse (none used by any page yet):** `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/select/src/lib/select.js:14-23` (`data-autosubmit`, submitted by `public/kit.js:7-10`), `vendor/kit/table/src/lib/table.js:22-44` (`dataTable`, with `render`, `sort`, `sortHref`, `empty`), `vendor/kit/badge/src/lib/badge.js:12-15` (tones `ok|warn|bad|info|muted`), `vendor/kit/empty/src/lib/empty.js:9-12`.
- **Chip colors:** `public/kit.css:2` defines `--kit-ok` green `#1a7f37`, `--kit-warn` amber `#9a6700`, `--kit-bad` red `#cf222e`, `--kit-info` blue `#0969da`, and `public/kit.css:19-24` applies them to `.kit-badge--*`. The app's own `.pill-*` (`public/app.css:19-23`) has no blue, which is why the page uses kit badges.
- **Kit import style:** `src/pages/services.js:1-3` uses `import { button } from '#kit/button';`, resolved by the `"imports"` map in `package.json`.
- **Timestamp formatting:** `src/core/format/timestamp.js:3-7` (`formatTimestamp(iso)` → `"2026-10-01 09:30 UTC"`, `''` for junk). Snapshot-time wording follows `src/pages/overview.js:29` ("Snapshot …").
- **Duration formatting:** none. There is no existing duration formatter in `src/core/format/`, so the page defines `formatDuration`.
- **Error handling (503):** `src/server.js:83-92` catches any `readSnapshot` failure and renders "Snapshot unavailable" with status 503. The page needs no error code of its own.
- **Routing and nav:** `src/server.js:43-74` (`ROUTES`), `src/server.js:7-36` (alphabetical page imports), `src/layout.js:3-34` (`NAV`).
- **Page test shape:** `test/pages/services.test.js:1-56` covers an inline snapshot fixture, `html.indexOf` ordering checks and `assert.match` on exact markup.
- **Server test shape:** `test/server.test.js:6-32`.
- **E2E fixtures every nav page needs:** `test/e2e/empty.test.js:9-16` and `test/e2e/single.test.js:9-16` walk every nav link against `test/e2e/fixtures/{empty,single}/`, so a new nav page without its fixture there fails with 503. Fixture format: `test/e2e/fixtures/empty/services.json`, `test/e2e/fixtures/single/services.json`.

## Decisions the spec leaves open

- **Started column display:** `formatTimestamp(startedAt)` ("2026-10-01 08:50 UTC"), the repo's UTC formatter. Sorting still compares the raw ISO string.
- **Default direction per column:** with no valid `dir`, `sort=startedAt` defaults to `desc` (newest first) and `sort=service` defaults to `asc`. Header links themselves follow the kit/Services rule: clicking the active column flips it, and any other column starts ascending.
- **Duration under a minute** renders as "0m 45s", so every value has the same shape.
- **"running"** is keyed on `finishedAt == null`, which the spec defines as exactly the in-progress case. This also avoids rendering `NaN` for any malformed row.
- **Empty with "All environments"** (an empty snapshot) reads "No deploys". The spec only fixes the wording for a chosen environment.
- **Unknown status values** get the kit's `muted` (grey) tone.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module built from six kit components. The plan has the full content, but the query-parsing and sort behavior is the substance of the spec.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `badge(label, tone)` from `#kit/badge`, `emptyState({ title })` from `#kit/empty`, `filterBar({ action, fields, keep })` from `#kit/filter-bar`, `pageHeader({ title, subtitle })` from `#kit/page-header`, `selectField({ name, label, options, value })` from `#kit/select`, `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/table`, `formatTimestamp(iso)` from `src/core/format/timestamp.js`.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: object[] }, query: Record<string, string>): string` and `export function formatDuration(startedAt: string, finishedAt: string | null): string`. Task 2 imports `renderDeploys`.

**Mirror:** `src/pages/services.js:1-17` (query parsing and header comment) and `test/pages/services.test.js` (test shape).

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1040', service: 'billing', version: '2.8.1', environment: 'production', status: 'failed', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:12:30Z', author: 'ana' },
    { id: 'd-1039', service: 'api', version: '3.1.1', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T07:40:00Z', finishedAt: '2026-10-01T07:47:05Z', author: 'li' },
  ],
};

const order = (html, names) => names.map((n) => html.indexOf(`<td>${n}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || positions[i - 1] < p));

test('shows the title, the snapshot time and the columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  for (const label of ['Version', 'Environment', 'Status', 'Duration', 'Author']) {
    assert.match(html, new RegExp(`<th>${label}</th>`));
  }
  assert.match(html, /<td>2026-10-01 08:50 UTC<\/td>/);
});

test('lists the newest deploy first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api'])));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(oldest, ['api', 'billing', 'notifications', 'search'])));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service' });
  assert.ok(ascending(order(az, ['api', 'billing', 'notifications', 'search'])));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(za, ['search', 'notifications', 'billing', 'api'])));
  assert.match(za, /<input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats the duration in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const production = renderDeploys(snapshot, { env: 'production' });
  assert.match(production, /<option value="production" selected>production<\/option>/);
  assert.equal(order(production, ['search'])[0], -1);
  assert.match(production, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.slice(1) }, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api'])));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the page module**

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

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const defaultDir = sort === 'startedAt' ? 'desc' : 'asc';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : defaultDir;

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

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

  // dataTable sorts the rows and builds the header links; the links carry the
  // filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; a deploy without a finish is still running.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt == null) return 'running';
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `sortHref` returns a raw `&`. `dataTable` escapes it to `&amp;` (`vendor/kit/table/src/lib/table.js:60`), so don't pre-escape it.
- `dataTable` escapes plain cells and treats `render` output as trusted HTML. `badge` and `emptyState` escape their own text, and `formatTimestamp`/`formatDuration` only produce digits and fixed words.
- Array sort is stable, so deploys with the same service keep the snapshot's newest-first order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Dashboard: add the deploys page renderer"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration (server, layout, e2e fixtures, README) that the nav-walking e2e suite exercises.

**Files:**
- Modify: `src/server.js:17` (import) and `src/server.js:45` (route)
- Modify: `src/layout.js:5` (nav entry)
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md:17` (page list)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` can't be read.

**Mirror:** `test/server.test.js:6-32` (server tests), `test/e2e/fixtures/empty/services.json` and `test/e2e/fixtures/single/services.json` (fixture format).

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` after `'/services'` in the path list of `serves every page in the nav`:

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
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `/deploys` answers 404, so the status assertions fail in all three tests.

- [ ] **Step 3: Wire the route and the nav link**

In `src/server.js`, add the import after the `renderDatabases` import (line 17), keeping imports alphabetical:

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add the route right after `/services` (line 45):

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry right after Services (line 5):

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Add the e2e fixtures**

`test/e2e/empty.test.js` and `test/e2e/single.test.js` render every nav link against their fixture directories. Without these files, `/deploys` answers 503 there and both tests fail.

Create `test/e2e/fixtures/empty/deploys.json`:

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

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS with 0 failures. This includes the new server tests and the nav-walking e2e tests (`navigation`, `titles`, `queries`, `empty`, `single`, `missing`), which now visit `/deploys`.

- [ ] **Step 6: Update the README page list**

In `README.md` line 17, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents, On-call
```

- [ ] **Step 7: Check the page by eye**

Run: `npm start`, then open `http://localhost:3000/deploys`. Confirm the Deploys nav link sits after Services, the chips are green/red/amber/blue, choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`, and clicking "Service" keeps `env`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Dashboard: add the Deploys page to the nav"
```
