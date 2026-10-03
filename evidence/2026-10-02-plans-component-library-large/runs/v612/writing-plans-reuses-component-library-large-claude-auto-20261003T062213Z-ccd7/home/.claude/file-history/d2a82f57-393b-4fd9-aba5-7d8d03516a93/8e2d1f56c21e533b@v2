# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing the deploys snapshot, with an environment filter, two sortable columns, colored status chips and a duration column.

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`, the same contract as every other page. It is built entirely from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of the hand-rolled markup in `src/pages/services.js`. The kit already does the Services behavior the spec points at: header links that flip sort direction, `aria-sort`, a filter form that keeps the sort, and an empty slot. `src/server.js` gets a route and `src/layout.js` a nav entry. The existing 503 path in `handle()` covers the error case with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`, page title and nav label "Deploys", nav link placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` via the existing `readSnapshot('deploys', dataDir)`. `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Changing it reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first (Started, descending). Service and Started are sortable both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chips: succeeded green, failed red, rolled-back amber, in-progress blue. These map to kit badge tones `ok`, `bad`, `warn`, `info` (`--kit-ok` #1a7f37, `--kit-bad` #cf222e, `--kit-warn` #9a6700, `--kit-info` #0969da in `public/kit.css`).
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` gives the shared 503 "Snapshot unavailable" page. An unknown `env`, `sort` or `dir` falls back to the default.
- Tests use `node --test`.
- Reuse the kit and the existing `src/core` helpers (`formatTimestamp`, `parseIso`). Do not add CSS or new kit components; `public/kit.css` already styles everything used here.

**Decisions not fixed by the spec** (flag in review if you disagree):
- Query values for the sortable columns are `sort=service` and `sort=startedAt` (the snapshot field names). The default `dir` is `desc` because the default view is newest first.
- The snapshot time and the Started column use `formatTimestamp` (`2026-10-01 09:30 UTC`), the repo's UTC display helper. The Services page shows raw ISO strings.
- With "All environments" and an empty snapshot, the empty message is "No deploys". The spec only defines the filtered case.
- Durations always use the `Xm Ys` form, including under a minute (`0m 45s`) and over an hour (`72m 5s`). The spec asks for minutes and seconds only.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filtering, kit composition, the duration format |
| `test/pages/deploys.test.js` | Create | Rendering tests: default order, both sorts, filter, chips, duration, empty state, fallbacks |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add `{ href: '/deploys', label: 'Deploys' }` to `NAV` after Services |
| `test/server.test.js` | Modify | Route test, nav-order check, 503 test; add `/deploys` to the served-paths list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot (`test/e2e/empty.test.js` walks every nav link against this directory) |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot (`test/e2e/single.test.js` walks every nav link against this directory) |

The e2e fixtures belong to Task 2. Adding the nav link without them makes `empty.test.js` and `single.test.js` fail with a 503 on `/deploys`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new page module composed from six kit components, with query-handling behavior)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `badge(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string` from `#kit/badge`. Unknown tones render as `muted`.
  - `emptyState({ title: string, body?: string }): string` from `#kit/empty`
  - `filterBar({ action: string, fields: string[], keep?: Record<string,string> }): string` from `#kit/filter-bar`. `keep` becomes hidden inputs, in key order.
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string` from `#kit/page-header`
  - `selectField({ name, label, options: {value,label}[], value }): string` from `#kit/select`. It marks itself `data-autosubmit`, and `public/kit.js` submits the form on change.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }): string` from `#kit/table`. It sorts rows by `sort` using a stable sort and compares `row[col.key]` as strings. It returns `empty` instead of a table when `rows` is empty, and escapes `sortHref` output.
  - `formatTimestamp(iso: string): string` from `src/core/format/timestamp.js`, e.g. `'2026-10-01 09:30 UTC'`
  - `parseIso(text: string): number | null` from `src/core/time/parse-iso.js`
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`. Task 2 imports it from `./pages/deploys.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in date order, so the default sort is actually exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

// Asserts the given cell texts appear, in this order.
function assertOrder(html, ...cells) {
  const positions = cells.map((c) => html.indexOf(`<td>${c}</td>`));
  positions.forEach((p, i) => assert.ok(p >= 0, `missing <td>${cells[i]}</td>`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `order: ${cells.join(', ')}`);
}

test('shows the header with the snapshot time and lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  assertOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3');
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, 'billing', 'notifications', 'search');
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' }), 'search', 'notifications', 'billing');
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, '2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1');
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows duration in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.includes('<td>4m 12s</td>'));
  assert.ok(html.includes('<td>21m 40s</td>'));
  assert.ok(html.includes('<td>2m 30s</td>'));
  assert.ok(html.includes('<td>running</td>'));
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=desc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
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
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
  { key: 'duration', label: 'Duration', render: (d) => duration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    // Sort links carry the filter so sorting keeps it.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  return `${header}
${filter}
${table}`;
}

// finishedAt minus startedAt as "4m 12s"; an unfinished deploy is "running".
function duration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const start = parseIso(deploy.startedAt);
  const end = parseIso(deploy.finishedAt);
  if (start === null || end === null || end < start) return '';
  const seconds = Math.round((end - start) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `render` output is trusted HTML. `badge` escapes its label, and `formatTimestamp` and `duration` only emit digits and fixed text, so nothing unescaped from the snapshot reaches the page.
- `STATUS_TONES['constructor']` is a function, not a tone. `badge` rejects it and falls back to `muted`, so an unexpected status can't break the page.
- `SORTS.includes` (rather than a key lookup on an object) is what makes `?sort=constructor` fall back cleanly.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS. The page isn't routed yet, so nothing else changes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard (multi-file integration: server routing, the shared layout, and fixtures every e2e suite walks)

**Files:**
- Modify: `src/server.js` (imports block, plus `ROUTES` after the `'/services'` entry)
- Modify: `src/layout.js` (`NAV`, after the Services entry)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). Also `readSnapshot(name, dir)` via the existing `handle()`, which reads `data/deploys.json` (already committed).
- Produces: `GET /deploys` → 200 with the layout titled "Deploys · Harbor" and the "Deploys" nav link current, or 503 "Snapshot unavailable" when the snapshot can't be read.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the `paths` array in `'serves every page in the nav'`, right after `'/services'`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

Then add these two tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`data/deploys.json` has `search` in staging and `notifications` only in production, so the `?env=staging` assertions check that the query reaches the page.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `'/deploys'` returns 404 in the served-paths test, and both new tests fail on status (404 instead of 200 or 503).

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, between the `databases` and `domains` imports:

```js
import { renderDatabases } from './pages/databases.js';
import { renderDeploys } from './pages/deploys.js';
import { renderDomains } from './pages/domains.js';
```

Then add the route right after `'/services'` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, add the entry right after Services in `NAV`:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 6: Run the e2e suites and watch the fixture gap fail**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `/deploys` reported as 503, because their fixture directories have no `deploys.json`. `navigation`, `titles`, `queries` and `missing` should already pass.

- [ ] **Step 7: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the neighboring empty fixtures):

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

- [ ] **Step 8: Run the whole suite**

Run: `node --test`
Expected: PASS, including every `test/e2e/` suite. `empty.test.js` renders "No deploys" with no `undefined`/`NaN`. `queries.test.js` gets 200 for `/deploys?sort=bogus&dir=sideways&env=mars`.

- [ ] **Step 9: Check the page in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected:
- "Deploys" is in the nav after "Services", with the snapshot time under the heading.
- Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.
- The chips are green, red, amber and blue.
- The in-progress `search` row shows "running".

Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json
git commit -m "Route the deploys page and link it after Services"
```
