# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page, linked from the nav after "Services", so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** A new page module `src/pages/deploys.js` renders `data/deploys.json` (already written by the pipeline) using the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) and does not hand-roll markup the way `src/pages/services.js` does. Query handling (`?env=`, `?sort=`, `?dir=` with fallback to defaults) follows the Services page. A small `formatDuration` helper goes in `src/core/format/`, next to `formatTimestamp`. `src/server.js` gets the route and `src/layout.js` gets the nav entry. The existing 503 path covers a missing snapshot.

**Tech Stack:** Node ≥ 20 (`.nvmrc`: 22), ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`. Nav label "Deploys", placed right after "Services". Page title "Deploys".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` is `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is null while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: a dropdown with "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started can be sorted both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Errors: a missing or unreadable `deploys.json` returns the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` values fall back to the default.
- Tests run with `node --test`.

## Grounding

- **Page module shape and query fallback:** `src/pages/services.js:5-21`. Header comment documents the query params, `ENVIRONMENTS` allowlist, `Object.hasOwn` guard against `?sort=constructor`, and `export function renderX(snapshot, query)` returns an HTML string.
- **Filter keeps sort / sort keeps filter:** `src/pages/services.js:30-38` (sort links carry `env`) and `src/pages/services.js:88-94` (filter form carries `sort`/`dir` as hidden inputs). The kit equivalents are `filterBar({ keep })` at `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` and `dataTable({ sortHref })` at `vendor/kit/table/src/lib/table.js:46-56`.
- **Kit table (sorting, `aria-sort`, empty fallback):** `vendor/kit/table/src/lib/table.js:20-44`. Sorts rows itself from `sort: {key, dir}`, escapes `row[key]` unless a column has `render`, and returns `empty` instead of the table when there are no rows.
- **Kit select + autosubmit:** `vendor/kit/select/src/lib/select.js:13-21` marks the select `data-autosubmit`, and `public/kit.js:8-9` submits the form on change. No inline `onchange` is needed.
- **Kit status chip:** `vendor/kit/badge/src/lib/badge.js:3-15`. Tones `ok|warn|bad|info|muted`, and unknown tones fall back to `muted`. `public/kit.css:1-2,19-24`: ok `#1a7f37` green, warn `#9a6700` amber, bad `#cf222e` red, info `#0969da` blue.
- **Kit header and empty state:** `vendor/kit/page-header/src/lib/page-header.js:10-14` and `vendor/kit/empty/src/lib/empty.js:9-12`.
- **Kit import style in pages:** `src/pages/services.js:1-3` (`import { button } from '#kit/button';` then local imports).
- **Kit stylesheet already loaded:** `src/layout.js:47-49`. No CSS changes needed.
- **Timestamp formatting:** `src/core/format/timestamp.js:1-7` (`formatTimestamp(iso)` gives `"2026-10-01 09:30 UTC"`, or `''` for junk). Use it for Started and the snapshot time.
- **Small formatter module + test shape:** `src/core/format/timestamp.js:1-7` with `test/core/timestamp.test.js:1-11`.
- **Page rendering test shape:** `test/pages/services.test.js:1-47` (inline snapshot, `indexOf` row-order assertions, regexes against exact markup).
- **Routing and the 503:** `src/server.js:43-45` (route table) and `src/server.js:83-92` (snapshot read failure gives a 503 "Snapshot unavailable").
- **Nav:** `src/layout.js:3-5`.
- **Server tests:** `test/server.test.js:6-32`.
- **E2E crawl fixtures:** `test/e2e/empty.test.js:6-16` and `test/e2e/single.test.js:6-16` crawl every nav link against `test/e2e/fixtures/{empty,single}/`. A new nav link without fixtures there makes those tests fail (503). Fixture style: `test/e2e/fixtures/empty/services.json` and `test/e2e/fixtures/single/services.json`.
- **Error handling inside renderers:** none. Renderers don't throw or validate; bad query values fall back silently (`src/pages/services.js:14-16`), and read errors are handled in `src/server.js:84-92`.
- **Duration formatting:** none. No existing helper (`grep -rn duration src` finds nothing), so Task 1 adds one.

---

### Task 1: `formatDuration` helper

**Risk tier:** low (one new pure-function module plus its test, with the complete content given below)

**Files:**
- Create: `src/core/format/duration.js`
- Test: `test/core/duration.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatDuration(startIso: string, endIso: string | null | undefined): string` returns `"<m>m <s>s"` (minutes are not capped, e.g. `"75m 0s"`), `"running"` when `endIso` is null/undefined, and `''` when either timestamp is unparseable or the end is before the start.

**Mirror:** `src/core/format/timestamp.js:1-7` and `test/core/timestamp.test.js:1-11` (lead comment explaining the format, `''` for junk, one assertion per behavior).

- [ ] **Step 1: Write the failing test**

Create `test/core/duration.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../../src/core/format/duration.js';

test('formats elapsed time in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:45Z'), '0m 45s');
});

test('keeps counting minutes past the hour', () => {
  assert.equal(formatDuration('2026-10-01T08:00:00Z', '2026-10-01T09:15:00Z'), '75m 0s');
});

test('says running when there is no end yet', () => {
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', undefined), 'running');
});

test('returns an empty string for junk or an end before the start', () => {
  assert.equal(formatDuration('yesterday', '2026-10-01T08:54:12Z'), '');
  assert.equal(formatDuration('2026-10-01T08:54:12Z', '2026-10-01T08:50:00Z'), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/core/duration.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/core/format/duration.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/format/duration.js`:

```js
// Elapsed time between two ISO timestamps in minutes and seconds, such as
// "4m 12s". No end yet means the work is still going.
export function formatDuration(startIso, endIso) {
  if (endIso == null) return 'running';
  const ms = Date.parse(endIso) - Date.parse(startIso);
  if (Number.isNaN(ms) || ms < 0) return '';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/core/duration.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/format/duration.js test/core/duration.test.js
git commit -m "Add formatDuration for elapsed minutes and seconds"
```

---

### Task 2: Deploys page renderer

**Risk tier:** standard (new page module composing six kit components plus query handling)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `formatDuration(startIso, endIso)` from `src/core/format/duration.js` (Task 1). `formatTimestamp(iso)` from `src/core/format/timestamp.js`. `escapeHtml(value)` from `src/html.js`. Kit: `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})`.
- Produces: `renderDeploys(snapshot: {generatedAt: string, deploys: object[]}, query: Record<string, string>): string`, with the same signature as every other renderer in `src/server.js`'s `ROUTES`.

**Mirror:** `src/pages/services.js:1-21` for the module header comment, allowlists, and `Object.hasOwn` guard. Use the kit components for the markup instead of `services.js:23-96`.

Notes for the implementer:
- `dataTable` sorts the rows itself from `sort: {key, dir}`. Don't pre-sort. `Array.prototype.sort` is stable, so deploys of the same service keep the snapshot's newest-first order.
- `sortHref` returns a raw URL. `dataTable` escapes it, so `&` becomes `&amp;` in the output.
- Default direction depends on the column: `startedAt` defaults to `desc` (newest first, the page default) and `service` to `asc`. A valid `dir` always wins. An unknown `sort` falls back to `startedAt`, and an unknown `dir` falls back to that column's default.
- The spec only defines the empty message for a chosen environment. With "All environments" and an empty snapshot (exercised by `test/e2e/empty.test.js`), the page says "No deploys yet".

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in time order, so the tests prove the page sorts.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1037', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

const order = (html, ...services) => {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p >= 0), `all of ${services} are listed`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `listed in order ${services}`);
};

test('shows the title and the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<header class="kit-page-header"><div><h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p><\/div><\/header>/,
  );
});

test('lists deploys newest first by default with the spec columns', () => {
  const html = renderDeploys(snapshot, {});
  order(html, 'search', 'notifications', 'billing', 'api-gateway');
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>api-gateway<\/td><td>3\.14\.2<\/td><td>production<\/td><td><span class="kit-badge kit-badge--ok">succeeded<\/span><\/td><td>2026-09-30 16:05 UTC<\/td><td>7m 48s<\/td><td>dana<\/td>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  order(oldest, 'api-gateway', 'billing', 'notifications', 'search');
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service' });
  order(az, 'api-gateway', 'billing', 'notifications', 'search');
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  order(za, 'search', 'notifications', 'billing', 'api-gateway');
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td><td>running<\/td>/);
});

test('filters by environment and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit><option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option><\/select>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  order(html, 'search', 'billing');
  assert.doesNotMatch(html, /<td>notifications<\/td>|<td>api-gateway<\/td>/);
});

test('keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys yet<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  order(html, 'search', 'notifications', 'billing', 'api-gateway');
});

test('escapes text from the snapshot', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], service: '<script>', author: 'a"b' }] };
  const html = renderDeploys(evil, {});
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<td>&lt;script&gt;<\/td>/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

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
import { formatDuration } from '../core/format/duration.js';
import { formatTimestamp } from '../core/format/timestamp.js';
import { escapeHtml } from '../html.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// The direction each sortable column starts in when ?dir is missing or unknown.
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => escapeHtml(formatTimestamp(d.startedAt)) },
  { key: 'duration', label: 'Duration', render: (d) => escapeHtml(formatDuration(d.startedAt, d.finishedAt)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys = env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [{ value: 'all', label: 'All environments' }, ...ENVIRONMENTS.map((e) => ({ value: e, label: e }))],
      }),
    ],
    keep: { sort, dir },
  });

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys yet' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer on the kit components"
```

---

### Task 3: Route, nav link, e2e fixtures

**Risk tier:** standard (multi-file integration: server routing, the shared layout, and the fixtures every e2e crawl depends on)

**Files:**
- Modify: `src/server.js:31-32` (import) and `src/server.js:45` (route after `/services`)
- Modify: `src/layout.js:5` (nav entry after Services)
- Modify: `test/server.test.js` (new route tests; add `/deploys` to the nav path list at lines 15-21)
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (the "Pages" paragraph lists the pages)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 2).
- Produces: `GET /deploys` returns 200 with the page in the layout, or 503 "Snapshot unavailable" when `deploys.json` can't be read. The nav has `<a href="/deploys">Deploys</a>` right after Services.

**Mirror:** `src/server.js:45` for the route entry, `src/layout.js:5` for the nav entry, `test/server.test.js:6-12` and `test/server.test.js:27-32` for the tests, and `test/e2e/fixtures/{empty,single}/services.json` for the fixtures.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the `'renders the services page inside the layout'` test:

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
  assert.match(body, /<a href="\/services"[^>]*>Services<\/a><a href="\/deploys"[^>]*>Deploys<\/a>/);
});

test('answers 503 for the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

In the `'serves every page in the nav'` test, change the first line of `paths` from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `renders the deploys page` gets 404, `lists Deploys in the nav` finds no match, the deploys 503 test gets 404, and `serves every page in the nav` reports `/deploys`.

- [ ] **Step 3: Add the route and nav entry**

In `src/server.js`, add the import in alphabetical position (between `renderDatabases` and `renderDomains`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route right after the `/services` entry:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry right after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 5: Run the e2e crawls to see them fail without fixtures**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys`. Their fixture dirs have no `deploys.json`.

- [ ] **Step 6: Add the e2e fixtures**

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

- [ ] **Step 7: Update the README page list**

In `README.md`, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents, On-call
```

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS, including `test/e2e/{empty,single,missing,navigation,queries,titles}.test.js`, which now crawl `/deploys` too.

- [ ] **Step 9: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Route /deploys and link it in the nav after Services"
```
