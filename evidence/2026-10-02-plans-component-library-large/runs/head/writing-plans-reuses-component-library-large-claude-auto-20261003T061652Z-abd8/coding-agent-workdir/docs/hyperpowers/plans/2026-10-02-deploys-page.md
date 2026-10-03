# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It follows `src/pages/services.js` for query parsing and URL shape, but builds its markup from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-writing it. A small pure helper, `formatDuration(ms)`, goes in `src/core/format/` next to the other formatters. `src/server.js` gets the route, which also gives the page the existing 503 handling for free, and `src/layout.js` gets the nav link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. The `#kit/*` import alias is defined in `package.json` `"imports"`.

## Global Constraints

- Route `/deploys`. Nav link label `Deploys`, placed directly after `Services` in the nav.
- Page title and header text: `Deploys`. The snapshot time goes under the header.
- Environment filter options: `All environments` (default, value `all`), `production`, `staging`. Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in this order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt`, descending). Service and Started can be sorted both ways through `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded is green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, e.g. `4m 12s`. An in-progress deploy shows `running`.
- Empty filter result: `No deploys in staging` (naming the chosen environment) in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages.
- An unknown `env`, `sort` or `dir` value falls back to the default.
- Out of scope: a deploy details page, pagination, live refresh, any action on a deploy.
- Tests run with `node --test`. No new dependencies.

## Grounding

- **Page module shape and query fallback:** `src/pages/services.js:5-21`. Whitelisted `env`, `sort` and `dir` with silent fallback, plus the header comment that documents the query parameters.
- **Sort links and filter form that keep each other's state:** `src/pages/services.js:30-38` and `src/pages/services.js:88-94`. `?env=…&sort=…&dir=…` links, and a GET form with hidden `sort`/`dir` inputs.
- **Kit components (exact output the tests assert on):**
  - `vendor/kit/table/src/lib/table.js:20-56`: `dataTable({columns, rows, sort, sortHref, empty})` sorts the rows, renders `aria-sort` and the ▲/▼ header links, escapes the href (so a raw `&` becomes `&amp;`), and returns `empty` when there are no rows.
  - `vendor/kit/badge/src/lib/badge.js:3-15`: `badge(label, tone)` takes the tones `ok|warn|bad|info|muted`.
  - `vendor/kit/select/src/lib/select.js:13-21`: `selectField({name, label, options, value})` renders a `data-autosubmit` select.
  - `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`: `filterBar({action, fields, keep})` renders the GET form with hidden inputs for `keep`.
  - `vendor/kit/empty/src/lib/empty.js:9-12`: `emptyState({title})`.
  - `vendor/kit/page-header/src/lib/page-header.js:10-14`: `pageHeader({title, subtitle})`.
  - `public/kit.js:7-10` submits the form when a `data-autosubmit` field changes. `public/kit.css:19-38` already styles every kit class used here, so no CSS work is needed.
- **Importing the kit from a page:** `src/pages/services.js:1-2` (`import { button } from '#kit/button';`).
- **Kit usage for table/badge/filter/empty/header:** `none`. No existing page uses these six kit components yet; `services.js` hand-rolls its table, filter and `.pill` chips. This page is the first to use them, which is deliberate. They match the spec one-to-one (the badge tones `ok`/`bad`/`warn`/`info` are exactly green/red/amber/blue), and the template ships them for this purpose.
- **Formatter helper + test shape:** `src/core/format/bytes.js:1-12` and `test/core/bytes.test.js:1-9`. One exported `formatX` function with a one-line rationale comment, and a test file that imports it by relative path.
- **Timestamp display:** `src/core/format/timestamp.js:1-7`. `formatTimestamp(iso)` returns `2026-10-01 09:30 UTC`.
- **Page render test shape:** `test/pages/services.test.js:1-47`. A module-level `snapshot` fixture, regex/`indexOf` assertions on the HTML string, one `test()` per behavior.
- **Route table and 503 handling:** `src/server.js:43-46` (ROUTES entries) and `src/server.js:83-92` (the 503 "Snapshot unavailable" body, owned by the server, not the page).
- **Nav:** `src/layout.js:3-6` (NAV entries, order = display order).
- **Server test shape:** `test/server.test.js:6-32`, which tests a route inside the layout, the list of nav paths, and a 503 against `no-such-dir`.
- **E2E fixtures:** `test/e2e/empty.test.js:9-15` and `test/e2e/single.test.js:9-15` render every nav link against `test/e2e/fixtures/{empty,single}/`. Shape to copy: `test/e2e/fixtures/empty/services.json` and `test/e2e/fixtures/single/services.json`. Once `/deploys` is in the nav, these tests fail with 503 unless both directories have a `deploys.json`.
- **Error handling in pages:** `none`. Pages do no I/O and throw nothing; the server owns snapshot errors (`src/server.js:83-92`).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/core/format/duration.js` | Create | `formatDuration(ms)` → `"4m 12s"` |
| `test/core/duration.test.js` | Create | Unit tests for `formatDuration` |
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: filter, sort, chips, duration, empty state |
| `test/pages/deploys.test.js` | Create | Rendering tests for the page |
| `src/server.js` | Modify | Import + `/deploys` route |
| `src/layout.js` | Modify | `Deploys` nav link after `Services` |
| `test/server.test.js` | Modify | Route test, nav-path list, 503 test |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty deploys snapshot |
| `test/e2e/fixtures/single/deploys.json` | Create | One-deploy snapshot |
| `README.md` | Modify | Mention Deploys in the page list |

---

### Task 1: `formatDuration` helper

**Risk tier:** low. It is one pure function, and the plan contains the complete content of both the helper and its test. Nothing else consumes it until Task 2.

**Files:**
- Create: `src/core/format/duration.js`
- Test: `test/core/duration.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function formatDuration(ms: number): string`. It returns `"<m>m <s>s"`, with seconds rounded to the nearest second and minutes not rolled up into hours (`75m 0s`). Negative input clamps to `0m 0s`. Non-finite input (`NaN`, from an unparseable timestamp) returns `''`.

**Mirror:** `src/core/format/bytes.js:1-12` and `test/core/bytes.test.js:1-9`, for the module shape, the rationale comment and the test layout.

- [ ] **Step 1: Write the failing test**

Create `test/core/duration.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../../src/core/format/duration.js';

test('formats minutes and seconds', () => {
  assert.equal(formatDuration(252_000), '4m 12s');
  assert.equal(formatDuration(45_000), '0m 45s');
  assert.equal(formatDuration(0), '0m 0s');
});

test('keeps counting minutes past an hour', () => {
  assert.equal(formatDuration(75 * 60_000), '75m 0s');
});

test('rounds to the nearest second', () => {
  assert.equal(formatDuration(59_600), '1m 0s');
});

test('clamps negative spans and blanks junk', () => {
  assert.equal(formatDuration(-5_000), '0m 0s');
  assert.equal(formatDuration(Number.NaN), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/core/duration.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/core/format/duration.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/format/duration.js`:

```js
// Elapsed time in minutes and seconds, such as "4m 12s". Deploys are short, so
// minutes are not rolled up into hours.
export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '';
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/core/duration.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/format/duration.js test/core/duration.test.js
git commit -m "Add formatDuration for minute-and-second spans"
```

---

### Task 2: Deploys page renderer

**Risk tier:** standard. This is a new page module that integrates six kit components and query handling.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `formatDuration(ms: number): string` from `src/core/format/duration.js` (Task 1). `formatTimestamp(iso: string): string` from `src/core/format/timestamp.js` (existing). The kit functions `pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge` and `emptyState`, with the signatures cited in Grounding.
- Produces: `export function renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`. `Deploy` is `{id, service, version, environment, status, startedAt, finishedAt: string | null, author}` (see `src/shared/schemas/deploys.js`). Task 3 wires this into `ROUTES`.

**Mirror:** `src/pages/services.js:5-21` for the query fallback and the header comment, and `test/pages/services.test.js:1-47` for the test shape.

Behavior decisions to implement (each traced to the spec):
- `env`: `production` or `staging`, else `all`.
- `sort`: `service` or `startedAt`, else `startedAt`.
- `dir`: `asc` or `desc`, else the default for the active sort: `desc` for `startedAt` (the spec's "newest first"), `asc` for `service`. With a single global default of `desc`, a hand-typed `?sort=service` would list Z→A.
- Sorting is done by `dataTable` (string `localeCompare` on `row[key]`, same as Services' `deployedAt` sort on fixed-width ISO strings). It is a stable sort, so deploys of the same service stay newest-first in snapshot order.
- Status tones: `succeeded → ok` (green), `failed → bad` (red), `rolled-back → warn` (amber), `in-progress → info` (blue). An unknown status falls back to the kit's `muted`.
- Started cell and header subtitle use `formatTimestamp` (`2026-10-01 09:05 UTC`).
- Empty: `No deploys in <env>` for a chosen environment. With `All environments` (only possible when the snapshot itself is empty, as in the e2e `empty` fixture) it says `No deploys`, because the spec only defines the filtered wording.

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
    { id: 'd-2', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T08:10:00Z', finishedAt: '2026-09-30T08:31:40Z', author: 'marco' },
  ],
};

const before = (html, a, b) => html.indexOf(`<td>${a}</td>`) < html.indexOf(`<td>${b}</td>`);

test('shows the header with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(before(html, '1.23.0-rc.1', '0.9.4'));
  assert.ok(before(html, '0.9.4', '2.9.0-rc.3'));
  assert.ok(before(html, '2.9.0-rc.3', '0.9.3'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(before(oldest, '0.9.3', '1.23.0-rc.1'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(before(az, 'billing', 'search'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service">/);
  assert.match(az, /<input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(before(za, 'search', 'billing'));
  // Same-service deploys stay newest first.
  assert.ok(before(za, '0.9.4', '0.9.3'));
});

test('sorting by service without a direction starts A to Z', () => {
  const html = renderDeploys(snapshot, { sort: 'service' });
  assert.ok(before(html, 'billing', 'search'));
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows the duration, or running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(html, /1\.23\.0-rc\.1/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.ok(before(html, '1.23.0-rc.1', '0.9.3'));
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

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy is on top).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

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

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: duration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    // The links carry the filter so sorting keeps it.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}

// finishedAt is null while a deploy is in progress.
function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  return formatDuration(Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS. The page is not routed yet, so no other test changes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 3: Route, nav link, e2e fixtures and README

**Risk tier:** standard. It is a multi-file integration (server, layout, two fixture files, server tests, README), and the e2e suite breaks if any piece is missing.

**Files:**
- Modify: `src/server.js:17` (import) and `src/server.js:45` (route)
- Modify: `src/layout.js:5` (nav)
- Modify: `test/server.test.js:6-32`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (Pages section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 2).
- Produces: `GET /deploys` → 200 page titled `Deploys · Harbor`, or 503 "Snapshot unavailable" when `deploys.json` cannot be read. Nav link `<a href="/deploys">Deploys</a>` after Services.

**Mirror:** `test/server.test.js:6-32` for the server tests, `src/server.js:45` for the route entry, `src/layout.js:5` for the nav entry, and `test/e2e/fixtures/{empty,single}/services.json` for the fixtures.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the existing `'renders the services page inside the layout'` test (after line 12):

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /1\.23\.0-rc\.1/);
});

test('lists Deploys right after Services in the nav', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});
```

In the `'serves every page in the nav'` test, change the first line of the `paths` array from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

After the existing `'answers 503 when the snapshot cannot be read'` test, add:

```js
test('answers 503 for the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The deploys tests get status 404 instead of 200/503, `serves every page in the nav` fails on `/deploys`, and the nav test finds no Deploys link.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import directly after `import { renderDatabases } from './pages/databases.js';` (line 17), so the alphabetical import list stays sorted:

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add directly after the `'/services'` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add directly after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 5: Run the e2e tests to see the missing fixtures fail**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `/deploys` returning 503 (no `deploys.json` in the fixture dirs). `navigation`, `titles`, `missing` and `queries` pass.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. It uses a finished deploy so the duration math runs under the `undefined|NaN` check:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" }
  ]
}
```

- [ ] **Step 7: Update the README page list**

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

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS, all tests (380 before this plan + 4 from Task 1 + 11 from Task 2 + 3 new server tests = 398).

- [ ] **Step 9: Check the page by hand**

Run: `npm start`, then open `http://localhost:3000/deploys`. Check that the newest deploy (`search 1.23.0-rc.1`, blue `in-progress`, `running`) is on top, that choosing "staging" in the dropdown reloads with `?env=staging` and keeps the sort, and that the Service/Started header links flip direction. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Route /deploys and link it from the nav"
```

---

## Spec Coverage

| Spec requirement | Task |
|---|---|
| `/deploys` route, nav link after Services | 3 |
| Header "Deploys" + snapshot time | 2 |
| Environment filter (All/production/staging, `?env=`, keeps sort) | 2 |
| Columns in order; newest first; Service/Started sortable both ways; sort keeps filter | 2 |
| Status chip colors | 2 |
| Duration `4m 12s` / `running` | 1, 2 |
| Empty state "No deploys in staging" | 2 |
| 503 "Snapshot unavailable" | 3 (server-owned, tested) |
| Unknown `env`/`sort`/`dir` fall back | 2 (unit), 3 (e2e `queries.test.js` covers `/deploys` via nav) |
| Testing: rendering tests + server test for route and 503 | 2, 3 |
