# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page that lists the deploy snapshot so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`. It is built from the vendored Keel kit components (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`), not from markup written by hand. The kit table already does the sorting, the sort links and `aria-sort`, and the kit badge has the blue tone that `app.css` pills lack. `src/server.js` gets a route entry and `src/layout.js` gets a nav entry. The existing 503 path in `handle()` covers a missing snapshot with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`. The nav label is "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot `data/deploys.json` (already committed): `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `finishedAt` is `null` while in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. Colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Header "Deploys", with the snapshot time under it.
- Environment filter: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started can be sorted both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Duration is `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s". An in-progress deploy shows "running".
- Empty: "No deploys in staging" (names the chosen environment) in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages.
- An unknown `env`, `sort` or `dir` falls back to the default (`all`, `startedAt`, `desc`).
- No new dependencies. Tests use `node --test`.

## Grounding

- Page module shape (exported `render<Page>(snapshot, query)`, a header comment documenting the query params, whitelist-or-default parsing): `src/pages/services.js:5-16`
- Filter/sort behavior to match (links carry `env`, the form carries `sort`/`dir` as hidden inputs, `env=all` in links): `src/pages/services.js:30-38` and `src/pages/services.js:88-94`
- Kit imports through `#kit/<name>`: `src/pages/services.js:1-2`, mapping in `package.json:7-9`
- Kit table (sort, header links, `aria-sort`, `empty` replaces the table, `render` returns trusted HTML, otherwise the cell is escaped): `vendor/kit/table/src/lib/table.js:20-56`
- Kit filter bar + select (GET form, hidden `keep` inputs, `data-autosubmit` that `public/kit.js` submits on change): `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`, `vendor/kit/select/src/lib/select.js:13-21`, `public/kit.js:7-10`
- Kit badge tones `ok|warn|bad|info|muted`, styled green/amber/red/blue in `public/kit.css:19-24`: `vendor/kit/badge/src/lib/badge.js:12-15`
- Kit page header (`<h1>` + `kit-muted` subtitle): `vendor/kit/page-header/src/lib/page-header.js:10-14`
- Kit empty state: `vendor/kit/empty/src/lib/empty.js:9-12`
- Snapshot-time wording ("Snapshot <iso>"): `src/pages/overview.js:29`
- Routing table and 503 handling: `src/server.js:17-43`
- Nav list: `src/layout.js:3-9`
- Page test shape (inline snapshot fixture, `assert.match` on exact markup, one behavior per `test`): `test/pages/services.test.js:1-47`
- Server test shape (`handle()` called directly, `no-such-dir` dataDir for 503): `test/server.test.js:1-25`
- Error handling inside page modules: none. Pages never throw; bad query values fall back to defaults (`src/pages/services.js:14-16`), and snapshot read errors are handled once in `src/server.js:33-41`.
- Duration formatting: none. There is no existing time-formatting helper. Other pages print ISO timestamps raw (`src/pages/services.js:47`), and so does the Started column here.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new page module plus its tests; it integrates six kit components)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (kit, existing):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`
  - `badge(label, tone?: 'ok'|'warn'|'bad'|'info'|'muted') → string` from `#kit/badge`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string,string>) → string`, consumed by Task 2
  - `formatDuration({ startedAt: string, finishedAt: string | null }) → string`

**Mirror:** `src/pages/services.js:5-16` for the module comment and query parsing. `test/pages/services.test.js` for the test style.

Notes for the implementer:
- Do **not** copy the hand-written table, `<select>` and `pill` markup from `services.js`. The kit components produce the same behavior, and the blue in-progress chip only exists as `kit-badge--info`.
- `dataTable` escapes the `sortHref` result, so return a raw `&` in it. It also escapes plain cells. Only `render` output is trusted, and both `badge()` and `formatDuration()` output are safe (badge escapes its label, the duration is digits plus fixed text).
- The ISO timestamps sort correctly as strings, so the `startedAt` column needs no `value` function.
- When `env` is `all` and the snapshot itself is empty, show "No deploys". The spec only defines the filtered case.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.8.1', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T10:00:00Z', finishedAt: '2026-09-30T10:21:40Z', author: 'sam' },
    { id: 'd-0', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'failed', startedAt: '2026-09-29T16:05:00Z', finishedAt: '2026-09-29T16:07:30Z', author: 'dana' },
  ],
};

// Row order, read from the Service cell (the first cell of each row).
function services(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time and every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  for (const label of ['Version', 'Environment', 'Status', 'Duration', 'Author']) {
    assert.match(html, new RegExp(`<th>${label}</th>`));
  }
  assert.match(html, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(services(oldest), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(services(az), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service">/);
  assert.match(az, /<input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(services(za), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats the duration in minutes and seconds, or running', () => {
  assert.equal(formatDuration(snapshot.deploys[1]), '4m 12s');
  assert.equal(formatDuration(snapshot.deploys[2]), '21m 40s');
  assert.equal(formatDuration(snapshot.deploys[0]), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(services(html), ['notifications', 'billing', 'api-gateway']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when no deploys match', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.slice(1) }, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api-gateway']);
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

// Recent deploys, newest first. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
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
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const environment = selectField({
    name: 'env',
    label: 'Environment',
    value: env,
    options: [
      { value: 'all', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
  });

  // Sort links carry the filter, and the filter form carries the sort, so
  // changing one keeps the other.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filterBar({ action: '/deploys', fields: [environment], keep: { sort, dir } })}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" while in progress.
export function formatDuration({ startedAt, finishedAt }) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 27 tests (18 existing + 9 new).

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** low (three one-line additions and the test assertions, all written out in full below)

**Files:**
- Modify: `src/server.js:7-12` (import), `src/server.js:17-23` (route)
- Modify: `src/layout.js:3-9` (nav)
- Modify: `README.md` (Pages section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from Task 1 (`src/pages/deploys.js`)
- Produces: `GET /deploys` → 200 page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` can't be read

**Mirror:** `test/server.test.js:6-25`

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the nav loop to include `/deploys`:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Then add these two tests after `answers 503 when the snapshot cannot be read`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
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

(The staging assertions rely on the committed `data/deploys.json`: `search` has a staging deploy and `notifications` only has production ones.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` reports `404 !== 200` for `/deploys`, and both new tests fail on status.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order with the other pages:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and the route after `/services`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

No change to the 503 path. `handle()` already catches the failed `readSnapshot('deploys')` and renders the route title with "Snapshot unavailable".

- [ ] **Step 4: Update the README**

In `README.md`, change the first line of the Pages section from:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 29 tests.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`. Check that the nav shows Deploys after Services, the four chips are green/red/amber/blue, choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`, and clicking "Service" keeps `env`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Deploys: route /deploys and link it in the nav"
```
