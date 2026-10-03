# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`. It has an environment filter, sorting by Service and Started, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** One page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` like every other page. It is built from the vendored component kit (`#kit/table`, `#kit/filter-bar`, `#kit/select`, `#kit/badge`, `#kit/page-header`, `#kit/empty`) and does not copy the hand-written table and form HTML from `src/pages/services.js`. The kit already covers what the spec says the Services page does: sort links with `aria-sort` and ▲/▼ arrows, flipping direction on the active column, auto-submitting dropdowns, and hidden fields that keep the sort when the filter changes. A small `formatDuration` helper goes in `src/core/format/` next to `formatTimestamp`. `src/server.js` and `src/layout.js` get one route and one nav entry each.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`, page title "Deploys", nav link "Deploys" placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is `null` while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Changing it reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first (`startedAt` descending). Service and Started can be sorted both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In progress shows "running".
- Empty filter result: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages (`src/server.js` already does this for every route).
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests: `node --test`. Rendering tests for the filter, both sorts, the chips, the duration format, the empty state and the unknown-value fallback, plus a server test for the route and its 503.

### Decisions this plan makes where the spec is silent

- **Status → kit badge tone:** succeeded → `ok` (green `#1a7f37`), failed → `bad` (red `#cf222e`), rolled-back → `warn` (amber `#9a6700`), in-progress → `info` (blue `#0969da`). Colors come from `public/kit.css`. An unexpected status falls back to the kit's grey `muted` tone instead of failing.
- **Unknown `dir`:** falls back to `desc`, the page default. This matches "falls back to the default" for the newest-first default.
- **Empty with "All environments":** reads "No deploys". The spec's wording ("No deploys in staging") only covers a chosen environment.
- **Started column:** shown through the existing `formatTimestamp` (`2026-10-01 09:05 UTC`), the same as the snapshot time. Sorting still compares the raw ISO string.
- **Durations over an hour** stay in minutes ("75m 3s"), as the spec says "minutes and seconds". Junk timestamps render an empty cell, as `formatTimestamp` does, so a bad row never prints `NaN`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/core/format/duration.js` | Create | `formatDuration(startedAt, finishedAt)`: "4m 12s" / "running" / "" |
| `test/core/duration.test.js` | Create | Unit tests for `formatDuration` |
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filtering, kit composition |
| `test/pages/deploys.test.js` | Create | Rendering tests (filter, sorts, chips, duration, empty, fallback) |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add `{ href: '/deploys', label: 'Deploys' }` after Services in `NAV` |
| `test/server.test.js` | Modify | Route-in-layout test, nav order, 503 for missing and malformed snapshot; add `/deploys` to the every-page list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. The e2e suite renders **every nav link** against this dir |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot, same reason |
| `README.md` | Modify | Mention Deploys in the page list |

Why the fixtures matter: `test/e2e/empty.test.js`, `single.test.js` and `missing.test.js` crawl every `<a href>` in the nav and render it against `test/e2e/fixtures/{empty,single}/`. Once "Deploys" is in the nav, those suites fail with a 503 unless both fixture files exist. `navigation.test.js`, `titles.test.js` and `queries.test.js` also pick the page up automatically.

Baseline before starting: `node --test` → 380 tests, all passing.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module plus a new shared formatter. Several kit components are composed, and the rendered HTML is what the e2e suite later crawls.

**Files:**
- Create: `src/core/format/duration.js`
- Create: `test/core/duration.test.js`
- Create: `src/pages/deploys.js`
- Create: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/table`. Sorts rows by `sort`, renders `<th aria-sort=…><a href=…>Label ▲</a></th>` for sortable columns, escapes `sortHref` output and plain cells, and returns `empty` when `rows` is empty.
  - `filterBar({ action, fields, keep })` from `#kit/filter-bar`. A GET form with hidden inputs for `keep`.
  - `selectField({ name, label, options, value })` from `#kit/select`. A `<select … data-autosubmit>`, which `public/kit.js` submits on change.
  - `badge(label, tone)` from `#kit/badge`, where tone ∈ `ok | warn | bad | info | muted`.
  - `pageHeader({ title, subtitle })` from `#kit/page-header`.
  - `emptyState({ title })` from `#kit/empty`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`.
- Produces:
  - `formatDuration(startedAt: string, finishedAt: string | null) → string` in `src/core/format/duration.js`.
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>) → string` in `src/pages/deploys.js`. Task 2 imports this into `src/server.js`.

- [ ] **Step 1: Write the failing duration tests**

Create `test/core/duration.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../../src/core/format/duration.js';

test('formats minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:09Z'), '0m 9s');
  assert.equal(formatDuration('2026-10-01T08:00:00Z', '2026-10-01T09:15:03Z'), '75m 3s');
});

test('says running while there is no finish time', () => {
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
});

test('returns an empty string for junk', () => {
  assert.equal(formatDuration('yesterday', '2026-10-01T09:05:00Z'), '');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', '2026-10-01T09:00:00Z'), '');
});
```

- [ ] **Step 2: Write the failing page tests**

Create `test/pages/deploys.test.js`. The snapshot rows are deliberately **not** in newest-first order, so the default-sort test proves the page sorts rather than trusting file order:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-29T16:05:00Z', finishedAt: '2026-09-29T16:12:48Z', author: 'dana' },
    { id: 'd-2', service: 'billing', version: '2.9.0', environment: 'production', status: 'failed', startedAt: '2026-09-30T06:45:00Z', finishedAt: '2026-09-30T06:49:12Z', author: 'sam' },
  ],
};

const order = (html, names) => {
  const at = names.map((n) => html.indexOf(`<td>${n}</td>`));
  assert.ok(at.every((i) => i >= 0), `all of ${names} are listed`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, `listed in the order ${names}`);
};

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists deploys newest first by default with all the columns', () => {
  const html = renderDeploys(snapshot, {});
  order(html, ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  order(asc, ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  order(desc, ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  order(oldest, ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  order(newest, ['search', 'notifications', 'billing', 'api-gateway']);
});

test('filters by environment; the filter keeps the sort and the sort keeps the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  order(html, ['api-gateway', 'billing', 'notifications']);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=desc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/,
  );
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations, and running for a deploy in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  for (const query of [
    { env: 'moon', sort: 'constructor', dir: 'sideways' },
    { env: '__proto__', sort: '__proto__', dir: '' },
  ]) {
    const html = renderDeploys(snapshot, query);
    assert.match(html, /<option value="all" selected>/);
    assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
    order(html, ['search', 'notifications', 'billing', 'api-gateway']);
  }
});
```

- [ ] **Step 3: Run the new tests and confirm they fail**

Run: `node --test test/core/duration.test.js test/pages/deploys.test.js`
Expected: both files FAIL with `ERR_MODULE_NOT_FOUND` for `src/core/format/duration.js` and `src/pages/deploys.js`.

- [ ] **Step 4: Implement `formatDuration`**

Create `src/core/format/duration.js`:

```js
// Elapsed time between two ISO timestamps as minutes and seconds ("4m 12s").
// No finish time means the work is still going.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 5: Run the duration tests**

Run: `node --test test/core/duration.test.js`
Expected: 3 tests PASS.

- [ ] **Step 6: Implement `renderDeploys`**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';
import { formatDuration } from '../core/format/duration.js';
import { formatTimestamp } from '../core/format/timestamp.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy is on top).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const filters = filterBar({
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

  // The kit sorts the rows and builds the header links; the links carry the
  // filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, Object.hasOwn(TONES, d.status) ? TONES[d.status] : 'muted') },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}
```

Notes for the implementer:
- `SORTS` is an array, so `SORTS.includes('constructor')` is false. Don't turn it into an object lookup without `Object.hasOwn`. The Services page guards its `SORTS` object the same way.
- Don't escape `sortHref` output yourself. `dataTable` already escapes it, which is why the tests expect `&amp;`.
- `render` returns trusted HTML. `badge` escapes its label, and `formatTimestamp`/`formatDuration` only return digits, letters and spaces. Version, environment, service and author go through the kit's default escaping.

- [ ] **Step 7: Run the page tests**

Run: `node --test test/core/duration.test.js test/pages/deploys.test.js`
Expected: all 14 tests PASS.

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: 394 tests, 0 failures (380 baseline + 14 new). The page isn't routed yet, so no e2e test touches it.

- [ ] **Step 9: Commit**

```bash
git add src/core/format/duration.js test/core/duration.test.js src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration touching the router, the shared layout every page renders through, and fixtures the whole e2e suite depends on.

**Files:**
- Modify: `src/server.js` (imports block; `ROUTES` after the `/services` line)
- Modify: `src/layout.js` (`NAV` after the Services entry)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (the "Pages" paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). `handle(url, { dataDir })` from `src/server.js` (existing).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` can't be read or parsed.

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

In the `'serves every page in the nav'` test, add `'/deploys'` after `'/services'` in the `paths` array:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

Then add these tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('lists Deploys in the nav right after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 on the deploys page without its snapshot', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 on the deploys page when its snapshot is half-written', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  try {
    await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "deploys": [');
    const res = await handle('/deploys', { dataDir });
    assert.equal(res.status, 503);
    assert.match(res.body, /Snapshot unavailable/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
```

The `0.9.4` (notifications, production) and `1.23.0-rc.1` (search, staging) versions come from the real `data/deploys.json`.

- [ ] **Step 2: Run the server tests and confirm they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `'renders the deploys page inside the layout'` and the two 503 tests get status 404. The nav test doesn't match. `'serves every page in the nav'` fails on `/deploys` with 404.

- [ ] **Step 3: Add the e2e fixtures**

These must exist **before** the nav link goes in, because the e2e suites crawl every nav link against these directories.

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
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

(The single row is in progress on purpose, so the e2e `undefined|NaN` check covers the `finishedAt: null` path.)

- [ ] **Step 4: Wire the route**

In `src/server.js`, add the import in alphabetical order between `renderDatabases` and `renderDomains`:

```js
import { renderDatabases } from './pages/databases.js';
import { renderDeploys } from './pages/deploys.js';
import { renderDomains } from './pages/domains.js';
```

Add the route directly after the `/services` entry in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

No 503 code is needed. `handle()` already turns a failed `readSnapshot` (missing file or bad JSON) into the "Snapshot unavailable" page.

- [ ] **Step 5: Add the nav link**

In `src/layout.js`, add the entry directly after Services in `NAV`:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 6: Run the server tests**

Run: `node --test test/server.test.js`
Expected: all 9 tests PASS.

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: 398 tests, 0 failures (394 after Task 1 + 4 new server tests). The e2e suites (`empty`, `single`, `missing`, `navigation`, `titles`, `queries`) now include `/deploys` without changes. If `empty.test.js` or `single.test.js` fails on `/deploys` with a 503, a fixture from Step 3 is missing or misnamed.

- [ ] **Step 8: Mention the page in the README**

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

- [ ] **Step 9: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`. Check that:
- "Deploys" comes after "Services" in the nav and is highlighted.
- The rows are newest first, `search` / in-progress / "running" is on top, and the chips are green, red, amber and blue.
- Choosing "staging" in the dropdown reloads to `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" then sorts A→Z and keeps `env=staging`.

Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it after Services"
```
