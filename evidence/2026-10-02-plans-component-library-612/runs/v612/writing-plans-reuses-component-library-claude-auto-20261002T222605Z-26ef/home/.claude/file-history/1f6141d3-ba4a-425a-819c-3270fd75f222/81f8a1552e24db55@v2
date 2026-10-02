# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service and Started columns, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `statusChip`, `emptyState`). The library already does the hard parts: `dataTable` sorts rows, renders sort links with `aria-sort` and arrows, and swaps in empty content; `filterBar` carries the current sort in hidden inputs; `public/harbor.js` auto-submits `data-autosubmit` selects. The page only maps query values to a filter and sort, maps statuses to chip tones, and formats durations. The server gets one route entry and the layout one nav entry; the existing 503 handling in `handle()` covers the new route for free.

**Tech Stack:** Node ≥20, ES modules, no dependencies, server-rendered HTML strings, `node --test` with `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav link label "Deploys", placed after "Services".
- Data comes from `data/deploys.json` via the existing `readSnapshot('deploys')`; shape `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Out of scope: details page, pagination, live refresh, any deploy action.
- Tests use `node --test`; no new dependencies (`package.json` stays dependency-free).

## Design Decisions

- **Reuse `src/ui/`, do not copy `src/pages/services.js`.** The Services page predates the template and hand-rolls its table, pills, escaping and inline `onchange`. The deploys page uses the library components instead. Refactoring Services onto the library is a separate change and not part of this plan.
- **Chip tones** map onto the template's existing tones, whose colors already match the spec: `succeeded → ok` (green), `failed → bad` (red), `rolled-back → warn` (amber), `in-progress → info` (blue). No new CSS; `public/app.css` is untouched.
- **Query fallback is per parameter.** `env` defaults to all (`''`), `sort` to `startedAt`, `dir` to `desc`. So `?sort=bogus&dir=asc` gives Started ascending, and `?sort=service` with no `dir` gives Service descending. Header links always carry both `sort` and `dir`, so the per-parameter rule only matters for hand-edited URLs.
- **"All environments" has option value `''`.** Submitting it sends `env=`, which falls back to all. Sort links leave out `env` when it is all.
- **Ties within a service sort stay newest first.** Rows are put in newest-first order before `dataTable`'s stable sort runs, so several deploys of one service still list newest first.
- **Duration format** is always `<m>m <s>s`, also under a minute (`0m 45s`) and past an hour (`72m 5s`); the spec asks for minutes and seconds only. Seconds are rounded to the nearest whole second.
- **Started** shows the raw ISO timestamp, the same way the Services page shows `deployedAt`.
- **Empty with no filter** (an empty snapshot) says "No deploys". The spec only names the filtered case.

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)` and `formatDuration(deploy)`; all deploy-specific page logic.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — import `renderDeploys`, add the `/deploys` route.
- Modify `src/layout.js` — add the nav entry after Services.
- Modify `test/server.test.js` — route, nav and 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that composes several library components and holds the query fallback logic.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`):
  - `pageHeader({ title, subtitle? }) → string`
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string`
  - `selectField({ name, label, options: {value,label}[], value }) → string`
  - `dataTable({ columns, rows, sort: {key, dir}, sortHref: (key, dir) => string, empty: string }) → string`. Columns are `{ key, label, sortable?, render?(row) }`; `render` returns trusted HTML. The table escapes `sortHref` output itself.
  - `statusChip(label, tone) → string`, tones `'ok'|'warn'|'bad'|'info'|'muted'`
  - `emptyState({ title }) → string`
- Produces:
  - `export function renderDeploys(snapshot, query): string`. `snapshot` is the parsed `deploys.json`; `query` is a plain object of query parameters (what `handle()` passes as `Object.fromEntries(searchParams)`).
  - `export function formatDuration(deploy: { status, startedAt, finishedAt }): string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const search = { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' };
const notifications = { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' };
const billing = { id: 'd-2', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' };
const gateway = { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' };

// Deliberately not in date order, so the tests prove the page sorts.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [billing, search, gateway, notifications],
};

// Asserts each version's cell appears, in the given order.
function assertOrder(html, versions) {
  const positions = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  assert.ok(positions.every((p) => p >= 0), `missing a row: ${versions} at ${positions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  const labels = ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author'];
  const positions = labels.map((l) => html.search(new RegExp(`<th[^>]*>(<a [^>]*>)?${l}`)));
  assert.ok(positions.every((p) => p >= 0), `missing a column: ${positions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '3.14.2']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a>/);
});

test('sorts by started time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['3.14.2', '2.9.0-rc.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(html, /<th aria-sort="ascending"><a href="\/deploys\?sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(asc, ['3.14.2', '2.9.0-rc.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);

  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(desc, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '3.14.2']);
});

test('keeps deploys of one service newest first when sorting by service', () => {
  const older = { ...notifications, id: 'd-0', version: '0.9.3', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z' };
  const html = renderDeploys({ ...snapshot, deploys: [older, notifications] }, { sort: 'service', dir: 'asc' });
  assertOrder(html, ['0.9.4', '0.9.3']);
});

test('filters by environment and keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assertOrder(html, ['1.23.0-rc.1', '2.9.0-rc.3']);
  assert.doesNotMatch(html, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(html, /<td>3\.14\.2<\/td>/);
  assert.match(html, /<a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a>/);
});

test('the filter form keeps the current sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="production">production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formatDuration', () => {
  assert.equal(formatDuration(notifications), '4m 12s');
  assert.equal(formatDuration(billing), '2m 30s');
  assert.equal(formatDuration({ status: 'succeeded', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:00:45Z' }), '0m 45s');
  assert.equal(formatDuration({ status: 'succeeded', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T09:12:05Z' }), '72m 5s');
  assert.equal(formatDuration(search), 'running');
});

test('names the environment when the filter matches no deploys', () => {
  const html = renderDeploys({ ...snapshot, deploys: [notifications, gateway] }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '3.14.2']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import {
  dataTable,
  emptyState,
  filterBar,
  pageHeader,
  selectField,
  statusChip,
} from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const DIRS = ['asc', 'desc'];

const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: formatDuration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = {
    key: SORTS.includes(query.sort) ? query.sort : 'startedAt',
    dir: DIRS.includes(query.dir) ? query.dir : 'desc',
  };

  // Newest first before the table sorts, so ties in a service sort stay
  // newest first.
  const deploys = snapshot.deploys
    .filter((d) => !env || d.environment === env)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: '', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
      }),
    ],
    keep: { sort: sort.key, dir: sort.dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort,
    sortHref: (key, dir) => deploysHref({ env, sort: key, dir }),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s", or "running" while the deploy has not finished.
export function formatDuration({ status, startedAt, finishedAt }) {
  if (status === 'in-progress' || !finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function deploysHref(params) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return `/deploys?${search}`;
}
```

Notes for the implementer:
- `snapshot.deploys.filter(...)` returns a new array, so the `.sort()` after it does not change the snapshot.
- `formatDuration` output is only digits and letters, so passing it straight to `render` (trusted HTML) is safe. Every other text cell is escaped by `dataTable` or `statusChip`.
- An unexpected status value gets the `muted` chip through `statusChip`'s own fallback. No extra handling needed.
- Do not change anything under `src/ui/`. It is vendored ("Keep local edits small so template updates still apply").

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, all 13 tests.

Then run the whole suite: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route and nav link

**Risk tier:** standard — touches the request router and shared layout (multi-file integration); the 503 path must be shown to cover the new snapshot.

**Files:**
- Modify: `src/server.js` (imports near line 8; `ROUTES` at lines 15-18)
- Modify: `src/layout.js` (`NAV` at lines 3-6)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir }) → Promise<{ status, type, body }>`.
- Produces: the `/deploys` route and the "Deploys" nav entry.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, replace the import block at the top with:

```js
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

// A data dir with services.json but no deploys.json, so only the deploys
// snapshot is missing.
async function dataDirWithoutDeploys() {
  const dir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await copyFile(join(DATA_DIR, 'services.json'), join(dir, 'services.json'));
  return dir;
}
```

Then append these tests at the end of the file:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const { body } = await handle('/');
  const services = body.indexOf('<a href="/services">Services</a>');
  const deploys = body.indexOf('<a href="/deploys">Deploys</a>');
  assert.ok(services >= 0 && deploys > services);
});

test('answers 503 when deploys.json is missing', async () => {
  const dataDir = await dataDirWithoutDeploys();
  try {
    const res = await handle('/deploys', { dataDir });
    assert.equal(res.status, 503);
    assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
    assert.equal((await handle('/services', { dataDir })).status, 200);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('answers 503 when deploys.json is unreadable', async () => {
  const dataDir = await dataDirWithoutDeploys();
  try {
    await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10');
    const res = await handle('/deploys', { dataDir });
    assert.equal(res.status, 503);
    assert.match(res.body, /Snapshot unavailable/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the four new tests FAIL. `/deploys` answers 404 (`404 !== 200` / `404 !== 503`), and the nav has no Deploys link. The four existing tests still PASS.

- [ ] **Step 3: Add the route and the nav entry**

In `src/server.js`, add the import after the `renderOverview` import:

```js
import { renderDeploys } from './pages/deploys.js';
```

and extend `ROUTES`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

In `src/layout.js`, extend `NAV`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

Nothing else changes. `handle()` already turns a failed `readSnapshot` into the 503 "Snapshot unavailable" page using the route's title, and it passes the query as a plain object.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS for the whole suite, including the four new server tests and the Task 1 page tests.

- [ ] **Step 5: Check it in the running app**

Run: `PORT=3123 npm start` in the background, then:

```bash
curl -s 'http://localhost:3123/deploys?env=staging&sort=service&dir=asc' | grep -E 'No deploys|ui-chip|<option|aria-sort'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3123/deploys?env=moon&sort=x&dir=y'
```

Expected: staging rows only (search, api-gateway, billing) with chips, `<option value="staging" selected>`, `aria-sort="ascending"` on Service; the second command prints `200`. Stop the server afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Add the /deploys route and nav link"
```

---

## Spec Coverage

| Spec requirement | Task |
|---|---|
| `/deploys` route, read-only | 2 |
| Nav link "Deploys" after "Services" | 2 |
| Reads `data/deploys.json` | 2 (route `snapshot: 'deploys'`) |
| Header + snapshot time | 1 |
| Env dropdown, default All, `?env=`, keeps sort | 1 (`filterBar` `keep`) |
| Columns in order, newest first default | 1 |
| Service/Started sortable both ways, keeps filter | 1 (`sortHref` carries `env`) |
| Status chip colors | 1 |
| Duration "4m 12s" / "running" | 1 |
| Empty "No deploys in staging" in place of table | 1 |
| 503 for missing/unreadable snapshot | 2 |
| Unknown env/sort/dir → default | 1 |
| Rendering tests + server test for route and 503 | 1, 2 |
