# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the pipeline's recent deploys, filterable by environment and sortable by service or start time, so whoever is on call can spot a failed or rolled-back deploy at a glance.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)` and builds the page **entirely from the vendored Harbor component library in `src/ui/`**: `pageHeader`, `filterBar` + `selectField`, `dataTable` (which already does sorting, sort links and the empty-state swap), `statusChip` and `emptyState`. `src/server.js` gets one new `ROUTES` entry, which gives it the existing snapshot read and 503 handling for free, and `src/layout.js` gets one new `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; the nav link reads "Deploys" and comes right after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot is `data/deploys.json` (`{ generatedAt, deploys: [...] }`), read with the existing `readSnapshot('deploys', dataDir)`. Do not modify `data/deploys.json`.
- Header title "Deploys", with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Default order is newest first (`startedAt` descending).
- Only Service and Started are sortable, both ways, through `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, such as "4m 12s". An in-progress deploy (`finishedAt: null`) shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) **in place of** the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. An unknown `env`, `sort` or `dir` falls back to the default.
- Tests use `node --test` (`npm test`). No new dependencies (`README.md`: "No dependencies; Node 20 or later").
- **Use the `src/ui/` components, not hand-rolled markup.** `src/pages/services.js` predates the template and hand-rolls its table, `<select>`, pills and `escapeHtml`; do not copy it and do not refactor it (out of scope). `src/ui/` is vendored ("Keep local edits small so template updates still apply", `src/ui/index.js:1-2`). This plan needs no changes there, and no new CSS: `public/harbor.css` already styles every component used.

## Grounding

- Page module shape (named `render<Page>(snapshot, query)` export, `pageHeader` with `Snapshot ${generatedAt}` subtitle, components imported from `../ui/index.js`): `src/pages/overview.js:1-24`.
- Status chips (map domain state → tone at the call site; unknown tone falls back to `muted`): `src/ui/chip.js:3-15`. Tones `ok`/`bad`/`warn`/`info` are green/red/amber/blue in `public/harbor.css:2,23-26`.
- Table, sorting, sort links, empty swap: `src/ui/table.js:20-69`. `sortHref(key, nextDir)` builds header links; the active column flips direction, inactive columns link with `asc`; `empty` replaces the whole table when there are no rows; `render` returns trusted HTML, otherwise cells are escaped.
- Filter form that keeps the sort: `src/ui/filter-bar.js:15-21` (`keep` becomes hidden inputs; empty values are dropped) and `src/ui/select.js:13-21` (`data-autosubmit`, which `public/harbor.js:2-5` submits on change).
- Empty state: `src/ui/empty-state.js:9-12`.
- Query parsing and fallback convention (whitelist, else default): `src/pages/services.js:3-7`. This is the **only** part of `services.js` to imitate.
- Routing, snapshot read, 503 handling: `src/server.js:14-39`. Routes are a table keyed by pathname; the 503 is generic over `route.title`.
- Nav: `src/layout.js:3-6`.
- Error handling in pages: none. Pages are pure renderers and trust the snapshot shape; read/parse failures are handled once in `src/server.js:26-37`.
- Page test shape (fixture snapshot const at top, one behavior per `test`, `assert.match` on exact HTML fragments, ordering by position): `test/pages/services.test.js:1-37`.
- Server test shape (call `handle()` directly; `dataDir` pointing at a missing dir for the 503): `test/server.test.js:1-19`.
- Unreadable (malformed) snapshot test: `none: no existing test writes a bad snapshot file`; Task 3 adds one with `mkdtemp`.

## File Structure

- Create `src/pages/deploys.js`: the Deploys page renderer: query parsing, filtering, column definitions, status→tone map, duration format, sort/filter URLs.
- Create `test/pages/deploys.test.js`: rendering tests for the page.
- Modify `src/server.js`: import `renderDeploys`, add the `/deploys` route.
- Modify `src/layout.js`: add the "Deploys" nav entry after "Services".
- Modify `test/server.test.js`: route, nav and 503 tests.

## Decisions the spec leaves open

- **Default direction per sort column:** `startedAt` defaults to `desc` (newest first, per spec), `service` to `asc`. An invalid `dir` falls back to the chosen column's default; an invalid `sort` falls back to `startedAt`. Each parameter falls back on its own.
- **Inactive sort links go `asc` first.** That's what `dataTable` already does (`src/ui/table.js:50`). Clicking "Started" while sorted by Service gives oldest first, and clicking again gives newest first. We keep the component's behavior rather than patching vendored code.
- **"All environments" is the empty value** (`env=` or no `env`). Sort links leave out `env` entirely when showing all.
- **Started shows the raw ISO timestamp**, as the Services page shows `deployedAt` today. The spec doesn't ask for any other format.
- **Empty text when there is no filter and no deploys:** "No deploys" (the spec only covers the filtered case).

---

### Task 1: Deploys table: header, columns, status chips, durations, newest first

**Risk tier:** standard: new page module whose behavior the later tasks build on.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js`: `dataTable({ columns, rows, sort, sortHref?, empty? }) → string`, `pageHeader({ title, subtitle }) → string`, `statusChip(label, tone?) → string`.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query?: Record<string, string>) → string` (HTML fragment, no layout). In this task `query` is ignored; Task 2 honors it. Task 3 registers it in `ROUTES`.

**Mirror:** `src/pages/overview.js:1-24`: imports from `../ui/index.js`, `pageHeader` with the `Snapshot ${snapshot.generatedAt}` subtitle, returns a template string. **Do not** mirror `src/pages/services.js:24-74` (hand-rolled table, pills, escaping).

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in date order, so the default sort has work to do.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'billing', version: '2.9.0', environment: 'production', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-09-29T08:50:00Z', finishedAt: '2026-09-29T08:54:12Z', author: 'marco' },
    { id: 'd-3', service: 'api', version: '3.1.0', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T08:10:00Z', finishedAt: '2026-09-30T08:31:40Z', author: 'dana' },
  ],
};

// Service column of each body row, top to bottom.
const services = (html) => [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);

// Header labels without sort links or arrows.
const headers = (html) =>
  [...html.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/ [▲▼]$/, ''));

test('shows the title, the snapshot time and the columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.deepEqual(headers(html), ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest deploys first by default', () => {
  assert.deepEqual(services(renderDeploys(snapshot, {})), ['search', 'billing', 'api', 'notifications']);
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, pageHeader, statusChip } from '../ui/index.js';

// Recent deploys, newest first.
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => duration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot) {
  const table = dataTable({
    columns: COLUMNS,
    rows: snapshot.deploys,
    sort: { key: 'startedAt', dir: 'desc' },
  });
  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" while in progress.
function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `statusChip` escapes the label, and an unknown status falls back to the `muted` tone through `TONES[...] === undefined`. Don't add your own escaping or fallback.
- `duration` output is digits plus `m`/`s`/`running`, never snapshot text, so returning it unescaped from `render` is safe.
- Sorting ISO-8601 UTC strings with the table's `localeCompare` orders them chronologically, the same way `services.js` sorts `deployedAt`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: table with status chips and durations"
```

---

### Task 2: Environment filter, both sorts, empty state, query fallbacks

**Risk tier:** standard: query handling and URL building across the filter and sort links.

**Files:**
- Modify: `src/pages/deploys.js` (whole file replaced below)
- Test: `test/pages/deploys.test.js` (append)

**Interfaces:**
- Consumes: Task 1's `renderDeploys` and its `snapshot`/`services` test helpers. From `src/ui/index.js`: `filterBar({ action, fields, keep }) → string`, `selectField({ name, label, options, value }) → string`, `emptyState({ title }) → string`, plus Task 1's imports.
- Produces: `renderDeploys(snapshot, query = {})` now honors `query.env` (`'production' | 'staging'`, else all), `query.sort` (`'service' | 'startedAt'`, else `'startedAt'`), `query.dir` (`'asc' | 'desc'`, else the column default). The signature is unchanged.

**Mirror:** `src/pages/services.js:3-7` for whitelist-then-default query parsing only. For the markup, use `filterBar`/`selectField` (`src/ui/filter-bar.js:15-21`, `src/ui/select.js:13-21`) and `dataTable`'s `sortHref`/`empty` (`src/ui/table.js:14-17`).

- [ ] **Step 1: Write the failing tests**

Append to `test/pages/deploys.test.js`:

```js
test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(services(html), ['notifications', 'billing', 'api']);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
});

test('defaults to all environments', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
});

test('sorts by service both ways', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), ['api', 'billing', 'notifications', 'search']);
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), ['search', 'notifications', 'billing', 'api']);
});

test('sorts by start time both ways', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), ['notifications', 'api', 'billing', 'search']);
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), ['search', 'billing', 'api', 'notifications']);
});

test('sort links flip the active column and keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sort links leave out env when showing all environments', () => {
  assert.match(renderDeploys(snapshot, {}), /<a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(services(html), ['search', 'billing', 'api', 'notifications']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('an unknown dir falls back to the column default', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'up' })), ['api', 'billing', 'notifications', 'search']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: the 4 Task 1 tests PASS and the 9 new tests FAIL (no `<option>`, no sort links, no empty-state title, query ignored).

- [ ] **Step 3: Implement**

Replace `src/pages/deploys.js` with:

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
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default). Unknown
// values fall back to the defaults.
const ENVIRONMENTS = ['production', 'staging'];

// Default direction for each sortable column.
const SORTS = { service: 'asc', startedAt: 'desc' };

const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => duration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query = {}) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(SORTS, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  const rows = env ? snapshot.deploys.filter((d) => d.environment === env) : snapshot.deploys;

  const filters = filterBar({
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
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows,
    sort: { key: sort, dir },
    sortHref: (key, next) => deploysHref({ env, sort: key, dir: next }),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" while in progress.
function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// Omits an empty env so "All environments" links stay clean.
function deploysHref(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ''));
  return `/deploys?${query}`;
}
```

Notes for the implementer:
- `dataTable` escapes what `sortHref` returns (`&` → `&amp;`), so build the raw URL with `URLSearchParams` and don't escape it yourself.
- `Object.hasOwn` (not `in`) keeps `?sort=toString` or `?sort=__proto__` from passing the whitelist.
- The filter form's hidden `sort`/`dir` inputs are what keep the sort when the dropdown changes; the sort links carry `env`, which keeps the filter when the sort changes. Both are in the tests above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: environment filter, sorting and empty state"
```

---

### Task 3: `/deploys` route and nav link

**Risk tier:** standard: wires the page into the server and the shared layout across two source files.

**Files:**
- Modify: `src/server.js:7-8` (import), `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js` (imports + append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from Task 2; existing `handle(url, { dataDir })` from `src/server.js:21`.
- Produces: `GET /deploys` → 200 with the page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` is missing or unparsable.

**Mirror:** `src/server.js:15-16` (route entries) and `test/server.test.js:6-19` (route and 503 tests).

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, replace the import block (lines 1-4) with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

and append:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<tr><td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": ');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The first test reads the real `data/deploys.json`. `1.23.0-rc.1` appears only on a staging deploy there, so it proves the filter reached the page.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the 4 existing tests PASS and all 4 new tests FAIL. `/deploys` is still an unknown route, so it answers 404 (not 200 or 503), and the nav has no Deploys link.

- [ ] **Step 3: Implement**

In `src/server.js`, add the import between `layout` and `renderOverview`:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
```

and add the route after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

In `src/layout.js`, add the nav entry after Services:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

Do not touch `handle()`: the existing `try/catch` around `readSnapshot` already covers both the missing file (`ENOENT`) and malformed JSON (`SyntaxError` from `JSON.parse` in `src/data.js:10`).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS, 36 tests (19 existing + 13 page + 4 server).

- [ ] **Step 5: Manual check**

Run `npm start` and open `http://localhost:3000/deploys`. Check that the "Deploys" nav link is underlined; that changing the dropdown to "staging" reloads with `?env=staging&sort=startedAt&dir=desc`; that clicking "Service" keeps `env=staging`; and that the chips are colored. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Add the Deploys page to the routes and nav"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| `/deploys` route, nav link after Services | 3 |
| Header "Deploys" + snapshot time | 1 |
| Environment dropdown (All / production / staging), reload with `?env=`, keeps sort | 2 |
| Columns Service…Author, newest first | 1 |
| Service and Started sortable both ways via `?sort=`/`?dir=`, keeps filter | 2 |
| Status chip colors | 1 |
| Duration "4m 12s" / "running" | 1 |
| Empty "No deploys in staging" instead of the table | 2 |
| 503 for missing/unreadable snapshot | 3 |
| Unknown `env`/`sort`/`dir` fall back | 2 |
| Rendering tests + server test for route and 503 | 1, 2, 3 |
