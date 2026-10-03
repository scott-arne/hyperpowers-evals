# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the last 50 deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, so on-call can spot a failed or rolled-back deploy.

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. Unlike `services.js`, which hand-rolls its markup, it composes the vendored Keel kit (`vendor/kit`, imported as `#kit/<name>`): `pageHeader`, `filterBar` + `selectField`, `dataTable` (sorting, sort links, empty slot), `badge` and `emptyState`. The kit already implements the Services page's sort and filter behavior (active column flips, other columns start ascending, filter form keeps the sort as hidden inputs), so the page only supplies query parsing, columns and the duration format. `src/server.js` and `src/layout.js` get one entry each; the existing 503 path covers the error case unchanged.

**Tech Stack:** Node 20+ ESM, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed immediately after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data source: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`, read through the existing `readSnapshot('deploys', dataDir)`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Environment filter options: "All environments" (default), "production", "staging"; query `?env=`; changing it keeps the current sort.
- Sort: Service and Started, both directions, via `?sort=` and `?dir=`; default newest first (`startedAt`, `desc`); changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue (kit tones `ok`, `bad`, `warn`, `info`).
- Duration: `finishedAt − startedAt` as e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing or unreadable `deploys.json` → the shared 503 "Snapshot unavailable" page. Unknown `env`, `sort` or `dir` → the default.
- Tests run with `node --test` (`npm test`).

## Decisions the spec leaves open

- **Timestamps** (header and Started column) use the existing `formatTimestamp` from `src/core/format/timestamp.js` (`2026-10-01 09:05 UTC`), not the raw ISO string. Sorting still compares the raw ISO value.
- **Default `dir` is always `desc`.** A hand-edited `?sort=service` with no `dir` therefore lists Z→A. Links the page generates always carry `dir`, so this only affects hand-written URLs, and it keeps "unknown `dir` → the default" to a single rule.
- **Empty with "All environments"** says "No deploys" (only reachable with an empty snapshot).
- **Ties** (same service) keep snapshot order, which is newest first, because `Array.prototype.sort` is stable.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, kit composition, duration format |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, sorts, filter, chips, durations, empty state, fallbacks |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route after `/services` |
| `src/layout.js` | Modify | Add the "Deploys" nav entry after "Services" |
| `test/server.test.js` | Modify | Route test, 503 test (missing and malformed file), add `/deploys` to the nav list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. The e2e suites crawl every nav link against these fixture dirs, so they fail without it |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot, same reason |
| `README.md` | Modify | Name Deploys in the Pages paragraph |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — a new page module composing five kit components, with the sort and fallback rules that the spec ties to the Services page.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, unchanged):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Columns are `{ key, label, sortable?, render?(row) → trusted HTML, value?(row) }`. It sorts the rows itself and HTML-escapes `sortHref` output, so `&` becomes `&amp;`.
  - `badge(label, tone?: 'ok'|'warn'|'bad'|'info'|'muted') → string` from `#kit/badge`. An unknown tone falls back to `muted`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`
- Produces: `export function renderDeploys(snapshot, query) → string` (HTML body fragment). `snapshot` is the parsed `deploys.json`. `query` is a plain object of search params (`Object.fromEntries(searchParams)`, as `src/server.js` passes it).

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.9.0-rc.3', environment: 'production', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1', service: 'api', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:09:12Z', author: 'dana' },
  ],
};

const order = (html, ...services) => services.map((s) => html.indexOf(`<td>${s}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || positions[i - 1] < p));

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(ascending(order(html, 'search', 'notifications', 'billing', 'api')));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(html, 'api', 'billing', 'notifications', 'search')));
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(az, 'api', 'billing', 'notifications', 'search')));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(za, 'search', 'notifications', 'billing', 'api')));
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
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

test('filters by environment and keeps the filter and the sort across each other', () => {
  const production = renderDeploys(snapshot, { env: 'production' });
  assert.match(production, /<option value="production" selected>/);
  assert.doesNotMatch(production, /<td>search<\/td>/);
  assert.match(production, /<td>billing<\/td>/);
  assert.match(production, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  const sorted = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'desc' });
  assert.match(sorted, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  assert.match(sorted, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /No deploys in staging/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(ascending(order(html, 'search', 'notifications', 'billing', 'api')));
});
```

`order` returns each service cell's position, and `ascending` checks that every cell is present and in that order. A missing row returns `-1` and fails the check instead of passing by accident. `sort: 'constructor'` guards against prototype-key lookups, as the Services test does.

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

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy comes first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

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

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: formatDuration },
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

// Minutes and seconds from start to finish, such as "4m 12s". finishedAt is
// null while the deploy is still going.
function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Don't escape the hrefs yourself. `dataTable` escapes `sortHref` output, and escaping it here too would produce `&amp;amp;`.
- `formatTimestamp` returns only digits, `-`, `:`, spaces and `UTC`, so returning it raw from `render` is safe. Every other text cell (Service, Version, Environment, Author) is escaped by `dataTable`, and `badge` escapes its label.
- Leave the Started column without a `value`. `dataTable` then sorts by the raw ISO `startedAt`, which orders correctly as a string.
- `public/kit.css` already styles every class these components emit, and `public/kit.js` auto-submits `data-autosubmit` selects. No CSS or JS changes are needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests, 0 failures.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 0 failures. The page isn't routed yet, so nothing else changes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — a multi-file integration. The route and nav edits are one line each, but the crawl-based e2e suites depend on the new fixtures.

**Files:**
- Modify: `src/server.js` (imports block, around line 14; `ROUTES`, around line 44)
- Modify: `src/layout.js` (`NAV`, around line 5)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (Pages paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1); `handle(url, { dataDir }) → Promise<{ status, type, body }>` from `src/server.js` (existing).
- Produces: `GET /deploys` → 200 with the page in the layout, or 503 "Snapshot unavailable" when `deploys.json` is missing or doesn't parse. Nav link `<a href="/deploys">Deploys</a>` directly after Services.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the import block at the top with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

In the `'serves every page in the nav'` test, change the first line of `paths` from

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

Insert these two tests directly before `test('answers 404 for an unknown path', ...)`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>billing<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the deploys snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const unreadable = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(unreadable, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "deplo');
  for (const dataDir of [missing, unreadable]) {
    const res = await handle('/deploys', { dataDir });
    assert.equal(res.status, 503, dataDir);
    assert.match(res.body, /<h1>Deploys<\/h1>\n<p class="muted">Snapshot unavailable, try again in a minute\.<\/p>/, dataDir);
  }
});
```

The route test reads the real `data/deploys.json`. Its staging rows include `billing` (d-1038), and `notifications` appears only in production, so the env filter is exercised end to end. The truncated file covers "unreadable" (a `JSON.parse` failure) separately from "missing" (a read failure).

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL in three tests. `serves every page in the nav` and `renders the deploys page…` get status 404 for `/deploys`. `answers 503…` matches 404 against the expected 503.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order, after the `renderDatabases` import:

```js
import { renderDatabases } from './pages/databases.js';
import { renderDeploys } from './pages/deploys.js';
import { renderDomains } from './pages/domains.js';
```

and add the route directly after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry directly after Services in `NAV`:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

`handle` already catches the snapshot read and renders the 503 page. Don't change it.

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 5: Run the whole suite and watch the e2e crawls fail**

Run: `npm test`
Expected: FAIL in exactly two tests: `every page renders an empty snapshot` (`test/e2e/empty.test.js`) and `every page renders a one-row snapshot` (`test/e2e/single.test.js`). Both crawl every nav link against `test/e2e/fixtures/{empty,single}/`, and neither directory has a `deploys.json` yet, so `/deploys` answers 503.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`. It matches the layout of the sibling `services.json`:

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
    { "id": "d-1037", "service": "api-gateway", "version": "3.14.2", "environment": "production", "status": "succeeded", "startedAt": "2026-09-30T16:05:00Z", "finishedAt": "2026-09-30T16:12:48Z", "author": "dana" }
  ]
}
```

- [ ] **Step 7: Name the page in the README**

In `README.md`, in the "Pages" section, change

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: PASS, 0 failures. The e2e navigation, titles, queries, missing, empty and single crawls all include `/deploys` now.

- [ ] **Step 9: Check the page by eye**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected: "Deploys" is in the nav after Services. The newest deploy (search, in-progress, blue chip, "running") comes first. Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`. Clicking "Service" keeps `env=staging`. Stop the server afterwards.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Route the deploys page and link it after Services"
```
