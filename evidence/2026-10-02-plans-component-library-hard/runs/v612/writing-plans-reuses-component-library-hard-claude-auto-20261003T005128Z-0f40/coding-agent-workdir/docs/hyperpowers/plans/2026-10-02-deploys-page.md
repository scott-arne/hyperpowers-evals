# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`. The page has an environment filter, sorting on Service and Started, colored status chips, durations and an empty state. A "Deploys" link goes in the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` the same way the other pages do. `src/server.js` gets a `/deploys` route, which brings the existing generic 503 handling with it. The page is assembled from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`). It does **not** copy the hand-written table, sort links, form and `.pill` markup from `src/pages/services.js`. The spec's "behave as on the Services page" describes behavior: query parameters, defaults, and filter and sort carrying each other. The kit components already implement that behavior. `dataTable` builds the same sort links and `aria-sort`/▲▼ headers, and `filterBar`'s `keep` carries the sort through a filter change.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`). `finishedAt` is `null` while in progress.
- `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`. Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Header text "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Default order: newest first.
- Service and Started are sortable both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Duration is `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` falls back to the default.
- Tests use `node --test` (`npm test`). The full suite must stay green.
- Do not edit anything under `vendor/kit/`. It is the vendored Keel template; use it as-is.

## Design decisions (read before Task 1)

- **Query values:** `sort` ∈ `service | startedAt` (default `startedAt`), `dir` ∈ `asc | desc` (default `desc`). Each one is validated on its own, so an unknown value falls back to its own default. `env` ∈ `production | staging`, otherwise `all`. Validate `sort` with `Object.hasOwn` on a lookup object, like Services does, so `?sort=constructor` can't slip through.
- **Sort links:** `sortHref(key, dir)` returns `?env=${env}&sort=${key}&dir=${dir}`. This is relative, like Services. `dataTable` escapes it, so the HTML contains `&amp;`. Clicking the active column flips its direction, and clicking another column starts ascending (built into `dataTable`).
- **Ties:** `dataTable` uses `Array.prototype.sort`, which is stable. Rows with the same service keep their snapshot order, which the pipeline writes newest first. No extra tiebreaker is needed.
- **Status → badge tone:** `succeeded → ok`, `failed → bad`, `rolled-back → warn`, `in-progress → info`. Anything unknown → `muted`. `kit.css` already defines these as green `#1a7f37`, red `#cf222e`, amber `#9a6700` and blue `#0969da`, so no CSS changes are needed.
- **Snapshot time:** the subtitle is `Snapshot ${generatedAt}`, the same wording and raw ISO format the Overview page uses. Started is likewise shown as the raw ISO string, as Services shows `deployedAt`.
- **Duration:** whole seconds, rounded. Formatted as `${Math.floor(s / 60)}m ${s % 60}s`, so 45 seconds is "0m 45s" and 62 minutes is "62m 5s". The spec asks for minutes and seconds only, with no hours unit.
- **Empty state:** `emptyState({ title: 'No deploys in staging' })` is passed as `dataTable`'s `empty`. With `env=all` (only possible if the snapshot is empty) the title is plain "No deploys".

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module that wires six kit components together with query validation; the plan contains the full code, but it is more than a mechanical single-file copy.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (vendored kit, unchanged):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `filterBar({ action, fields: string[], keep?: Record<string,string|undefined> }) → string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key,dir}, sortHref?: (key,dir)=>string, empty?: string }) → string` from `#kit/table`. A column is `{ key, label, sortable?, render?(row)→trustedHtml, value?(row) }`.
  - `badge(label, tone) → string` from `#kit/badge`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string,string>) → string` (HTML body fragment, wrapped by `layout` in the server)
  - `formatDuration(startedAt: string, finishedAt: string | null) → string`, exported so it can be tested directly

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-09-30T14:00:00Z', finishedAt: '2026-09-30T14:04:12Z', author: 'sam' },
    { id: 'd-0', service: 'api', version: '3.1.0', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T10:00:00Z', finishedAt: '2026-09-30T10:00:45Z', author: 'lee' },
  ],
};

// Position of a service's cell in the HTML, for order assertions.
const at = (html, service) => {
  const i = html.indexOf(`<td>${service}</td>`);
  assert.notEqual(i, -1, `${service} row missing`);
  return i;
};

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<header class="kit-page-header"><div><h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p><\/div><\/header>/);
});

test('lists every deploy newest first with the spec columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(at(html, 'search') < at(html, 'notifications'));
  assert.ok(at(html, 'notifications') < at(html, 'billing'));
  assert.ok(at(html, 'billing') < at(html, 'api'));
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>1\.23\.0-rc\.1<\/td><td>staging<\/td>/);
  assert.match(html, /<td>2026-10-01T09:05:00Z<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(at(asc, 'api') < at(asc, 'billing'));
  assert.ok(at(asc, 'notifications') < at(asc, 'search'));
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(at(desc, 'search') < at(desc, 'notifications'));
  assert.ok(at(desc, 'billing') < at(desc, 'api'));
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(at(oldest, 'api') < at(oldest, 'search'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(oldest, /<input type="hidden" name="dir" value="asc">/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option>/);
  assert.match(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
});

test('colors each status with a chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration('2026-09-30T14:00:00Z', '2026-09-30T14:04:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-09-30T10:00:00Z', '2026-09-30T10:00:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-09-30T10:00:00Z', '2026-09-30T11:02:05Z'), '62m 5s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const onlyProduction = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(onlyProduction, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.ok(at(html, 'search') < at(html, 'api'));
});

test('escapes snapshot text', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<b>x</b>' }] };
  assert.match(renderDeploys(evil, {}), /<td>&lt;b&gt;x&lt;\/b&gt;<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `Cannot find module '.../src/pages/deploys.js'` (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';

// Recent deploys, newest first. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = { service: true, startedAt: true };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status] ?? 'muted') },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const filter = filterBar({
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

  // The header links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from two ISO timestamps; "running" while the deploy has no finish.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests, 0 failures.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 28 tests (18 existing + 10 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — integration across `server.js`, `layout.js`, the server test and the README; small, but it changes the routing table and the nav every page shares.

**Files:**
- Modify: `src/server.js` (imports at lines 7-12; `ROUTES` at lines 17-23)
- Modify: `src/layout.js` (`NAV` at lines 3-9)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 HTML wrapped in `layout`, or 503 "Snapshot unavailable" when `deploys.json` can't be read. The nav gains `{ href: '/deploys', label: 'Deploys' }`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the nav loop and add two tests. Change:

```js
  for (const path of ['/', '/services', '/incidents', '/oncall', '/runbooks']) {
```

to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Then append after the existing `'answers 503 when the snapshot cannot be read'` test:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`data/deploys.json` has production `notifications` deploys, and the `env=production` filter must drop every staging row.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` fails with `404 !== 200` for `/deploys`, and both new tests fail on status 404.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, between `./layout.js` and `./pages/incidents.js`:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, insert after the Services entry:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 30 tests, 0 failures.

- [ ] **Step 6: Update the README**

In `README.md`, change the Pages paragraph's first line from:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 7: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`. Confirm that:
- the "Deploys" link sits after "Services" and is highlighted
- picking "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`
- clicking "Service" sorts A→Z and keeps `env=staging`
- the chips are green, red, amber and blue

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Route /deploys and link it from the nav"
```

---

## Spec coverage

| Spec requirement | Where |
|---|---|
| `/deploys` route, nav link after Services | Task 2 Steps 3-4; server test |
| Header "Deploys" + snapshot time | Task 1 `pageHeader`; test "shows the header" |
| Env filter, default All, `?env=`, keeps sort | Task 1 `filterBar` `keep`; tests "filters…", "sorts by start time… keeps the sort" |
| Seven columns, newest first | Task 1 `COLUMNS`; test "lists every deploy" |
| Service/Started sortable both ways, keeps filter | Task 1 `sortHref`; tests "sorts by service", "sorts by start time", "filters… keeps the filter" |
| Status chip colors | Task 1 `TONES`; test "colors each status" |
| Duration "4m 12s" / "running" | Task 1 `formatDuration`; test "formats durations" |
| Empty state naming the environment | Task 1 `emptyState`; test "names the environment" |
| 503 on missing/unreadable snapshot | Task 2 route (generic handler); test "answers 503… deploys" |
| Unknown env/sort/dir → default | Task 1 validation; test "falls back to the defaults" |
| `node --test`, rendering + server tests | Both tasks |
