# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, that exports `renderDeploys(snapshot, query)` and builds the page entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). The page does **not** copy the hand-rolled markup in `src/pages/services.js` (its own `<table class="services">`, `.pill` classes, `escapeHtml`, inline `onchange`); those predate the template components and are not the pattern to extend. `src/server.js` gets a `/deploys` route that reuses the existing snapshot loading and 503 handling, and `src/layout.js` gets a "Deploys" nav link after "Services".

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Node 20 or later (`"engines": { "node": ">=20" }`); no dependencies. Don't add any packages.
- Tests run with `node --test` (`npm test`), like the rest of the repository.
- Route `/deploys`; nav label "Deploys", placed right after "Services".
- Query parameters: `env` (`production` | `staging`), `sort` (`service` | `startedAt`), `dir` (`asc` | `desc`). Any unknown value falls back to the default.
- Default view: all environments, newest first (`startedAt` descending).
- Filter dropdown options, in order: "All environments" (the default), "production", "staging". Changing the filter keeps the current sort, and changing the sort keeps the filter.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Only Service and Started can be sorted.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue. Through the template tones that means `ok`, `bad`, `warn` and `info`.
- Duration: `finishedAt − startedAt` as minutes and seconds, such as `4m 12s`. An in-progress deploy shows `running`.
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Header: "Deploys", with the snapshot time under it (`Snapshot <generatedAt>`, the same wording as the Overview page).
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages.
- Out of scope: a deploy details page, pagination, live refresh, and any action on a deploy.
- Build the page from `src/ui/` (import from `../ui/index.js`). Don't edit `src/ui/` or `public/harbor.css`/`harbor.js`. `src/ui/index.js` says to keep local edits to the vendored template small, and none are needed here. No `public/app.css` changes are needed either.

## Interpretation notes (spec gaps resolved in this plan)

- **Default direction per sort key.** The spec gives only one default ("newest first"). When `sort` is valid but `dir` is missing or unknown, this plan uses that column's natural default: `startedAt` → `desc` (newest first) and `service` → `asc` (A→Z). The header sort links always send an explicit `dir`, so this only affects hand-typed URLs.
- **Each parameter falls back on its own.** `?sort=bogus&dir=asc` gives `startedAt` ascending, because only the bad value is replaced.
- **"All environments" has the value `""`.** Choosing it submits `?env=`, which isn't a known environment and therefore means "all". The same convention appears in `test/ui/select.test.js`.
- **Sort links always carry `sort` and `dir`,** plus `env` when a filter is active, for example `/deploys?env=staging&sort=service&dir=asc`.
- **No filter and no deploys** (not expected with a 50-deploy snapshot) shows "No deploys".

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query validation, filtering, the column definitions (status-to-tone mapping, duration format), and putting the page together from `src/ui` components. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, filter, both sorts, links that keep state, chips, durations, empty state, fallback for unknown query values. |
| `src/server.js` | Modify (lines 7–8 imports, 14–17 `ROUTES`) | Register `/deploys` with snapshot `deploys`. |
| `src/layout.js` | Modify (lines 3–6 `NAV`) | Add the Deploys nav link after Services. |
| `test/server.test.js` | Modify (append) | Route renders inside the layout with the nav highlighted; 503 when the snapshot is unavailable. |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — a new behavior-bearing module (query validation, sorting, filtering, formatting) built on several library components.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`. Don't modify them):
  - `pageHeader({ title, subtitle?, actions? }) → string`
  - `filterBar({ action, fields: string[], keep?: Record<string, string|undefined> }) → string`. Keeps non-empty `keep` entries as hidden inputs, in insertion order.
  - `selectField({ name, label, options: {value,label}[], value? }) → string`. Marks the matching option `selected` and adds `data-autosubmit`, so `public/harbor.js` submits the form on change.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string`. Sorts the rows by `sort` with a stable sort. Returns `empty` unchanged when `rows` is empty. Cells without `render` are escaped; `render` output is trusted HTML. A sortable header links to `sortHref(key, next)`, where `next` flips the active column's direction and is `asc` for inactive columns. The active header gets `aria-sort` and ▲/▼.
  - `statusChip(label, tone) → '<span class="ui-chip ui-chip--<tone>">label</span>'`
  - `emptyState({ title, body? }) → '<div class="ui-empty"><p class="ui-empty__title">title</p></div>'`
- Produces:
  - `export function renderDeploys(snapshot, query): string`, where `snapshot` is `{ generatedAt: string, deploys: Array<{ id, service, version, environment, status, startedAt: string, finishedAt: string|null, author }> }` and `query` is `Record<string, string>` (from `Object.fromEntries(searchParams)`, as `src/server.js` already passes it). Task 2 uses it.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in newest-first order, so the default sort is exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-4', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T07:20:00Z', finishedAt: '2026-10-01T07:26:05Z', author: 'dana' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Service names in row order (each body row starts with the Service cell).
function services(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

const NEWEST_FIRST = ['search', 'notifications', 'api-gateway', 'billing'];

test('shows the header with the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/,
  );
});

test('lists every deploy newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(services(html), NEWEST_FIRST);
  assert.match(
    html,
    /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/,
  );
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('has the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('sorts by service both ways', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway',
    'billing',
    'notifications',
    'search',
  ]);
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), [
    'search',
    'notifications',
    'billing',
    'api-gateway',
  ]);
});

test('sorts by start time oldest first', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), [
    'billing',
    'api-gateway',
    'notifications',
    'search',
  ]);
});

test('filters by environment and keeps the current sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(services(html), ['billing', 'search']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('offers all environments, production and staging, defaulting to all', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<option value="" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/,
  );
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a>/);
  assert.match(html, /<a href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>6m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(services(html), NEWEST_FIRST);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('an unknown dir falls back to the sort column default', () => {
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'service', dir: 'up' })), [
    'api-gateway',
    'billing',
    'notifications',
    'search',
  ]);
  assert.deepEqual(services(renderDeploys(snapshot, { sort: 'bogus', dir: 'asc' })), [
    'billing',
    'api-gateway',
    'notifications',
    'search',
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (`src/pages/deploys.js` does not exist yet).

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
const ENV_OPTIONS = [
  { value: '', label: 'All environments' },
  ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
];
// Sortable columns and the direction each sorts in when ?dir is missing.
const DEFAULT_DIR = { startedAt: 'desc', service: 'asc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys = env ? snapshot.deploys.filter((d) => d.environment === env) : snapshot.deploys;

  const filters = filterBar({
    action: '/deploys',
    fields: [selectField({ name: 'env', label: 'Environment', options: ENV_OPTIONS, value: env })],
    keep: { sort, dir },
  });
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => deploysHref(env, key, next),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

function deploysHref(env, sort, dir) {
  const params = new URLSearchParams(env ? { env, sort, dir } : { sort, dir });
  return `/deploys?${params}`;
}

// "4m 12s", or "running" while the deploy has not finished.
function duration({ status, startedAt, finishedAt }) {
  if (status === 'in-progress' || !finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` already handles sorting, header links, `aria-sort`, arrows and escaping. Don't sort `deploys` yourself and don't escape cells. `duration` returns only digits, `m`, `s` and `running`, so returning it as trusted HTML is safe.
- `startedAt` values are ISO-8601 UTC strings of the same shape, so `dataTable`'s string `localeCompare` orders them chronologically. No `value` accessor is needed.
- Don't touch `src/pages/services.js`. Its hand-rolled markup isn't part of this change.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then run the full suite: `npm test`
Expected: PASS, 32 tests (19 existing + 13 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard — integration across the server router, the shared layout and the server tests (three files), though every line is given here.

**Files:**
- Modify: `src/server.js:7-8` (imports), `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js` (append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1), and the existing `readSnapshot(name, dir)` / `handle(url, { dataDir })` 503 path in `src/server.js`. That path already returns `pageHeader({ title: route.title, subtitle: 'Snapshot unavailable, try again in a minute.' })` with status 503 for any route whose snapshot can't be read, so no new error handling is needed.
- Produces: `GET /deploys` → 200 HTML page, or 503 when `data/deploys.json` is missing or unreadable. A "Deploys" nav link appears on every page.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`/deploys?env=staging` reads the real `data/deploys.json`, which has a staging `search` deploy, `d-1042`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL (`/deploys` answers 404, so `404 !== 200` and `404 !== 503`); the four existing tests still pass.

- [ ] **Step 3: Register the route**

In `src/server.js`, add the `renderDeploys` import above `renderOverview` so the page imports stay alphabetical:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and extend `ROUTES`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 34 tests, 0 failures.

- [ ] **Step 6: Check it in the running app**

Run: `PORT=3000 npm start`, then open these:
- `http://localhost:3000/deploys`: 10 rows, newest first, with green, red, amber and blue chips and `running` for `search`.
- Choose "staging" in the dropdown: the URL becomes `/deploys?env=staging&sort=startedAt&dir=desc` and only staging rows show.
- Click "Service": the URL keeps `env=staging` and rows sort A→Z. Click again for Z→A.
- `http://localhost:3000/deploys?env=moon&sort=x&dir=y`: same as the default view.

Stop the server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and add it to the nav"
```
