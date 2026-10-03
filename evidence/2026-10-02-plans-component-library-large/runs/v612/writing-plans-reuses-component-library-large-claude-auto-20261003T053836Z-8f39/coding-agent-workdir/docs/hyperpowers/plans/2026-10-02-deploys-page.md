# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`. It has an environment filter, sorting by Service and Started, colored status chips, a duration column and an empty state.

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It has the same shape and query handling as `src/pages/services.js`, but builds its markup from the vendored Keel kit (`#kit/*`, mapped in `package.json` `imports`) instead of hand-written HTML. The kit pieces are `pageHeader`, `filterBar`, `selectField`, `dataTable` (which sorts the rows and builds the sort links), `badge` and `emptyState`. `src/server.js` gets a route and `src/layout.js` a nav link after Services. The server's existing try/catch around `readSnapshot` already gives the 503 page, so no error handling is new.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies, `node --test` with `node:assert/strict`, vendored kit under `vendor/kit/` (read-only. Do not edit it).

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services" in `src/layout.js` `NAV`; page title "Deploys".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`; `status` ∈ `succeeded | failed | rolled-back | in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → the default.
- Tests run with `node --test` (`npm test`). The whole suite must stay green.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | Parse the query, filter, and render the page from kit components |
| `test/pages/deploys.test.js` | Create | Rendering tests (filter, sorts, chips, duration, empty, fallbacks) |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add the `{ href: '/deploys', label: 'Deploys' }` nav entry after Services |
| `test/server.test.js` | Modify | Route test, nav-order test, 503 test for a missing and a corrupt snapshot; add `/deploys` to the every-page list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. The e2e suites walk every nav link against these fixture dirs, so without it they get a 503 |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot (in-progress, so the `null` `finishedAt` path runs) |
| `README.md` | Modify | Mention Deploys in the Pages list |

**Kit components used** (all under `vendor/kit/<name>/src/lib/`, imported as `#kit/<name>`; their exact output is what the tests assert):

- `pageHeader({ title, subtitle })` → `<header class="kit-page-header"><div><h1>Deploys</h1><p class="kit-muted">…</p></div></header>`
- `filterBar({ action, fields, keep })` → `<form class="kit-filter-bar" method="get" action="/deploys">…<input type="hidden" name="sort" value="…">…</form>`. `public/kit.js` submits the form when a `data-autosubmit` field changes.
- `selectField({ name, label, options, value })` → `<label class="kit-field">…<select name="env" class="kit-select" data-autosubmit><option value="staging" selected>staging</option>…`
- `dataTable({ columns, rows, sort, sortHref, empty })` sorts `rows` by `sort` (comparing `col.value ?? row[key]` with `localeCompare`) and renders `<td>` cells, escaped by default or from `col.render` (trusted HTML). Sortable headers look like `<th aria-sort="descending"><a href="?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼</a></th>`: the active column flips direction and other columns start ascending. With no rows it returns `empty` instead of the table.
- `badge(label, tone)` → `<span class="kit-badge kit-badge--ok">succeeded</span>`. In `public/kit.css`, tones are `ok` green `#1a7f37`, `bad` red `#cf222e`, `warn` amber `#9a6700`, `info` blue `#0969da`, and an unknown tone falls back to `muted`.
- `emptyState({ title })` → `<div class="kit-empty"><p class="kit-empty__title">No deploys in staging</p></div>`

Also reused: `formatTimestamp(iso)` from `src/core/format/timestamp.js` (`'2026-10-01T09:30:42Z'` → `'2026-10-01 09:30 UTC'`) for the snapshot time and the Started column.

---

### Task 1: Deploys page renderer

**Risk tier:** standard: new page module with query parsing and rendering behavior.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `#kit/badge` `badge(label, tone)`, `#kit/empty` `emptyState({ title })`, `#kit/filter-bar` `filterBar({ action, fields, keep })`, `#kit/page-header` `pageHeader({ title, subtitle })`, `#kit/select` `selectField({ name, label, options, value })`, `#kit/table` `dataTable({ columns, rows, sort, sortHref, empty })`, `formatTimestamp(iso): string`.
- Produces: `export function renderDeploys(snapshot, query): string`, where `snapshot` is the parsed `deploys.json` and `query` a plain object of query params (`Object.fromEntries(searchParams)`). Returns the page body HTML, without the layout. Task 2 wires it into `src/server.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture rows are deliberately **not** in newest-first order, so the default-order test proves the page sorts.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Out of order on purpose: the page must sort, not trust the file's order.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'failed', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'sam' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T07:40:00Z', finishedAt: '2026-10-01T07:41:05Z', author: 'lena' },
  ],
};

const order = (html, names) => {
  const at = names.map((n) => html.indexOf(`<td>${n}</td>`));
  assert.ok(at.every((i) => i >= 0), `all of ${names} present`);
  return at.every((i, k) => k === 0 || at[k - 1] < i);
};

test('shows the title, the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(order(html, ['search', 'notifications', 'api-gateway', 'billing']));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by started time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(order(oldest, ['billing', 'api-gateway', 'notifications', 'search']));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(order(newest, ['search', 'notifications', 'api-gateway', 'billing']));
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(order(az, ['api-gateway', 'billing', 'notifications', 'search']));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(order(za, ['search', 'notifications', 'billing', 'api-gateway']));
  assert.match(za, /<input type="hidden" name="sort" value="service">/);
  assert.match(za, /<input type="hidden" name="dir" value="desc">/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.ok(order(html, ['notifications', 'billing', 'api-gateway']));
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('offers the environments in a self-submitting dropdown', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(
    html,
    /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/,
  );
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
  assert.match(html, /<td>1m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says so when there are no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.ok(order(html, ['search', 'notifications', 'api-gateway', 'billing']));
});

test('escapes text from the snapshot', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<script>x</script>' }] };
  const html = renderDeploys(evil, {});
  assert.match(html, /<td>&lt;script&gt;x&lt;\/script&gt;<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `src/pages/deploys.js`).

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = ['asc', 'desc'].includes(query.dir) ? query.dir : sort === 'startedAt' ? 'desc' : 'asc';

  const deploys = env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const options = [
    { value: 'all', label: 'All environments' },
    ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
  ];
  const filters = filterBar({
    action: '/deploys',
    fields: [selectField({ name: 'env', label: 'Environment', options, value: env })],
    keep: { sort, dir },
  });

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });
  return `${header}
${filters}
${table}`;
}

// "4m 12s" once finished; finishedAt stays null while the deploy runs.
function duration({ startedAt, finishedAt }) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `sortHref` returns a raw `&`. `dataTable` escapes it to `&amp;` when it writes the attribute. Do not pre-escape, or you get `&amp;amp;`.
- `TONES[d.status]` for an unknown status is `undefined` (or an inherited `Object.prototype` member, which is never a valid tone). `badge` maps either to `muted`, so no guard is needed.
- `dataTable` uses `Array.prototype.sort`, which is stable. Rows with the same service keep the snapshot's newest-first order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: render the deploys snapshot with the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard: multi-file integration (server routing, layout nav, the e2e fixtures every nav-walking suite reads).

**Files:**
- Modify: `src/server.js` (imports block; `ROUTES`, after the `/services` entry)
- Modify: `src/layout.js` (`NAV`, after the Services entry)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` ("Pages" section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `handle(url, { dataDir })` from `src/server.js`.
- Produces: `GET /deploys` → 200 with the page in the layout, or 503 "Snapshot unavailable" when `deploys.json` cannot be read or parsed.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the imports at the top to:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

In the `'serves every page in the nav'` test, add `'/deploys'` after `'/services'`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

Add these tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('lists Deploys in the nav right after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services"[^>]*>Services<\/a><a href="\/deploys"[^>]*>Deploys<\/a>/);
});

test('answers 503 for deploys when its snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const gone = await handle('/deploys', { dataDir: missing });
  assert.equal(gone.status, 503);
  assert.match(gone.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(gone.body, /Snapshot unavailable/);

  const dir = await mkdtemp(join(tmpdir(), 'harbor-deploys-'));
  try {
    await writeFile(join(dir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:', 'utf8');
    const torn = await handle('/deploys', { dataDir: dir });
    assert.equal(torn.status, 503);
    assert.match(torn.body, /Snapshot unavailable/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

(`data/deploys.json` has production deploys of `notifications` and staging deploys of `search`, `billing` and `api-gateway`, so `<td>staging</td>` must not appear under `?env=production`.)

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The new deploys tests and `'serves every page in the nav'` get a 404 (status 404, not 200/503), and the nav-order test finds no `/deploys` link.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical position (after `renderDatabases`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js` `NAV`, after the Services entry:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 6: Run the e2e suites to see the missing fixtures**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys`. Those suites walk every nav link against `test/e2e/fixtures/{empty,single}/`, which have no `deploys.json` yet.

- [ ] **Step 7: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the sibling `services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. It is in progress so the `finishedAt: null` path is exercised under the suite's `undefined|NaN` check:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 8: Update the README**

In `README.md`, under "## Pages", change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 9: Run the whole suite**

Run: `npm test`
Expected: PASS, everything green. This includes `test/e2e/navigation.test.js` (Deploys marks itself current), `titles.test.js` ("Deploys · Harbor"), `queries.test.js` (bogus params give 200), `missing.test.js` (503) and `empty`/`single` (200, no `undefined`/`NaN`).

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys page: add the route and the nav link after Services"
```

---

## Spec coverage

| Spec requirement | Where |
|---|---|
| `/deploys` route, "Deploys" nav link after Services | Task 2 Steps 3–4; tests in Task 2 Step 1 |
| Header "Deploys" + snapshot time | Task 1 (`pageHeader`, test "shows the title…") |
| Environment filter, default "All environments", reload with `?env=` keeping sort | Task 1 (`filterBar` + `selectField` with `keep: { sort, dir }`; tests "offers the environments…", "sorts by service…") |
| Columns in order, newest first by default | Task 1 (`COLUMNS`; tests "shows the title…", "lists newest first…") |
| Service/Started sortable both ways, sort keeps filter | Task 1 (`dataTable` + `sortHref`; three sort/filter tests) |
| Status chip colors | Task 1 (`TONES` → kit tones; test "colors each status") |
| Duration "4m 12s" / "running" | Task 1 (`duration`; test "shows durations…") |
| Empty "No deploys in staging" in place of the table | Task 1 (`emptyState`; test "names the environment…") |
| 503 "Snapshot unavailable" for missing/unreadable file | Existing `handle` try/catch; Task 2 test covers missing and corrupt |
| Unknown `env`/`sort`/`dir` fall back | Task 1 (allowlists; test "falls back…"); e2e `queries.test.js` in Task 2 Step 9 |
| `node --test` rendering + server tests | Tasks 1 and 2 |

## Choices the spec leaves open

- **Kit over hand-rolled markup.** `services.js` predates most of the kit and hand-writes its table, pills and form. The kit already has every piece this page needs (header, filter bar, select, sortable table, badge, empty state), so the new page uses them and doesn't copy the Services HTML. The behavior matches the spec's reference to Services: the same query parameters, fallbacks and header-link flipping.
- **No filter, no deploys:** with "All environments" and an empty snapshot, the page says "No deploys", because there is no environment to name.
- **Default direction per column:** with no valid `dir`, Started defaults to descending (newest first) and Service to ascending.
- **Timestamps** use the existing `formatTimestamp` helper ("2026-10-01 09:05 UTC") for the snapshot time and the Started column.
- **Durations over an hour** stay in minutes ("75m 0s"), as the spec states minutes and seconds.
