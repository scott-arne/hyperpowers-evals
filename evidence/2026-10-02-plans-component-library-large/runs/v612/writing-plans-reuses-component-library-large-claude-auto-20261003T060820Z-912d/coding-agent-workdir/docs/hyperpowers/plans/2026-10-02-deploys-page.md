# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`. It has an environment filter, sorting by Service and Started, colored status chips and durations, and a "Deploys" nav link after "Services".

**Architecture:** One page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)`. It builds the page from the vendored Keel component kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) and does not hand-write the HTML the way `src/pages/services.js` does. The kit's `dataTable` already does the sort-header links, arrows, `aria-sort`, row sorting and the empty-state swap. The kit's `filterBar` already carries the sort through filter changes. `src/server.js` gets a route entry, `src/layout.js` gets a nav entry, and the existing 503 handling covers the error path with no changes.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Server-rendered HTML strings. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route is `/deploys`; the nav link label is `Deploys`, placed directly after `Services`.
- Page is read-only: no details page, no pagination, no live refresh, no actions.
- Data source: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`; `finishedAt` is `null` while in progress.
- Header: `Deploys`, with the snapshot time under it.
- Environment filter options, in order: `All environments` (default), `production`, `staging`. Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. `4m 12s`; in progress shows `running`.
- Empty filter result: `No deploys in staging` (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as every other page.
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests run under `node --test`. Current baseline: 380 tests, 0 failures.

## Decisions the spec leaves open

- **Reuse the kit, not the Services page's markup.** The spec says sorting and filtering "behave as on the Services page". The kit's `dataTable`/`filterBar` behave the same way as that page (clicking the active column flips direction, any other column starts ascending, links carry `env`, the form carries `sort`/`dir`), so we get that behavior without copying the hand-rolled HTML. The page's markup uses `kit-*` classes, which `public/kit.css` already styles, so `public/app.css` does not change.
- **Chip tones** map to the kit's palette in `public/kit.css`: `ok` (`#1a7f37`, green), `bad` (`#cf222e`, red), `warn` (`#9a6700`, amber), `info` (`#0969da`, blue). An unexpected status falls back to the kit's `muted` grey.
- **Default direction depends on the column.** With no valid `dir`, `startedAt` defaults to `desc` (newest first, per spec) and `service` defaults to `asc` (A→Z, the natural default for a name).
- **Times** (the snapshot time and the Started column) use the existing `formatTimestamp` (`2026-10-01 09:30 UTC`).
- **Empty with "All environments"** says `No deploys`. The spec only defines the message for a named environment.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filtering, page assembly from kit components, status tone and duration helpers |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, filter, both sorts, chips, durations, empty state, query fallback |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add the `Deploys` nav entry after `Services` |
| `test/server.test.js` | Modify | Route test, nav placement, 503 for missing and for malformed snapshot; add `/deploys` to the every-page list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. Needed because `test/e2e/empty.test.js` visits every nav link with this fixture dir |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot. Needed because `test/e2e/single.test.js` visits every nav link with this fixture dir |
| `README.md` | Modify | List Deploys among the pages |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with query parsing and sorting logic, built on kit components the repo has not used yet.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Renders `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. Renders a GET form plus `<input type="hidden" name="k" value="v">` for each `keep` entry.
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`. The select is marked `data-autosubmit`, and `public/kit.js` submits the form when it changes.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. A column is `{ key, label, sortable?, render?: row => trustedHtml, value?: row => comparable }`. Rows are sorted by `sort` using `localeCompare` on `row[key]` (stable). `sortHref` output is HTML-escaped by the kit, so pass raw `&`. When `rows` is empty, it returns `empty` and no table.
  - `badge(label, tone) → string` from `#kit/badge`. `tone` ∈ `ok | warn | bad | info | muted`; anything else becomes `muted`. Renders `<span class="kit-badge kit-badge--<tone>">label</span>`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`. Renders `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`, e.g. `'2026-10-01 09:30 UTC'`.
  - `parseIso(text) → number | null` (ms since epoch) from `src/core/time/parse-iso.js`.
- Produces: `export function renderDeploys(snapshot, query) → string` in `src/pages/deploys.js`. `snapshot` is the parsed `deploys.json`; `query` is a plain object of search params (`{ env?, sort?, dir? }`). This is the same signature as every other page renderer, so Task 2 can register it as a route `render`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

test('shows the title with the snapshot time under it', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/,
  );
});

test('lists the newest deploy first by default, with the spec columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.indexOf('<td>search</td>') < html.indexOf('<td>billing</td>'));
  assert.match(
    html,
    /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(oldest.indexOf('<td>billing</td>') < oldest.indexOf('<td>search</td>'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service' });
  assert.ok(az.indexOf('<td>billing</td>') < az.indexOf('<td>notifications</td>'));
  assert.ok(az.indexOf('<td>notifications</td>') < az.indexOf('<td>search</td>'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(za.indexOf('<td>search</td>') < za.indexOf('<td>billing</td>'));
  assert.match(za, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<td>notifications<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(html.indexOf('<td>search</td>') < html.indexOf('<td>billing</td>'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The file errors with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
import { parseIso } from '../core/time/parse-iso.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy comes first).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  // The bar keeps the sort; the table's header links keep the filter.
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

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: duration },
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

// finishedAt minus startedAt, as "4m 12s". A deploy in progress has no
// finishedAt yet.
function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const start = parseIso(deploy.startedAt);
  const end = parseIso(deploy.finishedAt);
  if (start === null || end === null) return '';
  const seconds = Math.round((end - start) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Do **not** sort the rows yourself. `dataTable` sorts by `sort.key`, comparing `row[key]` with `localeCompare`. ISO timestamps compare correctly as strings, and the sort is stable, so ties keep the snapshot's newest-first order.
- `STATUS_TONES[d.status]` on an unexpected status returns `undefined` (or an inherited property). `badge` turns any value outside its tone set into `muted`, so no guard is needed.
- `formatTimestamp` and `duration` output only digits, letters, spaces, `-` and `:`, so returning them unescaped from `render` is safe.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests, 0 failures.

Then the full suite: `node --test`
Expected: 389 tests, 0 failures. The page is not routed yet, so no other test changes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration. The nav change makes every nav-driven e2e test (`empty`, `single`, `missing`, `queries`, `titles`, `navigation`) visit `/deploys`.

**Files:**
- Modify: `src/server.js` (imports block near line 30; `ROUTES` near line 44)
- Modify: `src/layout.js` (`NAV`, line 5)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` ("Pages" section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Also the existing `handle(url, { dataDir }) → Promise<{ status, type, body }>` in `src/server.js`, which already returns the 503 "Snapshot unavailable" page when `readSnapshot` throws for a missing file or invalid JSON.
- Produces: `GET /deploys` served inside the layout with the title `Deploys · Harbor`, and a `Deploys` nav link directly after `Services`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the imports at the top to:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Add these tests directly after the existing `'renders the services page inside the layout'` test:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>production<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-deploys-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "deploys": [');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

In the `'serves every page in the nav'` test, add `'/deploys'` after `'/services'`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `renders the deploys page…` and `serves every page in the nav` fail with `404 !== 200`, and both 503 tests fail with `404 !== 503`.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order, between `renderDatabases` and `renderDomains`:

```js
import { renderDeploys } from './pages/deploys.js';
```

Add the route directly after the `/services` entry in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry directly after `Services` in `NAV`:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests, 0 failures.

- [ ] **Step 5: Run the e2e tests to see the fixture gap**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys`. Those tests visit every nav link against `test/e2e/fixtures/{empty,single}/`, which do not have a `deploys.json` yet.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the sibling `services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. Use an in-progress deploy so the `finishedAt: null` path is checked for `undefined`/`NaN`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Update the README**

In `README.md`, under "## Pages", change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS, 392 tests, 0 failures (380 baseline + 9 from Task 1 + 3 new server tests).

- [ ] **Step 9: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys` and check:
- "Deploys" sits after "Services" in the nav and is highlighted.
- The status chips are green, red, amber and blue.
- Choosing "staging" reloads with `?env=staging` and keeps the current sort.
- Clicking "Service" and then "Started" keeps the filter.

Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Serve the deploys page and link it after Services"
```
