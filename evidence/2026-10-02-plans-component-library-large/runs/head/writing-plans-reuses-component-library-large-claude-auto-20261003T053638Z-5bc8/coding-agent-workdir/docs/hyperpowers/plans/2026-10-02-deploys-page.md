# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`. It uses the same query handling as `src/pages/services.js` (unknown values fall back to defaults; the filter keeps the sort and the sort links keep the filter). The markup comes from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-rolled HTML. `src/server.js` gets a route entry and `src/layout.js` a nav entry. The server already returns a 503 for a missing snapshot on every route.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies, `node --test` with `node:assert/strict`, server-rendered HTML strings.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot: `data/deploys.json`, `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is `null` while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started can be sorted both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests run with `node --test`.
- Style: 2-space indent, LF, final newline (`.editorconfig`). Single quotes, semicolons, trailing commas (match `src/pages/services.js`).

## Grounding

- **Page module shape and naming:** `src/pages/services.js:1-97`. One exported `render<Page>(snapshot, query)` returning an HTML string. A header comment documents the query params. Constants are UPPER_CASE.
- **Query fallback (env/sort/dir):** `src/pages/services.js:13-16`. Uses `ENVIRONMENTS.includes`, plus `Object.hasOwn(SORTS, query.sort ?? '')` to guard against `?sort=constructor`.
- **Kit import alias:** `package.json` `"imports": { "#kit/*": "./vendor/kit/*/src/index.js" }`, used at `src/pages/services.js:1-2`.
- **Kit page header:** `vendor/kit/page-header/src/lib/page-header.js:10-14`. `pageHeader({ title, subtitle })` puts the subtitle in `<p class="kit-muted">`.
- **Kit filter form:** `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` (`keep` becomes hidden inputs) and `vendor/kit/select/src/lib/select.js:13-21` (`data-autosubmit`). The submit-on-change script is in `public/kit.js:8-9`.
- **Kit table with sorting:** `vendor/kit/table/src/lib/table.js:20-69`. It sorts rows by `sort` using `col.value ?? row[key]` with a stable `Array.prototype.sort`, builds the header links and `aria-sort` itself, and returns `empty` instead of the table when there are no rows.
- **Kit status chip:** `vendor/kit/badge/src/lib/badge.js:3-15` with tones `ok|warn|bad|info|muted`. The colors are in `public/kit.css:2,19-24`: ok `#1a7f37` green, warn `#9a6700` amber, bad `#cf222e` red, info `#0969da` blue.
- **Kit empty state:** `vendor/kit/empty/src/lib/empty.js:9-12`.
- **Timestamp display:** `src/core/format/timestamp.js:3-7`. `formatTimestamp(iso)` returns `"2026-10-01 09:30 UTC"`, or `''` when the input is invalid.
- **Timestamp parsing:** `src/core/time/parse-iso.js:5-9`. `parseIso(text)` returns ms or `null`.
- **Error handling (503):** `src/server.js:83-92`. Any route whose snapshot read fails renders "Snapshot unavailable" with status 503, so the page module itself does no error handling.
- **Route table:** `src/server.js:43-74`. **Nav list:** `src/layout.js:3-34`.
- **Page test shape:** `test/pages/services.test.js:1-47`. An inline `snapshot` const, one `test()` per behavior, assertions with `assert.match` / `indexOf` ordering on `<td>` cells.
- **Server test shape:** `test/server.test.js:6-32`.
- **E2E fixtures:** `test/e2e/fixtures/empty/services.json`, `test/e2e/fixtures/single/services.json`. `test/e2e/empty.test.js:9-16`, `single.test.js:9-16`, `missing.test.js:8-15`, `queries.test.js:7-13`, `navigation.test.js:7-15` and `titles.test.js:5-10` walk every link on `/`, so a new nav entry needs `deploys.json` in both fixture dirs.
- **Existing kit-component usage in pages:** none. No page uses `dataTable`, `filterBar`, `selectField`, `badge`, `pageHeader` or `emptyState` yet (`grep -rn "#kit" src` shows only `button`/`dialog`). This page is their first consumer. The output strings asserted below come from reading the kit sources cited above.

## Decisions the spec leaves open (flagged for review)

1. **Default `dir` per sort key.** With `?sort=service` and no valid `?dir`, the page sorts ascending (A→Z). With `?sort=startedAt` or no sort, it sorts descending (newest first, as the spec requires). An unknown `dir` falls back to the chosen sort's default.
2. **Snapshot empty with "All environments".** The spec only words the empty state for a chosen environment. When `env` is `all` and there are no deploys, the page says "No deploys".
3. **Time display.** The subtitle reads `Snapshot 2026-10-01 09:30 UTC` and the Started column shows the same format, both via the existing `formatTimestamp`. Sorting still compares the raw ISO strings.
4. **Service sort ties.** The kit table's sort is stable, so deploys of the same service keep the snapshot order (newest first) in both directions.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — a new module that composes six kit components plus query handling. Not a mechanical transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing code):
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string` from `#kit/page-header`
  - `filterBar({ action: string, fields: string[], keep?: Record<string,string> }): string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value }): string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }): string` from `#kit/table`
  - `badge(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string` from `#kit/badge`
  - `emptyState({ title: string, body?: string }): string` from `#kit/empty`
  - `formatTimestamp(iso: string): string` from `src/core/format/timestamp.js`
  - `parseIso(text: string): number | null` from `src/core/time/parse-iso.js`
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: object[] }, query: Record<string,string>): string` in `src/pages/deploys.js`. Task 2 wires it into the route table.

**Mirror:** `src/pages/services.js:5-21`. Copy its header comment style and its env/sort/dir fallback. For markup, use the kit components listed above, not the hand-written `<table>`/`<form>` in `services.js:23-96`.

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
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.8.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'sam' },
    { id: 'd-1', service: 'api-gateway', version: '3.15.0-rc.1', environment: 'staging', status: 'failed', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:05:45Z', author: 'dana' },
  ],
};

const order = (html, cells) => cells.map((c) => html.indexOf(`<td>${c}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]));

test('shows the header with the snapshot time and every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
  assert.match(html, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api-gateway'])));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(oldest, ['api-gateway', 'billing', 'notifications', 'search'])));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(ascending(order(newest, ['search', 'notifications', 'billing', 'api-gateway'])));
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(az, ['api-gateway', 'billing', 'notifications', 'search'])));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(za, ['search', 'notifications', 'billing', 'api-gateway'])));
  assert.match(za, /<input type="hidden" name="dir" value="desc">/);
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
  assert.match(html, /<td>0m 45s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option>/);
  assert.match(html, /<td>search<\/td>/);
  assert.match(html, /<td>api-gateway<\/td>/);
  assert.doesNotMatch(html, /<td>notifications<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ generatedAt: '2026-10-01T09:30:00Z', deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table|undefined|NaN/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api-gateway'])));
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(service, /<input type="hidden" name="dir" value="asc">/);
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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// Each sort's direction when ?dir is missing or unknown.
const DEFAULT_DIR = { startedAt: 'desc', service: 'asc' };
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

  // The kit table sorts the rows and builds the header links; the links carry
  // the filter so sorting keeps it.
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

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  return `${header}
${filters}
${table}`;
}

// Time from start to finish, such as "4m 12s"; "running" until it finishes.
function duration({ status, startedAt, finishedAt }) {
  if (status === 'in-progress' || !finishedAt) return 'running';
  const start = parseIso(startedAt);
  const end = parseIso(finishedAt);
  if (start === null || end === null) return '';
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `formatTimestamp` returns only digits, `-`, `:`, spaces and `UTC` (or `''`), so returning it from a `render` (which the kit treats as trusted HTML) is safe. `badge` escapes its own label.
- `sortHref` returns raw `&`. `dataTable` escapes the href, so the markup contains `&amp;`, which is what the tests expect.
- Do not pre-sort `deploys`. `dataTable` sorts by `sort.key` using `row[key]` (raw ISO strings for `startedAt`, which sort chronologically).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run the full suite: `node --test`
Expected: PASS. The page is not routed yet, so no other test changes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: render the deploys snapshot with the kit table"
```

---

### Task 2: Route, nav link and fixtures

**Risk tier:** standard — integration across the server, the layout, the e2e fixtures and the README. The e2e suites walk every nav link, so a missing fixture breaks four suites.

**Files:**
- Modify: `src/server.js:32` (import) and `src/server.js:45` (route table, after `/services`)
- Modify: `src/layout.js:5` (nav, after Services)
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `test/server.test.js:6-32`
- Modify: `README.md` (Pages paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` can't be read.

**Mirror:** `src/server.js:45` (route entry shape), `src/layout.js:5` (nav entry shape), `test/server.test.js:6-12` and `27-32` (route and 503 tests), and `test/e2e/fixtures/{empty,single}/services.json` (fixture shape).

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add these two tests after the existing `'renders the services page inside the layout'` test (after line 12):

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
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

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The deploys tests and `serves every page in the nav` fail with `404 !== 200` (the 503 test gets 404 instead of 503).

- [ ] **Step 3: Add the e2e fixtures**

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

- [ ] **Step 4: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order, between the `renderDatabases` and `renderDomains` imports:

```js
import { renderDeploys } from './pages/deploys.js';
```

Add the route directly after the `/services` entry:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry directly after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Update the README**

In `README.md`, under `## Pages`, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

Run: `node --test`
Expected: PASS, all suites, including `test/e2e/empty.test.js`, `single.test.js`, `missing.test.js`, `queries.test.js`, `navigation.test.js` and `titles.test.js`, which now cover `/deploys`. The baseline before this plan was 380 passing tests; expect 380 + 10 (Task 1) + 2 = 392.

- [ ] **Step 7: Smoke-check in the real server**

Run: `npm start`, then open `http://localhost:3000/deploys`. Confirm that:
- "Deploys" appears in the nav after "Services".
- The chips are green, red, amber and blue.
- Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys page: route it at /deploys and link it after Services"
```
